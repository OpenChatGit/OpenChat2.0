/**
 * BraveSearchProvider - Privacy-focused search via Brave Search API
 * 
 * Independent search index with privacy focus.
 * Pricing: $3 per 1,000 queries ($0.003 per search)
 * Free tier: 2,000 queries/month
 */

import { BaseProvider } from './BaseProvider';
import type {
  SearchOptions,
  SearchResult,
  ProviderMetadata
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { invoke } from '@tauri-apps/api/core';

interface BraveSearchResponse {
  web?: {
    results?: Array<{
      title: string;
      url: string;
      description: string;
      age?: string;
    }>;
  };
  error?: {
    code: number;
    message: string;
  };
}

export class BraveSearchProvider extends BaseProvider {
  readonly name = 'Brave Search API';
  readonly type = 'paid' as const;
  readonly requiresApiKey = true;
  
  private readonly baseUrl = 'https://api.search.brave.com/res/v1/web/search';
  private readonly costPerSearch = 0.003; // $0.003 per search

  /**
   * Execute search using Brave Search API
   */
  protected async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'Brave API key not configured',
        false,
        this.name
      );
    }

    const maxResults = Math.min(options?.maxResults || 5, 20); // Brave max is 20
    const timeout = options?.timeout || 10000;

    // Build request parameters
    const params = new URLSearchParams({
      q: query,
      count: String(maxResults)
    });

    if (options?.language) {
      params.append('search_lang', options.language);
    }

    if (options?.dateRange) {
      params.append('freshness', this.getDateRangeParam(options.dateRange));
    }

    try {
      // Use Tauri's proxy_http_request command to bypass CORS
      // Note: Brave requires X-Subscription-Token header, but Tauri's proxy doesn't support custom headers yet
      // For now, we'll try with the API key in the URL
      const url = `${this.baseUrl}?${params}&api_key=${apiKey}`;
      
      const responseText = await this.withTimeout(
        invoke<string>('proxy_http_request', {
          url,
          method: 'GET',
          body: null
        }),
        timeout,
        'Brave Search request'
      );

      const data: BraveSearchResponse = JSON.parse(responseText);

      if (data.error) {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN_ERROR,
          `Brave API error: ${data.error.message}`,
          false,
          this.name
        );
      }

      if (!data.web?.results || data.web.results.length === 0) {
        throw new ProviderError(
          ProviderErrorType.NO_RESULTS,
          'No results found',
          false,
          this.name
        );
      }

      // Parse and normalize results
      return data.web.results.map((result, index) => 
        this.normalizeResult({
          title: result.title,
          url: result.url,
          snippet: result.description,
          publishedDate: this.parseDate(result.age)
        }, index + 1)
      );

    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        ProviderErrorType.NETWORK_ERROR,
        `Brave API request failed: ${error}`,
        true,
        this.name
      );
    }
  }

  /**
   * Validate Brave Search configuration
   */
  async validateConfig(): Promise<boolean> {
    return this.validateApiKey(this.config.apiKey, 20);
  }

  /**
   * Calculate cost per search
   */
  protected calculateSearchCost(): number {
    return this.costPerSearch;
  }

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      name: this.name,
      type: this.type,
      description: 'Privacy-focused search API with independent index and affordable pricing.',
      pricing: {
        model: 'pay-per-use',
        freeTier: {
          limit: 2000,
          period: 'month'
        },
        paidTier: {
          price: 3,
          currency: 'USD',
          limit: 1000,
          period: 'month'
        },
        costPerSearch: this.costPerSearch
      },
      features: [
        'Privacy-focused (no tracking)',
        'Independent search index',
        'Affordable pricing',
        'Good free tier (2,000 searches/month)',
        'Fast response times',
        'Clean, ad-free results'
      ],
      limitations: [
        'Requires API key',
        'Smaller index than Google',
        'Less metadata than competitors',
        'Newer service (less mature)'
      ],
      setupInstructions:
        '1. Go to https://brave.com/search/api/\n' +
        '2. Sign up for API access\n' +
        '3. Get your subscription token\n' +
        '4. Enter the token in settings',
      documentationUrl: 'https://brave.com/search/api/'
    };
  }

  /**
   * Get real-time usage data from Brave API
   * Note: Brave doesn't provide a direct usage API endpoint
   */
  async getApiUsage(): Promise<import('./types').ApiUsageData | null> {
    // Brave Search API doesn't provide a usage endpoint
    // Users must check usage in their Brave dashboard
    // We return the known limits
    return {
      used: 0, // Cannot be determined via API
      limit: 2000,
      remaining: 2000,
      period: 'month'
    };
  }

  /**
   * Convert date range to Brave parameter
   */
  private getDateRangeParam(range: string): string {
    const rangeMap: Record<string, string> = {
      'day': 'pd',      // past day
      'week': 'pw',     // past week
      'month': 'pm',    // past month
      'year': 'py'      // past year
    };
    return rangeMap[range] || '';
  }
}
