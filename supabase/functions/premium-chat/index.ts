/**
 * Premium Chat Edge Function
 * Universal proxy for OpenRouter with dynamic reasoning support
 * 
 * Features:
 * - Model discovery with pricing
 * - Dynamic reasoning configuration per model
 * - Credit management
 * - Streaming support
 * - Compatible with Vercel AI SDK and OpenRouter SDK
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, content-type, apikey, x-user-token',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
};

/**
 * Pricing Cache (5 minutes TTL)
 */
let modelsCache: { data: any, timestamp: number } | null = null;
const CACHE_TTL = 300000;

/**
 * Fetch with retry logic for handling transient errors and rate limits
 */
async function fetchWithRetry(url: string, options: RequestInit, maxRetries = 5, initialBackoff = 1000): Promise<Response> {
  let lastResponse: Response | null = null;
  const requestId = Math.random().toString(36).substring(7);
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      const resp = await fetch(url, options);
      
      // If success or non-retryable error, return immediately
      if (resp.status !== 429 && resp.status < 500) {
        if (i > 0) console.log(`[PremiumChat][${requestId}] Request succeeded after ${i} retries.`);
        return resp;
      }
      
      lastResponse = resp;
      
      // Handle rate limit (429) specially with Retry-After header if present
      const retryAfter = resp.headers.get('retry-after');
      const delay = retryAfter 
        ? (parseInt(retryAfter) * 1000) 
        : (initialBackoff * Math.pow(2, i) + Math.random() * 500); // Increased jitter
      
      console.warn(`[PremiumChat][${requestId}] Attempt ${i + 1} failed with status ${resp.status}. Retrying in ${Math.round(delay)}ms...`);
      await new Promise(resolve => setTimeout(resolve, delay));
    } catch (e: any) {
      console.error(`[PremiumChat][${requestId}] Attempt ${i + 1} network error:`, e.message);
      if (i === maxRetries - 1) throw e;
      
      const delay = initialBackoff * Math.pow(2, i) + Math.random() * 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  
  console.error(`[PremiumChat][${requestId}] Max retries (${maxRetries}) reached. Returning last status: ${lastResponse?.status}`);
  return lastResponse!;
}

/**
 * Extract user token from headers
 */
