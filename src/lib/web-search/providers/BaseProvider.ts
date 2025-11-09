/**
 * BaseProvider - Abstract base class for search providers
 * 
 * Provides common functionality and utilities for all search providers:
 * - Configuration management
 * - Statistics tracking
 * - Error handling
 * - Timeout management
 * - Result normalization
 */

import type {
  SearchProvider,
  SearchProviderConfig,
  SearchOptions,
  SearchResult,
  ProviderMetadata,
  ProviderStats
} from './types';
import { ProviderError, ProviderErrorType } from './types';

export abstract class BaseProvider implements SearchProvider {
  abstract readonly name: string;
  abstract readonly type: 'free' | 'paid';
  abstract readonly requiresApiKey: boolean;
  
  protected config: SearchProviderConfig = {};
  protected stats: ProviderStats = {
    totalSearches: 0,
    successfulSearches: 0,
    failedSearches: 0,
    averageResponseTime: 0,
    estimatedCost: 0
  };
  
  private responseTimes: number[] = [];

  /**
   * Configure the provider
   */
  configure(config: SearchProviderConfig): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SearchProviderConfig {
    return { ...this.config };
  }

  /**
   * Perform search with error handling and statistics tracking
   */
  async search(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    const startTime = Date.now();
    this.stats.totalSearches++;
    this.stats.lastUsed = new Date();

    try {
      // Validate configuration before searching
      const isValid = await this.validateConfig();
      if (!isValid) {
        throw new ProviderError(
          ProviderErrorType.CONFIGURATION_ERROR,
          `${this.name} is not properly configured`,
          false,
          this.name
        );
      }

      // Execute provider-specific search
      const results = await this.executeSearch(query, options);
      
      // Track success
      this.stats.successfulSearches++;
      this.trackResponseTime(Date.now() - startTime);
      
      // Track cost for paid providers
      if (this.type === 'paid') {
        this.stats.estimatedCost += this.calculateSearchCost();
      }

      return results;

    } catch (error) {
      this.stats.failedSearches++;
      this.trackResponseTime(Date.now() - startTime);
      
      // Convert to ProviderError if not already
      if (error instanceof ProviderError) {
        throw error;
      }
      
      throw new ProviderError(
        ProviderErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown error',
        true,
        this.name
      );
    }
  }

  /**
   * Get provider statistics
   */
  getStats(): ProviderStats {
    return { ...this.stats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = {
      totalSearches: 0,
      successfulSearches: 0,
      failedSearches: 0,
      averageResponseTime: 0,
      estimatedCost: 0
    };
    this.responseTimes = [];
  }

  /**
   * Test connection with a simple query
   */
  async testConnection(): Promise<boolean> {
    try {
      await this.search('test', { maxResults: 1 });
      return true;
    } catch (error) {
      // Only log as error if it's not an authentication issue
      if (error instanceof ProviderError && error.type === ProviderErrorType.AUTHENTICATION_ERROR) {
        console.warn(`[${this.name}] Connection test failed: Invalid API key`);
      } else {
        console.error(`[${this.name}] Connection test failed:`, error);
      }
      return false;
    }
  }

  // ============================================================================
  // Abstract Methods (must be implemented by subclasses)
  // ============================================================================

  /**
   * Execute provider-specific search logic
   */
  protected abstract executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]>;

  /**
   * Validate provider-specific configuration
   */
  abstract validateConfig(): Promise<boolean>;

  /**
   * Get provider metadata
   */
  abstract getMetadata(): ProviderMetadata;

  /**
   * Calculate cost per search (for paid providers)
   */
  protected calculateSearchCost(): number {
    return 0; // Override in paid providers
  }

  // ============================================================================
  // Protected Utility Methods
  // ============================================================================

  /**
   * Execute with timeout
   */
  protected async withTimeout<T>(
    promise: Promise<T>,
    timeoutMs: number,
    operationName: string = 'Operation'
  ): Promise<T> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => {
        reject(new ProviderError(
          ProviderErrorType.TIMEOUT_ERROR,
          `${operationName} timed out after ${timeoutMs}ms`,
          true,
          this.name
        ));
      }, timeoutMs);
    });

    return Promise.race([promise, timeoutPromise]);
  }

  /**
   * Normalize search result
   */
  protected normalizeResult(result: Partial<SearchResult>, rank: number): SearchResult {
    const url = result.url || '';
    const domain = this.extractDomain(url);

    return {
      title: result.title || 'Untitled',
      url,
      snippet: result.snippet || '',
      domain,
      publishedDate: result.publishedDate,
      favicon: result.favicon || this.getFaviconUrl(domain),
      rank
    };
  }

  /**
   * Extract domain from URL
   */
  protected extractDomain(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.hostname;
    } catch {
      return '';
    }
  }

  /**
   * Get favicon URL for domain
   */
  protected getFaviconUrl(domain: string): string {
    return `https://www.google.com/s2/favicons?domain=${domain}&sz=32`;
  }

  /**
   * Track response time for statistics
   */
  private trackResponseTime(time: number): void {
    this.responseTimes.push(time);
    
    // Keep only last 100 response times
    if (this.responseTimes.length > 100) {
      this.responseTimes.shift();
    }
    
    // Calculate average
    const sum = this.responseTimes.reduce((a, b) => a + b, 0);
    this.stats.averageResponseTime = sum / this.responseTimes.length;
  }

  /**
   * Parse date string to Date object
   */
  protected parseDate(dateString?: string): Date | undefined {
    if (!dateString) return undefined;
    
    try {
      const date = new Date(dateString);
      return isNaN(date.getTime()) ? undefined : date;
    } catch {
      return undefined;
    }
  }

  /**
   * Validate API key format
   */
  protected validateApiKey(apiKey?: string, minLength: number = 10): boolean {
    return !!apiKey && apiKey.length >= minLength;
  }
}
