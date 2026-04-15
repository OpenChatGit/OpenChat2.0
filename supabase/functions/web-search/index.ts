/**
 * Web Search Edge Function
 * Provides web search capabilities with credit management
 * 
 * Features:
 * - Tavily API integration
 * - Credit-based access control
 * - Result formatting
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-user-token',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SEARCH_COST = 100000; // 100k credits per search

/**
 * Extract user token from headers
 */
function extractUserToken(req: Request): string | null {
  // Try x-user-token first
  const xUserToken = req.headers.get('x-user-token');
  if (xUserToken) return xUserToken;
  
  // Fallback to Authorization header
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
    // Extract and validate user token
    const userToken = extractUserToken(req);
    if (!userToken) {
      return new Response(
        JSON.stringify({ 
          error: 'Authorization required',
          details: 'Missing x-user-token or Authorization header'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create Supabase client
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    );
    
    // Verify user
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
    if (authError || !user) {
      console.error('[WebSearch] Auth error:', authError?.message);
      return new Response(
        JSON.stringify({ 
          error: 'Unauthorized',
          details: authError?.message || 'Invalid user token'
        }),
        { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Check credits
    const { data: settings } = await supabase
      .from('user_settings')
      .select('credits')
      .eq('user_id', user.id)
      .single();
      
    const currentCredits = settings?.credits || 0;
    console.log(`[WebSearch] User ${user.id} has ${currentCredits} credits. Cost: ${SEARCH_COST}`);

    if (currentCredits < SEARCH_COST) {
      return new Response(
        JSON.stringify({ 
          error: 'Insufficient credits',
          currentBalance: currentCredits,
          required: SEARCH_COST
        }),
        { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse request body
    const { query, limit = 10 } = await req.json();
    
    if (!query || typeof query !== 'string' || query.trim().length === 0) {
      return new Response(
        JSON.stringify({ error: 'Search query is required and must be non-empty' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Get Tavily API key
    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
    if (!TAVILY_API_KEY) {
      console.error('[WebSearch] TAVILY_API_KEY not configured');
      return new Response(
        JSON.stringify({ error: 'Search service not configured' }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    console.log(`[WebSearch] Searching Tavily for: "${query}" (limit: ${limit})`);

    // Call Tavily API
    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query.trim(),
        search_depth: "basic",
        max_results: Math.min(limit, 20), // Cap at 20
        include_answer: false,
        include_images: false,
        include_raw_content: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[WebSearch] Tavily API error:', errorText);
      return new Response(
        JSON.stringify({ 
          error: 'Search service error',
          details: `Tavily returned ${response.status}`
        }),
        { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
    
    const data = await response.json();
    
    // Format results
    const results = (data.results || []).map((r: any) => ({
      title: r.title || 'Untitled',
      url: r.url,
      content: r.content || "",
      score: r.score || 0,
      published_date: r.published_date || null,
      engine: "tavily"
    }));

    console.log(`[WebSearch] Found ${results.length} results`);

    // Deduct credits only after successful search
    const { error: deductError } = await supabase.rpc('deduct_credits', { 
      user_id_val: user.id, 
      amount_val: SEARCH_COST 
    });

    if (deductError) {
      console.error('[WebSearch] Credit deduction failed:', deductError.message);
      // Don't fail the request, just log the error
    } else {
      console.log(`[WebSearch] Deducted ${SEARCH_COST} credits from user ${user.id}`);
    }

    return new Response(
      JSON.stringify({ 
        results, 
        count: results.length,
        credits_used: SEARCH_COST,
        remaining_credits: currentCredits - SEARCH_COST
      }),
      { 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown search error';
    console.error('[WebSearch] Unhandled error:', errorMessage);
    return new Response(
      JSON.stringify({ error: 'Internal server error', details: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
