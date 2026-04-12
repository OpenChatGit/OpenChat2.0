import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { OpenRouter } from "npm:@openrouter/sdk";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': '*',
};

// Pricing Cache (valid for 5 minutes)
let modelsCache: { data: any, timestamp: number } | null = null;
const CACHE_TTL = 300000;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/functions\/v1\/premium-chat/, '');

  const OPENROUTER_API_KEY = (globalThis as any).Deno.env.get('OPENROUTER_API_KEY');

  // 1. Models Discovery: Curated with exact IDs to ensure pricing accuracy
  if (req.method === 'GET' || path === '/models') {
    try {
      const now = Date.now();
      let finalCuratedModels;

      if (modelsCache && (now - modelsCache.timestamp) < CACHE_TTL) {
        finalCuratedModels = modelsCache.data;
      } else {
        const resp = await fetch("https://openrouter.ai/api/v1/models");
        const json = await resp.json();
        const allModels = json.data;

        const ALLOWED_MODELS = [
          { id: 'qwen/qwen3.6-plus:free', name: 'Qwen 3.6 Plus (free)' },
          { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2' },
          { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
          { id: 'minimax/minimax-m2.7', name: 'MiniMax M2.7' },
          { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
          { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
          { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
          { id: 'stepfun/step-3.5-flash', name: 'Step 3.5 Flash' },
          { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super (free)' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' }
        ];

        // Enrichment helper inside the refresh cycle
        const enrichModel = async (model: any) => {
          try {
            // SPECIAL CASE: If it's a :free model and base price is 0, keep it 0
            if (model.id.endsWith(':free') && (parseFloat(model.pricing?.prompt || "0") === 0)) {
              return {
                ...model.pricing,
                is_average: false,
                is_free: true
              };
            }

            const slug = model.canonical_slug || model.id;
            const epResp = await fetch(`https://openrouter.ai/api/v1/models/${slug}/endpoints`, {
              headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
            });
            if (!epResp.ok) return model.pricing;
            const { data } = await epResp.json();
            const endpoints = data?.endpoints || [];
            if (endpoints.length === 0) return model.pricing;

            const totalInput = endpoints.reduce((s: number, e: any) => s + parseFloat(e.pricing?.prompt || "0"), 0);
            const totalOutput = endpoints.reduce((s: number, e: any) => s + parseFloat(e.pricing?.completion || "0"), 0);
            
            const avgInput = totalInput / endpoints.length;
            const avgOutput = totalOutput / endpoints.length;

            return {
              ...model.pricing,
              prompt: avgInput.toString(),
              completion: avgOutput.toString(),
              is_average: true
            };
          } catch { return model.pricing; }
        };

        const enriched = await Promise.all(ALLOWED_MODELS.map(async (rule) => {
          const found = allModels.find((m: any) => m.id === rule.id);
          if (!found) return null;
          const pricing = await enrichModel(found);
          const price = parseFloat(pricing.prompt || "0");
          const ctx = found.context_length || 0;
          return {
            id: found.id,
            name: rule.name,
            provider: found.id.split('/')[0],
            size: ctx >= 200000 ? 'Universal' : (ctx >= 128000 ? 'Vast' : (price > 0.00001 ? 'Extreme' : 'Standard')),
            pricing,
            description: found.description,
            context_length: ctx,
            architecture: found.architecture,
            supported_parameters: found.supported_parameters,
            top_provider: found.top_provider,
            capabilities: {
              vision: found.architecture?.modality?.includes('image') || found.id.includes('vision') || found.id.includes('-4o'),
              reasoning: ctx > 64000 || found.id.includes('o1') || found.id.includes('opus') || found.id.includes('r1')
            }
          };
        }));

        finalCuratedModels = enriched.filter(Boolean);
        modelsCache = { data: finalCuratedModels, timestamp: now };
      }

      return new Response(JSON.stringify(path === '/models' ? { data: finalCuratedModels } : finalCuratedModels), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 500, headers: corsHeaders });
    }
  }

  // 2. Chat Completions
  if (req.method === 'POST') {
    try {
      const userToken = req.headers.get('x-user-token');
      if (!userToken) throw new Error('Authorization required');

      const supabase = createClient(
        (globalThis as any).Deno.env.get('SUPABASE_URL') || '',
        (globalThis as any).Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || ''
      );

      const { data: { user }, error: authError } = await supabase.auth.getUser(userToken);
      if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders });

      const { data: settings } = await supabase.from('user_settings').select('credits').eq('user_id', user.id).single();
      if (!settings || (settings.credits || 0) < 5) return new Response(JSON.stringify({ error: 'Insufficient credits.' }), { status: 402, headers: corsHeaders });

      const body = await req.json();
      const requestData = body.chatRequest || body;
      const { model, messages, temperature, max_tokens, stream: isStreaming } = requestData;

      const openrouter = new OpenRouter({ apiKey: OPENROUTER_API_KEY });
      const completion = await (openrouter as any).chat.send({
        chatRequest: {
          model,
          messages,
          temperature: temperature ?? 0.7,
          max_tokens: max_tokens ?? 4096,
          stream: !!isStreaming,
        }
      });

      if (!isStreaming) {
        return new Response(JSON.stringify(completion), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { readable, writable } = new TransformStream();
      const writer = writable.getWriter();
      const encoder = new TextEncoder();

      (async () => {
        try {
          for await (const chunk of completion as any) {
            await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
          }
          await writer.write(encoder.encode('data: [DONE]\n\n'));
          await (supabase as any).rpc('deduct_credits', { user_id_val: user.id, amount_val: 1 });
        } catch (e) {
          console.error("Stream error", e);
        } finally {
          await writer.close();
        }
      })();

      return new Response(readable, { headers: { ...corsHeaders, 'Content-Type': 'text/event-stream' } });
    } catch (e: any) {
      return new Response(JSON.stringify({ error: e.message }), { status: 400, headers: corsHeaders });
    }
  }

  return new Response(JSON.stringify({ error: 'Method Not Allowed' }), { status: 405, headers: corsHeaders });
});
