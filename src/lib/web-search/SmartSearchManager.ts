/**
 * SmartSearchManager - Intelligent search orchestration with multi-provider support
 * 
 * This manager enhances the search experience with:
 * - Automatic provider selection based on query complexity
 * - Fallback to free provider on paid provider failures
 * - Cost tracking and usage statistics
 * - Provider health monitoring
 * - Smart caching across providers
 */

import type { SearchResult } from './providers/types';
import { searchProviderRegistry } from './providers/SearchProviderRegistry';
import type { ProviderType } from './providers/SearchProviderFactory';

// ============================================================================
// Configuration
// ============================================================================

interface SmartSearchConfig {
  enableAutoFallback: boolean;
  enableSmartSelection: boolean;
  preferredProvider?: ProviderType;
  maxRetries: number;
}

const DEFAULT_CONFIG: SmartSearchConfig = {
  enableAutoFallback: true,
  enableSmartSelection: false,
  maxRetries: 2
};

// ============================================================================
// Search Metadata
// ============================================================================

export interface SearchMetadata {
  provider: string;
  providerId: ProviderType;
  resultCount: number;
  searchTime: number;
  cost: number;
  quality: 'low' | 'medium' | 'high';
  usedFallback: boolean;
}

// ============================================================================
// SmartSearchManager Class
// ============================================================================

export class SmartSearchManager {
  private config: SmartSearchConfig;
  private searchHistory: SearchMetadata[] = [];

