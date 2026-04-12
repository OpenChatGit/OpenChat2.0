import { BaseProvider } from './BaseProvider';
import { SearchOptions, SearchResult, ProviderMetadata, ProviderError, ProviderErrorType } from './types';
import { supabase, supabaseAnonKey } from '../../../lib/supabase';

/**
 * SupabaseSearchProvider - Connects to Supabase Edge Functions for web search
 * 
 * This provider offloads the search logic to a serverless function,
 * allowing for secure API key management and Tavily integration.
 */
export class SupabaseSearchProvider extends BaseProvider {
  readonly name = 'OpenChat Search (Tavily)';
  readonly type = 'paid';
  readonly requiresApiKey = false; // Uses Supabase Auth tokens instead

  /**
   * Execute search via Supabase Edge Function
   */
  protected async executeSearch(query: string, options?: SearchOptions): Promise<SearchResult[]> {
    try {
      // Get the current session to pass the JWT
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new ProviderError(
          ProviderErrorType.AUTHENTICATION_ERROR,
          'You must be logged in to use OpenChat Search',
          false,
          this.name
        );
      }

      const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || '';
      const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';
      
      // Ensure no trailing slash on base URL
      const baseUrl = SUPABASE_URL.replace(/\/$/, '');
      const functionUrl = `${baseUrl}/functions/v1/web-search`;

      console.log(`[SupabaseSearch] Calling function: ${functionUrl}`);

      const response = await fetch(functionUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'X-User-Token': session.access_token
        },
        body: JSON.stringify({ 
          query, 
          limit: options?.maxResults || 10,
          time_range: (options as any).time_range // Forward to Tavily via Supabase
        }),
        signal: options?.signal
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Search Function Failed' }));
        throw new ProviderError(
          ProviderErrorType.NETWORK_ERROR,
          `Supabase Function Error: ${errorData.error || response.status}`,
          true,
          this.name
        );
      }

      const data = await response.json();

      if (!data?.results || !Array.isArray(data.results)) {
        return [];
      }

      // Normalize results using the base class utility
      return data.results.map((r: any, index: number) => 
        this.normalizeResult({
          title: r.title,
          url: r.url,
          snippet: r.content,
          domain: r.engine || 'tavily'
        }, index + 1)
      );

    } catch (error) {
      if (error instanceof ProviderError) throw error;
      
      throw new ProviderError(
        ProviderErrorType.UNKNOWN_ERROR,
        error instanceof Error ? error.message : 'Unknown search error',
        true,
        this.name
      );
    }
  }

  /**
   * Test connection to the Supabase Edge Function
   */
  async testConnection(): Promise<boolean> {
    try {
      // Perform a tiny search to verify the end-to-end connection
      const results = await this.executeSearch('ping', { maxResults: 1 });
      return Array.isArray(results);
    } catch (error) {
      console.error('[SupabaseSearch] Connection test failed:', error);
      return false;
    }
  }

  /**
   * Validate configuration (always valid as it uses global Supabase client)
   */
  async validateConfig(): Promise<boolean> {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      return !!session;
    } catch (e) {
      return false;
    }
  }

  /**
   * Provider Metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      name: this.name,
      type: this.type,
      description: 'Premium AI-native search powered by Tavily via Supabase',
      features: [
        'AI-optimized results',
        'High-quality snippets',
        'Automated billing',
        'Secure API management'
      ],
      pricing: {
        model: 'pay-per-use',
        costPerSearch: 100000 // UI cost representation
      },
      documentationUrl: 'https://tavily.com'
    };
  }

  /**
   * Deduct fixed cost per search (UI representation)
   */
  protected calculateSearchCost(): number {
    return 100000; // 100k OC-Tokens for testing
  }
}
