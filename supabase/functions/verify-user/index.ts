import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '', // Use Service Role for Admin power!
      { global: { headers: { Authorization: req.headers.get('Authorization')! } } }
    )

    // 1. Check if requester is Owner or Admin
    const { data: { user } } = await supabaseClient.auth.getUser()
    if (!user) throw new Error('Not authenticated')

    const { data: settings } = await supabaseClient
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single()

    if (settings?.role !== 'owner' && settings?.role !== 'admin') {
       return new Response(JSON.stringify({ error: 'Unauthorized: Admins/Owner only' }), {
         status: 403,
         headers: { ...corsHeaders, 'Content-Type': 'application/json' },
       })
    }

    // 2. Parse target user and requested role
    const { target_user_id, new_role, verify = true } = await req.json()

    if (!target_user_id || !new_role) {
       throw new Error('target_user_id and new_role are required')
    }

    // 3. Update the target settings
    const { data: updatedSettings, error: updateError } = await supabaseClient
      .from('user_settings')
      .update({ role: new_role, is_verified: verify, updated_at: new Date() })
      .eq('user_id', target_user_id)
      .select()
      .single()

    if (updateError) throw updateError

    return new Response(JSON.stringify({ success: true, settings: updatedSettings }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
