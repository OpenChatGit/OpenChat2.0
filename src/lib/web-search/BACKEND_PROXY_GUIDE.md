# Backend Proxy Implementation Guide

## 🎯 Problem

Browser-basierte Anwendungen können nicht direkt auf externe APIs zugreifen aufgrund von **CORS (Cross-Origin Resource Sharing)** Beschränkungen. Die paid search provider APIs (SerpAPI, Google, Brave) blockieren direkte Requests vom Browser.

## ✅ Lösung

API-Calls müssen über ein **Backend-Proxy** laufen. Da dies eine Tauri-App ist, können wir Rust-Commands verwenden.

---

## 🔧 Implementation Options

### Option 1: Tauri Commands (Empfohlen)

**Vorteile:**
- ✅ Nutzt bestehendes Rust-Backend
- ✅ Keine zusätzlichen Server nötig
- ✅ Sichere API-Key-Verwaltung
- ✅ Native Performance

**Implementation:**

#### 1. Rust Backend (src-tauri/src/main.rs)

```rust
use reqwest;
use serde::{Deserialize, Serialize};

#[derive(Serialize, Deserialize)]
struct SearchRequest {
    provider: String,
    query: String,
    api_key: String,
    max_results: u32,
}

#[derive(Serialize, Deserialize)]
struct SearchResult {
    title: String,
    url: String,
    snippet: String,
    rank: u32,
}

#[tauri::command]
async fn search_with_provider(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    match request.provider.as_str() {
        "serpapi" => search_serpapi(request).await,
        "google" => search_google(request).await,
        "brave" => search_brave(request).await,
        _ => Err("Unknown provider".to_string()),
    }
}

async fn search_serpapi(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    let client = reqwest::Client::new();
    let url = format!(
        "https://serpapi.com/search?q={}&api_key={}&num={}",
        urlencoding::encode(&request.query),
        request.api_key,
        request.max_results
    );

    let response = client
        .get(&url)
        .send()
        .await
        .map_err(|e| e.to_string())?;

    if !response.status().is_success() {
        return Err(format!("API error: {}", response.status()));
    }

    let data: serde_json::Value = response
        .json()
        .await
        .map_err(|e| e.to_string())?;

    // Parse results
    let results = data["organic_results"]
        .as_array()
        .ok_or("No results")?
        .iter()
        .enumerate()
        .map(|(i, item)| SearchResult {
            title: item["title"].as_str().unwrap_or("").to_string(),
            url: item["link"].as_str().unwrap_or("").to_string(),
            snippet: item["snippet"].as_str().unwrap_or("").to_string(),
            rank: (i + 1) as u32,
        })
        .collect();

    Ok(results)
}

async fn search_google(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    // Similar implementation for Google Custom Search
    // URL: https://www.googleapis.com/customsearch/v1
    todo!()
}

async fn search_brave(request: SearchRequest) -> Result<Vec<SearchResult>, String> {
    // Similar implementation for Brave Search
    // URL: https://api.search.brave.com/res/v1/web/search
    todo!()
}

// Register command in main()
fn main() {
    tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            search_with_provider,
            // ... other commands
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

#### 2. TypeScript Frontend Update

Update the provider implementations to use Tauri commands:

```typescript
// src/lib/web-search/providers/SerpAPIProvider.ts

import { invoke } from '@tauri-apps/api/core';

export class SerpAPIProvider extends BaseProvider {
  // ...

  protected async executeSearch(
    query: string,
    options?: SearchOptions
  ): Promise<SearchResult[]> {
    const apiKey = this.config.apiKey;
    if (!apiKey) {
      throw new ProviderError(
        ProviderErrorType.CONFIGURATION_ERROR,
        'SerpAPI key not configured',
        false,
        this.name
      );
    }

    const maxResults = options?.maxResults || 5;
    const timeout = options?.timeout || 10000;

    try {
      // Use Tauri command instead of direct fetch
      const results = await this.withTimeout(
        invoke<SearchResult[]>('search_with_provider', {
          request: {
            provider: 'serpapi',
            query,
            api_key: apiKey,
            max_results: maxResults
          }
        }),
        timeout,
        'SerpAPI search'
      );

      return results.map((result, index) => 
        this.normalizeResult(result, index + 1)
      );

    } catch (error) {
      if (error instanceof ProviderError) {
        throw error;
      }

      throw new ProviderError(
        ProviderErrorType.NETWORK_ERROR,
        `SerpAPI request failed: ${error}`,
        true,
        this.name
      );
    }
  }
}
```

---

### Option 2: Separate Backend Server

**Vorteile:**
- ✅ Unabhängig von Tauri
- ✅ Kann von mehreren Clients genutzt werden
- ✅ Einfacher zu testen

**Nachteile:**
- ❌ Zusätzlicher Server nötig
- ❌ Mehr Komplexität
- ❌ Deployment-Overhead

**Implementation:**

#### 1. Node.js/Express Backend

```javascript
// server.js
const express = require('express');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
app.use(express.json());

