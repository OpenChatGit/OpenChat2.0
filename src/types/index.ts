// Core types for the modular provider system

export type ProviderType = 'ollama' | 'supabase-premium';

export interface ImageAttachment {
  id: string;
  data: string; // Base64 encoded image data
  mimeType: string; // e.g., 'image/jpeg', 'image/png'
  fileName: string;
  size: number; // File size in bytes
  width?: number;
  height?: number;
  url?: string; // Optional: For displaying the image
}

export interface TokenUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  tokensPerSecond?: number; // Speed of token generation
  streamDuration?: number; // Duration of streaming in milliseconds
}

export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system' | 'tool';
  content: string;
  timestamp: number;
  toolCalls?: any[]; // Keep as any for now to avoid circular deps or use imports
  toolCallId?: string; // For tool response messages
  images?: ImageAttachment[]; // Array of attached images
  isReasoning?: boolean; // Flag to indicate if this is a reasoning model response
  isHidden?: boolean; // Hide from UI (tool results, etc.)
  status?: 'thinking' | 'searching' | 'processing' | 'generating' | 'cancelled' | 'completed'; // Status indicator
  isStreaming?: boolean; // Track if message is actively streaming
  metadata?: {
    model?: string;
    provider?: string;
    tokensUsed?: number;
    tokenUsage?: TokenUsage;
    renderTime?: number; // Track rendering performance
    autoSearch?: {
      triggered: boolean;
      query: string;
      sources: Array<{
        url: string;
        title: string;
        domain: string;
        publishedDate?: Date;
      }>;
      chunkCount: number;
      searchTime: number;
    };
    citations?: {
      sourceIds: number[];      // Array of source IDs that are cited in this message
      citationCount: number;    // Total number of citations in this message
    };
  };
}

export interface ChatSession {
  id: string;
  title: string;
  messages: Message[];
  provider: ProviderType;
  model: string;
  createdAt: number;
  updatedAt: number;
}


export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  size?: 'Standard' | 'Vast' | 'Extreme' | 'Universal';
  pricing?: {
    prompt: string;
    completion: string;
    [key: string]: any;
  };
  capabilities?: {
    vision: boolean;
    reasoning: boolean;
    [key: string]: any;
  };
  description?: string;
  context_length?: number;
  architecture?: any;
  supported_parameters?: string[];
  top_provider?: any;
}

export interface StreamChunk {
  content: string;
  done: boolean;
}

export interface ProviderConfig {
  type: ProviderType;
  name: string;
  baseUrl: string;
  enabled: boolean;
  apiKey?: string;
  hiddenModels?: string[];
}

export interface ChatCompletionRequest {
  model: string;
  messages: Array<{
    role: 'system' | 'user' | 'assistant' | 'tool';
    content: string;
    tool_call_id?: string;
    tool_calls?: any[];
    images?: any[]; // Allow images in the request
  }>;
  stream?: boolean;
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  tools?: Array<{
    type: 'function';
    function: {
      name: string;
      description: string;
      parameters: any;
    };
  }>;
}

export interface ChatCompletionResponse {
  id?: string;
  object?: string;
  created?: number;
  model: string;
  choices: Array<{
    index: number;
    message: {
      role: string;
      content: string | null;
      tool_calls?: any[];
      reasoning_content?: string;
    };
    finish_reason?: string;
  }>;
}

export interface StreamResponse {
  id?: string;
  object?: string;
  created?: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: string;
      content?: string | null;
      tool_calls?: any[];
      reasoning_content?: string;
    };
    finish_reason?: string | null;
  }>;
}
