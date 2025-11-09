# Chat Web Search Provider Guide

## How to Use Different Search Providers in Chat

The chat automatically uses the configured search provider when the Web Search toggle is enabled.

### 🎯 Quick Setup

1. **Enable Web Search in Chat**
   - Click the Globe icon (🌐) in the chat input
   - Icon turns blue when enabled

2. **Configure Your Preferred Provider**
   - Open Settings → Web Search → Provider Settings
   - Choose your default provider
   - Configure API keys if needed

3. **Start Searching!**
   - Ask questions in chat
   - Search happens automatically
   - Results are injected into context

---

## 📊 Provider Selection Logic

### Default Behavior
The system uses your **Default Provider** from settings:
- Settings → Web Search → Provider Settings
- Click "Set as Default Provider" on any provider

### Smart Selection (Optional)
Enable "Smart Provider Selection" for automatic optimization:
- **Simple queries** → Free Provider (DuckDuckGo)
- **Complex queries** → Premium Provider (if configured)

**Examples:**
```
Simple: "What is Python?"
→ Uses Free Provider

Complex: "site:github.com machine learning frameworks 2024"
→ Uses Serper API (if configured)
```

---

## 🔧 Provider Configuration

### Free Provider (DuckDuckGo)
**Setup:** None required - works immediately!
- ✅ No API key needed
- ✅ Unlimited searches
- ✅ Good quality results
- ⚠️ Slower than paid providers (~1-2s)

### Shared Serper (10 Free/Month)
**Setup:** Requires shared API key (configured by admin)
- ✅ No personal API key needed
- ✅ 10 free searches per user per month
- ✅ Fast results (< 500ms)
- ⚠️ Limited to 10 searches/month

### Serper API (Your Own Key)
**Setup:** Get API key from [serper.dev](https://serper.dev)

1. Sign up at serper.dev
2. Get your API key
3. Settings → Web Search → Provider Settings
4. Find "Serper API" card
5. Enter API key
6. Click "Test" to verify
7. Click "Set as Default Provider"

**Benefits:**
- ✅ 2,500 free searches (one-time)
- ✅ Very fast (< 500ms)
- ✅ High quality results
- ✅ $0.001 per search after free tier

### Google Custom Search
**Setup:** More complex - requires Google Cloud setup

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Create new project
3. Enable Custom Search API
4. Create API credentials
5. Create custom search engine at [cse.google.com](https://cse.google.com)
6. Get Search Engine ID (cx parameter)
7. Enter both in Settings

**Benefits:**
- ✅ Official Google results
- ✅ 100 free searches per day
- ⚠️ More expensive ($0.005/search)
- ⚠️ Complex setup

### Brave Search API
**Setup:** Get API key from [brave.com/search/api](https://brave.com/search/api)

**Benefits:**
- ✅ Privacy-focused
- ✅ Independent index
- ✅ 2,000 free searches/month
- ✅ $0.003 per search

---

## 🎮 Usage Examples

### Example 1: Using Free Provider
```
Settings:
- Default Provider: DuckDuckGo (Free)
- Web Search Toggle: ON

Chat:
User: "What is the current weather in Berlin?"
→ System searches with DuckDuckGo
→ Results injected into context
→ AI responds with current info
```

### Example 2: Using Serper API
```
Settings:
- Default Provider: Serper API
- API Key: configured
- Web Search Toggle: ON

Chat:
User: "Latest AI news 2024"
→ System searches with Serper API
→ Fast results (< 500ms)
→ AI responds with latest news
→ Cost: $0.001
```

### Example 3: Smart Selection
```
Settings:
- Default Provider: Serper API
- Smart Selection: ON
- Auto-Fallback: ON
- Web Search Toggle: ON

Chat:
User: "What is 2+2?"
→ Smart Selection: Simple query
→ Uses Free Provider (saves money)

User: "site:arxiv.org quantum computing papers 2024"
→ Smart Selection: Complex query
→ Uses Serper API (better quality)
```

---

## 🔄 Auto-Fallback

If enabled, the system automatically falls back to Free Provider if your paid provider fails:

```
Settings:
- Default Provider: Serper API
- Auto-Fallback: ON

Scenario 1: Serper API works
User: "Latest news"
→ Serper API: Success ✅
→ Fast, high-quality results

Scenario 2: Serper API fails (quota exceeded)
User: "Latest news"
→ Serper API: Failed ❌
→ Auto-Fallback: DuckDuckGo ✅
→ Search still works!
```

---

## 📈 Monitoring Usage

### View Real-Time Usage
Settings → Web Search → Provider Settings
- Each provider card shows current usage
- Updates automatically every 60 seconds
- Shows remaining searches and reset date

### Check Search History
Settings → Web Search → Dashboard
- View all searches
- See which provider was used
- Track costs
- Monitor performance

---

## 💡 Best Practices

### For Cost Optimization
1. ✅ Use Free Provider as default
2. ✅ Enable Smart Selection
3. ✅ Enable Auto-Fallback
4. ✅ Monitor usage regularly

### For Best Quality
1. ✅ Use Serper API as default
2. ✅ Disable Smart Selection
3. ✅ Enable Auto-Fallback (safety net)
4. ✅ Monitor costs

### For Privacy
1. ✅ Use Brave Search API
2. ✅ Or use Free Provider (DuckDuckGo)
3. ✅ Disable Smart Selection
4. ✅ Enable Auto-Fallback

---

## 🐛 Troubleshooting

### Web Search Not Working
**Check:**
1. Is Web Search toggle enabled? (Globe icon should be blue)
2. Is a provider configured and enabled?
3. Check browser console for errors
4. Try testing provider in Settings

### Provider Not Being Used
**Check:**
1. Is provider set as default?
2. Is provider enabled?
3. Is API key configured (for paid providers)?
4. Check console logs for provider selection

### "Usage data unavailable"
**Causes:**
- No API key configured
- Invalid API key
- API endpoint unreachable

**Solutions:**
1. Configure valid API key
2. Test connection in Settings
3. Check API key in provider dashboard

---

## 🎯 Quick Reference

| Provider | Setup | Cost | Speed | Quality |
|----------|-------|------|-------|---------|
| Free (DuckDuckGo) | None | $0 | ~1-2s | Good |
| Shared Serper | None | $0 (10/mo) | < 500ms | High |
| Serper API | API Key | $0.001 | < 500ms | High |
| Google | Complex | $0.005 | ~1s | High |
| Brave | API Key | $0.003 | ~1s | High |

---

## 📚 Additional Resources

- [Serper API Docs](https://serper.dev/docs)
- [Google Custom Search Docs](https://developers.google.com/custom-search)
- [Brave Search API Docs](https://brave.com/search/api/)
- [DuckDuckGo](https://duckduckgo.com)

---

## 🎉 Summary

1. **Enable Web Search** - Click Globe icon in chat
2. **Configure Provider** - Settings → Web Search → Provider Settings
3. **Set as Default** - Click "Set as Default Provider"
4. **Start Chatting** - Search happens automatically!

The system will use your configured provider for all web searches in chat. Switch providers anytime in Settings!
