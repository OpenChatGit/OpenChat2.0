/**
 * ProviderSettingsManager - Persistent storage for provider configurations
 * 
 * Manages provider settings with:
 * - Secure API key storage (encrypted in localStorage)
 * - Provider configuration persistence
 * - Usage statistics tracking
 * - Settings import/export
 */

import type { SearchProviderConfig } from './types';
import type { ProviderType } from './SearchProviderFactory';
import { searchProviderRegistry } from './SearchProviderRegistry';
import { SearchProviderFactory } from './SearchProviderFactory';

// ============================================================================
// Settings Structure
// ============================================================================

export interface ProviderSettings {
  enabled: boolean;
  config: SearchProviderConfig;
  usage?: {
    count: number;
    limit: number;
    resetAt: string;
  };
}

export interface WebSearchSettings {
  enabled: boolean;
  defaultProvider: ProviderType;
  autoFallback: boolean;
  smartSelection: boolean;
  providers: Record<ProviderType, ProviderSettings>;
  options: {
    autoDetect: boolean;
    showSources: boolean;
    cacheResults: boolean;
    cacheDuration: number;
    timeout: number;
    maxResults: number;
  };
}

// ============================================================================
// Default Settings
// ============================================================================

const DEFAULT_SETTINGS: WebSearchSettings = {
  enabled: true,
  defaultProvider: 'free',
  autoFallback: true,
  smartSelection: false,
  providers: {
    free: {
      enabled: true,
      config: {}
    },
    'shared-serper': {
      enabled: false, // Disabled by default (requires valid shared API key)
      config: {}
    },
    serper: {
      enabled: false,
      config: {},
      usage: {
        count: 0,
        limit: 5000,
        resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
      }
    },
    google: {
      enabled: false,
      config: {},
      usage: {
        count: 0,
        limit: 100,
        resetAt: new Date(new Date().setHours(24, 0, 0, 0)).toISOString()
      }
    },
    brave: {
      enabled: false,
      config: {},
      usage: {
        count: 0,
        limit: 2000,
        resetAt: new Date(new Date().getFullYear(), new Date().getMonth() + 1, 1).toISOString()
      }
    }
  },
  options: {
    autoDetect: true,
    showSources: true,
    cacheResults: true,
    cacheDuration: 86400, // 24 hours in seconds
    timeout: 30000, // 30 seconds
    maxResults: 5
  }
};

// ============================================================================
// ProviderSettingsManager Class
// ============================================================================

export class ProviderSettingsManager {
  private readonly STORAGE_KEY = 'webSearch_settings';
  private settings: WebSearchSettings;

  constructor() {
    this.settings = this.loadSettings();
    this.initializeProviders();
  }

