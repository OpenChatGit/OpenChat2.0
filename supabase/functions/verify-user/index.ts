/**
 * Verify User Edge Function
 * Admin-only endpoint for managing user roles and verification status
 * 
 * Features:
 * - Role management (user, verified, admin, owner)
 * - Verification status control
 * - Admin/Owner access control
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

/**
 * Extract user token from Authorization header
 */
function extractUserToken(req: Request): string | null {
  const authHeader = req.headers.get('authorization');
  if (!authHeader) return null;
  
  if (authHeader.startsWith('Bearer ')) {
    return authHeader.substring(7);
  }
  return authHeader;
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }

  try {
    // Extract user token
    const userToken = extractUserToken(req);
    if (!userToken) {
      return new Response(
        JSON.stringify({ error: 'Authorization required' }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client with service role for admin operations
    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Verify requesting user
    const { data: { user }, error: authError } = await supabaseClient.auth.getUser(userToken);
    if (authError || !user) {
      console.error('[VerifyUser] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check if requester is Owner or Admin
    const { data: requesterSettings } = await supabaseClient
      .from('user_settings')
      .select('role')
      .eq('user_id', user.id)
      .single();

    const requesterRole = requesterSettings?.role || 'user';
    
    if (requesterRole !== 'owner' && requesterRole !== 'admin') {
      console.log(`[VerifyUser] Access denied for user ${user.id} with role ${requesterRole}`);
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden',
          details: 'Only admins and owners can verify users'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { target_user_id, new_role, verify = true } = await req.json();

    if (!target_user_id || !new_role) {
      return new Response(
        JSON.stringify({ error: 'target_user_id and new_role are required' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Validate role
    const validRoles = ['user', 'verified', 'admin', 'owner'];
    if (!validRoles.includes(new_role)) {
      return new Response(
        JSON.stringify({ 
          error: 'Invalid role',
          details: `Role must be one of: ${validRoles.join(', ')}`
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent non-owners from creating owners
    if (new_role === 'owner' && requesterRole !== 'owner') {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden',
          details: 'Only owners can assign owner role'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Prevent users from modifying themselves
    if (target_user_id === user.id) {
      return new Response(
        JSON.stringify({ 
          error: 'Forbidden',
          details: 'Cannot modify your own role'
        }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[VerifyUser] ${user.id} (${requesterRole}) updating ${target_user_id} to role: ${new_role}, verified: ${verify}`);

    // Update target user settings
    const { data: updatedSettings, error: updateError } = await supabaseClient
      .from('user_settings')
      .update({ 
        role: new_role, 
        is_verified: verify, 
        updated_at: new Date().toISOString()
      })
      .eq('user_id', target_user_id)
      .select()
      .single();

    if (updateError) {
      console.error('[VerifyUser] Update error:', updateError.message);
      return new Response(
        JSON.stringify({ 
          error: 'Update failed',
          details: updateError.message
        }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    console.log(`[VerifyUser] Successfully updated user ${target_user_id}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        settings: updatedSettings,
        updated_by: user.id
      }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' }, status: 200 }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('[VerifyUser] Unhandled error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
