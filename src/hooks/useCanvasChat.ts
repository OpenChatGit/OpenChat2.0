// Separate chat logic for Canvas Mode
// Completely independent from useChatWithTools
// Includes Canvas Tool integration for LIVE code updates

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ProviderConfig, ImageAttachment, FileItem } from '../types'
import { ProviderFactory } from '../providers'
import { generateId } from '../lib/utils'


export interface CanvasMessage {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: number
  images?: ImageAttachment[]
}

export interface CanvasSession {
  id: string
  title: string
  messages: CanvasMessage[]
  provider: string
  model: string
  createdAt: number
  updatedAt: number
  // Canvas-specific data
  canvasCode?: string
  canvasLanguage?: string
  canvasFiles?: FileItem[]
  currentFileId?: string
  showFileExplorer?: boolean  // Persist file explorer state
}

export function useCanvasChat() {
  // Load sessions from localStorage
  const [sessions, setSessions] = useState<CanvasSession[]>(() => {
    try {
      const saved = localStorage.getItem('canvas-chat-sessions')
      const parsed = saved ? JSON.parse(saved) : []
      console.log('[useCanvasChat] 📂 Loaded sessions from localStorage:', {
        count: parsed.length,
        sessions: parsed.map((s: CanvasSession) => ({
          id: s.id,
          title: s.title,
          filesCount: s.canvasFiles?.length || 0,
          fileNames: s.canvasFiles?.map(f => f.name) || [],
          showFileExplorer: s.showFileExplorer
        }))
      })
      return parsed
    } catch (error) {
      console.error('[useCanvasChat] ❌ Failed to load canvas sessions:', error)
      return []
    }
  })

  const [currentSession, setCurrentSession] = useState<CanvasSession | null>(() => {
    try {
      const saved = localStorage.getItem('current-canvas-session')
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      return null
    }
  })

  const [isGenerating, setIsGenerating] = useState(false)
  const streamingContentRef = useRef<string>('')
  const [canvasToolsEnabled, setCanvasToolsEnabled] = useState(true)
  const lastProcessedCodeRef = useRef<string>('')
  const currentCodeBlockRef = useRef<{ language: string; code: string } | null>(null)
  const processedBlocksRef = useRef<Set<string>>(new Set()) // Track which blocks we've already sent

  // Save sessions to localStorage
  useEffect(() => {
    try {
      console.log('[useCanvasChat] 💾 Saving sessions to localStorage:', {
        count: sessions.length,
        sessions: sessions.map(s => ({
          id: s.id,
          title: s.title,
          filesCount: s.canvasFiles?.length || 0,
          fileNames: s.canvasFiles?.map(f => f.name) || [],
          showFileExplorer: s.showFileExplorer
        }))
      })
      localStorage.setItem('canvas-chat-sessions', JSON.stringify(sessions))
      console.log('[useCanvasChat] ✅ Sessions saved to localStorage')
    } catch (error) {
      console.error('[useCanvasChat] ❌ Failed to save canvas sessions:', error)
    }
  }, [sessions])

  // Save current session
  useEffect(() => {
    try {
      if (currentSession) {
        localStorage.setItem('current-canvas-session', JSON.stringify(currentSession))
      } else {
        localStorage.removeItem('current-canvas-session')
      }
    } catch (error) {
      console.error('Failed to save current canvas session:', error)
    }
  }, [currentSession])

  // Create new session
  const createSession = useCallback((provider: ProviderConfig, model: string) => {
    const newSession: CanvasSession = {
      id: `canvas-${Date.now()}`,
      title: 'New Canvas',
      messages: [],
      provider: provider.type,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setSessions(prev => [newSession, ...prev])
    setCurrentSession(newSession)
    
    console.log('[Canvas Chat] Created new session:', newSession.id)
    return newSession
  }, [])

  // Select session
  const selectSession = useCallback((sessionId: string) => {
    const session = sessions.find(s => s.id === sessionId)
    if (session) {
      setCurrentSession(session)
      console.log('[Canvas Chat] Selected session:', sessionId)
    }
  }, [sessions])

  // Delete session
  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    
    if (currentSession?.id === sessionId) {
      const remaining = sessions.filter(s => s.id !== sessionId)
      setCurrentSession(remaining.length > 0 ? remaining[0] : null)
    }
  }, [sessions, currentSession])

  // Rename session
  const renameSession = useCallback((sessionId: string, newTitle: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, title: newTitle, updatedAt: Date.now() } : s
    ))
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title: newTitle } : null)
    }
  }, [currentSession])

  // Save canvas state (code + language + files + explorer state)
  const saveCanvasState = useCallback((
    sessionId: string, 
    code: string, 
    language: string, 
    files?: FileItem[], 
    currentFileId?: string,
    showFileExplorer?: boolean
  ) => {
    console.log('[useCanvasChat] 💾 saveCanvasState called:', {
      sessionId,
      codeLength: code.length,
      language,
      filesCount: files?.length || 0,
      fileNames: files?.map(f => f.name) || [],
      currentFileId,
      showFileExplorer
    })
    
    setSessions(prev => {
      const updated = prev.map(s => 
        s.id === sessionId ? { 
          ...s, 
          canvasCode: code, 
          canvasLanguage: language,
          canvasFiles: files,
          currentFileId: currentFileId,
          showFileExplorer: showFileExplorer,
          updatedAt: Date.now() 
        } : s
      )
      
      console.log('[useCanvasChat] ✅ Sessions updated, session data:', 
        updated.find(s => s.id === sessionId)
      )
      
      return updated
    })
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { 
        ...prev, 
        canvasCode: code, 
        canvasLanguage: language,
        canvasFiles: files,
        currentFileId: currentFileId,
        showFileExplorer: showFileExplorer
      } : null)
    }
  }, [currentSession])

  // Stream code to canvas in real-time (during streaming)
  const streamCodeToCanvas = useCallback((content: string, isStreaming: boolean) => {
    if (!canvasToolsEnabled) return

    const supportedLanguages = ['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'c', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin', 'csharp', 'bash', 'shell', 'sql', 'json', 'yaml', 'xml']

    // Extract ALL code blocks - handle both closed and open blocks
    const allCodeBlocks: Array<{ language: string; code: string; filename?: string }> = []
    
    // Debug: Log the content to see what we're working with
    console.log('[Canvas Chat] Content length:', content.length)
    console.log('[Canvas Chat] Content preview:', content.substring(0, 500))
    
    // Split content by code block markers and markdown headings
    // This handles cases where AI doesn't close code blocks properly
    const codeBlockRegex = /```(\w+)(?:\s*\n|\s|$)/g
    const blockStarts: Array<{ index: number; language: string; matchLength: number }> = []
    
    let match
    while ((match = codeBlockRegex.exec(content)) !== null) {
      blockStarts.push({
        index: match.index + match[0].length,
        language: match[1].toLowerCase(),
        matchLength: match[0].length
      })
      console.log('[Canvas Chat] Found code block start:', match[1], 'at index', match.index)
    }
    
    console.log('[Canvas Chat] Total code block starts found:', blockStarts.length)
    
    // Debug: Show what we're looking at
    if (blockStarts.length === 0) {
      console.log('[Canvas Chat] ⚠️ No code blocks found! Content preview:')
      console.log(content.substring(0, 500))
    } else if (blockStarts.length > 1) {
      console.log('[Canvas Chat] 📋 Multiple blocks detected:')
      blockStarts.forEach((start, i) => {
        console.log(`  Block ${i + 1}: ${start.language} at position ${start.index}`)
      })
    }
    
    // Extract code for each block
    for (let i = 0; i < blockStarts.length; i++) {
      const start = blockStarts[i]
      const language = start.language
      
      // Find the end of this block
      let endIndex: number
      let isClosed = false
      
      // Look for closing ```
      const closingIndex = content.indexOf('```', start.index)
      
      // Look for next code block start
      const nextBlockIndex = i < blockStarts.length - 1 ? blockStarts[i + 1].index - 10 : -1
      
      // Look for markdown heading (### or ##)
      const headingMatch = content.substring(start.index).match(/\n#{2,3}\s/)
      const headingIndex = headingMatch && headingMatch.index !== undefined ? start.index + headingMatch.index : -1
      
      // Determine the actual end
      if (closingIndex !== -1 && (closingIndex < nextBlockIndex || nextBlockIndex === -1) && (closingIndex < headingIndex || headingIndex === -1)) {
        endIndex = closingIndex
        isClosed = true
      } else if (headingIndex !== -1 && (headingIndex < nextBlockIndex || nextBlockIndex === -1)) {
        endIndex = headingIndex
        isClosed = false
      } else if (nextBlockIndex !== -1) {
        endIndex = nextBlockIndex
        isClosed = false
      } else {
        endIndex = content.length
        isClosed = false
      }
      
      const code = content.substring(start.index, endIndex).trim()
      
      console.log('[Canvas Chat] Block', i + 1, ':', language, `(${code.length} chars)`, isClosed ? 'CLOSED' : 'OPEN')
      console.log('[Canvas Chat]   Start:', start.index, 'End:', endIndex, 'Method:', 
                  closingIndex !== -1 && closingIndex === endIndex ? 'closing ```' :
                  headingIndex !== -1 && headingIndex === endIndex ? 'heading' :
                  nextBlockIndex !== -1 && nextBlockIndex === endIndex ? 'next block' : 'end of content')
      console.log('[Canvas Chat]   Code preview:', code.substring(0, 100).replace(/\n/g, '\\n'))
      
      if (supportedLanguages.includes(language) && code.length > 0) {
        // Try to extract filename from various sources
        let filename: string | undefined
        
        // 1. Check for hidden tag format: {code_block_N_filename.ext}
        if (start.index > 0) {
          const beforeBlock = content.substring(Math.max(0, start.index - 100), start.index)
          const tagMatch = beforeBlock.match(/\{code_block_\d+_([^}]+)\}/i)
          if (tagMatch) {
            filename = tagMatch[1].trim()
            console.log('[Canvas Chat] ✓ Extracted filename from tag:', filename)
          }
        }
        
        // 2. Check for filename in code comment (first line)
        if (!filename) {
          const commentMatch = code.match(/^(?:\/\/|#|<!--)\s*(?:filename:|file:)?\s*([^\n]+)/i)
          if (commentMatch) {
            filename = commentMatch[1].trim()
            console.log('[Canvas Chat] ✓ Extracted filename from comment:', filename)
          }
        }
        
        // 3. Check for filename in markdown heading or bold text before this block
        if (!filename && start.index > 0) {
          const beforeBlock = content.substring(Math.max(0, start.index - 300), start.index)
          
          // Try multiple patterns (in order of specificity)
          // Pattern 1: **filename.ext** or **filename**
          let filenameMatch = beforeBlock.match(/\*\*([^\*]+\.(?:html|css|js|ts|py|java|cpp|rs|go|rb|php|swift|kt|cs|sql|sh|json|yaml|xml|md))\*\*/i)
          
          // Pattern 2: ### filename.ext or ## filename.ext (markdown heading)
          if (!filenameMatch) {
            filenameMatch = beforeBlock.match(/#{2,3}\s*([^\s\n]+\.(?:html|css|js|ts|py|java|cpp|rs|go|rb|php|swift|kt|cs|sql|sh|json|yaml|xml|md))/i)
          }
          
          // Pattern 3: (filename.ext) in parentheses
          if (!filenameMatch) {
            filenameMatch = beforeBlock.match(/\(([^\)]+\.(?:html|css|js|ts|py|java|cpp|rs|go|rb|php|swift|kt|cs|sql|sh|json|yaml|xml|md))\)/i)
          }
          
          // Pattern 4: `filename.ext` in backticks
          if (!filenameMatch) {
            filenameMatch = beforeBlock.match(/`([^\`]+\.(?:html|css|js|ts|py|java|cpp|rs|go|rb|php|swift|kt|cs|sql|sh|json|yaml|xml|md))`/i)
          }
          
          // Pattern 5: "filename.ext" in quotes
          if (!filenameMatch) {
            filenameMatch = beforeBlock.match(/"([^"]+\.(?:html|css|js|ts|py|java|cpp|rs|go|rb|php|swift|kt|cs|sql|sh|json|yaml|xml|md))"/i)
          }
          
          // Pattern 6: filename.ext: at the start of a line (like "index.html:")
          if (!filenameMatch) {
            filenameMatch = beforeBlock.match(/^([a-zA-Z0-9_-]+\.(?:html|css|js|ts|py|java|cpp|rs|go|rb|php|swift|kt|cs|sql|sh|json|yaml|xml|md)):\s*$/im)
          }
          
          // Pattern 7: Just filename.ext at the end of a line
          if (!filenameMatch) {
            filenameMatch = beforeBlock.match(/([a-zA-Z0-9_-]+\.(?:html|css|js|ts|py|java|cpp|rs|go|rb|php|swift|kt|cs|sql|sh|json|yaml|xml|md))\s*$/i)
          }
          
          // Pattern 8: For JavaScript files, look for common patterns like "script.js" or "app.js"
          if (!filenameMatch && language === 'javascript') {
            filenameMatch = beforeBlock.match(/(script|app|main|index)\.js/i)
          }
          
          if (filenameMatch) {
            filename = filenameMatch[1].trim()
            console.log('[Canvas Chat] ✓ Extracted filename from text:', filename)
          }
        }
        
        // 4. If still no filename, try to infer from context or use smart defaults
        if (!filename) {
          // Check if this is the first block of a specific type
          const existingOfType = allCodeBlocks.filter(b => b.language === language).length
          
          if (existingOfType === 0) {
            // First file of this type - use common defaults
            const commonDefaults: Record<string, string> = {
              html: 'index.html',
              css: 'styles.css',
              javascript: 'script.js',
              typescript: 'script.ts',
              python: 'main.py',
              java: 'Main.java',
              cpp: 'main.cpp',
              rust: 'main.rs',
              go: 'main.go'
            }
            
            filename = commonDefaults[language]
            if (filename) {
              console.log('[Canvas Chat] ✓ Using default filename for', language, ':', filename)
            }
          }
        }
        
        // Always add closed blocks (they're complete)
        // For open blocks, only add if it's the last block and we're streaming
        const isLastBlock = i === blockStarts.length - 1
        const shouldAdd = isClosed || (!isClosed && isLastBlock && isStreaming)
        
        if (shouldAdd) {
          allCodeBlocks.push({ language, code, filename })
          
          if (isClosed) {
            console.log('[Canvas Chat] ✓ Added CLOSED block:', language, filename || 'no filename', `(${code.length} chars)`)
          } else {
            console.log('[Canvas Chat] ⏳ Added OPEN block:', language, filename || 'no filename', `(${code.length} chars)`)
          }
        } else {
          console.log('[Canvas Chat] ⊘ Skipped:', language, 'Reason:', !isClosed ? 'not closed and not last' : 'unknown')
        }
      } else {
        console.log('[Canvas Chat] ✗ Skipped block:', language, 'supported:', supportedLanguages.includes(language), 'has code:', code.length > 0)
      }
    }
    
    // If streaming and no blocks found yet, look for open blocks
    // BUT: Only if we're actually streaming (isStreaming = true)
    // AND: Only if we haven't found any closed blocks
    if (isStreaming && allCodeBlocks.length === 0 && blockStarts.length > 0) {
      // Only look for the LAST block if it's still open
      const lastBlockStart = blockStarts[blockStarts.length - 1]
      const afterLastBlock = content.substring(lastBlockStart.index)
      const closingIndex = afterLastBlock.indexOf('```')
      
      if (closingIndex === -1) {
        // Last block is still open
        const code = afterLastBlock.trim()
        const language = lastBlockStart.language
        
        if (supportedLanguages.includes(language) && code.length > 0) {
          const filenameMatch = code.match(/^(?:\/\/|#|<!--)\s*(?:filename:|file:)?\s*([^\n]+)/i)
          const filename = filenameMatch ? filenameMatch[1].trim() : undefined
          
          allCodeBlocks.push({ language, code, filename })
          console.log('[Canvas Chat] Added open block (streaming):', language, `(${code.length} chars)`)
        }
      }
    }
    
    console.log('[Canvas Chat] 📊 Final block count:', allCodeBlocks.length, 'Is streaming:', isStreaming)
    
    if (allCodeBlocks.length > 0) {
      // Get the FIRST code block as main code
      const firstBlock = allCodeBlocks[0]
      
      // Create a hash of all blocks to detect changes
      const allBlocksHash = allCodeBlocks.map(b => `${b.language}:${b.code.length}`).join('|')
      
      // Only update if something has changed
      if (allBlocksHash !== lastProcessedCodeRef.current) {
        lastProcessedCodeRef.current = allBlocksHash
        
        console.log('[Canvas Chat] 📤 Sending to canvas:', allCodeBlocks.length, 'blocks')
        console.log('[Canvas Chat] Main block:', firstBlock.language, `(${firstBlock.code.length} chars)`)
        if (allCodeBlocks.length > 1) {
          console.log('[Canvas Chat] Additional blocks:', allCodeBlocks.slice(1).map(b => `${b.language} (${b.code.length})`).join(', '))
        }
        
        // Dispatch event to Canvas component for LIVE streaming
        const event = new CustomEvent('canvasCodeStream', {
          detail: {
            language: firstBlock.language,
            code: firstBlock.code,
            isComplete: !isStreaming,
            allCodeBlocks: allCodeBlocks // Always send all blocks
          }
        })
        window.dispatchEvent(event)
        
        // Update current code block reference
        currentCodeBlockRef.current = { language: firstBlock.language, code: firstBlock.code }
      }
    }
  }, [canvasToolsEnabled])

  // Send message with Canvas Tool support
  const sendMessage = useCallback(async (
    content: string,
    provider: ProviderConfig,
    model: string,
    images?: ImageAttachment[]
  ) => {
    // Reset processed blocks for new message
    processedBlocksRef.current.clear()
    lastProcessedCodeRef.current = ''
    console.log('[Canvas Chat] 🔄 Reset processed blocks for new message')
    
    // Auto-create session if none exists
    let targetSession = currentSession
    if (!targetSession) {
      console.log('[Canvas Chat] Auto-creating session for message')
      targetSession = createSession(provider, model)
    }

    // Add user message
    const userMessage: CanvasMessage = {
      id: generateId(),
      role: 'user',
      content,
      timestamp: Date.now(),
      images,
    }

    const updatedSession = {
      ...targetSession,
      messages: [...targetSession.messages, userMessage],
      updatedAt: Date.now(),
    }

    setSessions(prev => prev.map(s => s.id === targetSession!.id ? updatedSession : s))
    setCurrentSession(updatedSession)

    // Start generating
    setIsGenerating(true)
    streamingContentRef.current = ''
    lastProcessedCodeRef.current = ''
    currentCodeBlockRef.current = null

    try {
      const providerInstance = ProviderFactory.createProvider(provider)

      // Prepare messages for API (with Canvas Tool if enabled)
      const apiMessages = updatedSession.messages.map(m => ({
        role: m.role,
        content: m.content,
        images: m.images,
      }))

      // Add system message with Canvas Tool instructions if enabled
      if (canvasToolsEnabled) {
        apiMessages.unshift({
          role: 'system',
          content: `You are in Canvas Mode - an interactive code editor.

📁 MULTI-FILE FORMAT (REQUIRED for multiple files):
When creating multiple files, use this EXACT format:

{code_block_1_index.html}
\`\`\`html
<!DOCTYPE html>...
\`\`\`

{code_block_2_styles.css}
\`\`\`css
body { ... }
\`\`\`

{code_block_3_script.js}
\`\`\`javascript
console.log('test');
\`\`\`

RULES:
1. Use {code_block_N_filename.ext} BEFORE each code block
2. N = sequential number (1, 2, 3...)
3. filename.ext = actual filename with extension
4. Each file appears as a separate tab

SINGLE FILE:
\`\`\`python
print("Hello")
\`\`\`

Code appears automatically in the canvas editor.`,
          images: undefined
        })
      }

      // Create assistant message
      const assistantMessage: CanvasMessage = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      // Add to session
      const sessionWithAssistant = {
        ...updatedSession,
        messages: [...updatedSession.messages, assistantMessage],
      }

      setSessions(prev => prev.map(s => s.id === targetSession!.id ? sessionWithAssistant : s))
      setCurrentSession(sessionWithAssistant)

      // Stream response
      await providerInstance.sendMessage(
        {
          model,
          messages: apiMessages,
          stream: true,
          temperature: 0.7,
        },
        (chunk) => {
          streamingContentRef.current += chunk
          
          // Update message
          setSessions(prev => prev.map(s => {
            if (s.id === targetSession!.id) {
              return {
                ...s,
                messages: s.messages.map(m => 
                  m.id === assistantMessage.id 
                    ? { ...m, content: streamingContentRef.current }
                    : m
                ),
              }
            }
            return s
          }))

          setCurrentSession(prev => {
            if (prev && prev.id === targetSession!.id) {
              return {
                ...prev,
                messages: prev.messages.map(m => 
                  m.id === assistantMessage.id 
                    ? { ...m, content: streamingContentRef.current }
                    : m
                ),
              }
            }
            return prev
          })

          // Stream code to canvas in real-time
          streamCodeToCanvas(streamingContentRef.current, true)
        }
      )

      // Final update after streaming completes
      streamCodeToCanvas(streamingContentRef.current, false)
      
      // Update session with final canvas code if available
      if (currentCodeBlockRef.current) {
        const { language, code } = currentCodeBlockRef.current
        setSessions(prev => prev.map(s => {
          if (s.id === targetSession!.id) {
            return {
              ...s,
              canvasCode: code,
              canvasLanguage: language,
              updatedAt: Date.now(),
            }
          }
          return s
        }))
        setCurrentSession(prev => {
          if (prev && prev.id === targetSession!.id) {
            return {
              ...prev,
              canvasCode: code,
              canvasLanguage: language,
            }
          }
          return prev
        })
      }

      console.log('[Canvas Chat] Message sent successfully')
    } catch (error) {
      console.error('[Canvas Chat] Error sending message:', error)
      
      // Add error message
      const errorMessage: CanvasMessage = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      }

      setSessions(prev => prev.map(s => {
        if (s.id === targetSession!.id) {
          return {
            ...s,
            messages: [...s.messages, errorMessage],
          }
        }
        return s
      }))
      setCurrentSession(prev => {
        if (prev && prev.id === targetSession!.id) {
          return {
            ...prev,
            messages: [...(prev.messages || []), errorMessage],
          }
        }
        return prev
      })
    } finally {
      setIsGenerating(false)
    }
  }, [currentSession, canvasToolsEnabled, createSession])

  return {
    sessions,
    currentSession,
    isGenerating,
    canvasToolsEnabled,
    setCanvasToolsEnabled,
    createSession,
    selectSession,
    deleteSession,
    renameSession,
    saveCanvasState,
    sendMessage,
  }
}
