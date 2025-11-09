# Migration Guide: Multi-Provider Architecture

This guide helps you migrate from the old single-provider search system to the new multi-provider architecture.

## 🎯 What Changed?

### Before (Old System)
```typescript
import { searchEngineFactory } from './searchEngineFactory';

// Direct search with factory
const results = await searchEngineFactory.search(query, maxResults);
```

### After (New System)
```typescript
import { smartSearchManager } from './SmartSearchManager';

// Smart search with automatic provider selection and fallback
const { results, metadata } = await smartSearchManager.search(query, maxResults);
```

## 🔄 Key Changes

### 1. SearchOrchestrator

**Old:**
```typescript
import { searchOrchestrator } from './searchOrchestrator';

const results = await searchOrchestrator.search(query, maxResults);
```

**New:**
```typescript
import { searchOrchestrator } from './searchOrchestrator';

// Still works! Now uses SmartSearchManager internally
const results = await searchOrchestrator.search(query, maxResults);
```

✅ **No changes needed** - SearchOrchestrator now uses the new provider system internally.

### 2. AutoSearchManager

**Old:**
```typescript
import { autoSearchManager } from './autoSearchManager';

const shouldSearch = await autoSearchManager.shouldSearch(query);
if (shouldSearch) {
  const context = await autoSearchManager.performSearch(query);
}
```

**New:**
```typescript
import { autoSearchManager } from './autoSearchManager';

// Same API, but now uses multi-provider system
const shouldSearch = await autoSearchManager.shouldSearch(query);
if (shouldSearch) {
  const context = await autoSearchManager.performSearch(query);
}
```

✅ **No changes needed** - AutoSearchManager uses SearchOrchestrator which now uses providers.

## 🆕 New Features

### 1. Configure Search Providers

```typescript
import { providerSettingsManager } from './providers';

// Configure SerpAPI
providerSettingsManager.updateProviderConfig('serpapi', {
  apiKey: 'your-serpapi-key'
});

providerSettingsManager.setProviderEnabled('serpapi', true);
providerSettingsManager.setDefaultProvider('serpapi');
```

### 2. Smart Search with Metadata

```typescript
import { smartSearchManager } from './SmartSearchManager';

const { results, metadata } = await smartSearchManager.search(query, 5);

console.log(`Provider: ${metadata.provider}`);
console.log(`Results: ${metadata.resultCount}`);
console.log(`Time: ${metadata.searchTime}ms`);
console.log(`Cost: $${metadata.cost}`);
console.log(`Used fallback: ${metadata.usedFallback}`);
```

### 3. Provider Statistics

```typescript
import { searchProviderRegistry } from './providers';

const provider = searchProviderRegistry.getProvider('serpapi');
const stats = provider.getStats();

console.log(`Total searches: ${stats.totalSearches}`);
console.log(`Success rate: ${stats.successfulSearches / stats.totalSearches}`);
console.log(`Average time: ${stats.averageResponseTime}ms`);
console.log(`Estimated cost: $${stats.estimatedCost}`);
```

### 4. Automatic Fallback

```typescript
import { smartSearchManager } from './SmartSearchManager';

// Configure fallback
smartSearchManager.configure({
  enableAutoFallback: true,  // Falls back to free provider on paid provider errors
  enableSmartSelection: true // Automatically selects best provider based on query
});

// Search will automatically fall back to free provider if paid provider fails
const { results, metadata } = await smartSearchManager.search(query, 5);

if (metadata.usedFallback) {
  console.log('Paid provider failed, used free provider as fallback');
}
```

## 📦 Import Changes

### Old Imports
```typescript
import { searchEngineFactory } from './searchEngineFactory';
import { searchOrchestrator } from './searchOrchestrator';
import { autoSearchManager } from './autoSearchManager';
```

### New Imports (Recommended)
```typescript
// Use the unified index
import {
  smartSearchManager,
  searchOrchestrator,
  autoSearchManager,
  providerSettingsManager,
  searchProviderRegistry
} from './lib/web-search';
```

## 🔧 Configuration Migration

### Old Configuration (if you had custom settings)
```typescript
// Settings were hardcoded or in separate files
const SEARCH_TIMEOUT = 30000;
const MAX_RESULTS = 5;
```

### New Configuration
```typescript
import { providerSettingsManager } from './providers';

// Centralized settings management
providerSettingsManager.updateOptions({
  timeout: 30000,
  maxResults: 5,
  cacheResults: true,
  cacheDuration: 86400
});
```

