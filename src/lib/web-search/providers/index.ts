/**
 * Provider System - Public API
 * 
 * Central export point for the provider system.
 * Import everything you need from this file.
 */

// Types
export type {
  SearchProvider,
  SearchProviderConfig,
  SearchOptions,
  SearchResult,
  ProviderMetadata,
  ProviderStats,
  ProviderCategory,
  PricingInfo,
  ApiUsageData
} from './types';

export {
  ProviderError,
  ProviderErrorType
} from './types';

// Base Provider
export { BaseProvider } from './BaseProvider';

// Provider Implementations
export { FreeSearchProvider } from './FreeSearchProvider';
export { SharedSerperProvider } from './SharedSerperProvider';
export { SerperAPIProvider } from './SerpAPIProvider';
export { GoogleSearchProvider } from './GoogleSearchProvider';
export { BraveSearchProvider } from './BraveSearchProvider';

// Factory and Registry
export {
  SearchProviderFactory,
  type ProviderType
} from './SearchProviderFactory';

export {
  SearchProviderRegistry,
  searchProviderRegistry
} from './SearchProviderRegistry';

// Settings Manager
export {
  ProviderSettingsManager,
  providerSettingsManager,
  type ProviderSettings,
  type WebSearchSettings
} from './ProviderSettingsManager';
