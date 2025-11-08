# Debug Guide - File Persistence

## Problem
Files verschwinden nach Reload, obwohl sie erstellt wurden.

## Debug Steps

### 1. Öffne Browser Console (F12)

### 2. Erstelle Multi-File Projekt
Sage zur AI: "Create a website with index.html, styles.css, and script.js"

### 3. Beobachte Console Logs

#### Beim Erstellen der Files:
```
[Canvas] 📡 Streaming code: html (XXX chars) ✓ Complete
[Canvas] 📁 All code blocks: [...]
[Canvas] 📁 Files detected: 3
[Canvas] 📁 Block details: html (index.html), css (styles.css), javascript (script.js)
[Canvas] ➕ Adding new file: index.html html (XXX chars)
[Canvas] ➕ Adding new file: styles.css css (XXX chars)
[Canvas] ➕ Adding new file: script.js javascript (XXX chars)
[Canvas] ✅ Total files: 3 index.html, styles.css, script.js
[Canvas] 💾 Saving to session: {
  sessionId: "canvas-...",
  filesCount: 3,
  fileNames: ["index.html", "styles.css", "script.js"],
  currentFileId: "file-...",
  showFileExplorer: true
}
[Canvas] ✅ Multi-files saved to session
```

#### In useCanvasChat:
```
[useCanvasChat] 💾 saveCanvasState called: {
  sessionId: "canvas-...",
  codeLength: XXX,
  language: "html",
  filesCount: 3,
  fileNames: ["index.html", "styles.css", "script.js"],
  currentFileId: "file-...",
  showFileExplorer: true
}
[useCanvasChat] ✅ Sessions updated, session data: {
  id: "canvas-...",
  title: "New Canvas",
  canvasFiles: [
    { id: "file-...", name: "index.html", language: "html", content: "..." },
    { id: "file-...", name: "styles.css", language: "css", content: "..." },
    { id: "file-...", name: "script.js", language: "javascript", content: "..." }
  ],
  showFileExplorer: true,
  ...
}
```

#### In localStorage:
```
[useCanvasChat] 💾 Saving sessions to localStorage: {
  count: 1,
  sessions: [{
    id: "canvas-...",
    title: "New Canvas",
    filesCount: 3,
    fileNames: ["index.html", "styles.css", "script.js"],
    showFileExplorer: true
  }]
}
[useCanvasChat] ✅ Sessions saved to localStorage
```

### 4. Reload Page (Ctrl+R)

#### Beim Laden:
```
[useCanvasChat] 📂 Loaded sessions from localStorage: {
  count: 1,
  sessions: [{
    id: "canvas-...",
    title: "New Canvas",
    filesCount: 3,
    fileNames: ["index.html", "styles.css", "script.js"],
    showFileExplorer: true
  }]
}
```

#### In Canvas Component:
```
[Canvas] 📁 Restoring files from session: {
  sessionId: "canvas-...",
  filesCount: 3,
  fileNames: ["index.html", "styles.css", "script.js"],
  currentFileId: "file-...",
  showFileExplorer: true
}
[Canvas] 📄 Restored current file: index.html
[Canvas] 📂 Restoring file explorer state: true
[Canvas] ✅ Files restored successfully
```

### 5. Überprüfe UI

**Erwartung:**
- ✅ File Explorer Button ist sichtbar
- ✅ Badge zeigt "3"
- ✅ Dropdown ist geöffnet (showFileExplorer: true)
- ✅ Alle 3 Files sind in der Liste
- ✅ index.html ist ausgewählt (bg-primary/20)

## Troubleshooting

### Problem 1: Keine Logs beim Speichern
**Symptom:**
```
[Canvas] ❌ Cannot save - missing session or save function: {
  hasSession: false,
  hasSaveFunction: true
}
```

**Ursache:** currentSession ist undefined

**Lösung:** 
- Überprüfe ob Canvas Session erstellt wurde
- Überprüfe ob `currentSession` prop korrekt übergeben wird

---

### Problem 2: Files werden nicht gespeichert
**Symptom:**
```
[useCanvasChat] 💾 saveCanvasState called: {
  filesCount: 0,
  fileNames: []
}
```

**Ursache:** Files Array ist leer beim Speichern

**Lösung:**
- Überprüfe ob `setFiles(updatedFiles)` aufgerufen wird
- Überprüfe ob `updatedFiles` nicht leer ist
- Überprüfe ob `onSaveCanvasState` mit korrekten Parametern aufgerufen wird

---

### Problem 3: Files werden nicht geladen
**Symptom:**
```
[Canvas] ℹ️ No files in session to restore
```

**Ursache:** `currentSession.canvasFiles` ist undefined oder leer

**Lösung:**
- Überprüfe localStorage: `localStorage.getItem('canvas-chat-sessions')`
- Überprüfe ob Session die Files enthält
- Überprüfe ob `canvasFiles` Array vorhanden ist

