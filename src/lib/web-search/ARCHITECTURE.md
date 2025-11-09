# Web Search System Architecture

## 🏗️ System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                        User Interface                           │
│                    (React Components)                           │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                    AutoSearchManager                            │
│  • Query analysis (should search?)                              │
│  • Search query extraction                                      │
│  • Context injection                                            │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   SearchOrchestrator                            │
│  • Caching (LRU + TTL)                                          │
│  • Scraping coordination                                        │
│  • Source registry                                              │
│  • Statistics tracking                                          │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                   SmartSearchManager                            │
│  • Provider selection (smart/manual)                            │
│  • Automatic fallback                                           │
│  • Cost tracking                                                │
│  • Search history                                               │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│                SearchProviderRegistry                           │
│  • Provider registration                                        │
│  • Provider retrieval                                           │
│  • Default provider management                                  │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    ┌────────┴────────┐
                    │                 │
┌───────────────────▼──┐   ┌──────────▼──────────────────────────┐
│  FreeSearchProvider  │   │     Paid Search Providers           │
│  (DuckDuckGo)        │   │  • SerpAPIProvider                  │
│                      │   │  • GoogleSearchProvider             │
│  • No API key        │   │  • BraveSearchProvider              │
│  • Unlimited         │   │                                     │
│  • Backend scraping  │   │  • API key required                 │
└──────────────────────┘   │  • Rate limits                      │
                           │  • Cost tracking                    │
                           └─────────────────────────────────────┘
```

## 📦 Layer Breakdown

### Layer 1: User Interface
**Responsibility:** User interaction and display

**Components:**
- Chat interface
- Settings UI
- Statistics dashboard

**Interactions:**
- Calls `AutoSearchManager` for searches
- Displays results and metadata
- Configures providers via `ProviderSettingsManager`

---

### Layer 2: Auto Search Manager
**Responsibility:** Intelligent search triggering

**Key Functions:**
```typescript
shouldSearch(query: string): Promise<boolean>
  → Analyzes if web search would be helpful
  
extractSearchQuery(query: string): string
  → Optimizes query for search engines
  
performSearch(query: string): Promise<SearchContext>
  → Executes full search pipeline
  
injectContext(message: string, context: SearchContext): Promise<string>
  → Formats and injects search results
```

**Features:**
- Query analysis (question detection, time references)
- Query optimization (stopword removal, temporal context)
- Context formatting (verbose/compact/json)
- Event emission (progress updates)

---

### Layer 3: Search Orchestrator
**Responsibility:** Caching and scraping coordination

**Key Functions:**
```typescript
search(query: string, maxResults: number): Promise<SearchResult[]>
  → Executes search with caching
  
scrapeContent(urls: string[]): Promise<ScrapedContent[]>
  → Scrapes content from URLs
  
getCached(query: string): SearchContext | null
  → Retrieves cached results
  
setCached(query: string, context: SearchContext): void
  → Stores results in cache
```

**Features:**
- LRU cache with TTL
- Automatic cache cleanup
- Parallel scraping
- Source registry
- Statistics tracking

---

### Layer 4: Smart Search Manager
**Responsibility:** Provider selection and fallback

**Key Functions:**
```typescript
search(query: string, maxResults: number): Promise<{
  results: SearchResult[];
  metadata: SearchMetadata;
}>
  → Intelligent search with metadata
  
selectProvider(query: string): ProviderType
  → Chooses best provider
  
smartSelectProvider(query: string): ProviderType
  → Analyzes query complexity
```

**Features:**
- Query complexity analysis
- Automatic provider selection
- Fallback to free provider
- Cost tracking
- Search history
- Aggregated statistics

---

### Layer 5: Provider Registry
**Responsibility:** Provider management

**Key Functions:**
```typescript
registerProvider(id: ProviderType, provider: SearchProvider): void
  → Registers a provider
  
getProvider(id?: ProviderType): SearchProvider
  → Retrieves provider
  
setDefaultProvider(id: ProviderType): void
  → Sets default
  
listProviders(): Array<{id, provider}>
  → Lists all providers
