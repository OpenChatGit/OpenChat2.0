/**
 * Universal Reasoning Adapter
 * Handles reasoning/thinking content from multiple providers and model formats
 * 
 * Supported formats:
 * - OpenRouter: reasoning_details, reasoning_content, includeReasoning
 * - DeepSeek R1: <think> tags in content
 * - OpenAI o1/o3: reasoning_content field
 * - Anthropic Claude: thinking blocks
 * - Nemotron: reasoning with enabled flag
 * - QwQ: thought process in content
 * - Custom models: various thinking/thought fields
 */

export interface ReasoningChunk {
  content: string;
  type: 'reasoning' | 'thinking' | 'thought' | 'planning';
  source: 'stream' | 'metadata' | 'content' | 'post-stream';
  modelHint?: string;
}

export interface ReasoningMetadata {
  hasReasoning: boolean;
  reasoningTokens?: number;
  reasoningDetails?: unknown;
  format: 'openrouter' | 'openai' | 'anthropic' | 'embedded' | 'custom' | 'none';
}

/**
 * Detects reasoning content from various chunk formats
 */
export class ReasoningDetector {
  /**
   * Extract reasoning from a stream chunk (Vercel AI SDK format)
   */
  static extractFromChunk(chunk: any): ReasoningChunk | null {
    // Log chunk structure for debugging
    console.log('[ReasoningDetector] Inspecting chunk:', {
      type: chunk.type,
      hasReasoning: !!chunk.reasoning,
      hasReasoningContent: !!chunk.reasoning_content,
      hasThinking: !!chunk.thinking,
      hasAdditionalKwargs: !!chunk.additional_kwargs,
      additionalKwargsKeys: chunk.additional_kwargs ? Object.keys(chunk.additional_kwargs) : [],
      hasDelta: !!chunk.delta,
      deltaKeys: chunk.delta ? Object.keys(chunk.delta) : []
    });

    // 1. Direct reasoning fields (OpenRouter, OpenAI o1/o3)
    const directReasoning = 
      chunk.reasoning ||
      chunk.reasoning_content ||
      chunk.thinking ||
      chunk.thought;

    if (directReasoning && typeof directReasoning === 'string' && directReasoning.trim()) {
      console.log('[ReasoningDetector] Direct reasoning found:', directReasoning.substring(0, 50));
      return {
        content: directReasoning,
        type: 'reasoning',
        source: 'stream',
        modelHint: this.detectModelType(chunk)
      };
    }

    // 2. Additional kwargs (LangChain-style, legacy)
    const kwargs = chunk.additional_kwargs;
    if (kwargs) {
      const kwargReasoning =
        kwargs.reasoning ||
        kwargs.reasoning_content ||
        kwargs.thinking ||
        kwargs.thought;

      if (kwargReasoning && typeof kwargReasoning === 'string' && kwargReasoning.trim()) {
        console.log('[ReasoningDetector] Kwargs reasoning found:', kwargReasoning.substring(0, 50));
        return {
          content: kwargReasoning,
          type: 'reasoning',
          source: 'metadata',
          modelHint: this.detectModelType(chunk)
        };
      }
    }

    // 3. Delta field (streaming format)
    const delta = chunk.delta;
    if (delta) {
      const deltaReasoning =
        delta.reasoning ||
        delta.reasoning_content ||
        delta.thinking ||
        delta.thought;

      if (deltaReasoning && typeof deltaReasoning === 'string' && deltaReasoning.trim()) {
        console.log('[ReasoningDetector] Delta reasoning found:', deltaReasoning.substring(0, 50));
        return {
          content: deltaReasoning,
          type: 'reasoning',
          source: 'stream',
          modelHint: this.detectModelType(chunk)
        };
      }
    }

    // 4. Embedded in content (DeepSeek R1, QwQ style)
    const content = chunk.content;
    if (content && typeof content === 'string') {
      // Check for <think> tags
      const thinkMatch = content.match(/<think>([\s\S]*?)(?:<\/think>|$)/i);
      if (thinkMatch) {
        console.log('[ReasoningDetector] <think> tag found in content');
        return {
          content: thinkMatch[1],
          type: 'thinking',
          source: 'content',
          modelHint: 'deepseek-r1'
        };
      }

      // Check for <thought> tags
      const thoughtMatch = content.match(/<thought>([\s\S]*?)(?:<\/thought>|$)/i);
      if (thoughtMatch) {
        console.log('[ReasoningDetector] <thought> tag found in content');
        return {
          content: thoughtMatch[1],
          type: 'thought',
          source: 'content',
          modelHint: 'qwq'
        };
      }

      // Check for <reasoning> tags
      const reasoningMatch = content.match(/<reasoning>([\s\S]*?)(?:<\/reasoning>|$)/i);
      if (reasoningMatch) {
        console.log('[ReasoningDetector] <reasoning> tag found in content');
        return {
          content: reasoningMatch[1],
          type: 'reasoning',
          source: 'content',
          modelHint: 'custom'
        };
      }

      // 5. Pattern-based detection for non-tag reasoning (e.g. "Thinking Process:", "Analyze the Request:")
      // This is common for some models (e.g. Qwen, Claude outputs) when they don't use special tokens
      const patterns = [
        /^Thinking Process:[\s\S]*/i,
        /^Thought Process:[\s\S]*/i,
        /^Analyze the Request:[\s\S]*/i,
        /^1\. Analyze the Request:[\s\S]*/i,
        /^### Thinking Process:[\s\S]*/i
      ];

      for (const pattern of patterns) {
        if (pattern.test(content.trim())) {
          console.log('[ReasoningDetector] Pattern-based reasoning found in content');
          return {
            content: content,
            type: 'thinking',
            source: 'content',
            modelHint: 'pattern-match'
          };
        }
      }
    }

    return null;
  }