---

### Problem 4: Dropdown verschwindet
**Symptom:**
```
[Canvas] 📂 Restoring file explorer state: undefined
```

**Ursache:** `showFileExplorer` wurde nicht gespeichert

**Lösung:**
- Überprüfe ob `showFileExplorer` beim Speichern übergeben wird
- Überprüfe ob `showFileExplorer` in Session vorhanden ist
- Fallback: Auto-open bei >1 File sollte greifen

---

### Problem 5: localStorage ist leer
**Symptom:**
```
[useCanvasChat] 📂 Loaded sessions from localStorage: {
  count: 0,
  sessions: []
}
```

**Ursache:** Sessions wurden nie gespeichert oder localStorage wurde gelöscht

**Lösung:**
- Überprüfe ob `useEffect` für localStorage-Save läuft
- Überprüfe Browser localStorage: DevTools → Application → Local Storage
- Überprüfe ob `sessions` State aktualisiert wird

---

## Manual localStorage Check

### 1. Öffne Browser DevTools (F12)

### 2. Gehe zu Application Tab → Local Storage

### 3. Suche nach Key: `canvas-chat-sessions`

### 4. Überprüfe Value:
```json
[
  {
    "id": "canvas-1234567890",
    "title": "New Canvas",
    "messages": [...],
    "provider": "ollama",
    "model": "llama3.2",
    "createdAt": 1234567890,
    "updatedAt": 1234567890,
    "canvasCode": "<!DOCTYPE html>...",
    "canvasLanguage": "html",
    "canvasFiles": [
      {
        "id": "file-1234567890-0",
        "name": "index.html",
        "language": "html",
        "content": "<!DOCTYPE html>..."
      },
      {
        "id": "file-1234567890-1",
        "name": "styles.css",
        "language": "css",
        "content": "body { ... }"
      },
      {
        "id": "file-1234567890-2",
        "name": "script.js",
        "language": "javascript",
        "content": "console.log('test');"
      }
    ],
    "currentFileId": "file-1234567890-0",
    "showFileExplorer": true
  }
]
```

**Erwartung:**
- ✅ `canvasFiles` Array ist vorhanden
- ✅ `canvasFiles` enthält alle 3 Files
- ✅ Jedes File hat: `id`, `name`, `language`, `content`
- ✅ `currentFileId` ist gesetzt
- ✅ `showFileExplorer` ist `true`

---

## Quick Test Script

Füge in Browser Console ein:

```javascript
// Check localStorage
const sessions = JSON.parse(localStorage.getItem('canvas-chat-sessions') || '[]');
console.log('Sessions:', sessions.length);
sessions.forEach(s => {
  console.log(`Session ${s.id}:`, {
    title: s.title,
    filesCount: s.canvasFiles?.length || 0,
    fileNames: s.canvasFiles?.map(f => f.name) || [],
    showFileExplorer: s.showFileExplorer
  });
});

// Check current session
const currentSession = JSON.parse(localStorage.getItem('current-canvas-session') || 'null');
if (currentSession) {
  console.log('Current Session:', {
    id: currentSession.id,
    filesCount: currentSession.canvasFiles?.length || 0,
    fileNames: currentSession.canvasFiles?.map(f => f.name) || [],
    showFileExplorer: currentSession.showFileExplorer
  });
} else {
  console.log('No current session');
}
```

---

## Expected Flow

```
1. AI creates files
   ↓
2. handleCanvasCodeStream receives allCodeBlocks
   ↓
3. updatedFiles array is created
   ↓
4. setFiles(updatedFiles) updates state
   ↓
5. onSaveCanvasState is called with files
   ↓
6. useCanvasChat.saveCanvasState updates sessions
   ↓
7. useEffect saves sessions to localStorage
   ↓
8. [RELOAD]
   ↓
9. useCanvasChat loads sessions from localStorage
   ↓
10. Canvas component receives currentSession with canvasFiles
    ↓
11. useEffect restores files from currentSession.canvasFiles
    ↓
12. setFiles(currentSession.canvasFiles)
    ↓
13. setShowFileExplorer(currentSession.showFileExplorer)
    ↓
14. UI shows File Explorer with all files
```

---

## If Still Not Working

1. **Clear localStorage and try again:**
   ```javascript
   localStorage.clear();
   location.reload();
   ```

2. **Check if onSaveCanvasState is passed correctly:**
   - In App.tsx or parent component
   - Should be connected to useCanvasChat.saveCanvasState

3. **Check if currentSession is passed correctly:**
   - Should be from useCanvasChat.currentSession
   - Should have all required fields

4. **Check React DevTools:**
   - Canvas component state
   - files array
   - currentFileId
   - showFileExplorer

5. **Check for errors in console:**
   - Any red errors?
   - Any warnings about missing props?
