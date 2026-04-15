# Supabase Edge Functions

Alle Edge Functions für OpenChat 2.0 mit korrekter Authorization und ohne Konflikte.

## Übersicht

| Function | Zweck | Auth | Endpoints |
|----------|-------|------|-----------|
| `memory-sync` | Session & Message Sync | User JWT | `/sync`, `/load` |
| `premium-chat` | OpenRouter Proxy mit Reasoning | User JWT | `/`, `/models` |
| `web-search` | Tavily Web Search | User JWT | `/` |
| `verify-user` | Admin User Management | Admin/Owner JWT | `/` |

## Authorization

Alle Functions verwenden **User JWT** aus dem `Authorization` Header:

```typescript
Authorization: Bearer <user_jwt_token>
```

Alternative (bevorzugt für neue Implementierungen):
```typescript
x-user-token: <user_jwt_token>
```

### Wichtig
- ❌ **NICHT** `SUPABASE_ANON_KEY` als Bearer Token verwenden
- ✅ **NUR** User JWT Token aus `supabase.auth.getSession()`
- ✅ Functions extrahieren Token automatisch aus beiden Headers

## Functions im Detail

### 1. memory-sync

**Zweck:** Synchronisiert Chat-Sessions und Messages mit der Cloud

**Endpoints:**
- `POST /sync` - Session und Messages hochladen
- `POST /load` - Session Messages laden

**Features:**
- Auto-Sync von User-Profil-Metadaten
- Upsert-basierte Synchronisation (keine Duplikate)
- Session-Ownership-Validierung

**Request Body (sync):**
```json
{
  "session_id": "uuid",
  "session_title": "Chat Title",
  "messages": [
    {
      "id": "msg-uuid",
      "role": "user",
      "content": "Hello",
      "created_at": "2024-01-01T00:00:00Z",
      "images": [],
      "tokens": {}
    }
  ],
  "provider": "supabase-premium",
  "model": "deepseek/deepseek-v3.2",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

**Request Body (load):**
```json
{
  "session_id": "uuid",
  "limit_messages_per_session": 200
}
```

---

### 2. premium-chat

**Zweck:** Universal OpenRouter Proxy mit dynamischer Reasoning-Unterstützung

**Endpoints:**
- `GET /` oder `GET /models` - Verfügbare Modelle abrufen
- `POST /` - Chat Completion

**Features:**
- Automatische Reasoning-Erkennung (DeepSeek R1, o1, Nemotron, QwQ)
- Dynamische API-Konfiguration pro Modell
- Streaming Support
- Model Pricing Cache (5 Min TTL)
- Credit Management (optional)

**Unterstützte Modelle:**
- DeepSeek V3.2 & R1 (Reasoning)
- Claude Opus 4.6 & Sonnet 4.6
- OpenAI o1-mini (Reasoning)
- Nemotron 3 Super (Reasoning)
- QwQ 32B (Reasoning)
- Qwen 3.6 Plus (Free)
- Gemini 3 Flash & Pro
- GPT-4o Mini
- MiniMax M2.7
- Step 3.5 Flash

**Request Body:**
```json
{
  "model": "deepseek/deepseek-r1",
  "messages": [
    { "role": "user", "content": "Explain quantum computing" }
  ],
  "temperature": 0.7,
  "max_tokens": 4096,
  "stream": true
}
```

**Reasoning-Konfiguration:**
- **Nemotron:** `reasoning: { enabled: true }`
- **Andere Reasoning-Modelle:** `include_reasoning: true, reasoning: { effort: 'high' }`
- **Standard-Modelle:** Keine Reasoning-Flags

---

### 3. web-search

**Zweck:** Web-Suche via Tavily API mit Credit-Management

**Endpoint:** `POST /`

**Features:**
- Tavily API Integration
- Credit-basierte Zugriffskontrolle (100k Credits pro Suche)
- Automatische Credit-Abrechnung
- Result Formatting

**Request Body:**
```json
{
  "query": "latest AI developments",
  "limit": 10
}
```

**Response:**
```json
{
  "results": [
    {
      "title": "Article Title",
      "url": "https://example.com",
      "content": "Article snippet...",
      "score": 0.95,
      "published_date": "2024-01-01",
      "engine": "tavily"
    }
  ],
  "count": 10,
  "credits_used": 100000,
  "remaining_credits": 900000
}
```

---

### 4. verify-user

**Zweck:** Admin-Endpoint für User-Rollen-Management

**Endpoint:** `POST /`

**Auth:** Nur Admin oder Owner

**Features:**
- Rollen-Verwaltung (user, verified, admin, owner)
- Verification-Status-Kontrolle
- Selbst-Modifikations-Schutz
- Owner-Rollen-Schutz

**Request Body:**
```json
{
  "target_user_id": "user-uuid",
  "new_role": "verified",
  "verify": true
}
```

**Rollen-Hierarchie:**
- `user` - Standard-Benutzer
- `verified` - Verifizierter Benutzer
- `admin` - Administrator (kann User verwalten)
- `owner` - Owner (kann Admins verwalten)

---

## Environment Variables

Alle Functions benötigen diese Umgebungsvariablen:

```bash
# Supabase (automatisch gesetzt)
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# OpenRouter (für premium-chat)
OPENROUTER_API_KEY=your-openrouter-key

