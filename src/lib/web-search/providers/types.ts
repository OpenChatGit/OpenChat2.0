/**
 * Provider System Types
 * 
 * Core interfaces and types for the multi-provider search architecture.
 * This module defines the contract that all search providers must implement.
 */

// ============================================================================
// Provider Configuration
// ============================================================================

export interface SearchProviderConfig {
  apiKey?: string;
  searchEngineId?: string;
  maxResults?: number;
  timeout?: number;
  [key: string]: any; // Allow provider-specific config
}

export interface SearchOptions {
  maxResults?: number;
  language?: string;
  dateRange?: 'day' | 'week' | 'month' | 'year';
  domain?: string;
  timeout?: number;
}

// ============================================================================
// Search Results
// ============================================================================

export interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  domain: string;
  publishedDate?: Date;
  favicon?: string;
  rank: number;
}

// ============================================================================
// Provider Interface
// ============================================================================

export type ProviderCategory = 'free' | 'paid';

export interface SearchProvider {
  readonly name: string;
  readonly type: ProviderCategory;
  readonly requiresApiKey: boolean;
  
  /**
   * Configure the provider with API keys and settings
   */
  configure(config: SearchProviderConfig): void;
  
  /**
   * Perform a search query
   */
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>;
  
  /**
   * Validate the current configuration
   */
  validateConfig(): Promise<boolean>;
  
  /**
   * Test connection to the provider
   */
  testConnection(): Promise<boolean>;
  
  /**
   * Get provider-specific metadata
   */
  getMetadata(): ProviderMetadata;
  
  /**
   * Get provider statistics
   */
  getStats(): ProviderStats;
  
  /**
   * Reset provider statistics
   */
  resetStats(): void;
  
  /**
   * Get real-time usage data from the API (if supported)
   */
  getApiUsage?(): Promise<ApiUsageData | null>;
}

// ============================================================================
// API Usage Data
// ============================================================================

export interface ApiUsageData {
  used: number;
  limit: number;
  remaining: number;
  resetDate?: Date;
  period: 'day' | 'month' | 'year';
}

// ============================================================================
// Provider Metadata
// ============================================================================

export interface ProviderMetadata {
  name: string;
  type: ProviderCategory;
  description: string;
  pricing?: PricingInfo;
  features: string[];
  limitations?: string[];
  setupInstructions?: string;
  documentationUrl?: string;
}

export interface PricingInfo {
  model: 'free' | 'subscription' | 'pay-per-use';
  freeTier?: {
    limit: number;
    period: 'day' | 'month' | 'year';
  };
  paidTier?: {
    price: number;
    currency: string;
    limit: number;
    period: 'day' | 'month' | 'year';
  };
  costPerSearch?: number;
}

// ============================================================================
// Provider Errors
// ============================================================================

export enum ProviderErrorType {
  CONFIGURATION_ERROR = 'configuration_error',
  AUTHENTICATION_ERROR = 'authentication_error',
  RATE_LIMIT_ERROR = 'rate_limit_error',
  NETWORK_ERROR = 'network_error',
  TIMEOUT_ERROR = 'timeout_error',
  PARSE_ERROR = 'parse_error',
  NO_RESULTS = 'no_results',
  UNKNOWN_ERROR = 'unknown_error'
}

export class ProviderError extends Error {
  constructor(
    public type: ProviderErrorType,
    message: string,
    public retryable: boolean = false,
    public provider?: string
  ) {
    super(message);
    this.name = 'ProviderError';
  }
}

// ============================================================================
// Provider Statistics
// ============================================================================

export interface ProviderStats {
  totalSearches: number;
  successfulSearches: number;
  failedSearches: number;
  averageResponseTime: number;
  lastUsed?: Date;
  estimatedCost: number;
}
