# Web Search UI Components

React components for configuring and monitoring the multi-provider web search system.

## 📦 Components

### 1. WebSearchProviderSettings

**Purpose:** Configure search providers and API keys

**Features:**
- Provider selection (Free, SerpAPI, Google, Brave)
- API key configuration with masking
- Connection testing
- Usage statistics per provider
- Enable/disable providers
- Set default provider
- Auto-fallback toggle
- Smart selection toggle

**Usage:**
```tsx
import { WebSearchProviderSettings } from './components/WebSearchProviderSettings';

function SettingsPage() {
  return (
    <div>
      <WebSearchProviderSettings />
    </div>
  );
}
```

**Features per Provider:**

#### Free Provider (DuckDuckGo)
- ✅ Always enabled
- ✅ No configuration needed
- ✅ Unlimited searches
- ✅ No API key required

#### SerpAPI
- 🔑 API key required
- 💰 $50/month for 5,000 searches
- 🆓 100 free searches/month
- ⚡ Fast response times
- 📊 Usage tracking

#### Google Custom Search
- 🔑 API key + Search Engine ID required
- 💰 $5 per 1,000 searches
- 🆓 100 free searches/day
- ⚡ Fast response times
- 📊 Daily usage tracking

#### Brave Search API
- 🔑 API key required
- 💰 $3 per 1,000 searches
- 🆓 2,000 free searches/month
- ⚡ Fast response times
- 🔒 Privacy-focused

---

### 2. WebSearchStatistics

**Purpose:** Monitor search usage and costs

**Features:**
- Total searches counter
- Total cost tracking
- Average response time
- Fallback usage statistics
- Provider usage breakdown (pie chart)
- Per-provider detailed stats
- Cost breakdown
- Auto-refresh (every 5 seconds)
- Manual refresh button
- Reset statistics

**Usage:**
```tsx
import { WebSearchStatistics } from './components/WebSearchStatistics';

function DashboardPage() {
  return (
    <div>
      <WebSearchStatistics />
    </div>
  );
}
```

**Displayed Metrics:**

#### Overview Cards
- Total Searches
- Total Cost ($)
- Average Response Time (ms)
- Fallback Usage (count + percentage)

#### Provider Usage Chart
- Visual breakdown of searches per provider
- Percentage distribution
- Color-coded progress bars

#### Per-Provider Details
- Search count
- Success rate (%)
- Average response time (ms)
- Estimated cost ($)

#### Cost Breakdown
- Cost per provider
- Percentage of total cost
- Total cost summary

---

### 3. WebSearchSettings

**Purpose:** Configure search behavior and RAG processing

**Features:**
- Auto web search toggle
- Max results slider (1-10)
- Cache enable/disable
- RAG configuration:
  - Chunk size (500-2000 chars)
  - Max chunks (3-20)
  - Recency weight (0-1)
  - Quality weight (0-1)
  - Trusted domains list
- Reset to defaults button
- **Includes WebSearchProviderSettings**

**Usage:**
```tsx
import { WebSearchSettings } from './components/WebSearchSettings';

function SettingsPage() {
  const [settings, setSettings] = useState(DEFAULT_WEB_SEARCH_SETTINGS);

  return (
    <WebSearchSettings
      settings={settings}
      onUpdateSettings={setSettings}
    />
  );
}
```

---

## 🎨 UI Design Patterns

### Provider Card Layout

```
┌─────────────────────────────────────────────┐
│ Provider Name                    [Toggle]   │
│ Description                                 │
│ 🔍 X searches  💰 $X.XX  ⏱️ XXXms          │
├─────────────────────────────────────────────┤
│ API Key: [●●●●●●●●●●1234] [👁️] [Test]    │
│ ✅ Connection successful!                   │
│                                             │
│ Usage: ████████░░ 80% (800/1000)           │
│ Resets: Jan 1, 2024                        │
│                                             │
│ Pricing: $50/month for 5,000 searches      │
│                                             │
│ [Show details ▼]                           │
│                                             │
│ Features:                                   │
│ ✓ High-quality results                     │
│ ✓ Fast response times                      │
│                                             │
│ [Set as Default Provider]                  │
└─────────────────────────────────────────────┘
```

### Statistics Dashboard Layout

```
┌─────────────────────────────────────────────┐
│ Search Statistics          [Refresh] [Reset]│
├─────────────────────────────────────────────┤
│ ┌──────┐ ┌──────┐ ┌──────┐ ┌──────┐       │
│ │ 172  │ │$0.15 │ │1250ms│ │  3   │       │
│ │Search│ │ Cost │ │ Time │ │Fallbk│       │
│ └──────┘ └──────┘ └──────┘ └──────┘       │
├─────────────────────────────────────────────┤
│ Provider Usage                              │
│ DuckDuckGo ████████████░░░░ 70% (120)     │
│ SerpAPI    ████░░░░░░░░░░░░ 20% (34)      │
│ Google     ██░░░░░░░░░░░░░░ 10% (18)      │
├─────────────────────────────────────────────┤
│ Provider Details                            │
│ ┌─────────────────────────────────────────┐│
│ │ SerpAPI                          [Paid] ││
│ │ 34 searches | 97.1% success | 850ms    ││
│ │ Cost: $0.34                             ││
│ └─────────────────────────────────────────┘│
└─────────────────────────────────────────────┘
```