```

**Features:**
- Provider registration
- Default provider management
- Provider lookup
- Statistics aggregation

---

### Layer 6: Search Providers
**Responsibility:** Actual search execution

**Interface:**
```typescript
interface SearchProvider {
  search(query: string, options?: SearchOptions): Promise<SearchResult[]>
  validateConfig(): Promise<boolean>
  testConnection(): Promise<boolean>
  getMetadata(): ProviderMetadata
  getStats(): ProviderStats
  resetStats(): void
}
```

**Implementations:**

#### FreeSearchProvider
```typescript
Type: Free
Backend: Rust scraping (Tauri)
Speed: 2-5 seconds
Quality: Medium
Limit: Unlimited
```

#### SerpAPIProvider
```typescript
Type: Paid
API: https://serpapi.com
Speed: < 1 second
Quality: High
Cost: $0.01/search
Free Tier: 100/month
```

#### GoogleSearchProvider
```typescript
Type: Paid
API: Google Custom Search
Speed: < 1 second
Quality: High
Cost: $0.005/search
Free Tier: 100/day
```

#### BraveSearchProvider
```typescript
Type: Paid
API: Brave Search API
Speed: < 1 second
Quality: Good
Cost: $0.003/search
Free Tier: 2000/month
```

---

## 🔄 Data Flow

### Search Request Flow

```
1. User Query
   ↓
2. AutoSearchManager.shouldSearch()
   → Analyzes query
   → Decides if search needed
   ↓
3. AutoSearchManager.performSearch()
   → Extracts optimized query
   ↓
4. SearchOrchestrator.search()
   → Checks cache
   → If cached: return immediately
   → If not cached: continue
   ↓
5. SmartSearchManager.search()
   → Selects provider (smart/manual)
   → Executes search
   → Handles fallback on error
   ↓
6. SearchProvider.search()
   → Calls API or scrapes
   → Returns results
   ↓
7. SearchOrchestrator.scrapeContent()
   → Scrapes full content from URLs
   → Parallel execution
   ↓
8. RAGProcessor.process()
   → Chunks content
   → Ranks by relevance
   → Selects best chunks
   ↓
9. ContextFormatter.format()
   → Formats for LLM
   → Adds citations
   ↓
10. AutoSearchManager.injectContext()
    → Injects into user message
    → Returns enhanced message
    ↓
11. LLM Processing
    → Generates response
    → Uses search context
```

### Configuration Flow

```
1. User Updates Settings
   ↓
2. ProviderSettingsManager.updateProviderConfig()
   → Validates configuration
   → Saves to localStorage
   ↓
3. SearchProviderFactory.createProvider()
   → Creates new provider instance
   → Applies configuration
   ↓
4. SearchProviderRegistry.registerProvider()
   → Registers in registry
   → Updates default if needed
   ↓
5. Provider Ready
   → Available for searches
   → Can be tested
```

## 🎯 Design Patterns

### 1. Factory Pattern
**Used in:** `SearchProviderFactory`

```typescript
SearchProviderFactory.createProvider('serpapi', config)
  → Creates SerpAPIProvider instance
  → Applies configuration
  → Returns SearchProvider interface
```

**Benefits:**
- Centralized provider creation
- Easy to add new providers
- Configuration abstraction

---

### 2. Registry Pattern
**Used in:** `SearchProviderRegistry`

```typescript
registry.registerProvider('serpapi', provider)
registry.getProvider('serpapi')
registry.setDefaultProvider('serpapi')
```

**Benefits:**
- Centralized provider management
- Dynamic provider switching
- Default provider handling

---

### 3. Strategy Pattern
**Used in:** Provider implementations

```typescript
interface SearchProvider {
  search(query, options): Promise<SearchResult[]>
}

class FreeSearchProvider implements SearchProvider { ... }
class SerpAPIProvider implements SearchProvider { ... }
```

**Benefits:**
- Interchangeable algorithms
- Runtime provider switching
- Easy testing

---

### 4. Template Method Pattern
**Used in:** `BaseProvider`

```typescript
abstract class BaseProvider {
  // Template method
  async search(query, options) {
    // Common logic
    const results = await this.executeSearch(query, options);
    // More common logic
    return results;
  }
  
  // Abstract method (implemented by subclasses)
  protected abstract executeSearch(query, options): Promise<SearchResult[]>
}
```

**Benefits:**
- Code reuse
- Consistent behavior
- Easy to extend

---

### 5. Singleton Pattern
**Used in:** Manager instances

```typescript
export const smartSearchManager = new SmartSearchManager();
export const searchProviderRegistry = new SearchProviderRegistry();
export const providerSettingsManager = new ProviderSettingsManager();
```

**Benefits:**
- Shared state
- Single source of truth
- Easy access

---

## 🔐 Security Architecture

### API Key Storage

```
User Input (API Key)
   ↓