  constructor(config: Partial<SmartSearchConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * Perform intelligent search with automatic provider selection and fallback
   */
  async search(
    query: string,
    maxResults: number = 5
  ): Promise<{ results: SearchResult[]; metadata: SearchMetadata }> {
    const startTime = Date.now();
    let lastError: Error | null = null;

    // Step 1: Select provider
    const providerId = this.selectProvider(query);
    const provider = searchProviderRegistry.getProvider(providerId);

    console.log(`[SmartSearch] Selected provider: ${provider.name} (${providerId})`);

    // Step 2: Try primary provider
    try {
      const results = await provider.search(query, { maxResults });
      const searchTime = Date.now() - startTime;

      const metadata: SearchMetadata = {
        provider: provider.name,
        providerId,
        resultCount: results.length,
        searchTime,
        cost: this.calculateCost(provider),
        quality: this.assessQuality(provider, results),
        usedFallback: false
      };

      this.recordSearch(metadata);
      console.log(`[SmartSearch] Success: ${results.length} results in ${searchTime}ms`);

      return { results, metadata };

    } catch (error) {
      lastError = error as Error;
      console.warn(`[SmartSearch] Primary provider failed:`, error);

      // Step 3: Try fallback if enabled and provider is paid
      if (this.config.enableAutoFallback && provider.type === 'paid') {
        console.log('[SmartSearch] Attempting fallback to free provider...');

        try {
          const freeProvider = searchProviderRegistry.getProvider('free');
          const results = await freeProvider.search(query, { maxResults });
          const searchTime = Date.now() - startTime;

          const metadata: SearchMetadata = {
            provider: freeProvider.name,
            providerId: 'free',
            resultCount: results.length,
            searchTime,
            cost: 0,
            quality: this.assessQuality(freeProvider, results),
            usedFallback: true
          };

          this.recordSearch(metadata);
          console.log(`[SmartSearch] Fallback success: ${results.length} results in ${searchTime}ms`);

          return { results, metadata };

        } catch (fallbackError) {
          console.error('[SmartSearch] Fallback also failed:', fallbackError);
          throw fallbackError;
        }
      }

      // No fallback available or disabled
      throw lastError;
    }
  }

  /**
   * Select best provider based on query and configuration
   */
  private selectProvider(query: string): ProviderType {
    console.log('[SmartSearchManager] Selecting provider with config:', {
      preferredProvider: this.config.preferredProvider,
      smartSelection: this.config.enableSmartSelection,
      autoFallback: this.config.enableAutoFallback
    });

    // 1. Use preferred provider if set
    if (this.config.preferredProvider) {
      try {
        const provider = searchProviderRegistry.getProvider(this.config.preferredProvider);
        if (provider) {
          console.log(`[SmartSearchManager] Using preferred provider: ${this.config.preferredProvider}`);
          return this.config.preferredProvider;
        }
      } catch (error) {
        console.warn(`[SmartSearchManager] Preferred provider ${this.config.preferredProvider} not available:`, error);
      }
    }

    // 2. Use smart selection if enabled
    if (this.config.enableSmartSelection) {
      const selected = this.smartSelectProvider(query);
      console.log(`[SmartSearchManager] Smart selection chose: ${selected}`);
      return selected;
    }

    // 3. Use default provider
    const defaultProvider = searchProviderRegistry.getDefaultProviderId();
    console.log(`[SmartSearchManager] Using default provider: ${defaultProvider}`);
    return defaultProvider;
  }

  /**
   * Smart provider selection based on query complexity
   */
  private smartSelectProvider(query: string): ProviderType {
    const complexity = this.analyzeQueryComplexity(query);

    // For complex queries, prefer paid providers if available
    if (complexity === 'high') {
      const configured = searchProviderRegistry.listProviders()
        .filter(({ provider }) => provider.type === 'paid');

      if (configured.length > 0) {
        // Prefer Serper API for complex queries (best quality)
        const serper = configured.find(({ id }) => id === 'serper');
        if (serper) return 'serper';

        // Otherwise use first available paid provider
        return configured[0].id;
      }
    }

    // For simple queries or no paid providers, use free
    return 'free';
  }

  /**
   * Analyze query complexity
   */
  private analyzeQueryComplexity(query: string): 'low' | 'medium' | 'high' {
    const wordCount = query.split(/\s+/).length;
    const charCount = query.length;
    const hasOperators = /site:|filetype:|inurl:|intitle:/.test(query);
    const hasQuotes = query.includes('"');

    // High complexity indicators
    if (
      charCount > 100 ||
      wordCount > 10 ||
      hasOperators ||
      (hasQuotes && wordCount > 5)
    ) {
      return 'high';
    }

    // Medium complexity
    if (charCount > 50 || wordCount > 5) {
      return 'medium';
    }

    // Low complexity
    return 'low';
  }

  /**
   * Calculate search cost
   */
  private calculateCost(provider: any): number {
    if (provider.type === 'free') {
      return 0;
    }

    const stats = provider.getStats();
    return stats.estimatedCost || 0;
  }

  /**
   * Assess result quality
   */
  private assessQuality(provider: any, results: SearchResult[]): 'low' | 'medium' | 'high' {
    const count = results.length;
    
    // Paid providers generally have higher quality
    if (provider.type === 'paid') {
      return count >= 5 ? 'high' : 'medium';
    }

    // Free provider quality depends on result count
    if (count >= 5) {
      return 'medium';
    } else if (count >= 3) {
      return 'low';
    }

    return 'low';
  }

  /**
   * Record search in history
   */
  private recordSearch(metadata: SearchMetadata): void {
    this.searchHistory.push(metadata);

    // Keep only last 100 searches
    if (this.searchHistory.length > 100) {
      this.searchHistory.shift();
    }
  }

  /**
   * Get search history
   */
  getSearchHistory(): SearchMetadata[] {
    return [...this.searchHistory];
  }

  /**
   * Get aggregated statistics
   */
  getAggregatedStats(): {
    totalSearches: number;
    successfulSearches: number;
    fallbackSearches: number;
    totalCost: number;
    averageSearchTime: number;
    providerUsage: Record<string, number>;
  } {
    const totalSearches = this.searchHistory.length;
    const fallbackSearches = this.searchHistory.filter(s => s.usedFallback).length;
    const totalCost = this.searchHistory.reduce((sum, s) => sum + s.cost, 0);
    const averageSearchTime = totalSearches > 0
      ? this.searchHistory.reduce((sum, s) => sum + s.searchTime, 0) / totalSearches
      : 0;

    const providerUsage: Record<string, number> = {};
    for (const search of this.searchHistory) {
      providerUsage[search.provider] = (providerUsage[search.provider] || 0) + 1;
    }

    return {
      totalSearches,
      successfulSearches: totalSearches, // All recorded searches are successful
      fallbackSearches,
      totalCost,
      averageSearchTime,
      providerUsage
    };
  }

  /**
   * Clear search history
   */
  clearHistory(): void {
    this.searchHistory = [];
  }

  /**
   * Configure the manager
   */
  configure(config: Partial<SmartSearchConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Get current configuration
   */
  getConfig(): SmartSearchConfig {
    return { ...this.config };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const smartSearchManager = new SmartSearchManager();
