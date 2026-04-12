import { createClient } from "npm:@supabase/supabase-js@2";

type ChatMessage = {
  id: string; // stable UUID from client (m.id)
  role: string;
  content: string;
  images?: any; // JSONB (expects array)
  tokens?: any; // JSONB (expects object)
  created_at?: string; // ISO timestamp from client (preferred)
};

type RequestBody = {
  session_id: string; // from client
  session_title: string;
  messages: ChatMessage[];
  provider?: string | null;
  model?: string | null;
  updated_at?: string;
};

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-user-token, content-type, apikey",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

// @ts-ignore: Deno is defined in Edge Functions context
Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  if (req.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const userToken = req.headers.get("x-user-token");
    if (!userToken) return jsonResponse({ error: "Missing X-User-Token" }, 401);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY");

    if (!supabaseUrl || !supabaseAnonKey) {
      return jsonResponse({ error: "Missing SUPABASE_URL/ANON_KEY env vars" }, 500);
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: {
        headers: {
          Authorization: `Bearer ${userToken}`,
        },
      },
    });

    const { data: { user }, error: userErr } = await supabase.auth.getUser(userToken);
    if (userErr || !user) {
      return jsonResponse({ error: "Invalid user token" }, 401);
    }

    const body = (await req.json()) as RequestBody;
    const {
      session_id,
      session_title,
      messages,
      provider = null,
      model = null,
      updated_at,
    } = body;

    if (!session_id || !session_title || !Array.isArray(messages)) {
      return jsonResponse({ error: "Invalid request body" }, 400);
    }

    const userId = user.id;

    // 1) Upsert session (by primary key id)
    const sessionUpsertPayload = {
      id: session_id,
      user_id: userId,
      title: session_title,
      provider: provider || 'unknown',
      model: model || 'unknown',
      updated_at: updated_at || new Date().toISOString(),
    };

    const { error: sessionErr } = await supabase
      .from("sessions")
      .upsert(sessionUpsertPayload, { onConflict: "id" });

    if (sessionErr) {
      return jsonResponse({ error: "Session upsert failed", details: sessionErr.message }, 400);
    }

    // 2) Upsert messages (by primary key id)
    const messageUpsertPayload = messages.map((m) => ({
      id: m.id,
      session_id: session_id,
      user_id: userId,
      role: m.role,
      content: m.content,
      images: Array.isArray(m.images) ? m.images : [],
      tokens: m.tokens || {},
      created_at: m.created_at || new Date().toISOString(),
    }));

    const { error: messagesErr } = await supabase
      .from("messages")
      .upsert(messageUpsertPayload, { onConflict: "id" });

    if (messagesErr) {
      return jsonResponse(
        { error: "Messages upsert failed", details: messagesErr.message },
        400
      );
    }

    return jsonResponse({
      ok: true,
      session_id,
      user_id: userId,
      messages_upserted: messageUpsertPayload.length,
    });
  } catch (e: any) {
    const msg = e instanceof Error ? e.message : String(e);
    return jsonResponse({ error: "Unhandled error", details: msg }, 500);
  }
});