function extractUserToken(req: Request): string | null {
  // Try x-user-token first (new standard)
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

/**
 * Remove sensitive fields from request body
 */
function sanitizeRequestBody(obj: Record<string, unknown>): Record<string, unknown> {
  const forbidden = new Set(['api_key', 'apiKey', 'authorization', 'Authorization', 'user']);
  const sanitized: Record<string, unknown> = {};
  
  for (const [key, value] of Object.entries(obj)) {
    if (!forbidden.has(key)) {
      sanitized[key] = value;
    }
  }
  
  return sanitized;
}

/**
 * Detect if model supports reasoning
 */
function isReasoningModel(modelId: string): boolean {
  const m = modelId.toLowerCase();
  return (
    m.includes('nemotron') ||
    m.includes('deepseek-r1') ||
    m.includes('o1-') ||
    m.includes('o3-') ||
    m.includes('thinking') ||
    m.includes('qwq') ||
    m.includes('reasoning')
  );
}

/**
 * Check if model uses Nemotron-style reasoning API
 */
function usesNemotronReasoningShape(modelId: string): boolean {
  return modelId.toLowerCase().includes('nemotron');
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const path = url.pathname.replace(/\/functions\/v1\/premium-chat/, '');

  const OPENROUTER_API_KEY = Deno.env.get('OPENROUTER_API_KEY');
  if (!OPENROUTER_API_KEY) {
    return new Response(JSON.stringify({ error: 'Server configuration error' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }

  // ==========================================
  // GET /models - Model Discovery
  // ==========================================
  if (req.method === 'GET' || path === '/models') {
    try {
      const now = Date.now();
      let finalModels;

      // Check cache
      if (modelsCache && (now - modelsCache.timestamp) < CACHE_TTL) {
        finalModels = modelsCache.data;
      } else {
        // Fetch from OpenRouter with retry
        const resp = await fetchWithRetry("https://openrouter.ai/api/v1/models", {
          headers: { 'Authorization': `Bearer ${OPENROUTER_API_KEY}` }
        });
        
        if (!resp.ok) {
          throw new Error(`OpenRouter API error: ${resp.status}`);
        }
        
        const json = await resp.json();
        const allModels = json.data;

        // Curated model list
        const ALLOWED_MODELS = [
          { id: 'qwen/qwen3.6-plus:free', name: 'Qwen 3.6 Plus (free)' },
          { id: 'deepseek/deepseek-v3.2', name: 'DeepSeek V3.2' },
          { id: 'deepseek/deepseek-r1', name: 'DeepSeek R1 (Reasoning)' },
          { id: 'anthropic/claude-opus-4.6', name: 'Claude Opus 4.6' },
          { id: 'anthropic/claude-sonnet-4.6', name: 'Claude Sonnet 4.6' },
          { id: 'minimax/minimax-m2.7', name: 'MiniMax M2.7' },
          { id: 'google/gemini-3-flash-preview', name: 'Gemini 3 Flash Preview' },
          { id: 'google/gemini-3.1-pro-preview', name: 'Gemini 3.1 Pro Preview' },
          { id: 'stepfun/step-3.5-flash', name: 'Step 3.5 Flash' },
          { id: 'nvidia/nemotron-3-super-120b-a12b:free', name: 'Nemotron 3 Super (free)' },
          { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
          { id: 'openai/o1-mini', name: 'OpenAI o1-mini (Reasoning)' },
          { id: 'qwen/qwq-32b-preview', name: 'QwQ 32B (Reasoning)' }
        ];

        // Enrich models with pricing
        const enriched = await Promise.all(ALLOWED_MODELS.map(async (rule) => {
          const found = allModels.find((m: any) => m.id === rule.id);
          if (!found) return null;

          const price = parseFloat(found.pricing?.prompt || "0");
          const ctx = found.context_length || 0;
          const isFree = found.id.endsWith(':free') && price === 0;

          return {
            id: found.id,
            name: rule.name,
            provider: 'supabase-premium',
            size: ctx >= 200000 ? 'Universal' : (ctx >= 128000 ? 'Vast' : (price > 0.00001 ? 'Extreme' : 'Standard')),
            pricing: {
              ...found.pricing,
              is_free: isFree
            },
            description: found.description,
            context_length: ctx,
            architecture: found.architecture,
            supported_parameters: found.supported_parameters,
            top_provider: found.top_provider,
            capabilities: {
              vision: found.architecture?.modality?.includes('image') || found.id.includes('vision') || found.id.includes('-4o'),
              reasoning: isReasoningModel(found.id)
            }
          };
        }));

        finalModels = enriched.filter(Boolean);
        modelsCache = { data: finalModels, timestamp: now };
      }

      return new Response(
        JSON.stringify(finalModels),
        {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        }
      );
    } catch (e: any) {
      console.error('[PremiumChat] Model discovery error:', e.message);
      return new Response(
        JSON.stringify({ error: 'Failed to fetch models', details: e.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  // ==========================================
  // POST / - Chat Completions
  // ==========================================
  if (req.method === 'POST') {
    try {
      // Extract and validate user token
      const userToken = extractUserToken(req);
      if (!userToken) {
        return new Response(
          JSON.stringify({ error: 'Authorization required' }),
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
        console.error('[PremiumChat] Auth error:', authError?.message);
        return new Response(
          JSON.stringify({ error: 'Unauthorized', details: authError?.message }),
          { status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Parse request body - support both direct format and wrapped chatRequest
      const raw = await req.json();
      const requestData = raw.chatRequest ?? raw;
      const base = sanitizeRequestBody(requestData as Record<string, unknown>);

      const model = base.model as string | undefined;
      const messages = base.messages;

      if (!model || !messages) {
        return new Response(
          JSON.stringify({ error: 'Missing model or messages' }),
          { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      const temperature = base.temperature as number | undefined;
      const max_tokens = base.max_tokens as number | undefined;
      const isStreaming = !!base.stream;
      const stream_options = base.stream_options as Record<string, unknown> | undefined;

      // Remove already extracted fields
      const { model: _m, messages: _msg, temperature: _t, max_tokens: _mt, stream: _s, stream_options: _so, ...rest } = base;

      // Dynamic reasoning configuration
      const isNemotron = usesNemotronReasoningShape(model);
      const needsReasoning = isReasoningModel(model);

      // Build OpenRouter request body
      const openRouterBody = isNemotron
        ? {
            ...rest,
            model,
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 4096,
            stream: isStreaming,
            reasoning: { enabled: true },
            stream_options: { ...(stream_options || {}), include_usage: true },
          }
        : {
            ...rest,
            model,
            messages,
            temperature: temperature ?? 0.7,
            max_tokens: max_tokens ?? 4096,
            stream: isStreaming,
            ...(needsReasoning ? { 
              include_reasoning: true,
              reasoning: { effort: 'high' }
            } : {}),
            stream_options: { ...(stream_options || {}), include_usage: true },
          };

      console.log(`[PremiumChat] User: ${user.id}, Model: ${model}, Streaming: ${isStreaming}, Reasoning: ${needsReasoning}`);

      // Forward to OpenRouter with retry
      const openRouterResponse = await fetchWithRetry('https://openrouter.ai/api/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${OPENROUTER_API_KEY}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://openchat.ai',
          'X-Title': 'OpenChat 2.0'
        },
        body: JSON.stringify(openRouterBody),
      });

      if (!openRouterResponse.ok) {
        const errorText = await openRouterResponse.text();
        console.error('[PremiumChat] OpenRouter error:', errorText);
        return new Response(
          JSON.stringify({ error: 'OpenRouter API error', details: errorText }),
          { status: openRouterResponse.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      // Non-streaming response
      if (!isStreaming) {
        const data = await openRouterResponse.json();
        return new Response(JSON.stringify(data), {
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      // Streaming response - log first few chunks for debugging, then pass through
      const reader = openRouterResponse.body?.getReader();
      if (!reader) {
        return new Response(JSON.stringify({ error: 'No response body' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
      }

      const stream = new ReadableStream({
        async start(controller) {
          const decoder = new TextDecoder();
          let chunkCount = 0;
          
          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              // Log first 3 chunks for debugging Nemotron
              if (chunkCount < 3) {
                const text = decoder.decode(value, { stream: true });
                console.log(`[PremiumChat] Stream chunk ${chunkCount} for ${model}:`, text.substring(0, 200));
                chunkCount++;
              }
              
              controller.enqueue(value);
            }
            controller.close();
          } catch (error) {
            console.error('[PremiumChat] Stream error:', error);
            controller.error(error);
          }
        }
      });

      return new Response(stream, {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive'
        }
      });

    } catch (e: any) {
      console.error('[PremiumChat] Unhandled error:', e.message);
      return new Response(
        JSON.stringify({ error: 'Internal server error', details: e.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  }

  return new Response(
    JSON.stringify({ error: 'Method Not Allowed' }),
    { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
  );
});