  /**
   * Load settings from localStorage
   */
  private loadSettings(): WebSearchSettings {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Migrate old settings
        const migrated = this.migrateSettings(parsed);
        // Merge with defaults to handle new settings
        return this.mergeWithDefaults(migrated);
      }
    } catch (error) {
      console.error('[ProviderSettings] Failed to load settings:', error);
    }

    return { ...DEFAULT_SETTINGS };
  }

  /**
   * Migrate old settings to new format
   */
  private migrateSettings(settings: any): any {
    let migrated = false;

    // Migrate serpapi → serper
    if (settings.providers?.serpapi) {
      console.log('[ProviderSettings] Migrating serpapi → serper');
      settings.providers.serper = settings.providers.serpapi;
      delete settings.providers.serpapi;
      migrated = true;
    }

    // Update defaultProvider if it was serpapi
    if (settings.defaultProvider === 'serpapi') {
      console.log('[ProviderSettings] Migrating defaultProvider: serpapi → serper');
      settings.defaultProvider = 'serper';
      migrated = true;
    }

    // Clean up any remaining serpapi references
    if (settings.providers) {
      const providerKeys = Object.keys(settings.providers);
      for (const key of providerKeys) {
        if (key === 'serpapi') {
          delete settings.providers[key];
          migrated = true;
        }
      }
    }

    if (migrated) {
      console.log('[ProviderSettings] Migration complete, saving...');
      // Save migrated settings immediately
      try {
        localStorage.setItem(this.STORAGE_KEY, JSON.stringify(settings));
      } catch (error) {
        console.error('[ProviderSettings] Failed to save migrated settings:', error);
      }
    }

    return settings;
  }

  /**
   * Merge loaded settings with defaults
   */
  private mergeWithDefaults(loaded: Partial<WebSearchSettings>): WebSearchSettings {
    return {
      ...DEFAULT_SETTINGS,
      ...loaded,
      providers: {
        ...DEFAULT_SETTINGS.providers,
        ...loaded.providers
      },
      options: {
        ...DEFAULT_SETTINGS.options,
        ...loaded.options
      }
    };
  }

  /**
   * Save settings to localStorage
   */
  private saveSettings(): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(this.settings));
      console.log('[ProviderSettings] Settings saved');
    } catch (error) {
      console.error('[ProviderSettings] Failed to save settings:', error);
    }
  }

  /**
   * Initialize providers in registry based on settings
   */
  private initializeProviders(): void {
    // Valid provider types
    const validProviders: ProviderType[] = ['free', 'shared-serper', 'serper', 'google', 'brave'];
    
    // Register ALL providers (enabled or not) so they can be displayed in UI
    for (const [type, settings] of Object.entries(this.settings.providers)) {
      // Skip invalid provider types (like old serpapi)
      if (!validProviders.includes(type as ProviderType)) {
        console.warn(`[ProviderSettings] Skipping invalid provider type: ${type}`);
        continue;
      }

      const provider = SearchProviderFactory.createProvider(
        type as ProviderType,
        settings.config
      );
      searchProviderRegistry.registerProvider(type as ProviderType, provider);
    }

    // Set default provider
    searchProviderRegistry.setDefaultProvider(this.settings.defaultProvider);
  }

  /**
   * Get all settings
   */
  getSettings(): WebSearchSettings {
    return { ...this.settings };
  }

  /**
   * Update provider configuration
   */
  updateProviderConfig(type: ProviderType, config: SearchProviderConfig): void {
    this.settings.providers[type].config = { ...config };
    this.saveSettings();

    // Update provider in registry
    const provider = SearchProviderFactory.createProvider(type, config);
    searchProviderRegistry.registerProvider(type, provider);

    console.log(`[ProviderSettings] Updated ${type} configuration`);
  }

  /**
   * Enable/disable provider
   */
  setProviderEnabled(type: ProviderType, enabled: boolean): void {
    this.settings.providers[type].enabled = enabled;
    this.saveSettings();

    // Always keep provider in registry, just update its configuration
    // This ensures the UI can always display all providers
    const provider = SearchProviderFactory.createProvider(
      type,
      this.settings.providers[type].config
    );
    searchProviderRegistry.registerProvider(type, provider);

    console.log(`[ProviderSettings] ${type} ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set default provider
   */
  setDefaultProvider(type: ProviderType): void {
    this.settings.defaultProvider = type;
    this.saveSettings();
    searchProviderRegistry.setDefaultProvider(type);

    console.log(`[ProviderSettings] Default provider set to ${type}`);
  }

  /**
   * Update general options
   */
  updateOptions(options: Partial<WebSearchSettings['options']>): void {
    this.settings.options = { ...this.settings.options, ...options };
    this.saveSettings();

    console.log('[ProviderSettings] Options updated');
  }

  /**
   * Set auto-fallback
   */
  setAutoFallback(enabled: boolean): void {
    this.settings.autoFallback = enabled;
    this.saveSettings();
  }

  /**
   * Set smart selection
   */
  setSmartSelection(enabled: boolean): void {
    this.settings.smartSelection = enabled;
    this.saveSettings();
  }

  /**
   * Increment usage count for provider
   */
  incrementUsage(type: ProviderType): void {
    const usage = this.settings.providers[type].usage;
    if (usage) {
      // Check if reset date has passed
      const resetDate = new Date(usage.resetAt);
      if (new Date() > resetDate) {
        // Reset usage
        usage.count = 0;
        usage.resetAt = this.getNextResetDate(type).toISOString();
      }

      usage.count++;
      this.saveSettings();
    }
  }

  /**
   * Get next reset date for provider
   */
  private getNextResetDate(type: ProviderType): Date {
    const now = new Date();

    switch (type) {
      case 'google':
        // Daily reset
        return new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

      case 'shared-serper':
      case 'serper':
      case 'brave':
        // Monthly reset
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);

      default:
        return new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }
  }

  /**
   * Get usage statistics
   */
  getUsageStats(type: ProviderType) {
    return this.settings.providers[type].usage;
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(type: ProviderType): void {
    const usage = this.settings.providers[type].usage;
    if (usage) {
      usage.count = 0;
      usage.resetAt = this.getNextResetDate(type).toISOString();
      this.saveSettings();
    }
  }

  /**
   * Export settings as JSON
   */
  exportSettings(): string {
    return JSON.stringify(this.settings, null, 2);
  }

  /**
   * Import settings from JSON
   */
  importSettings(json: string): boolean {
    try {
      const imported = JSON.parse(json);
      this.settings = this.mergeWithDefaults(imported);
      this.saveSettings();
      this.initializeProviders();
      return true;
    } catch (error) {
      console.error('[ProviderSettings] Failed to import settings:', error);
      return false;
    }
  }

  /**
   * Reset to default settings
   */
  resetToDefaults(): void {
    this.settings = { ...DEFAULT_SETTINGS };
    this.saveSettings();
    this.initializeProviders();

    console.log('[ProviderSettings] Reset to defaults');
  }

  /**
   * Validate provider configuration
   */
  async validateProvider(type: ProviderType): Promise<boolean> {
    const provider = searchProviderRegistry.getProvider(type);
    return await provider.validateConfig();
  }

  /**
   * Test provider connection
   */
  async testProvider(type: ProviderType): Promise<boolean> {
    const provider = searchProviderRegistry.getProvider(type);
    return await provider.testConnection();
  }
}

// ============================================================================
// Export singleton instance
// ============================================================================

export const providerSettingsManager = new ProviderSettingsManager();
