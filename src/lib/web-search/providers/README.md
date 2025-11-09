# Web Search Provider System

A modular, extensible multi-provider search architecture that supports both free and paid search APIs.

## 🏗️ Architecture

```
┌─────────────────────────────────────────┐
│      SmartSearchManager                 │
│  (Intelligent orchestration)            │
└─────────────────┬───────────────────────┘
                  │
┌─────────────────▼───────────────────────┐
│    SearchProviderRegistry               │
│  (Provider management)                  │
└─────────────────┬───────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌──────▼──────────┐
│ Free Provider  │  │ Paid Providers  │
│ (DuckDuckGo)   │  │ (SerpAPI, etc.) │
└────────────────┘  └─────────────────┘
```

## 📦 Components

### Core Interfaces

- **`SearchProvider`**: Base interface all providers must implement
- **`SearchProviderConfig`**: Configuration structure for providers
- **`SearchResult`**: Standardized search result format
- **`ProviderMetadata`**: Provider information and capabilities

### Provider Implementations

1. **FreeSearchProvider** (DuckDuckGo)
   - No API key required
   - Unlimited searches
   - Backend Rust scraping

2. **SerpAPIProvider**
   - $50/month for 5,000 searches
   - High-quality Google results
   - Fast response times

3. **GoogleSearchProvider**
   - 100 free searches/day
   - Official Google API
   - Requires API key + Search Engine ID

4. **BraveSearchProvider**
   - 2,000 free searches/month
   - Privacy-focused
   - Independent index

### Management Classes

- **`SearchProviderFactory`**: Creates provider instances
- **`SearchProviderRegistry`**: Manages registered providers
- **`SmartSearchManager`**: Intelligent search orchestration
- **`ProviderSettingsManager`**: Persistent configuration storage

## 🚀 Usage

### Basic Search

```typescript
import { searchProviderRegistry } from './providers';

// Use default provider
const provider = searchProviderRegistry.getDefaultProvider();
const results = await provider.search('TypeScript tutorial', { maxResults: 5 });
```

### Smart Search with Fallback

```typescript
import { smartSearchManager } from './SmartSearchManager';

// Automatically selects best provider and falls back on errors
const { results, metadata } = await smartSearchManager.search('React hooks', 5);

console.log(`Found ${results.length} results via ${metadata.provider}`);
console.log(`Search took ${metadata.searchTime}ms, cost: $${metadata.cost}`);
```

### Configure Providers

```typescript
import { providerSettingsManager } from './providers';

// Configure SerpAPI
providerSettingsManager.updateProviderConfig('serpapi', {
  apiKey: 'your-api-key-here',
  maxResults: 10
});

// Enable provider
providerSettingsManager.setProviderEnabled('serpapi', true);

// Set as default
providerSettingsManager.setDefaultProvider('serpapi');
```

### Test Provider Connection

```typescript
import { providerSettingsManager } from './providers';

const isValid = await providerSettingsManager.testProvider('serpapi');
if (isValid) {
  console.log('SerpAPI connection successful!');
}
```

## 🔧 Adding a New Provider

1. Create a new provider class extending `BaseProvider`:

```typescript
import { BaseProvider } from './BaseProvider';
import type { SearchOptions, SearchResult, ProviderMetadata } from './types';

export class MyCustomProvider extends BaseProvider {
  readonly name = 'My Custom Search';
  readonly type = 'paid' as const;
  readonly requiresApiKey = true;

  protected async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    // Implement your search logic
    const response = await fetch(`https://api.example.com/search?q=${query}`);
    const data = await response.json();
    
    return data.results.map((r, i) => this.normalizeResult(r, i + 1));
  }

  async validateConfig(): Promise<boolean> {
    return this.validateApiKey(this.config.apiKey);
  }

  getMetadata(): ProviderMetadata {
    return {
      name: this.name,
      type: this.type,
      description: 'My custom search provider',
      // ... more metadata
    };
  }
}
```

2. Register in `SearchProviderFactory`:

```typescript
case 'mycustom':
  provider = new MyCustomProvider();
  break;
```

3. Add to settings defaults in `ProviderSettingsManager`.

## 📊 Statistics & Monitoring

### Provider Statistics

```typescript
const provider = searchProviderRegistry.getProvider('serpapi');
const stats = provider.getStats();

console.log(`Total searches: ${stats.totalSearches}`);
console.log(`Success rate: ${stats.successfulSearches / stats.totalSearches * 100}%`);
console.log(`Average response time: ${stats.averageResponseTime}ms`);
console.log(`Estimated cost: $${stats.estimatedCost}`);
```

### Aggregated Statistics

```typescript
const stats = smartSearchManager.getAggregatedStats();

console.log(`Total searches: ${stats.totalSearches}`);
console.log(`Fallback usage: ${stats.fallbackSearches}`);
console.log(`Total cost: $${stats.totalCost}`);
console.log('Provider usage:', stats.providerUsage);
```

## 🔐 Security

- API keys are stored in localStorage (consider encryption for production)
- Keys are never logged or exposed in error messages
- Validation before each search request
- Rate limiting awareness

## 🎯 Features

- ✅ Multiple provider support
- ✅ Automatic fallback on failures
- ✅ Smart provider selection
- ✅ Cost tracking
- ✅ Usage statistics
- ✅ Persistent configuration
- ✅ Provider health monitoring
- ✅ Standardized error handling
- ✅ Timeout management
- ✅ Result normalization

## 📝 Configuration Storage

Settings are stored in localStorage under the key `webSearch_settings`:

```json
{
  "enabled": true,
  "defaultProvider": "free",
  "autoFallback": true,
  "smartSelection": false,
  "providers": {
    "free": { "enabled": true, "config": {} },
    "serpapi": { "enabled": false, "config": { "apiKey": "..." } }
  },
  "options": {
    "maxResults": 5,
    "timeout": 30000
  }
}
```

## 🧪 Testing

```typescript
// Test all providers
const providers = searchProviderRegistry.listProviders();

for (const { id, provider } of providers) {
  console.log(`Testing ${provider.name}...`);
  
  const isValid = await provider.validateConfig();
  console.log(`  Config valid: ${isValid}`);
  
  if (isValid) {
    const canConnect = await provider.testConnection();
    console.log(`  Connection: ${canConnect ? 'OK' : 'FAILED'}`);
  }
}
```

## 📚 API Reference

See individual class files for detailed API documentation:

- `types.ts` - Core interfaces and types
- `BaseProvider.ts` - Abstract base class
- `SearchProviderFactory.ts` - Provider creation
- `SearchProviderRegistry.ts` - Provider management
- `SmartSearchManager.ts` - Intelligent orchestration
- `ProviderSettingsManager.ts` - Configuration persistence
