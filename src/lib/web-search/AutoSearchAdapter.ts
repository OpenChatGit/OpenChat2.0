/**
 * AutoSearchAdapter - Adapter for backward compatibility
 * 
 * This adapter wraps the new SmartSearchManager to provide the same
 * interface as the old AutoSearchManager, ensuring backward compatibility
 * with existing chat integration.
 */

import { smartSearchManager } from './SmartSearchManager';
import { searchOrchestrator } from './searchOrchestrator';
import { providerSettingsManager } from './providers/ProviderSettingsManager';
import { loadContextFormatter } from './lazyLoader';
import type { SearchContext, OutputFormat } from './types';
import type { Message } from '../../types';

// ============================================================================
// Configuration
// ============================================================================

interface AutoSearchConfig {
  enabled: boolean;
  maxResults: number;
  timeout: number;
  outputFormat: OutputFormat;
  maxContextLength: number;
}

const DEFAULT_CONFIG: AutoSearchConfig = {
  enabled: false,
  maxResults: 5,
  timeout: 30000,
  outputFormat: 'verbose',
  maxContextLength: 8000
};

// ============================================================================
// Query Analysis Patterns
// ============================================================================

const GERMAN_QUESTION_WORDS = [
  'wer', 'was', 'wann', 'wo', 'wie', 'warum', 'weshalb', 'wieso',
  'welche', 'welcher', 'welches', 'woher', 'wohin', 'womit'
];

const ENGLISH_QUESTION_WORDS = [
  'who', 'what', 'when', 'where', 'why', 'how', 'which', 'whose'
];

const TIME_KEYWORDS = [
  'heute', 'aktuell', 'neueste', 'jetzt', 'momentan', 'derzeit',
  'kürzlich', 'letzte', 'aktuelle', 'neuste', 'gegenwärtig',
  'today', 'current', 'latest', 'now', 'recent', 'currently',
  'this year', 'this month', 'this week'
];

const INFO_REQUEST_KEYWORDS = [
  'erkläre', 'erklär', 'zeige', 'zeig', 'finde', 'such', 'suche',
  'gib mir', 'liste', 'nenne', 'beschreibe', 'was ist', 'was sind',
  'informiere', 'berichte', 'erzähle',
  'explain', 'show', 'find', 'search', 'give me', 'list', 'tell me',
  'describe', 'what is', 'what are', 'inform', 'report'
];

const YEAR_PATTERN = /\b(202[0-9]|2030)\b/;

// ============================================================================
// AutoSearchAdapter Class
// ============================================================================

export class AutoSearchAdapter {
  private config: AutoSearchConfig;

  constructor() {
    this.config = { ...DEFAULT_CONFIG };
    
    // Initialize with current provider settings
    this.syncWithProviderSettings();
  }

  /**
   * Sync with provider settings
   */
  private syncWithProviderSettings(): void {
    const settings = providerSettingsManager.getSettings();
    smartSearchManager.configure({
      enableAutoFallback: settings.autoFallback,
      enableSmartSelection: settings.smartSelection,
      preferredProvider: settings.defaultProvider
    });
    
    console.log('[AutoSearchAdapter] Synced with provider settings:', {
      defaultProvider: settings.defaultProvider,
      autoFallback: settings.autoFallback,
      smartSelection: settings.smartSelection
    });
  }

  /**
   * Configure the adapter
   */
  configure(config: Partial<AutoSearchConfig>): void {
    this.config = { ...this.config, ...config };

    // Always sync with latest provider settings
    this.syncWithProviderSettings();
  }

  /**
   * Determine if search should be performed
   */
  async shouldSearch(
    query: string,
    _conversationHistory: Message[]
  ): Promise<boolean> {
    if (!this.config.enabled) {
      return false;
    }

    const lowerQuery = query.toLowerCase();

    // Check for question words
    const hasQuestionWord = 
      GERMAN_QUESTION_WORDS.some(word => lowerQuery.includes(word)) ||
      ENGLISH_QUESTION_WORDS.some(word => lowerQuery.includes(word));

    // Check for time-related keywords
    const hasTimeKeyword = TIME_KEYWORDS.some(keyword => 
      lowerQuery.includes(keyword.toLowerCase())
    );

    // Check for information request keywords
    const hasInfoRequest = INFO_REQUEST_KEYWORDS.some(keyword =>
      lowerQuery.includes(keyword.toLowerCase())
    );

    // Check for year mentions
    const hasYear = YEAR_PATTERN.test(query);

    // Check for question mark
    const hasQuestionMark = query.includes('?');

    // Determine if search is needed
    const shouldSearch = 
      hasQuestionWord ||
      hasTimeKeyword ||
      hasInfoRequest ||
      hasYear ||
      hasQuestionMark;

    if (shouldSearch) {
      console.log('[AutoSearchAdapter] Search triggered:', {
        hasQuestionWord,
        hasTimeKeyword,
        hasInfoRequest,
        hasYear,
        hasQuestionMark
      });
    }

    return shouldSearch;
  }

  /**
   * Perform search using new multi-provider system
   */
  async performSearch(query: string): Promise<SearchContext> {
    console.log('[AutoSearchAdapter] Performing search with new multi-provider system');

    try {
      // Use SmartSearchManager for intelligent provider selection
      const { results, metadata } = await smartSearchManager.search(
        query,
        this.config.maxResults
      );

      console.log(`[AutoSearchAdapter] Search completed: ${results.length} results from ${metadata.provider}`);

      // Convert to SearchContext format
      const searchContext: SearchContext = {
        query,
        sources: results.map(r => ({
          url: r.url,
          title: r.title,
          snippet: r.snippet,
          publishedDate: r.publishedDate,
          domain: new URL(r.url).hostname
        })),
        chunks: results.map((r, index) => ({
          content: r.snippet,
          source: r.url,
          relevanceScore: 1.0 - (index * 0.1),
          position: index + 1,
          metadata: {
            wordCount: r.snippet.split(/\s+/).length,
            publishedDate: r.publishedDate,
            domain: new URL(r.url).hostname,
            isTrustedDomain: false
          }
        })),
        summary: `Found ${results.length} results from ${metadata.provider}${metadata.usedFallback ? ' (fallback)' : ''}`,
        timestamp: Date.now()
      };

      return searchContext;

    } catch (error) {
      console.error('[AutoSearchAdapter] Search failed:', error);
      throw error;
    }
  }

  /**
   * Inject search context into user message
   */
  async injectContext(
    userMessage: string,
    searchContext: SearchContext
  ): Promise<string> {
    // Load context formatter lazily
    const formatter = await loadContextFormatter();

    // Convert SearchContext to ProcessedContext
    const processedContext = {
      query: searchContext.query,
      chunks: searchContext.chunks,
      totalChunks: searchContext.chunks.length,
      selectedChunks: searchContext.chunks.length
    };

    // Format context
    const formattedContext = formatter.format(
      processedContext,
      this.config.outputFormat
    );

    // Inject context
    return `${userMessage}\n\n${formattedContext}`;
  }

  /**
   * Get orchestrator (for backward compatibility)
   */
  getOrchestrator() {
    return searchOrchestrator;
  }
}