  /**
   * Extract reasoning from post-stream metadata (Nemotron, OpenRouter)
   */
  static extractFromMetadata(metadata: any): ReasoningChunk | null {
    if (!metadata) return null;

    // OpenRouter reasoning_details
    const reasoningDetails = metadata.reasoning_details || metadata.reasoningDetails;
    if (reasoningDetails) {
      const formatted = this.formatReasoningDetails(reasoningDetails);
      if (formatted) {
        return {
          content: formatted,
          type: 'reasoning',
          source: 'post-stream',
          modelHint: 'openrouter-nemotron'
        };
      }
    }

    // OpenAI o1/o3 style
    const reasoningContent = metadata.reasoning_content || metadata.reasoningContent;
    if (reasoningContent && typeof reasoningContent === 'string') {
      return {
        content: reasoningContent,
        type: 'reasoning',
        source: 'post-stream',
        modelHint: 'openai-o1'
      };
    }

    return null;
  }

  /**
   * Format OpenRouter reasoning_details array
   */
  private static formatReasoningDetails(details: unknown): string | null {
    if (!details) return null;
    
    if (typeof details === 'string') return details;
    
    if (Array.isArray(details)) {
      const parts: string[] = [];
      for (const item of details) {
        if (!item || typeof item !== 'object') continue;
        
        const d = item as Record<string, unknown>;
        const type = d.type;
        
        if (type === 'reasoning.text' && typeof d.text === 'string') {
          parts.push(d.text);
        } else if (type === 'reasoning.summary' && typeof d.summary === 'string') {
          parts.push(d.summary);
        } else if (typeof d.text === 'string') {
          parts.push(d.text);
        }
      }
      return parts.filter(Boolean).join('\n\n');
    }
    
    if (typeof details === 'object' && details !== null) {
      const obj = details as Record<string, unknown>;
      if (typeof obj.text === 'string') return obj.text;
      if (typeof obj.content === 'string') return obj.content;
    }
    
    return null;
  }

  /**
   * Detect model type from chunk metadata
   */
  private static detectModelType(chunk: any): string {
    const model = chunk.model || chunk.metadata?.model || '';
    const modelLower = model.toLowerCase();

    if (modelLower.includes('deepseek-r1')) return 'deepseek-r1';
    if (modelLower.includes('o1-') || modelLower.includes('o3-')) return 'openai-o1';
    if (modelLower.includes('nemotron')) return 'nemotron';
    if (modelLower.includes('qwq')) return 'qwq';
    if (modelLower.includes('claude')) return 'anthropic';
    
    return 'unknown';
  }

