import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from "https://esm.sh/@supabase/supabase-js@2"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-oc-token, x-user-token',
}

const SEARCH_COST = 100000; // 100k OC-Tokens for testing

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    const ocToken = req.headers.get('x-oc-token')
    const xUserToken = req.headers.get('x-user-token')
    const userToken = xUserToken || ocToken || authHeader?.replace('Bearer ', '')

    if (!userToken) {
      return new Response(JSON.stringify({ 
        error: 'Authorization required',
        details: 'Missing x-oc-token or Authorization header'
      }), { status: 401, headers: corsHeaders })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') || '', 
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
    )
    
    const { data: { user }, error: authError } = await supabase.auth.getUser(userToken)
    if (authError || !user) {
      return new Response(JSON.stringify({ 
        error: 'Unauthorized',
        details: authError?.message || 'Invalid user token'
      }), { status: 401, headers: corsHeaders })
    }

    const { data: settings } = await supabase.from('user_settings').select('credits').eq('user_id', user.id).single();
    const currentCredits = settings?.credits || 0;
    console.log(`User ${user.id} has ${currentCredits} credits. Cost: ${SEARCH_COST}`);

    if (!settings || currentCredits < SEARCH_COST) {
      return new Response(JSON.stringify({ 
        error: 'Insufficient tokens.',
        currentBalance: currentCredits,
        required: SEARCH_COST
      }), { status: 402, headers: corsHeaders });
    }

    const { query, limit = 10 } = await req.json()
    if (!query) throw new Error("Search query is empty");

    const TAVILY_API_KEY = Deno.env.get('TAVILY_API_KEY');
    if (!TAVILY_API_KEY) {
      throw new Error("TAVILY_API_KEY is not set in Supabase project secrets.");
    }
    
    console.log(`Searching Tavily for: ${query}`);

    const response = await fetch('https://api.tavily.com/search', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        api_key: TAVILY_API_KEY,
        query: query,
        search_depth: "basic",
        max_results: limit,
        include_answer: false,
        include_images: false,
        include_raw_content: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Tavily error: ${response.status} ${errorText}`);
    }
    
    const data = await response.json()
    
    // Deduct tokens only on successful search response
    await supabase.rpc('deduct_credits', { user_id_val: user.id, amount_val: SEARCH_COST });

    const results = (data.results || []).map((r: any) => ({
      title: r.title,
      url: r.url,
      content: r.content || "",
      engine: "tavily"
    }))

    return new Response(JSON.stringify({ results, count: results.length }), { 
      headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown search error';
    console.error('Edge Function Error:', errorMessage);
    return new Response(JSON.stringify({ error: errorMessage }), { status: 400, headers: { ...corsHeaders } })
  }
})
