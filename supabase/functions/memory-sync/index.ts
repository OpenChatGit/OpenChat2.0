/**
 * Memory Sync Edge Function
 * Handles session and message synchronization with proper auth and profile sync
 * 
 * Endpoints:
 * - POST /sync - Sync session and messages to cloud
 * - POST /load - Load session messages from cloud
 */

import { createClient } from "npm:@supabase/supabase-js@2";

type ChatMessage = {
  id: string;
  role: string;
  content: string;
  images?: any[];
  tokens?: any;
  created_at?: string;
};

type SyncRequestBody = {
  session_id: string;
  session_title: string;
  messages: ChatMessage[];
  provider?: string | null;
  model?: string | null;
  updated_at?: string;
};

type LoadRequestBody = {
  session_id: string;
  limit_messages_per_session?: number;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

/**
 * Extract user token from Authorization header
 */
function extractUserToken(req: Request): string | null {
  const authHeader = req.headers.get("authorization");
  if (!authHeader) return null;
  
  // Support both "Bearer <token>" and raw token
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.substring(7);
  }
  return authHeader;
}

/**
 * Auto-sync user profile from auth metadata to user_settings
 */
async function syncUserProfile(supabase: any, user: any, currentSettings: any) {
  const metaName = user.user_metadata?.full_name || 
                   user.user_metadata?.name || 
                   user.user_metadata?.user_name || 
                   user.email?.split('@')[0];
  const metaAvatar = user.user_metadata?.avatar_url || user.user_metadata?.picture;
  
  const nameIsEmail = currentSettings?.display_name?.includes('@') || 
                      currentSettings?.display_name === user.email;
  const shouldUpdateName = !currentSettings?.display_name || nameIsEmail;
  const shouldUpdateAvatar = !currentSettings?.avatar_url && !!metaAvatar;

  if (shouldUpdateName || shouldUpdateAvatar) {
    console.log(`[MemorySync] Upgrading profile for ${user.id}...`);
    
    const updates: any = {
      updated_at: new Date().toISOString()
    };
    
    if (shouldUpdateName && metaName) {
      updates.display_name = metaName;
    }
    if (shouldUpdateAvatar && metaAvatar) {
      updates.avatar_url = metaAvatar;
    }
    
    const { error } = await supabase
      .from("user_settings")
      .update(updates)
      .eq("user_id", user.id);

    if (error) {
      console.error("[MemorySync] Profile update failed:", error.message);
    } else {
      console.log("[MemorySync] Profile successfully upgraded.");
    }
  }
}

// @ts-ignore: Deno is defined in Edge Functions context
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    // Extract user token from Authorization header
    const userToken = extractUserToken(req);
    if (!userToken) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Server configuration error" }, 500);
    }

    // Create Supabase client with user token
    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    });

    // Verify user authentication
    const { data: { user }, error: userErr } = await supabase.auth.getUser(userToken);
    if (userErr || !user) {
      console.error("[MemorySync] Auth error:", userErr?.message);
      return jsonResponse({ error: "Invalid or expired token" }, 401);
    }

    const url = new URL(req.url);
    const path = url.pathname;

    // Route: Load session messages
    if (path.includes('/load')) {
      const body = (await req.json()) as LoadRequestBody;
      const { session_id, limit_messages_per_session = 200 } = body;

      if (!session_id) {
        return jsonResponse({ error: "session_id is required" }, 400);
      }

      // Fetch session to verify ownership
      const { data: session, error: sessionErr } = await supabase
        .from("sessions")
        .select("id, user_id")
        .eq("id", session_id)
        .eq("user_id", user.id)
        .single();

      if (sessionErr || !session) {
        return jsonResponse({ error: "Session not found or access denied" }, 404);
      }

      // Fetch messages
      const { data: messages, error: messagesErr } = await supabase
        .from("messages")
        .select("*")
        .eq("session_id", session_id)
        .order("created_at", { ascending: true })
        .limit(limit_messages_per_session);

      if (messagesErr) {
        return jsonResponse({ error: "Failed to load messages", details: messagesErr.message }, 400);
      }

      return jsonResponse({
        ok: true,
        session_id,
        messages: messages || [],
        count: messages?.length || 0
      });
    }

    // Route: Sync session and messages
    if (path.includes('/sync')) {
      const body = (await req.json()) as SyncRequestBody;
      const {
        session_id,
        session_title,
        messages,
        provider = null,
        model = null,
        updated_at,
      } = body;

      if (!session_id || !session_title || !Array.isArray(messages)) {
        return jsonResponse({ error: "Invalid request: session_id, session_title, and messages are required" }, 400);
      }

      // Fetch user settings and sync profile
      const { data: userSettings, error: settingsErr } = await supabase
        .from("user_settings")
        .select("role, is_verified, display_name, avatar_url")
        .eq("user_id", user.id)
        .single();

      if (settingsErr && settingsErr.code !== 'PGRST116') {
        console.error("[MemorySync] Settings fetch error:", settingsErr.message);
      }

      // Auto-sync profile metadata
      await syncUserProfile(supabase, user, userSettings);

      const userRole = userSettings?.role || 'user';
      const isVerified = userSettings?.is_verified || false;

      console.log(`[MemorySync] Syncing session ${session_id} for user ${user.id} (Role: ${userRole})`);

      // Upsert session
      const sessionPayload = {
        id: session_id,
        user_id: user.id,
        title: session_title,
        provider: provider || 'unknown',
        model: model || 'unknown',
        updated_at: updated_at || new Date().toISOString(),
      };

      const { error: sessionErr } = await supabase
        .from("sessions")
        .upsert(sessionPayload, { onConflict: "id" });

      if (sessionErr) {
        return jsonResponse({ 
          error: "Session sync failed", 
          details: sessionErr.message 
        }, 400);
      }

      // Upsert messages
      const messagePayloads = messages.map((m) => ({
        id: m.id,
        session_id: session_id,
        user_id: user.id,
        role: m.role,
        content: m.content,
        images: Array.isArray(m.images) ? m.images : [],
        tokens: m.tokens || {},
        created_at: m.created_at || new Date().toISOString(),
      }));

      const { error: messagesErr } = await supabase
        .from("messages")
        .upsert(messagePayloads, { onConflict: "id" });

      if (messagesErr) {
        return jsonResponse({
          error: "Messages sync failed",
          details: messagesErr.message
        }, 400);
      }

      return jsonResponse({
        ok: true,
        session_id,
        user_id: user.id,
        role: userRole,
        is_verified: isVerified,
        messages_synced: messagePayloads.length,
      });
    }

    return jsonResponse({ error: "Invalid endpoint" }, 404);

  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    console.error("[MemorySync] Unhandled error:", msg);
    return jsonResponse({ error: "Internal server error", details: msg }, 500);
  }
});
