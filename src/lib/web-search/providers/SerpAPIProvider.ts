/**
 * SerperAPIProvider - Google search results via Serper API
 * 
 * Fast and affordable Google search API.
 * Pricing: $50/month for 5,000 searches ($0.01 per search)
 * Free tier: 2,500 searches (one-time)
 */

import { BaseProvider } from './BaseProvider';
import type {
  SearchOptions,
  SearchResult,
  ProviderMetadata
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { invoke } from '@tauri-apps/api/core';

interface SerperAPIResponse {
  organic?: Array<{
    title: string;
    link: string;
    snippet: string;
    date?: string;
  }>;
  error?: string;
}

export class SerperAPIProvider extends BaseProvider {
  readonly name = 'Serper API';
  readonly type = 'paid' as const;
  readonly requiresApiKey = true;
  
  private readonly baseUrl = 'https://google.serper.dev/search';
  private readonly costPerSearch = 0.001; // $0.001 per search (much cheaper!)

  /**
   * Execute search using Serper API
   */
  protected async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'Serper API key not configured',
        false,
        this.name
      );
    }

    const maxResults = options?.maxResults || 5;
    const timeout = options?.timeout || 10000;

    // Build request body (Serper uses POST with JSON)
    const requestBody = {
      q: query,
      num: maxResults,
      ...(options?.language && { gl: options.language }),
      ...(options?.dateRange && { tbs: this.getDateRangeParam(options.dateRange) })
    };

    try {
      // Use Tauri's proxy_http_request command to bypass CORS
      // Serper API requires POST with JSON body and X-API-KEY header
      // Since proxy doesn't support custom headers, we'll add the key to the URL
      const url = `${this.baseUrl}?api_key=${apiKey}`;
      
      const responseText = await this.withTimeout(
        invoke<string>('proxy_http_request', {
          url,
          method: 'POST',
          body: JSON.stringify(requestBody)
        }),
        timeout,
        'Serper API request'
      );

      const data: SerperAPIResponse = JSON.parse(responseText);

      if (data.error) {
        // Check for authentication errors
        if (data.error.includes('403') || data.error.includes('Forbidden') || data.error.includes('Invalid API key') || data.error.includes('Unauthorized')) {
          throw new ProviderError(
            ProviderErrorType.AUTHENTICATION_ERROR,
            'Invalid API key. Please check your Serper API key at https://serper.dev',
            false,
            this.name
          );
        }
        
        throw new ProviderError(
          ProviderErrorType.UNKNOWN_ERROR,
          `Serper API error: ${data.error}`,
          false,
          this.name
        );
      }

      if (!data.organic || data.organic.length === 0) {
        throw new ProviderError(
          ProviderErrorType.NO_RESULTS,
          'No results found',
          false,
          this.name
        );
      }

      // Parse and normalize results
      return data.organic.map((result, index) => 
        this.normalizeResult({
          title: result.title,
          url: result.link,
          snippet: result.snippet,
          publishedDate: this.parseDate(result.date)
        }, index + 1)
      );

    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      // Check if error message contains 403 or authentication issues
      const errorMsg = String(error);
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden') || errorMsg.includes('Unauthorized')) {
        throw new ProviderError(
          ProviderErrorType.AUTHENTICATION_ERROR,
          'Invalid API key. Please check your Serper API key at https://serper.dev',
          false,
          this.name
        );
      }

      throw new ProviderError(
        ProviderErrorType.NETWORK_ERROR,
        `Serper API request failed: ${error}`,
        true,
        this.name
      );
    }
  }

  /**
   * Validate Serper API configuration
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
      description: 'Fast and affordable Google search API with real-time results.',
      pricing: {
        model: 'pay-per-use',
        freeTier: {
          limit: 2500,
          period: 'month'
        },
        paidTier: {
          price: 50,
          currency: 'USD',
          limit: 5000,
          period: 'month'
        },
        costPerSearch: this.costPerSearch
      },
      features: [
        'Real-time Google search results',
        'Very fast response times (< 500ms)',
        'Rich metadata and snippets',
        'Advanced search operators',
        'Location-based search',
        'Affordable pricing ($0.001/search)'
      ],
      limitations: [
        'Requires API key',
        'Costs money after free tier',
        'Rate limits apply'
      ],
      setupInstructions: 
        '1. Sign up at https://serper.dev\n' +
        '2. Get your API key from the dashboard\n' +
        '3. Enter the API key in settings',
      documentationUrl: 'https://serper.dev/docs'
    };
  }

  /**
   * Get real-time usage data from Serper API
   */
  async getApiUsage(): Promise<import('./types').ApiUsageData | null> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      return null;
    }

    try {
      // Serper API provides usage info in the account endpoint
      const url = `https://google.serper.dev/account?api_key=${apiKey}`;
      
      const responseText = await invoke<string>('proxy_http_request', {
        url,
        method: 'GET',
        body: null
      });

      const data = JSON.parse(responseText);
      
      console.log('[Serper API] Account data:', data);
      
      // Serper API returns: { balance: number, rateLimit: number }
      // balance = remaining searches
      // rateLimit = searches per second
      
      if (data.balance !== undefined) {
        const remaining = data.balance;
        
        // Determine limit based on balance
        // If balance is high (> 2000), likely paid plan
        // If balance is low (< 2500), likely free tier
        let limit = 2500; // Default to free tier
        if (remaining > 2500) {
          limit = 5000; // Paid plan
        }
        
        const used = Math.max(0, limit - remaining);
        
        console.log(`[Serper API] Used: ${used}, Remaining: ${remaining}, Limit: ${limit}, Rate: ${data.rateLimit}/s`);
        
        return {
          used,
          limit,
          remaining,
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1), // Monthly reset
          period: 'month'
        };
      }
      
      // Fallback for old API format
      if (data.credits !== undefined) {
        const remaining = data.credits;
        const plan = data.plan || 'unknown';
        
        let limit = 5000;
        if (plan === 'free') {
          limit = 2500;
        } else if (plan === 'starter') {
          limit = 5000;
        } else if (plan === 'pro') {
          limit = 50000;
        }
        
        const used = Math.max(0, limit - remaining);
        
        return {
          used,
          limit,
          remaining,
          resetDate: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1),
          period: 'month'
        };
      }

      console.warn('[Serper API] Unexpected account data format:', data);
      return null;
    } catch (error) {
      const errorMsg = String(error);
      // Don't log 403 errors as errors - they're expected for invalid keys
      if (errorMsg.includes('403') || errorMsg.includes('Forbidden')) {
        console.warn('[Serper API] Invalid API key - cannot fetch usage data');
      } else {
        console.error('[Serper API] Failed to fetch usage data:', error);
      }
      return null;
    }
  }

  /**
   * Convert date range to SerpAPI parameter
   */
  private getDateRangeParam(range: string): string {
    const rangeMap: Record<string, string> = {
      'day': 'qdr:d',
      'week': 'qdr:w',
      'month': 'qdr:m',
      'year': 'qdr:y'
    };
    return rangeMap[range] || '';
  }
}
