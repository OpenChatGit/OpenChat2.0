/**
 * SearchProviderRegistry - Manages multiple search providers
 * 
 * Central registry for managing search providers:
 * - Provider registration and retrieval
 * - Default provider management
 * - Provider listing and metadata
 * - Configuration persistence
 */

import type { SearchProvider } from './types';
import { SearchProviderFactory, type ProviderType } from './SearchProviderFactory';

export class SearchProviderRegistry {
  private providers: Map<ProviderType, SearchProvider> = new Map();
  private defaultProvider: ProviderType = 'free';

  constructor() {
    // Register free provider by default
    this.registerProvider('free', SearchProviderFactory.createProvider('free'));
  }

  /**
   * Register a provider
   */
  registerProvider(id: ProviderType, provider: SearchProvider): void {
    this.providers.set(id, provider);
    console.log(`[Registry] Registered provider: ${provider.name} (${id})`);
  }

  /**
   * Get a provider by ID
   */
  getProvider(id?: ProviderType): SearchProvider {
    const providerId = id || this.defaultProvider;
    const provider = this.providers.get(providerId);

    if (!provider) {
      console.warn(`[Registry] Provider ${providerId} not found, using free provider`);
      return this.providers.get('free')!;
    }

    return provider;
  }

  /**
   * Get provider by name
   */
  getProviderByName(name: string): SearchProvider | null {
    for (const provider of this.providers.values()) {
      if (provider.name === name) {
        return provider;
      }
    }
    return null;
  }

  /**
   * Check if provider is registered
   */
  hasProvider(id: ProviderType): boolean {
    return this.providers.has(id);
  }

  /**
   * Set default provider
   */
  setDefaultProvider(id: ProviderType): void {
    if (!this.providers.has(id)) {
      console.error(`[Registry] Cannot set default: provider ${id} not registered`);
      return;
    }

    this.defaultProvider = id;
    console.log(`[Registry] Default provider set to: ${id}`);
  }

  /**
   * Get default provider ID
   */
  getDefaultProviderId(): ProviderType {
    return this.defaultProvider;
  }

  /**
   * Get default provider instance
   */
  getDefaultProvider(): SearchProvider {
    return this.getProvider(this.defaultProvider);
  }

  /**
   * List all registered providers
   */
  listProviders(): Array<{ id: ProviderType; provider: SearchProvider }> {
    return Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      provider
    }));
  }

  /**
   * List only configured providers (with valid config)
   */
  async listConfiguredProviders(): Promise<Array<{ id: ProviderType; provider: SearchProvider }>> {
    const configured: Array<{ id: ProviderType; provider: SearchProvider }> = [];

    for (const [id, provider] of this.providers.entries()) {
      const isValid = await provider.validateConfig();
      if (isValid) {
        configured.push({ id, provider });
      }
    }

    return configured;
  }

  /**
   * Get provider statistics
   */
  getProviderStats(id: ProviderType) {
    const provider = this.providers.get(id);
    if (!provider) return null;

    return provider.getStats();
  }

  /**
   * Get all provider statistics
   */
  getAllStats(): Map<ProviderType, ReturnType<SearchProvider['getStats']>> {
    const stats = new Map();

    for (const [id, provider] of this.providers.entries()) {
      stats.set(id, provider.getStats());
    }

    return stats;
  }

  /**
   * Reset statistics for a provider
   */
  resetProviderStats(id: ProviderType): void {
    const provider = this.providers.get(id);
    if (provider) {
      provider.resetStats();
    }
  }

  /**
   * Reset statistics for all providers
   */
  resetAllStats(): void {
    for (const provider of this.providers.values()) {
      provider.resetStats();
    }
  }

  /**
   * Remove a provider
   */
  removeProvider(id: ProviderType): void {
    if (id === 'free') {
      console.error('[Registry] Cannot remove free provider');
      return;
    }

    if (this.defaultProvider === id) {
      console.warn('[Registry] Removing default provider, switching to free');
      this.defaultProvider = 'free';
    }

    this.providers.delete(id);
    console.log(`[Registry] Removed provider: ${id}`);
  }

  /**
   * Clear all providers except free
   */
  clear(): void {
    const freeProvider = this.providers.get('free');
    this.providers.clear();
    
    if (freeProvider) {
      this.providers.set('free', freeProvider);
    }
    
    this.defaultProvider = 'free';
    console.log('[Registry] Cleared all providers except free');
  }

  /**
   * Get registry summary
   */
  getSummary(): {
    totalProviders: number;
    defaultProvider: ProviderType;
    providers: Array<{
      id: ProviderType;
      name: string;
      type: 'free' | 'paid';
      configured: boolean;
    }>;
  } {
    const providers = Array.from(this.providers.entries()).map(([id, provider]) => ({
      id,
      name: provider.name,
      type: provider.type,
      configured: false // Will be updated asynchronously
    }));

    return {
      totalProviders: this.providers.size,
      defaultProvider: this.defaultProvider,
      providers
    };
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const searchProviderRegistry = new SearchProviderRegistry();
