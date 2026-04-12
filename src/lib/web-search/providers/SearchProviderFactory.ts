import type { SearchProvider, SearchProviderConfig } from './types';
import { SupabaseSearchProvider } from './SupabaseSearchProvider';

export type ProviderType = 'supabase' | 'free' | 'serper' | 'tavily';

export class SearchProviderFactory {
  /**
   * Create a provider instance by type
   */
  static createProvider(
    type: ProviderType,
    config?: SearchProviderConfig
  ): SearchProvider {
    // We now force SupabaseSearchProvider for everything as the premium standard
    const provider = new SupabaseSearchProvider();

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
    const types: ProviderType[] = ['supabase'];

    for (const type of types) {
      const config = configs?.[type as ProviderType];
      const provider = this.createProvider(type as ProviderType, config);
      providers.set(type as ProviderType, provider);
    }

    return providers;
  }

  /**
   * Get list of available provider types
   */
  static getAvailableTypes(): ProviderType[] {
    return ['supabase'];
  }

  /**
   * Get provider type from provider name
   */
  static getTypeFromName(name: string): ProviderType | null {
    return 'supabase';
  }
}
