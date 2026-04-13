import { supabase, getSafeSession, getSafeToken } from '../lib/supabase'
import type { ChatSession, Message } from '../types'

export interface CloudUserSettings {
  user_id: string
  cloud_sync_enabled: boolean
  credits: number // Updated from rag_credits to match DB schema
  theme: string
  role: 'user' | 'verified' | 'admin' | 'owner'
  is_verified: boolean
  stack?: string[]
}

// ==========================================
// Edge Function URLs
// ==========================================

const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // Passierschein
const SYNC_URL = `${SUPABASE_PROJECT_URL}/functions/v1/memory-sync/sync`;
const LOAD_URL = `${SUPABASE_PROJECT_URL}/functions/v1/memory-sync/load`;

async function getJwt() {
  const token = await getSafeToken();
  if (!token) throw new Error("No access_token in session");
  return token;
}

// ==========================================
// User Settings API
// ==========================================

// ==========================================
// User Settings API (Native Fetch Bypass)
// ==========================================

export async function fetchUserSettings(userId: string): Promise<CloudUserSettings | null> {
  try {
    const token = await getSafeToken();
    if (!token) return null;

    const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/user_settings?user_id=eq.${userId}&select=display_name,avatar_url,role,is_verified,credits,cloud_sync_enabled`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(4000)
    });

    if (!res.ok) {
        if (res.status === 404) return null;
        throw new Error(`Fetch settings failed: ${res.status}`);
    }

    const data = await res.json();
    return data[0] || null;
  } catch (e) {
    console.error('[CloudSync] Failed to fetch settings:', e);
    return null;
  }
}

export async function updateUserSettings(userId: string, settings: Partial<CloudUserSettings>): Promise<void> {
  try {
    const token = await getSafeToken();
    if (!token) throw new Error("No token");

    const res = await fetch(`${SUPABASE_PROJECT_URL}/rest/v1/user_settings?user_id=eq.${userId}`, {
      method: 'PATCH',
      headers: {
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=minimal'
      },
      body: JSON.stringify(settings),
      signal: AbortSignal.timeout(5000)
    });

    if (!res.ok) throw new Error(`Update settings failed: ${res.status}`);
  } catch (e) {
    console.error('[CloudSync] Failed to update settings:', e);
    throw e;
  }
}

// ==========================================
// Sessions API (Cloud Sync)
// ==========================================

export async function pushSessionToEdge(chatSession: ChatSession): Promise<string> {
  const userToken = await getJwt();
  
  const res = await fetch(SYNC_URL, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,                   // Gateway Check
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Gateway Passierschein (muss JWT sein)
      "X-User-Token": userToken,                     // Deine User-Identität
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: chatSession.id,
      session_title: chatSession.title,
      provider: chatSession.provider,
      model: chatSession.model,
      updated_at: new Date(chatSession.updatedAt).toISOString(),
      messages: chatSession.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: new Date(m.timestamp).toISOString(),
        images: m.images || [],
        tokens: m.metadata?.tokenUsage || {}
      })),
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Cloud Sync Error Details:", {
      status: res.status,
      statusText: res.statusText,
      body: errorText
    });
    throw new Error(`Sync failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  console.log("SYNC OK:", data);
  return data.session_id;
}

export async function loadSessionFromEdge(sessionId: string): Promise<Message[]> {
  const userToken = await getJwt();
  
  const res = await fetch(LOAD_URL, {
    method: "POST",
    headers: {
      "apikey": SUPABASE_ANON_KEY,                   // Gateway Check
      "Authorization": `Bearer ${SUPABASE_ANON_KEY}`, // Gateway Passierschein (muss JWT sein)
      "X-User-Token": userToken,                     // Deine User-Identität
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      session_id: sessionId,
      limit_messages_per_session: 200,
    }),
  });

  if (!res.ok) {
    const errorText = await res.text();
    console.error("Cloud Load Error Details:", {
      status: res.status,
      statusText: res.statusText,
      body: errorText
    });
    throw new Error(`Load failed: ${res.status} ${errorText}`);
  }

  const data = await res.json();
  console.log("LOAD OK:", data);
  
  return (data.messages ?? []).map((m: any) => ({
    id: crypto.randomUUID(),
    role: m.role,
    content: m.content,
    timestamp: Date.now()
  }));
}

export async function fetchCloudSessions(userId: string): Promise<ChatSession[]> {
  // Join sessions with their messages
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      messages (*)
    `)
    .eq('user_id', userId)
    .order('updated_at', { ascending: false })

  if (error) {
    console.error('Error fetching cloud sessions:', error)
    return []
  }

  // Map database payload back to frontend types
  return data.map((row: any) => ({
    id: row.id,
    title: row.title,
    provider: row.provider,
    model: row.model,
    createdAt: new Date(row.created_at).getTime(),
    updatedAt: new Date(row.updated_at).getTime(),
    messages: (row.messages || []).map((m: any) => ({
      id: m.id,
      role: m.role,
      content: m.content,
      images: m.images,
      metadata: {
        tokenUsage: m.tokens
      },
      timestamp: new Date(m.created_at).getTime()
    })).sort((a: any, b: any) => a.timestamp - b.timestamp) // Ensure chronological order
  }))
}

export async function deleteCloudSession(sessionId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', userId)

  if (error) {
    console.error('Error deleting cloud session:', error)
  }
}
