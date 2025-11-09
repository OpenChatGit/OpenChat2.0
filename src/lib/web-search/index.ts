/**
 * Web Search System - Public API
 * 
 * Unified export point for the entire web search system.
 */

// Core types
export type {
  SearchOptions,
  SearchResult,
  SearchContext,
  SearchStats,
  ScrapedContent,
  ContentMetadata,
  Source,
  ContentChunk,
  ProcessedContext,
  RAGConfig,
  OutputFormat
} from './types';

export {
  SearchErrorType,
  DEFAULT_RAG_CONFIG,
  DEFAULT_SEARCH_OPTIONS
} from './types';

// Provider system
export {
  // Types
  type SearchProvider,
  type SearchProviderConfig,
  type ProviderMetadata,
  type ProviderStats,
  type PricingInfo,
  ProviderError,
  ProviderErrorType,
  
  // Implementations
  FreeSearchProvider,
  SerperAPIProvider,
  GoogleSearchProvider,
  BraveSearchProvider,
  
  // Management
  SearchProviderFactory,
  type ProviderType,
  SearchProviderRegistry,
  searchProviderRegistry,
  
  // Settings
  ProviderSettingsManager,
  providerSettingsManager,
  type ProviderSettings,
  type WebSearchSettings
} from './providers';

// Smart search manager
export {
  SmartSearchManager,
  smartSearchManager,
  type SearchMetadata
} from './SmartSearchManager';

// Core orchestration
export {
  SearchOrchestrator,
  searchOrchestrator
} from './searchOrchestrator';

// Auto-search manager
export {
  AutoSearchManager,
  autoSearchManager
} from './autoSearchManager';

// Backend scraper
export {
  BackendScraper,
  type ScrapeResult,
  type ScrapeOptions
} from './backendScraper';

// Source registry
export {
  SourceRegistry
} from './sourceRegistry';

// Search events
export {
  SearchEventEmitter,
  createSearchEvent,
  type SearchEventType,
  type SearchEventListener,
  type SearchEvent,
  type SearchStartedEvent,
  type SearchResultsFoundEvent,
  type ScrapingStartedEvent,
  type ScrapingCompletedEvent,
  type ProcessingStartedEvent,
  type ProcessingCompletedEvent,
  type SearchCompletedEvent,
  type SearchErrorEvent
} from './searchEvents';