# Tavily (für web-search)
TAVILY_API_KEY=your-tavily-key
```

## Deployment

### Einzelne Function deployen:
```bash
supabase functions deploy memory-sync
supabase functions deploy premium-chat
supabase functions deploy web-search
supabase functions deploy verify-user
```

### Alle Functions deployen:
```bash
supabase functions deploy
```

### Secrets setzen:
```bash
supabase secrets set OPENROUTER_API_KEY=your-key
supabase secrets set TAVILY_API_KEY=your-key
```

## Testing

### memory-sync testen:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/memory-sync/sync \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "session_id": "test-123",
    "session_title": "Test Chat",
    "messages": []
  }'
```

### premium-chat testen:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/premium-chat \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "qwen/qwen3.6-plus:free",
    "messages": [{"role": "user", "content": "Hello"}],
    "stream": false
  }'
```

### web-search testen:
```bash
curl -X POST https://your-project.supabase.co/functions/v1/web-search \
  -H "Authorization: Bearer YOUR_USER_JWT" \
  -H "Content-Type: application/json" \
  -d '{
    "query": "AI news",
    "limit": 5
  }'
```

## Fehlerbehandlung

Alle Functions geben strukturierte Fehler zurück:

```json
{
  "error": "Error message",
  "details": "Detailed error information"
}
```

**Häufige Fehler:**
- `401 Unauthorized` - Fehlender oder ungültiger JWT Token
- `403 Forbidden` - Keine Berechtigung für diese Operation
- `402 Payment Required` - Nicht genug Credits
- `400 Bad Request` - Ungültige Request-Daten
- `500 Internal Server Error` - Server-Fehler

## Best Practices

1. **Authorization:**
   - Immer User JWT verwenden, nie ANON_KEY
   - Token aus `supabase.auth.getSession()` holen
   - Token im `Authorization: Bearer <token>` Header senden

2. **Error Handling:**
   - Alle Fehler loggen mit Context
   - Strukturierte Error-Responses zurückgeben
   - Sensitive Daten nicht in Errors exposen

3. **Performance:**
   - Caching wo möglich (z.B. Model-Liste)
   - Timeouts für externe APIs setzen
   - Streaming für große Responses nutzen

4. **Security:**
   - Input-Validierung für alle Requests
   - Sanitize Request Bodies vor Weiterleitung
   - Rate Limiting über Supabase konfigurieren

## Monitoring

Logs anschauen:
```bash
supabase functions logs memory-sync
supabase functions logs premium-chat --tail
```

## Troubleshooting

### "Invalid or expired token"
- Token ist abgelaufen → Neuen Token holen
- Falscher Token-Typ → User JWT verwenden, nicht ANON_KEY

### "Insufficient credits"
- User hat nicht genug Credits
- Credits über Admin-Panel aufladen

### "OpenRouter API error"
- OPENROUTER_API_KEY prüfen
- OpenRouter Status prüfen
- Rate Limits prüfen

### "Search service not configured"
- TAVILY_API_KEY fehlt
- Secret neu setzen und Function neu deployen
