/**
 * SearchProviderFactory - Creates and configures search providers
 * 
 * Factory pattern for creating provider instances with proper configuration.
 * Supports all provider types and handles initialization.
 */

import type { SearchProvider, SearchProviderConfig } from './types';
import { FreeSearchProvider } from './FreeSearchProvider';
import { SharedSerperProvider } from './SharedSerperProvider';
import { SerperAPIProvider } from './SerpAPIProvider';
import { GoogleSearchProvider } from './GoogleSearchProvider';
import { BraveSearchProvider } from './BraveSearchProvider';

export type ProviderType = 'free' | 'shared-serper' | 'serper' | 'google' | 'brave';

export class SearchProviderFactory {
  /**
   * Create a provider instance by type
   */
  static createProvider(
    type: ProviderType,
    config?: SearchProviderConfig
  ): SearchProvider {
    let provider: SearchProvider;

    switch (type) {
      case 'free':
        provider = new FreeSearchProvider();
        break;

      case 'shared-serper':
        provider = new SharedSerperProvider();
        break;

      case 'serper':
        provider = new SerperAPIProvider();
        break;

      case 'google':
        provider = new GoogleSearchProvider();
        break;

      case 'brave':
        provider = new BraveSearchProvider();
        break;

      default:
        console.warn(`Unknown provider type: ${type}, falling back to free provider`);
        provider = new FreeSearchProvider();
    }

    // Configure if config provided
    if (config) {
      provider.configure(config);
    }

    return provider;
  }

  /**
   * Create all available providers
   */
  static createAllProviders(configs?: Record<ProviderType, SearchProviderConfig>): Map<ProviderType, SearchProvider> {
    const providers = new Map<ProviderType, SearchProvider>();
    const types: ProviderType[] = ['free', 'shared-serper', 'serper', 'google', 'brave'];

    for (const type of types) {
      const config = configs?.[type];
      const provider = this.createProvider(type, config);
      providers.set(type, provider);
    }

    return providers;
  }

  /**
   * Get list of available provider types
   */
  static getAvailableTypes(): ProviderType[] {
    return ['free', 'shared-serper', 'serper', 'google', 'brave'];
  }

  /**
   * Get provider type from provider name
   */
  static getTypeFromName(name: string): ProviderType | null {
    const nameMap: Record<string, ProviderType> = {
      'DuckDuckGo (Free)': 'free',
      'Serper API (Shared - 10 Free)': 'shared-serper',
      'Serper API': 'serper',
      'Google Custom Search': 'google',
      'Brave Search API': 'brave'
    };

    return nameMap[name] || null;
  }
}