---

## 🔧 Integration

### Add to Settings Page

```tsx
// src/components/Settings.tsx
import { WebSearchSettings } from './WebSearchSettings';

export function Settings() {
  return (
    <div className="space-y-6">
      {/* Existing settings */}
      
      {/* Web Search Settings */}
      <div>
        <h3 className="text-lg font-semibold mb-3">Web Search</h3>
        <WebSearchSettings />
      </div>
    </div>
  );
}
```

### Add Statistics to Dashboard

```tsx
// src/components/Dashboard.tsx
import { WebSearchStatistics } from './WebSearchStatistics';

export function Dashboard() {
  return (
    <div className="space-y-6">
      <h2>Dashboard</h2>
      
      {/* Web Search Statistics */}
      <WebSearchStatistics />
    </div>
  );
}
```

---

## 🎯 User Flows

### Configure a Paid Provider

1. Navigate to Settings → Web Search
2. Find the provider card (e.g., SerpAPI)
3. Toggle the provider ON
4. Enter API key
5. Click "Test" to verify connection
6. See ✅ "Connection successful!"
7. Click "Save Configuration"
8. Optionally click "Set as Default Provider"

### Monitor Usage

1. Navigate to Statistics/Dashboard
2. View overview cards (searches, cost, time)
3. Check provider usage breakdown
4. Review per-provider details
5. Monitor cost breakdown
6. Click "Refresh" for latest data

### Switch Providers

1. Navigate to Settings → Web Search
2. Find desired provider card
3. Click "Set as Default Provider"
4. Provider is now used for all searches

---

## 🎨 Styling

All components use Tailwind CSS with the following design tokens:

**Colors:**
- Primary: `text-primary`, `bg-primary`
- Muted: `text-muted-foreground`, `bg-muted`
- Border: `border-border`
- Success: `text-green-600 dark:text-green-400`
- Error: `text-red-600 dark:text-red-400`
- Warning: `text-yellow-600 dark:text-yellow-400`

**Components:**
- Button: `./ui/Button`
- Input: `./ui/Input`
- Toggle: `./ui/Toggle`
- Slider: `./ui/Slider`

**Icons:**
- Lucide React icons
- Size: `w-4 h-4` or `w-5 h-5`

---

## 🧪 Testing

### Manual Testing Checklist

**Provider Configuration:**
- [ ] Toggle provider on/off
- [ ] Enter API key
- [ ] Test connection (success)
- [ ] Test connection (failure)
- [ ] Save configuration
- [ ] Set as default
- [ ] View usage statistics
- [ ] Expand/collapse details

**Statistics:**
- [ ] View overview cards
- [ ] Check provider usage chart
- [ ] Review per-provider details
- [ ] Monitor cost breakdown
- [ ] Refresh statistics
- [ ] Reset statistics

**Integration:**
- [ ] Settings persist across page reloads
- [ ] Statistics update in real-time
- [ ] Provider changes reflect immediately
- [ ] Error messages display correctly

---

## 📱 Responsive Design

All components are responsive and work on:
- ✅ Desktop (1920x1080+)
- ✅ Laptop (1366x768+)
- ✅ Tablet (768x1024+)
- ✅ Mobile (375x667+)

**Breakpoints:**
- `md:` - 768px+
- `lg:` - 1024px+

**Grid Layouts:**
- Overview cards: 1 column (mobile) → 2 columns (tablet) → 4 columns (desktop)
- Provider cards: 1 column (all sizes)

---

## 🔐 Security

**API Key Handling:**
- Keys are masked by default (●●●●●●●●1234)
- Toggle visibility with eye icon
- Keys stored in localStorage (encrypted in future)
- Keys never logged or exposed in errors

**Validation:**
- API keys validated before saving
- Connection tested before enabling
- Invalid configurations prevented

---

## 🚀 Future Enhancements

- [ ] Export statistics as CSV/JSON
- [ ] Cost alerts and notifications
- [ ] Provider health monitoring
- [ ] Search history viewer
- [ ] Batch provider testing
- [ ] Custom provider addition
- [ ] Dark/light theme support
- [ ] Keyboard shortcuts
- [ ] Accessibility improvements (ARIA labels)

---

## 📚 Related Documentation

- [Provider System](../../lib/web-search/providers/README.md)
- [Migration Guide](../../lib/web-search/MIGRATION.md)
- [Architecture](../../lib/web-search/ARCHITECTURE.md)
