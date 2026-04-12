import { supabase } from '../lib/supabase'
import type { ChatSession, Message } from '../types'

export interface CloudUserSettings {
  user_id: string
  cloud_sync_enabled: boolean
  rag_credits: number
  theme: string
}

// ==========================================
// Edge Function URLs
// ==========================================

const SUPABASE_PROJECT_URL = import.meta.env.VITE_SUPABASE_URL || '';
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''; // Passierschein
const SYNC_URL = `${SUPABASE_PROJECT_URL}/functions/v1/memory-sync/sync`;
const LOAD_URL = `${SUPABASE_PROJECT_URL}/functions/v1/memory-sync/load`;

async function getJwt() {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.access_token) throw new Error("No access_token in session");
  return session.access_token;
}

// ==========================================
// User Settings API
// ==========================================

export async function fetchUserSettings(): Promise<CloudUserSettings | null> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return null

  const { data, error } = await supabase
    .from('user_settings')
    .select('*')
    .eq('user_id', session.user.id)
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 is "No rows found"
    console.error('Error fetching user settings:', error)
    return null
  }

  return data as CloudUserSettings
}

export async function updateUserSettings(settings: Partial<CloudUserSettings>): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  const { error } = await supabase
    .from('user_settings')
    .upsert({ 
      user_id: session.user.id, 
      ...settings 
    }, { onConflict: 'user_id' })

  if (error) {
    console.error('Error updating user settings:', error)
    throw error
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

export async function fetchCloudSessions(): Promise<ChatSession[]> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return []

  // Join sessions with their messages
  const { data, error } = await supabase
    .from('sessions')
    .select(`
      *,
      messages (*)
    `)
    .eq('user_id', session.user.id)
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

export async function deleteCloudSession(sessionId: string): Promise<void> {
  const { data: { session } } = await supabase.auth.getSession()
  if (!session?.user) return

  const { error } = await supabase
    .from('sessions')
    .delete()
    .eq('id', sessionId)
    .eq('user_id', session.user.id)

  if (error) {
    console.error('Error deleting cloud session:', error)
  }
}
