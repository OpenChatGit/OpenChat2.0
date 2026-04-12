import { ProviderType } from '../types';

export interface TokenCount {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export class Tokenizer {

  /**
   * Count tokens for a given text and model
   */
  static countTokens(text: string, model: string, provider: ProviderType): number {
    if (!text) return 0;

    try {
      switch (provider) {
        case 'ollama':
          return this.countOllamaTokens(text, model);
        default:
          return this.fallbackEstimation(text);
      }
    } catch (error) {
      console.warn(`Token counting failed for ${provider}/${model}, using fallback:`, error);
      return this.fallbackEstimation(text);
    }
  }





  private static countOllamaTokens(text: string, _model: string): number {
    // tiktoken is not easily usable in browser without wasm setup
    // Use fallback estimation which is safe and efficient
    return this.fallbackEstimation(text);
  }

  /**
   * Fallback character-based estimation when libraries fail
   * Rough estimate: 1 token ≈ 4 characters
   */
  private static fallbackEstimation(text: string): number {
    return Math.ceil(text.length / 4);
  }

  /**
   * Count tokens for a complete message exchange
   */
  static countMessageTokens(
    messages: Array<{ role: string; content: string }>,
    model: string,
    provider: ProviderType
  ): TokenCount {
    try {
      // Calculate input tokens (all messages except the last assistant message)
      let inputTokens = 0;
      let outputTokens = 0;

      for (let i = 0; i < messages.length; i++) {
        const message = messages[i];
        const tokenCount = this.countTokens(message.content, model, provider);

        // The last message is typically the assistant's response (output)
        if (i === messages.length - 1 && message.role === 'assistant') {
          outputTokens = tokenCount;
        } else {
          inputTokens += tokenCount;
        }

        // Add overhead for message formatting (role, delimiters, etc.)
        // OpenAI adds ~4 tokens per message for formatting
        inputTokens += 4;
      }

      const totalTokens = inputTokens + outputTokens;

      return {
        inputTokens,
        outputTokens,
        totalTokens,
      };
    } catch (error) {
      console.error('Error counting message tokens:', error);
      // Return fallback estimation
      const totalText = messages.map(m => m.content).join(' ');
      const total = this.fallbackEstimation(totalText);
      return {
        inputTokens: Math.floor(total * 0.7), // Estimate 70% input
        outputTokens: Math.floor(total * 0.3), // Estimate 30% output
        totalTokens: total,
      };
    }
  }

  /**
   * Clean up (no-op since tiktoken was removed)
   */
  static cleanup(): void {
    // No-op
  }
}
