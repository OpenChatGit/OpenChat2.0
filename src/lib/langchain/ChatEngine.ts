import { ChatOpenAI } from "@langchain/openai";
import { ChatOllama } from "@langchain/ollama";
import { HumanMessage, SystemMessage, AIMessage, ToolMessage } from "@langchain/core/messages";
import { createReactAgent } from "@langchain/langgraph/prebuilt";

export type LangChainProvider = 'openai' | 'anthropic' | 'ollama' | 'supabase-premium';

export interface ChatConfig {
  provider: LangChainProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  streaming?: boolean;
  maxTokens?: number;
  headers?: Record<string, string>;
}

export class ChatEngine {
  private model: any;

  constructor(config: ChatConfig) {
    this.model = this.createModel(config);
  }

  private createModel(config: ChatConfig) {
    const ollamaBase = (config.baseUrl || "http://localhost:11434").replace(/\/$/, "");
    
    switch (config.provider) {
      case 'ollama':
        return new ChatOllama({
          model: config.model,
          temperature: config.temperature ?? 0.7,
          baseUrl: ollamaBase,
        });
      case 'openai':
        return new ChatOpenAI({
          modelName: config.model,
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 4096,
          apiKey: config.apiKey,
          configuration: { 
            baseURL: config.baseUrl,
            headers: config.headers,
            dangerouslyAllowBrowser: true 
          },
          streaming: true,
        });
      case 'supabase-premium':
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || "";
        return new ChatOpenAI({
          modelName: config.model,
          temperature: config.temperature ?? 0.7,
          maxTokens: config.maxTokens ?? 4096,
          apiKey: config.apiKey || 'sk-or-v1-dummy-key-for-langchain',
          configuration: {
             baseURL: config.baseUrl || `${supabaseUrl}/functions/v1/premium-chat`,
             headers: config.headers,
             dangerouslyAllowBrowser: true
          }
        });
      default:
        throw new Error(`Unsupported provider: ${config.provider}`);
    }
  }

  async chat(messages: { role: string, content: string, tool_calls?: any[], tool_call_id?: string }[], tools?: any[], signal?: AbortSignal) {
    // Convert to LangChain messages
    const langChainMessages = messages.map(msg => {
      if (msg.role === 'system') return new SystemMessage(msg.content);
      if (msg.role === 'assistant') {
        return new AIMessage({
          content: msg.content,
          tool_calls: msg.tool_calls,
        });
      }
      if (msg.role === 'tool') {
        return new ToolMessage({
          content: msg.content,
          tool_call_id: msg.tool_call_id!,
        });
      }
      return new HumanMessage(msg.content);
    });

    if (!tools || tools.length === 0) {
      return this.model.stream(langChainMessages, { signal });
    }

    // Modern LangChain Agent pattern
    const agent = createReactAgent({
      llm: this.model,
      tools: tools,
    });

    // We yield chunks that look like LangChain AIMessageChunks for compatibility
    async function* eventStreamer() {
      const eventStream = agent.streamEvents(
        { messages: langChainMessages },
        { version: "v2", signal }
      );

      for await (const event of eventStream) {
        const eventType = event.event;
        
        // Yield chunks for the chat model
        if (eventType === "on_chat_model_stream") {
          const chunk = event.data.chunk;
          yield { type: 'chat', data: chunk };
        }
        
        // Yield tool execution results to update SourceRegistry on the frontend
        if (eventType === "on_tool_end") {
          yield { type: 'tool', data: event.data.output };
        }
      }
    }

    return eventStreamer();
  }
}