## 🎨 UI Integration

### Settings Component

```typescript
import { providerSettingsManager, searchProviderRegistry } from './lib/web-search';

function WebSearchSettings() {
  const [settings, setSettings] = useState(providerSettingsManager.getSettings());
  
  const handleProviderChange = (type: ProviderType) => {
    providerSettingsManager.setDefaultProvider(type);
    setSettings(providerSettingsManager.getSettings());
  };
  
  const handleApiKeyUpdate = (type: ProviderType, apiKey: string) => {
    providerSettingsManager.updateProviderConfig(type, { apiKey });
  };
  
  const testConnection = async (type: ProviderType) => {
    const success = await providerSettingsManager.testProvider(type);
    alert(success ? 'Connection successful!' : 'Connection failed');
  };
  
  return (
    <div>
      {/* Provider selection UI */}
      {/* API key inputs */}
      {/* Test connection buttons */}
    </div>
  );
}
```

## ⚠️ Breaking Changes

### None!

The new system is **fully backward compatible**. All existing code will continue to work without modifications.

The old `searchEngineFactory` is still available but deprecated. It now uses the free provider internally.

## 🚀 Recommended Migration Path

### Phase 1: No Changes Required
- ✅ Your existing code works as-is
- ✅ Free provider is used by default
- ✅ All functionality preserved

### Phase 2: Add Provider Configuration (Optional)
```typescript
// Add settings UI for users to configure paid providers
import { providerSettingsManager } from './lib/web-search';

// Let users add their API keys
providerSettingsManager.updateProviderConfig('serpapi', {
  apiKey: userProvidedKey
});
```

### Phase 3: Enable Smart Features (Optional)
```typescript
import { smartSearchManager } from './lib/web-search';

// Enable automatic fallback and smart selection
smartSearchManager.configure({
  enableAutoFallback: true,
  enableSmartSelection: true
});
```

### Phase 4: Add Statistics Dashboard (Optional)
```typescript
import { smartSearchManager } from './lib/web-search';

// Show usage statistics to users
const stats = smartSearchManager.getAggregatedStats();

console.log(`Total searches: ${stats.totalSearches}`);
console.log(`Total cost: $${stats.totalCost}`);
console.log('Provider usage:', stats.providerUsage);
```

## 📊 Testing Your Migration

```typescript
// Test that everything still works
import { searchOrchestrator } from './lib/web-search';

async function testMigration() {
  try {
    // This should work exactly as before
    const results = await searchOrchestrator.search('test query', 5);
    console.log('✅ Migration successful!', results.length, 'results');
  } catch (error) {
    console.error('❌ Migration issue:', error);
  }
}

testMigration();
```

## 🆘 Troubleshooting

### Issue: "Provider not found"
**Solution:** Make sure providers are registered:
```typescript
import { searchProviderRegistry, SearchProviderFactory } from './lib/web-search';

// Register free provider (should be automatic)
const freeProvider = SearchProviderFactory.createProvider('free');
searchProviderRegistry.registerProvider('free', freeProvider);
```

### Issue: "API key not configured"
**Solution:** Configure the provider before use:
```typescript
import { providerSettingsManager } from './lib/web-search';

providerSettingsManager.updateProviderConfig('serpapi', {
  apiKey: 'your-key-here'
});
providerSettingsManager.setProviderEnabled('serpapi', true);
```

### Issue: "Search slower than before"
**Solution:** The free provider is the same as before. If using paid providers, check network connectivity and API status.

## 📚 Additional Resources

- [Provider System README](./providers/README.md)
- [Implementation Plan](../../WEB_SEARCH_MULTI_PROVIDER_PLAN.md)
- [API Documentation](./index.ts)

## 💡 Tips

1. **Start with free provider** - No changes needed, works out of the box
2. **Add paid providers gradually** - Test each provider individually
3. **Monitor costs** - Use statistics to track API usage
4. **Enable fallback** - Ensures searches always work even if paid provider fails
5. **Use smart selection** - Let the system choose the best provider for each query

## ✅ Migration Checklist

- [ ] Verify existing searches still work
- [ ] Test with free provider (default)
- [ ] Add provider configuration UI (optional)
- [ ] Configure paid providers (optional)
- [ ] Enable auto-fallback (recommended)
- [ ] Add usage statistics dashboard (optional)
- [ ] Test error handling and fallback
- [ ] Update documentation for your users
