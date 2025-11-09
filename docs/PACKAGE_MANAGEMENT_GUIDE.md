# 📦 Canvas Package Management - Benutzerhandbuch

## Übersicht

Das Canvas Package Management System ermöglicht die einfache Installation, Verwaltung und Deinstallation von Packages direkt aus dem Canvas-Editor heraus.

## 🎯 Unterstützte Sprachen

| Sprache | Package Manager | Status |
|---------|----------------|--------|
| 🐍 Python | pip | ✅ Vollständig unterstützt |
| 📜 JavaScript | npm | ✅ Vollständig unterstützt |
| 📘 TypeScript | npm | ✅ Vollständig unterstützt |
| 💎 Ruby | gem | ✅ Vollständig unterstützt |
| 🦀 Rust | cargo | ✅ Vollständig unterstützt |
| 🐹 Go | go modules | ✅ Vollständig unterstützt |
| 🐘 PHP | composer | ✅ Vollständig unterstützt |

## 🚀 Schnellstart

### Package installieren

1. **Öffne den Package Manager**
   - Klicke auf das 📦 Icon in der Editor-Toolbar
   - Oder klicke auf das 📦 Icon im Output-Panel

2. **Package eingeben**
   - Gib den Package-Namen ein (z.B. `requests`, `axios`, `lodash`)
   - Drücke Enter oder klicke auf "Install"

3. **Warten auf Installation**
   - Der Output zeigt den Installationsfortschritt
   - Bei Erfolg erscheint das Package in der Liste

### Package deinstallieren

#### Methode 1: Vollständige Deinstallation
```
1. Öffne Package Manager Dropdown (📦)
2. Hover über das Package
3. Klicke auf 🗑️ (Trash Icon)
4. Bestätige die Deinstallation
→ Package wird von Disk entfernt
```

#### Methode 2: Nur aus Liste entfernen
```
1. Öffne Package Manager Dropdown (📦)
2. Hover über das Package
3. Klicke auf ❌ (X Icon)
→ Package bleibt installiert, wird aber nicht mehr angezeigt
```

### Umgebung bereinigen

```
1. Öffne Package Manager Dropdown (📦)
2. Scrolle zu "⚠️ Danger Zone"
3. Klicke auf "Clean Environment"
4. Bestätige die Aktion
→ Alle Packages werden deinstalliert
→ Virtuelle Umgebung wird gelöscht
→ Speicherplatz wird freigegeben
```

## 🎨 UI-Elemente

### Package Manager Dropdown

```
┌─────────────────────────────────────┐
│ 📦 Package Manager                  │
├─────────────────────────────────────┤
│ Installed Packages (3)  [Clear List]│
│                                     │
│ ✓ requests      [🗑️] [❌]          │
│ ✓ numpy         [🗑️] [❌]          │
│ ✓ pandas        [🗑️] [❌]          │
│                                     │
├─────────────────────────────────────┤
│ Errors (1)              [Clear All] │
│                                     │
│ ⚠️ Failed to install scipy          │
│                                     │
├─────────────────────────────────────┤
│ Install New Package                 │
│ [e.g., requests    ] [Install]      │
│                                     │
├─────────────────────────────────────┤
│ ⚠️ Danger Zone                      │
│                                     │
│ [🗑️ Clean Environment]              │
│                                     │
│ 💡 Tip: Use individual package      │
│    uninstall or Clean Environment   │
└─────────────────────────────────────┘
```

### Icons Bedeutung

| Icon | Bedeutung | Aktion |
|------|-----------|--------|
| 📦 | Package Manager | Öffnet Dropdown |
| ✓ | Installiert | Zeigt Status |
| 🗑️ | Deinstallieren | Entfernt von Disk |
| ❌ | Aus Liste entfernen | Nur UI-Update |
| ⚠️ | Warnung/Fehler | Achtung erforderlich |
| 💡 | Tipp | Hilfreiche Information |

## 🔒 Isolation & Sicherheit

### Python (venv)
```
.canvas_env_${sessionId}/
├── Scripts/
│   ├── python.exe
│   ├── pip.exe
│   └── activate
└── Lib/
    └── site-packages/
        ├── requests/
        ├── numpy/
        └── ...
```

### JavaScript/TypeScript (npm)
```
.canvas_env_${sessionId}/
├── node_modules/
│   ├── axios/
│   ├── lodash/
│   └── ...
└── package.json
```

### Vorteile
- ✅ Keine Konflikte mit System-Packages
- ✅ Einfache Bereinigung
- ✅ Session-spezifische Isolation
- ✅ Automatische Cleanup beim Session-Wechsel

## 📋 Beispiel-Workflows

