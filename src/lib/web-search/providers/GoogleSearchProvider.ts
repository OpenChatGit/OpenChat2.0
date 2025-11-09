/**
 * GoogleSearchProvider - Google Custom Search API
 * 
 * Official Google search API with 100 free searches per day.
 * Pricing: $5 per 1,000 additional queries ($0.005 per search)
 */

import { BaseProvider } from './BaseProvider';
import type {
  SearchOptions,
  SearchResult,
  ProviderMetadata
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { invoke } from '@tauri-apps/api/core';

interface GoogleSearchResponse {
  items?: Array<{
    title: string;
    link: string;
    snippet: string;
    pagemap?: {
      metatags?: Array<{
        'article:published_time'?: string;
      }>;
    };
  }>;
  error?: {
    code: number;
    message: string;
  };
}

export class GoogleSearchProvider extends BaseProvider {
  readonly name = 'Google Custom Search';
  readonly type = 'paid' as const;
  readonly requiresApiKey = true;
  
  private readonly baseUrl = 'https://www.googleapis.com/customsearch/v1';
  private readonly costPerSearch = 0.005; // $0.005 per search

  /**
   * Execute search using Google Custom Search API
   */
  protected async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const apiKey = this.config.apiKey;
    const searchEngineId = this.config.searchEngineId;

    if (!apiKey || !searchEngineId) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'Google API key and Search Engine ID required',
        false,
        this.name
      );
    }

    const maxResults = Math.min(options?.maxResults || 5, 10); // Google max is 10
    const timeout = options?.timeout || 10000;

    // Build request parameters
    const params = new URLSearchParams({
      key: apiKey,
      cx: searchEngineId,
      q: query,
      num: String(maxResults)
    });

    if (options?.language) {
      params.append('lr', `lang_${options.language}`);
    }

    if (options?.dateRange) {
      params.append('dateRestrict', this.getDateRangeParam(options.dateRange));
    }

    try {
      // Use Tauri's proxy_http_request command to bypass CORS
      const url = `${this.baseUrl}?${params}`;
      
      const responseText = await this.withTimeout(
        invoke<string>('proxy_http_request', {
          url,
          method: 'GET',
          body: null
        }),
        timeout,
        'Google Search request'
      );

      const data: GoogleSearchResponse = JSON.parse(responseText);

      if (data.error) {
        throw new ProviderError(
          ProviderErrorType.UNKNOWN_ERROR,
          `Google API error: ${data.error.message}`,
          false,
          this.name
        );
      }

      if (!data.items || data.items.length === 0) {
        throw new ProviderError(
          ProviderErrorType.NO_RESULTS,
          'No results found',
          false,
          this.name
        );
      }

      // Parse and normalize results
      return data.items.map((item, index) => {
        const publishedDate = item.pagemap?.metatags?.[0]?.['article:published_time'];
        
        return this.normalizeResult({
          title: item.title,
          url: item.link,
          snippet: item.snippet,
          publishedDate: this.parseDate(publishedDate)
        }, index + 1);
      });

    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        ProviderErrorType.NETWORK_ERROR,
        `Google API request failed: ${error}`,
        true,
        this.name
      );
    }
  }

  /**
   * Validate Google Search configuration
   */
  async validateConfig(): Promise<boolean> {
    return (
      this.validateApiKey(this.config.apiKey, 30) &&
      !!this.config.searchEngineId &&
      this.config.searchEngineId.length > 10
    );
  }

  /**
   * Calculate cost per search
   */
  protected calculateSearchCost(): number {
    // First 100 searches per day are free
    return this.costPerSearch;
  }

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      name: this.name,
      type: this.type,
      description: 'Official Google search API with 100 free searches per day and reliable results.',
      pricing: {
        model: 'pay-per-use',
        freeTier: {
          limit: 100,
          period: 'day'
        },
        paidTier: {
          price: 5,
          currency: 'USD',
          limit: 1000,
          period: 'month'
        },
        costPerSearch: this.costPerSearch
      },
      features: [
        'Official Google search results',
        '100 free searches per day',
        'Fast and reliable',
        'Rich metadata',
        'Advanced search operators',
        'Good documentation'
      ],
      limitations: [
        'Requires API key + Search Engine ID',
        'Setup complexity (need to create custom search engine)',
        'Costs after free tier',
        'Max 10 results per query'
      ],
      setupInstructions:
        '1. Go to https://console.cloud.google.com\n' +
        '2. Create a new project\n' +
        '3. Enable Custom Search API\n' +
        '4. Create API credentials (API key)\n' +
        '5. Go to https://cse.google.com/cse/all\n' +
        '6. Create a new search engine\n' +
        '7. Get your Search Engine ID (cx parameter)\n' +
        '8. Enter both API key and Search Engine ID in settings',
      documentationUrl: 'https://developers.google.com/custom-search/v1/overview'
    };
  }

  /**
   * Get real-time usage data from Google API
   * Note: Google doesn't provide a direct usage API, so we return null
   * Users need to check their Google Cloud Console for usage
   */
  async getApiUsage(): Promise<import('./types').ApiUsageData | null> {
    // Google Custom Search API doesn't provide a usage endpoint
    // Users must check usage in Google Cloud Console
    // We return the known limits
    return {
      used: 0, // Cannot be determined via API
      limit: 100,
      remaining: 100,
      resetDate: new Date(new Date().setHours(24, 0, 0, 0)),
      period: 'day'
    };
  }

  /**
   * Convert date range to Google parameter
   */
  private getDateRangeParam(range: string): string {
    const rangeMap: Record<string, string> = {
      'day': 'd1',
      'week': 'w1',
      'month': 'm1',
      'year': 'y1'
    };
    return rangeMap[range] || '';
  }
}