app.post('/api/search/serpapi', async (req, res) => {
  try {
    const { query, apiKey, maxResults } = req.body;
    
    const response = await axios.get('https://serpapi.com/search', {
      params: {
        q: query,
        api_key: apiKey,
        num: maxResults
      }
    });

    const results = response.data.organic_results.map((item, i) => ({
      title: item.title,
      url: item.link,
      snippet: item.snippet,
      rank: i + 1
    }));

    res.json(results);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.listen(3001, () => {
  console.log('Proxy server running on port 3001');
});
```

#### 2. Update Provider to use Proxy

```typescript
// Change baseUrl to proxy server
private readonly baseUrl = 'http://localhost:3001/api/search/serpapi';

// Use POST instead of GET
const response = await fetch(this.baseUrl, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    query,
    apiKey: this.config.apiKey,
    maxResults
  })
});
```

---

## 🔐 Security Considerations

### API Key Storage

**Current (Development):**
```typescript
// Stored in localStorage (not encrypted)
localStorage.setItem('search_api_serpapi', apiKey);
```

**Production (Recommended):**
```rust
// Store in Tauri's secure storage
use tauri_plugin_store::StoreBuilder;

#[tauri::command]
async fn store_api_key(provider: String, api_key: String) -> Result<(), String> {
    let store = StoreBuilder::new("api_keys.dat").build();
    store.insert(provider, api_key)?;
    store.save()?;
    Ok(())
}
```

### Rate Limiting

Implement rate limiting in backend:

```rust
use std::collections::HashMap;
use std::time::{Duration, Instant};

struct RateLimiter {
    requests: HashMap<String, Vec<Instant>>,
    max_requests: usize,
    window: Duration,
}

impl RateLimiter {
    fn check_limit(&mut self, provider: &str) -> Result<(), String> {
        let now = Instant::now();
        let requests = self.requests.entry(provider.to_string()).or_insert(vec![]);
        
        // Remove old requests
        requests.retain(|&time| now.duration_since(time) < self.window);
        
        if requests.len() >= self.max_requests {
            return Err("Rate limit exceeded".to_string());
        }
        
        requests.push(now);
        Ok(())
    }
}
```

---

## 📝 Cargo.toml Dependencies

Add to `src-tauri/Cargo.toml`:

```toml
[dependencies]
reqwest = { version = "0.11", features = ["json"] }
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"
urlencoding = "2.1"
tokio = { version = "1", features = ["full"] }
```

---

## 🧪 Testing

### Test Tauri Command

```typescript
// Test in browser console
import { invoke } from '@tauri-apps/api/core';

const result = await invoke('search_with_provider', {
  request: {
    provider: 'serpapi',
    query: 'test',
    api_key: 'your-key',
    max_results: 5
  }
});

console.log(result);
```

### Test Backend Server

```bash
# Start server
node server.js

# Test with curl
curl -X POST http://localhost:3001/api/search/serpapi \
  -H "Content-Type: application/json" \
  -d '{"query":"test","apiKey":"your-key","maxResults":5}'
```

---

## 🚀 Deployment

### Tauri App

1. Build Rust backend with commands
2. Bundle with Tauri
3. Distribute as single executable

### Separate Backend

1. Deploy to cloud (Heroku, AWS, etc.)
2. Update frontend to use production URL
3. Configure CORS for your domain

---

## 📚 Resources

- [Tauri Commands Documentation](https://tauri.app/v1/guides/features/command)
- [Reqwest Documentation](https://docs.rs/reqwest/)
- [SerpAPI Documentation](https://serpapi.com/docs)
- [Google Custom Search API](https://developers.google.com/custom-search/v1/overview)
- [Brave Search API](https://brave.com/search/api/)

---

## ✅ Current Status

**Working:**
- ✅ Free Provider (DuckDuckGo) - Uses existing Rust backend
- ✅ Provider UI and configuration
- ✅ Statistics and monitoring
- ✅ Error handling with CORS detection

**Needs Implementation:**
- ⏳ SerpAPI backend proxy
- ⏳ Google Custom Search backend proxy
- ⏳ Brave Search backend proxy
- ⏳ Secure API key storage
- ⏳ Rate limiting

---

## 💡 Quick Start

For immediate testing, you can:

1. **Use Free Provider** - Works immediately, no setup needed
2. **Mock Paid Providers** - Return dummy data for UI testing
3. **Implement Backend** - Follow Option 1 (Tauri Commands) for production

The UI is fully functional and ready. Only the backend proxy implementation is needed for paid providers to work in production.