  /**
   * Check if a model is known to support reasoning
   */
  static isReasoningModel(modelId: string): boolean {
    const m = modelId.toLowerCase();
    return (
      m.includes('deepseek-r1') ||
      m.includes('o1-') ||
      m.includes('o3-') ||
      m.includes('nemotron') ||
      m.includes('qwq') ||
      m.includes('thinking') ||
      m.includes('reasoning')
    );
  }

  /**
   * Get provider-specific reasoning configuration
   */
  static getReasoningConfig(modelId: string): {
    enabled: boolean;
    includeReasoning?: boolean;
    reasoningEffort?: 'low' | 'medium' | 'high';
    nemotronStyle?: boolean;
  } {
    const m = modelId.toLowerCase();

    // Nemotron: special API shape
    if (m.includes('nemotron')) {
      return {
        enabled: true,
        nemotronStyle: true
      };
    }

    // DeepSeek R1, o1, o3, QwQ: include reasoning
    if (m.includes('deepseek-r1') || m.includes('o1-') || m.includes('o3-') || m.includes('qwq')) {
      return {
        enabled: true,
        includeReasoning: true,
        reasoningEffort: 'high'
      };
    }

    // Generic reasoning models
    if (m.includes('thinking') || m.includes('reasoning')) {
      return {
        enabled: true,
        includeReasoning: true,
        reasoningEffort: 'medium'
      };
    }

    return { enabled: false };
  }
}

/**
 * Manages reasoning content accumulation during streaming
 */
export class ReasoningAccumulator {
  private reasoningBuffer: string = '';
  private isInReasoningMode: boolean = false;
  private reasoningMetadata: ReasoningMetadata = {
    hasReasoning: false,
    format: 'none'
  };

  /**
   * Process a reasoning chunk and update internal state
   */
  processChunk(chunk: ReasoningChunk | null): {
    shouldOpenTag: boolean;
    shouldCloseTag: boolean;
    content: string;
  } {
    if (!chunk) {
      return {
        shouldOpenTag: false,
        shouldCloseTag: false,
        content: ''
      };
    }

    this.reasoningMetadata.hasReasoning = true;
    this.reasoningMetadata.format = this.detectFormat(chunk);

    const shouldOpenTag = !this.isInReasoningMode;
    this.isInReasoningMode = true;
    this.reasoningBuffer += chunk.content;

    return {
      shouldOpenTag,
      shouldCloseTag: false,
      content: chunk.content
    };
  }

  /**
   * Signal that reasoning mode should end
   */
  endReasoning(): { shouldCloseTag: boolean } {
    const shouldCloseTag = this.isInReasoningMode;
    this.isInReasoningMode = false;
    return { shouldCloseTag };
  }

  /**
   * Check if currently in reasoning mode
   */
  isReasoning(): boolean {
    return this.isInReasoningMode;
  }

  /**
   * Get accumulated reasoning content
   */
  getReasoningContent(): string {
    return this.reasoningBuffer;
  }

  /**
   * Get reasoning metadata
   */
  getMetadata(): ReasoningMetadata {
    return { ...this.reasoningMetadata };
  }

  /**
   * Reset accumulator state
   */
  reset(): void {
    this.reasoningBuffer = '';
    this.isInReasoningMode = false;
    this.reasoningMetadata = {
      hasReasoning: false,
      format: 'none'
    };
  }

  /**
   * Detect reasoning format from chunk
   */
  private detectFormat(chunk: ReasoningChunk): ReasoningMetadata['format'] {
    if (chunk.modelHint?.includes('openrouter') || chunk.modelHint?.includes('nemotron')) {
      return 'openrouter';
    }
    if (chunk.modelHint?.includes('openai') || chunk.modelHint?.includes('o1')) {
      return 'openai';
    }
    if (chunk.modelHint?.includes('anthropic') || chunk.modelHint?.includes('claude')) {
      return 'anthropic';
    }
    if (chunk.source === 'content') {
      return 'embedded';
    }
    return 'custom';
  }
}

