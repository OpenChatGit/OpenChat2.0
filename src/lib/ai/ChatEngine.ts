import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { streamText, tool as createTool } from 'ai';
import { z } from 'zod';
import {
  extractReasoningDetailsFromResponse,
  formatReasoningDetailsForDisplay,
} from './openRouterReasoning';
import {
  isOpenRouterReasoningHeuristic,
  shouldMergeReasoningDetailsFromFinalResponse,
  usesNemotronReasoningApiShape,
} from './openRouterModelHints';
import { ReasoningDetector } from './reasoningAdapter';

export type ChatProvider = 'openai' | 'anthropic' | 'ollama' | 'supabase-premium' | 'openchat-cloud';

export interface ChatConfig {
  provider: ChatProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
  headers?: Record<string, string>;
}

/** Runnable tool contract used with {@link ChatEngine} (Vercel AI SDK `streamText`). */
export interface ChatEngineTool {
  name: string;
  description: string;
  _call(input: string): Promise<string>;
}

export class ChatEngine {
  private config: ChatConfig;

  constructor(config: ChatConfig) {
    this.config = config;
  }

  async chat(messages: any[], tools?: ChatEngineTool[], signal?: AbortSignal) {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
    const modelId = this.config.model;
    
    // Use dynamic reasoning detection
    const reasoningConfig = ReasoningDetector.getReasoningConfig(modelId);
    const nemotronReasoningShape = reasoningConfig.nemotronStyle || false;
    const reasoningHeuristic = reasoningConfig.enabled;

    let baseURL = this.config.baseUrl;
    const isCloudProvider = this.config.provider === 'supabase-premium' || this.config.provider === 'openchat-cloud';

    if (isCloudProvider || !baseURL) {
      if (isCloudProvider) {
        // Single Supabase proxy: model-specific behavior is resolved in `premium-chat` from the model id.
        baseURL = `${supabaseUrl}/functions/v1/premium-chat`;
      } else {
        baseURL = 'https://openrouter.ai/api/v1';
      }
    }

    const isDirectOpenRouter = baseURL.includes('openrouter.ai');
    let isLocalProvider = baseURL.includes('localhost') || baseURL.includes('127.0.0.1');

    // Automatically append /v1 to local providers (Ollama) if missing
    // Ollama's OpenAI-compatible endpoint is at /v1/chat/completions
    if (isLocalProvider && !baseURL.includes('/v1') && !baseURL.includes('/api/')) {
       baseURL = baseURL.replace(/\/$/, '') + '/v1';
       console.log(`[ChatEngine] Adjusted local baseURL to: ${baseURL}`);
    }

    const headers = { ...this.config.headers };
    // Strip our custom Supabase auth headers when calling direct APIs or local providers
    // to prevent CORS preflight failures (Access-Control-Allow-Headers).
    if (isDirectOpenRouter || isLocalProvider) {
      delete headers['X-User-Token'];
      // Only delete Authorization if it's the Supabase one (handled by provider type check)
      if (this.config.provider !== 'openai' && this.config.provider !== 'anthropic') {
        delete headers['Authorization'];
      }
    }

    const openrouter = createOpenRouter({
      apiKey: this.config.apiKey || 'not-needed',
      baseURL: baseURL,
      headers: headers,
    });

    const sdkTools: Record<string, any> = {};
    if (tools && tools.length > 0) {
      tools.forEach(t => {
        sdkTools[t.name] = createTool({
          description: t.description,
          parameters: z.object({ query: z.string().describe('The search query') }),
          execute: async ({ query }: { query: string }) => {
            console.log(`[ChatEngine] Executing tool ${t.name} with query: ${query}`);
            return t._call(query);
          },
        });
      });
    }

    const coreMessages = messages.map((m: any) => {
      const role = typeof m.role === 'string' ? m.role : '';
      let coreRole: 'user' | 'system' | 'assistant' | 'tool' = 'user';
      if (role === 'human' || role === 'user') coreRole = 'user';
      else if (role === 'system') coreRole = 'system';
      else if (role === 'ai' || role === 'assistant') coreRole = 'assistant';
      else if (role === 'tool') coreRole = 'tool';

      const reasoningDetails =
        m.metadata?.reasoningDetails ??
        m.reasoning_details;

      const base: Record<string, unknown> = {
        role: coreRole,
        content: m.content ?? '',
      };

      if (coreRole === 'assistant' && reasoningDetails != null) {
        base.reasoning_details = reasoningDetails;
      }

      return base;
    });

    // Dynamic provider options based on model capabilities
    const openrouterProviderOptions = nemotronReasoningShape
      ? { reasoning: { enabled: true as const } }
      : reasoningHeuristic
      ? {
          includeReasoning: true,
          reasoning: { effort: (reasoningConfig.reasoningEffort || 'high') as const }
        }
      : {};

    const result = await streamText({
      model: openrouter(modelId),
      messages: coreMessages as any,
      tools: sdkTools,
      // @ts-expect-error maxSteps supported by AI SDK streamText multi-step tool use
      maxSteps: tools && tools.length > 0 ? 5 : undefined,
      temperature: this.config.temperature ?? 0.7,
      maxOutputTokens: this.config.maxTokens,
      abortSignal: signal,
      maxRetries: 0, // Disable client-side retries since our Supabase function handles retries
      providerOptions: {
        openrouter: openrouterProviderOptions,
      },
    });

    const mergeReasoningDetailsPostStream = shouldMergeReasoningDetailsFromFinalResponse(modelId);

    async function* streamGenerator() {
      let streamedReasoningNonEmpty = false;
      let accumulatedUsage: any = null;
      let chunkCount = 0;

      for await (const part of result.fullStream) {
        const p = part as any;
        const t = p.type;

        // Log first 5 chunks with full details for debugging Nemotron
        if (chunkCount < 5) {
          console.log(`[ChatEngine] Chunk ${chunkCount} for ${modelId}:`, JSON.stringify(p, null, 2));
          chunkCount++;
        } else if (chunkCount === 5) {
          console.log('[ChatEngine] Stopping detailed chunk logging (first 5 chunks logged)');
          chunkCount++;
        }

        // Handle text content
        if (t === 'text-delta') {
          const text = p.text ?? p.textDelta ?? '';
          yield { type: 'chat', data: { content: text } };
          continue;
        }

        // Handle reasoning content (DeepSeek R1, o1, o3, QwQ, Nemotron, etc.)
        // Vercel AI SDK provides these as separate stream events
        if (t === 'reasoning-delta' || t === 'reasoning') {
          const text = p.text ?? p.textDelta ?? '';
          if (String(text).trim().length > 0) {
            streamedReasoningNonEmpty = true;
            console.log('[ChatEngine] Reasoning delta:', text.substring(0, 100));
          }
          yield { type: 'chat', data: { additional_kwargs: { reasoning: text } } };
          continue;
        }

        // Handle tool calls
        if (t === 'tool-call') {
          const toolCall = {
            id: p.toolCallId ?? `call_${Date.now()}`,
            type: 'function',
            function: {
              name: p.toolName,
              arguments: typeof p.args === 'string' ? p.args : JSON.stringify(p.args)
            }
          };
          yield { type: 'chat', data: { additional_kwargs: { tool_calls: [toolCall] } } };
          continue;
        }

        // Handle tool results
        if (t === 'tool-result') {
          yield { type: 'tool', data: p.result ?? p.output ?? '' };
          continue;
        }

        // Accumulate usage data (including reasoning tokens)
        if (t === 'finish' || t === 'step-finish') {
          if (p.usage || p.totalUsage) {
            accumulatedUsage = p.usage || p.totalUsage;
          }
          continue;
        }

        // Fallback: Try to extract reasoning from any unhandled chunk types
        // This catches edge cases where providers send reasoning in non-standard formats
        const reasoningChunk = ReasoningDetector.extractFromChunk(p);
        if (reasoningChunk) {
          if (reasoningChunk.content.trim().length > 0) {
            streamedReasoningNonEmpty = true;
            console.log('[ChatEngine] Fallback reasoning detected:', reasoningChunk.content.substring(0, 100));
          }
          yield { type: 'chat', data: { additional_kwargs: { reasoning: reasoningChunk.content } } };
          continue;
        }
        
        // Additional fallback: Check if text content contains reasoning markers
        // Some models embed reasoning in the text stream itself
        if (t === 'text-delta' || t === 'content-delta') {
          const text = p.text ?? p.textDelta ?? p.content ?? '';
          if (typeof text === 'string' && text.length > 0) {
            // Check for reasoning markers in content
            if (text.includes('<think>') || text.includes('<reasoning>') || 
                text.includes('<thought>') || text.includes('reasoning:')) {
              console.log('[ChatEngine] Reasoning markers detected in text content');
            }
          }
        }
      }

      // Send final usage data after stream completes
      if (accumulatedUsage) {
        yield { type: 'chat', data: { usage_metadata: accumulatedUsage } };
      }

      // Nemotron: Merge reasoning_details from final response if not streamed
      if (mergeReasoningDetailsPostStream) {
        try {
          console.log('[ChatEngine] Attempting to extract post-stream reasoning_details for Nemotron');
          const response = await result.response;
          console.log('[ChatEngine] Response object keys:', Object.keys(response));
          
          let raw = extractReasoningDetailsFromResponse(response as { messages?: Array<Record<string, unknown>> });
          console.log('[ChatEngine] extractReasoningDetailsFromResponse result:', raw ? 'found' : 'null');
          
          if (raw == null) {
            const pm = (await result.providerMetadata) as Record<string, unknown> | undefined;
            console.log('[ChatEngine] providerMetadata keys:', pm ? Object.keys(pm) : 'null');
            const or = pm?.openrouter as Record<string, unknown> | undefined;
            console.log('[ChatEngine] openrouter metadata keys:', or ? Object.keys(or) : 'null');
            raw = or?.reasoning_details ?? pm?.reasoning_details;
            console.log('[ChatEngine] reasoning_details from metadata:', raw ? 'found' : 'null');
          }
          
          if (raw == null) {
            const rt = await result.reasoningText;
            console.log('[ChatEngine] reasoningText:', rt ? rt.substring(0, 100) : 'null');
            if (rt) raw = [{ type: 'reasoning.text', text: rt }];
          }
          
          if (raw != null) {
            const display = formatReasoningDetailsForDisplay(raw);
            console.log('[ChatEngine] Post-stream reasoning_details formatted, length:', display.length);
            console.log('[ChatEngine] Reasoning preview:', display.substring(0, 200));
            yield {
              type: 'chat',
              data: {
                content: '',
                additional_kwargs: {
                  ...(streamedReasoningNonEmpty ? {} : { reasoning: display }),
                  reasoning_details_raw: raw,
                },
              },
            };
          } else {
            console.log('[ChatEngine] No post-stream reasoning found for Nemotron');
          }
        } catch (e) {
          console.warn('[ChatEngine] OpenRouter reasoning_details merge failed:', e);
        }
      }
    }

    return streamGenerator();
  }
}
