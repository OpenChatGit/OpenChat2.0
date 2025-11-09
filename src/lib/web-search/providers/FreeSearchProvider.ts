/**
 * FreeSearchProvider - DuckDuckGo scraping via Rust backend
 * 
 * This provider wraps the existing backend scraper functionality
 * into the new provider interface. It provides:
 * - Free, unlimited searches
 * - No API key required
 * - Privacy-focused (DuckDuckGo)
 * - Backend Rust scraping with headless Chrome
 */

import { BaseProvider } from './BaseProvider';
import type {
  SearchOptions,
  SearchResult,
  ProviderMetadata
} from './types';
import { ProviderError, ProviderErrorType } from './types';
import { invoke } from '@tauri-apps/api/core';

export class FreeSearchProvider extends BaseProvider {
  readonly name = 'DuckDuckGo (Free)';
  readonly type = 'free' as const;
  readonly requiresApiKey = false;

  /**
   * Execute search using backend Rust scraper
   */
  protected async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const maxResults = options?.maxResults || 5;
    const timeout = options?.timeout || 30000;

    try {
      // Call Rust backend for DuckDuckGo search (returns HTML string)
      const html = await this.withTimeout(
        invoke<string>('search_duckduckgo', {
          query,
          maxResults
        }),
        timeout,
        'DuckDuckGo search'
      );

      if (!html || typeof html !== 'string') {
        throw new ProviderError(
          ProviderErrorType.NO_RESULTS,
          'No response from search engine',
          false,
          this.name
        );
      }

      // Parse HTML to extract search results
      const results = this.parseResults(html, maxResults);

      if (!results || results.length === 0) {
        throw new ProviderError(
          ProviderErrorType.NO_RESULTS,
          'No search results found',
          false,
          this.name
        );
      }

      // Normalize results
      return results.map((result, index) => 
        this.normalizeResult(result, index + 1)
      );

    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      // Handle Tauri invoke errors
      if (typeof error === 'string' && error.includes('rate limit')) {
        throw new ProviderError(
          ProviderErrorType.RATE_LIMIT_ERROR,
          'DuckDuckGo rate limit reached, please try again later',
          true,
          this.name
        );
      }

      throw new ProviderError(
        ProviderErrorType.NETWORK_ERROR,
        `Search failed: ${error}`,
        true,
        this.name
      );
    }
  }

  /**
   * Parse DuckDuckGo HTML response and extract search results
   */
  private parseResults(html: string, maxResults: number): any[] {
    const results: any[] = [];
    
    try {
      // Create a DOM parser
      const parser = new DOMParser();
      const doc = parser.parseFromString(html, 'text/html');

      // Try multiple selectors for result elements
      let resultElements = doc.querySelectorAll('.result');
      
      // If no results with .result, try alternative selectors
      if (resultElements.length === 0) {
        resultElements = doc.querySelectorAll('.results_links, .web-result, [data-testid="result"]');
      }

      console.log(`[FreeProvider] Found ${resultElements.length} result elements in HTML`);

      for (const element of Array.from(resultElements)) {
        if (results.length >= maxResults) break;

        try {
          // Try multiple selectors for the link element
          let linkElement = element.querySelector('.result__a');
          if (!linkElement) {
            linkElement = element.querySelector('a.result-link, a[href^="http"]');
          }
          if (!linkElement) {
            linkElement = element.querySelector('a[href]');
          }
          
          if (!linkElement) continue;

          const title = linkElement.textContent?.trim() || '';
          let url = linkElement.getAttribute('href') || '';

          // Skip if no URL or internal DuckDuckGo links
          if (!url || url.startsWith('//duckduckgo.com') || url.includes('duckduckgo.com/y.js')) {
            continue;
          }
          
          // Handle relative URLs
          if (url.startsWith('//')) {
            url = 'https:' + url;
          }

          // Extract snippet
          let snippetElement = element.querySelector('.result__snippet');
          if (!snippetElement) {
            snippetElement = element.querySelector('.result-snippet, .snippet, [class*="snippet"]');
          }
          const snippet = snippetElement?.textContent?.trim() || '';

          // Only add if we have at least a title and URL
          if (title && url) {
            results.push({
              title,
              url,
              snippet
            });
          }

        } catch (error) {
          console.warn('[FreeProvider] Error parsing individual result:', error);
          continue;
        }
      }

      console.log(`[FreeProvider] Successfully parsed ${results.length} results`);

    } catch (error) {
      console.error('[FreeProvider] Error parsing search results:', error);
      throw new ProviderError(
        ProviderErrorType.PARSE_ERROR,
        'Failed to parse search results',
        false,
        this.name
      );
    }

    return results;
  }

  /**
   * Validate configuration (always valid for free provider)
   */
  async validateConfig(): Promise<boolean> {
    return true; // No configuration needed
  }

  /**
   * Get provider metadata
   */
  getMetadata(): ProviderMetadata {
    return {
      name: this.name,
      type: this.type,
      description: 'Free DuckDuckGo search via backend scraping. No API key required, unlimited searches.',
      pricing: {
        model: 'free',
        freeTier: {
          limit: -1, // Unlimited
          period: 'month'
        }
      },
      features: [
        'Completely free',
        'No API key required',
        'Unlimited searches',
        'Privacy-focused (DuckDuckGo)',
        'Backend Rust scraping',
        'Headless Chrome rendering'
      ],
      limitations: [
        'Slower than paid APIs (2-5 seconds per search)',
        'May be rate-limited by DuckDuckGo',
        'Result quality may vary',
        'No advanced search features'
      ],
      setupInstructions: 'No setup required. This provider works out of the box.',
      documentationUrl: 'https://duckduckgo.com'
    };
  }
}