/**
 * Utility to wrap reasoning content in appropriate tags
 */
export class ReasoningFormatter {
  /**
   * Wrap reasoning content in tags (always use <think> for consistency)
   */
  static wrapReasoning(content: string, _format?: ReasoningMetadata['format']): string {
    // Use <think> tags for all formats for consistency in UI
    return `<think>${content}</think>`;
  }

  /**
   * Extract reasoning from wrapped content
   */
  static unwrapReasoning(content: string): string | null {
    const patterns = [
      /<think>([\s\S]*?)<\/think>/i,
      /<thought>([\s\S]*?)<\/thought>/i,
      /<reasoning>([\s\S]*?)<\/reasoning>/i,
      /<redacted_thinking>([\s\S]*?)<\/redacted_thinking>/i
    ];

    for (const pattern of patterns) {
      const match = content.match(pattern);
      if (match) return match[1];
    }

    return null;
  }

  /**
   * Check if content contains reasoning tags
   */
  static hasReasoningTags(content: string): boolean {
    return (
      content.includes('<think>') ||
      content.includes('<thought>') ||
      content.includes('<reasoning>') ||
      content.includes('<redacted_thinking>')
    );
  }

  /**
   * Remove duplicate reasoning if it appears in both thinking and answer
   */
  static deduplicateReasoning(content: string): string {
    // Match any reasoning tag format
    const thinkMatch = content.match(/<(think|thought|reasoning|redacted_thinking)>([\s\S]*?)<\/\1>(\s*)([\s\S]*)$/i);
    if (!thinkMatch) return content;

    const tagName = thinkMatch[1];
    const thinkingContent = thinkMatch[2].trim();
    const whitespace = thinkMatch[3];
    const answerContent = thinkMatch[4].trim();

    // If there's no answer content, keep the thinking block as-is
    if (!answerContent || answerContent.length === 0) {
      console.log('[ReasoningFormatter] No answer content, keeping thinking block only');
      return `<${tagName}>${thinkingContent}</${tagName}>`;
    }

    // If there's no thinking content, just return the answer
    if (!thinkingContent || thinkingContent.length === 0) {
      console.log('[ReasoningFormatter] No thinking content, keeping answer only');
      return answerContent;
    }

    // Normalize whitespace for comparison
    const normalize = (s: string) => s.replace(/\s+/g, ' ').trim();
    
    const normalizedThinking = normalize(thinkingContent);
    const normalizedAnswer = normalize(answerContent);
    
    // Check if answer is exact duplicate of thinking - remove the duplicate answer
    if (normalizedThinking === normalizedAnswer) {
      console.log('[ReasoningFormatter] Exact duplicate detected, removing duplicate answer text');
      // Keep only the thinking block, the answer is redundant
      return `<${tagName}>${thinkingContent}</${tagName}>`;
    }
    
    // Check if answer starts with thinking content (partial duplicate)
    if (normalizedAnswer.startsWith(normalizedThinking)) {
      console.log('[ReasoningFormatter] Partial duplicate detected, removing duplicate prefix from answer');
      // Find where the duplicate ends in the original (non-normalized) answer
      // This is tricky because we need to preserve formatting
      const thinkingWords = thinkingContent.split(/\s+/);
      const answerWords = answerContent.split(/\s+/);
      
      // Skip the duplicate words
      const uniqueWords = answerWords.slice(thinkingWords.length);
      const uniqueAnswer = uniqueWords.join(' ').trim();
      
      if (uniqueAnswer.length > 0) {
        return `<${tagName}>${thinkingContent}</${tagName}>\n\n${uniqueAnswer}`;
      } else {
        // If removing the prefix leaves nothing, keep only thinking
        return `<${tagName}>${thinkingContent}</${tagName}>`;
      }
    }

    // No duplication, keep both
    return content;
  }
}