ProviderSettingsManager
   ↓
[Future: Encryption Layer]
   ↓
localStorage
   ↓
[Future: Decryption Layer]
   ↓
Provider Configuration
   ↓
API Request (HTTPS)
```

### Error Handling

```
Provider Error
   ↓
ProviderError (typed)
   ↓
SmartSearchManager
   ↓
Fallback Logic
   ↓
User-Friendly Message
   (No sensitive data)
```

---

## 📊 Statistics Architecture

### Per-Provider Statistics

```typescript
BaseProvider
  ↓
  stats: {
    totalSearches: number
    successfulSearches: number
    failedSearches: number
    averageResponseTime: number
    estimatedCost: number
  }
```

### Aggregated Statistics

```typescript
SmartSearchManager
  ↓
  searchHistory: SearchMetadata[]
  ↓
  getAggregatedStats(): {
    totalSearches
    fallbackSearches
    totalCost
    averageSearchTime
    providerUsage
  }
```

---

## 🧪 Testing Architecture

### Unit Testing

```
Provider Tests
  ├── FreeSearchProvider.test.ts
  ├── SerpAPIProvider.test.ts
  ├── GoogleSearchProvider.test.ts
  └── BraveSearchProvider.test.ts

Manager Tests
  ├── SmartSearchManager.test.ts
  ├── SearchProviderRegistry.test.ts
  └── ProviderSettingsManager.test.ts

Utility Tests
  ├── SearchProviderFactory.test.ts
  └── BaseProvider.test.ts
```

### Integration Testing

```
End-to-End Flow
  ├── Search with free provider
  ├── Search with paid provider
  ├── Fallback mechanism
  ├── Caching behavior
  └── Settings persistence
```

### Mocking Strategy

```typescript
// Mock provider
const mockProvider: SearchProvider = {
  name: 'Mock',
  type: 'free',
  search: jest.fn().mockResolvedValue([...]),
  validateConfig: jest.fn().mockResolvedValue(true),
  testConnection: jest.fn().mockResolvedValue(true),
  getMetadata: jest.fn().mockReturnValue({...}),
  getStats: jest.fn().mockReturnValue({...}),
  resetStats: jest.fn()
};

// Register mock
searchProviderRegistry.registerProvider('mock', mockProvider);

// Test
const results = await smartSearchManager.search('test', 5);
expect(mockProvider.search).toHaveBeenCalledWith('test', { maxResults: 5 });
```

---

## 🚀 Scalability

### Horizontal Scaling
- ✅ Multiple providers can be used simultaneously
- ✅ Load balancing across providers
- ✅ Parallel scraping

### Vertical Scaling
- ✅ Caching reduces API calls
- ✅ Smart selection optimizes costs
- ✅ Fallback ensures availability

### Future Scaling
- [ ] Provider health monitoring
- [ ] Automatic provider rotation
- [ ] Request queuing
- [ ] Rate limit management
- [ ] Distributed caching

---

## 📈 Performance Characteristics

### Search Latency

```
Free Provider (DuckDuckGo):
  Search: 2-5 seconds
  Scraping: 3-10 seconds
  Total: 5-15 seconds

Paid Providers (SerpAPI, Google, Brave):
  Search: 0.5-1 second
  Scraping: 3-10 seconds
  Total: 3.5-11 seconds

With Cache:
  Search: < 10ms
  Scraping: 0ms (cached)
  Total: < 10ms
```

### Memory Usage

```
Provider Registry: ~1 KB
Settings Manager: ~5 KB
Cache (100 entries): ~10-50 MB
Search History (100): ~100 KB
Total: ~10-50 MB
```

### API Costs

```
Free Provider: $0
SerpAPI: $0.01/search
Google: $0.005/search
Brave: $0.003/search

With Smart Selection:
  Average: $0.002-0.005/search
  (70% free, 30% paid)
```

---

## 🎯 Summary

The architecture is designed for:
- ✅ **Modularity** - Easy to add/remove components
- ✅ **Extensibility** - Simple to add new providers
- ✅ **Reliability** - Automatic fallback and error handling
- ✅ **Performance** - Caching and smart selection
- ✅ **Cost Efficiency** - Track and optimize costs
- ✅ **Maintainability** - Clear separation of concerns
- ✅ **Testability** - Easy to mock and test
- ✅ **Scalability** - Ready for growth

The system follows SOLID principles and uses proven design patterns to ensure long-term maintainability and extensibility.