### Workflow 1: Python Data Science
```python
# 1. Code schreiben
import pandas as pd
import numpy as np

data = pd.DataFrame({'A': [1, 2, 3]})
print(data)

# 2. Ausführen → Fehler: ModuleNotFoundError
# 3. Package Manager öffnen
# 4. "pandas" installieren
# 5. "numpy" installieren
# 6. Code erneut ausführen → Erfolg!
```

### Workflow 2: JavaScript Web App
```javascript
// 1. Code schreiben
const axios = require('axios');

axios.get('https://api.example.com/data')
  .then(response => console.log(response.data));

// 2. Ausführen → Fehler: Cannot find module 'axios'
// 3. Package Manager öffnen
// 4. "axios" installieren
// 5. Code erneut ausführen → Erfolg!
```

### Workflow 3: Projekt abschließen
```
1. Projekt fertig
2. Package Manager öffnen
3. "Clean Environment" klicken
4. Bestätigen
→ Alle Packages deinstalliert
→ Speicherplatz freigegeben
→ Sauberer Zustand für neues Projekt
```

## 🛠️ Fehlerbehebung

### Problem: Package-Installation schlägt fehl

**Lösung 1: Fehler-Details prüfen**
```
1. Öffne Package Manager Dropdown
2. Schaue in "Errors" Sektion
3. Lese Fehlermeldung
4. Behebe Problem (z.B. Internetverbindung)
5. Versuche erneut
```

**Lösung 2: Umgebung neu erstellen**
```
1. Clean Environment
2. Neue Session starten
3. Package erneut installieren
```

### Problem: Package wird nicht gefunden

**Prüfe Package-Namen**
- Python: `requests` nicht `request`
- JavaScript: `axios` nicht `axio`
- Verwende offizielle Package-Namen

**Prüfe Package Manager**
- Python: PyPI (pip)
- JavaScript: npm Registry
- Ruby: RubyGems
- Rust: crates.io
- Go: pkg.go.dev
- PHP: Packagist

### Problem: Zu viele Packages installiert

**Lösung: Selektive Deinstallation**
```
1. Öffne Package Manager
2. Hover über nicht benötigte Packages
3. Klicke 🗑️ für jedes Package
4. Behalte nur benötigte Packages
```

## 💡 Best Practices

### 1. Minimale Packages
```
✅ Installiere nur benötigte Packages
❌ Vermeide unnötige Dependencies
```

### 2. Regelmäßige Bereinigung
```
✅ Clean Environment nach Projekt-Abschluss
✅ Entferne nicht mehr benötigte Packages
❌ Lasse alte Packages nicht akkumulieren
```

### 3. Fehlerbehandlung
```
✅ Prüfe Fehler-Sektion regelmäßig
✅ Behebe Fehler sofort
❌ Ignoriere Fehlermeldungen nicht
```

### 4. Session-Management
```
✅ Eine Session pro Projekt
✅ Clean Environment beim Session-Wechsel
❌ Mische nicht verschiedene Projekte
```

## 🔄 Automatische Features

### Auto-Installation (Python)
```python
# Code mit fehlenden Packages ausführen
import requests  # Fehlt

# System erkennt fehlendes Package
# → Automatische Installation
# → Erneute Ausführung
# → Erfolg!
```

### Auto-Cleanup
```
# Session wechseln
→ Alte Umgebung wird automatisch bereinigt
→ Neue Umgebung wird erstellt
→ Keine manuellen Schritte nötig
```

## 📊 Package-Statistiken

### Anzeige im Dropdown
```
📦 Package Manager
├── Installed Packages (5)  ← Anzahl
├── Errors (2)              ← Anzahl
└── 🔒 Sandboxed            ← Status
```

### Badge im Icon
```
📦 [5]  ← Anzahl installierter Packages
📦 [•]  ← Fehler vorhanden
```

## 🎓 Erweiterte Nutzung

### Package-Versionen (zukünftig)
```
requests==2.28.0
numpy>=1.20.0
pandas~=1.5.0
```

### Bulk-Operationen (zukünftig)
```
[✓] requests
[✓] numpy
[✓] pandas
[Uninstall Selected]
```

### Package-Suche (zukünftig)
```
Search: [req___________]
        ↓
        requests ⭐ 50k
        requestium ⭐ 1k
        request-id ⭐ 500
```

## 📞 Support

Bei Problemen:
1. Prüfe Fehler-Sektion im Package Manager
2. Schaue in Output-Panel für Details
3. Versuche Clean Environment
4. Erstelle neue Session

## 🎉 Zusammenfassung

Das Canvas Package Management System bietet:
- ✅ Einfache Installation
- ✅ Flexible Deinstallation
- ✅ Isolierte Umgebungen
- ✅ Multi-Sprachen-Support
- ✅ Automatische Bereinigung
- ✅ Benutzerfreundliche UI
- ✅ Robuste Fehlerbehandlung

Viel Erfolg beim Coden! 🚀
