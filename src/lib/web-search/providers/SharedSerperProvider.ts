/**
 * SharedSerperProvider - Shared Serper API with free tier for users
 * 
 * Uses a shared API key to provide free searches to users.
 * Limit: 10 searches per user per month
 * This allows users to try premium search without their own API key.
 */

import { BaseProvider } from './BaseProvider';
import type {
  SearchOptions,
  SearchResult,
  ProviderMetadata,
  ApiUsageData
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

export class SharedSerperProvider extends BaseProvider {
  readonly name = 'Serper API (Shared - 10 Free)';
  readonly type = 'free' as const; // Free for users!
  readonly requiresApiKey = false; // No API key needed from user
  
  private readonly baseUrl = 'https://google.serper.dev/search';
  
  // This will be your shared API key (set via environment or config)
  private readonly sharedApiKey = import.meta.env.VITE_SHARED_SERPER_KEY || '';
  
  // User-specific usage tracking
  private readonly STORAGE_KEY = 'shared_serper_usage';
  private readonly MONTHLY_LIMIT = 10;

  /**
   * Get user's usage from localStorage
   */
  private getUserUsage(): { count: number; resetAt: string } {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const usage = JSON.parse(stored);
        
        // Check if reset date has passed
        const resetDate = new Date(usage.resetAt);
        if (new Date() > resetDate) {
          // Reset usage
          return this.resetUserUsage();
        }
        
        return usage;
      }
    } catch (error) {
      console.error('Failed to load usage:', error);
    }
    
    return this.resetUserUsage();
  }

  /**
   * Reset user usage (monthly)
   */
  private resetUserUsage(): { count: number; resetAt: string } {
    const now = new Date();
    const resetAt = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    
    const usage = {
      count: 0,
      resetAt: resetAt.toISOString()
    };
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error('Failed to save usage:', error);
    }
    
    return usage;
  }

  /**
   * Increment user usage
   */
  private incrementUsage(): void {
    const usage = this.getUserUsage();
    usage.count++;
    
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(usage));
    } catch (error) {
      console.error('Failed to save usage:', error);
    }
  }

  /**
   * Check if user has remaining searches
   */
  private hasRemainingSearches(): boolean {
    const usage = this.getUserUsage();
    return usage.count < this.MONTHLY_LIMIT;
  }

  /**
   * Execute search using shared Serper API
   */
  protected async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    // Check if shared API key is configured
    if (!this.sharedApiKey) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'Shared Serper API key not configured. Please contact support.',
        false,
        this.name
      );
    }

    // Check user's monthly limit
    if (!this.hasRemainingSearches()) {
      const usage = this.getUserUsage();
      const resetDate = new Date(usage.resetAt);
      
      throw new ProviderError(
        ProviderErrorType.RATE_LIMIT_ERROR,
        `Monthly limit of ${this.MONTHLY_LIMIT} free searches reached. Resets on ${resetDate.toLocaleDateString()}. Get your own API key for unlimited searches.`,
        false,
        this.name
      );
    }

    const maxResults = options?.maxResults || 5;
    const timeout = options?.timeout || 10000;

    // Build request body
    const requestBody = {
      q: query,
      num: maxResults,
      ...(options?.language && { gl: options.language }),
      ...(options?.dateRange && { tbs: this.getDateRangeParam(options.dateRange) })
    };

    try {
      // Use shared API key
      const url = `${this.baseUrl}?api_key=${this.sharedApiKey}`;
      
      const responseText = await this.withTimeout(
        invoke<string>('proxy_http_request', {
          url,
          method: 'POST',
          body: JSON.stringify(requestBody)
        }),
        timeout,
        'Shared Serper API request'
      );

      const data: SerperAPIResponse = JSON.parse(responseText);

      if (data.error) {
        // Check for authentication errors
        if (data.error.includes('403') || data.error.includes('Forbidden') || data.error.includes('Invalid API key')) {
          throw new ProviderError(
            ProviderErrorType.AUTHENTICATION_ERROR,
            'Shared API key is invalid or expired. Please use a different provider or get your own API key at https://serper.dev',
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

      // Increment usage counter AFTER successful search
      this.incrementUsage();

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
          'Shared API key is invalid or expired. Please use a different provider or get your own API key at https://serper.dev',
          false,
          this.name
        );
      }

      throw new ProviderError(
        ProviderErrorType.NETWORK_ERROR,
        `Shared Serper API request failed: ${error}`,
        true,
        this.name
      );
    }
  }

  /**
   * Validate configuration (checks if shared key is available)
   */
  async validateConfig(): Promise<boolean> {
    if (!this.sharedApiKey) {
      console.warn('[SharedSerper] Shared API key not configured. Set VITE_SHARED_SERPER_KEY in .env');
      console.warn('[SharedSerper] This provider will be unavailable. Use Free Provider or get your own API key.');
      return false;
    }
    return true;
  }

  /**
   * Test connection to verify API key is valid
   */
  async testConnection(): Promise<boolean> {
    if (!this.sharedApiKey) {
      return false;
    }

    try {
      // Try a simple test search
      await this.executeSearch('test', { maxResults: 1 });
      return true;
    } catch (error) {
      if (error instanceof ProviderError && error.type === ProviderErrorType.AUTHENTICATION_ERROR) {
        console.error('[SharedSerper] API key is invalid or expired');
        return false;
      }
      // Other errors might be temporary
      return true;
    }
  }

  /**
   * Get user's API usage (combines local tracking with real API data)
   */
  async getApiUsage(): Promise<ApiUsageData | null> {
    try {
      // Get local user usage (for per-user limits)
      const localUsage = this.getUserUsage();
      
      // Try to get real API usage from Serper
      let apiCredits: number | null = null;
      if (this.sharedApiKey) {
        try {
          const url = `https://google.serper.dev/account?api_key=${this.sharedApiKey}`;
          const responseText = await invoke<string>('proxy_http_request', {
            url,
            method: 'GET',
            body: null
          });
          
          const data = JSON.parse(responseText);
          
          // New API format: { balance: number, rateLimit: number }
          if (data.balance !== undefined) {
            apiCredits = data.balance;
            console.log('[SharedSerper] Real API balance remaining:', apiCredits, 'Rate:', data.rateLimit, '/s');
          }
          // Old API format: { credits: number, plan: string }
          else if (data.credits !== undefined) {
            apiCredits = data.credits;
            console.log('[SharedSerper] Real API credits remaining:', apiCredits);
          }
        } catch (error) {
          console.warn('[SharedSerper] Could not fetch real API usage:', error);
        }
      }
      
      return {
        used: localUsage.count,
        limit: this.MONTHLY_LIMIT,
        remaining: this.MONTHLY_LIMIT - localUsage.count,
        resetDate: new Date(localUsage.resetAt),
        period: 'month',
        // Add real API credits as additional info
        ...(apiCredits !== null && { 
          apiCreditsRemaining: apiCredits,
          note: `Shared API has ${apiCredits} total credits remaining`
        })
      };
    } catch (error) {
      console.error('[SharedSerper] Failed to get usage data:', error);
      return null;
    }
  }

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    const isConfigured = !!this.sharedApiKey;
    
    return {
      name: this.name,
      type: this.type,
      description: isConfigured 
        ? 'Free premium search powered by Serper API. 10 searches per month included.'
        : 'Shared Serper API (currently unavailable - no API key configured)',
      pricing: {
        model: 'free',
        freeTier: {
          limit: this.MONTHLY_LIMIT,
          period: 'month'
        }
      },
      features: isConfigured ? [
        'Real-time Google search results',
        'Fast response times (< 500ms)',
        'No API key required',
        '10 free searches per month',
        'Premium quality results',
        'Automatic monthly reset'
      ] : [
        'Shared API key not configured',
        'Use Free Provider or get your own API key'
      ],
      limitations: [
        `Limited to ${this.MONTHLY_LIMIT} searches per month`,
        'Shared API key (rate limits apply)',
        'May be unavailable if shared key expires',
        'For unlimited searches, get your own API key'
      ],
      setupInstructions: isConfigured
        ? 'No setup required! This provider is ready to use.\n' +
          `You get ${this.MONTHLY_LIMIT} free premium searches per month.\n` +
          'For unlimited searches, sign up at https://serper.dev'
        : 'Shared API key is not configured or expired.\n' +
          'Please use the Free Provider or get your own API key at https://serper.dev',
      documentationUrl: 'https://serper.dev/docs'
    };
  }

  /**
   * Convert date range parameter
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
