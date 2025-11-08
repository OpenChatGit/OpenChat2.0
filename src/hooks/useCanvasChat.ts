// Separate chat logic for Canvas Mode
// Completely independent from useChatWithTools
// Includes Canvas Tool integration for LIVE code updates

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ProviderConfig, ImageAttachment } from '../types'
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
}

export function useCanvasChat() {
  // Load sessions from localStorage
  const [sessions, setSessions] = useState<CanvasSession[]>(() => {
    try {
      const saved = localStorage.getItem('canvas-chat-sessions')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Failed to load canvas sessions:', error)
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

  // Save sessions to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('canvas-chat-sessions', JSON.stringify(sessions))
    } catch (error) {
      console.error('Failed to save canvas sessions:', error)
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

  // Save canvas state (code + language)
  const saveCanvasState = useCallback((sessionId: string, code: string, language: string) => {
    setSessions(prev => prev.map(s => 
      s.id === sessionId ? { ...s, canvasCode: code, canvasLanguage: language, updatedAt: Date.now() } : s
    ))
    
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, canvasCode: code, canvasLanguage: language } : null)
    }
  }, [currentSession])

  // Stream code to canvas in real-time (during streaming)
  const streamCodeToCanvas = useCallback((content: string, isStreaming: boolean) => {
    if (!canvasToolsEnabled) return

    const supportedLanguages = ['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'c', 'rust', 'go', 'ruby', 'php', 'swift', 'kotlin', 'csharp', 'bash', 'shell', 'sql', 'json', 'yaml', 'xml']

    // Check if we're inside a code block
    const codeBlockStart = /```(\w+)\n/g
    const matches = Array.from(content.matchAll(codeBlockStart))
    
    if (matches.length > 0) {
      // Get the FIRST code block (main code)
      const firstMatch = matches[0]
      const language = firstMatch[1].toLowerCase()
      
      if (supportedLanguages.includes(language)) {
        // Extract code after the opening ```language
        const startIndex = firstMatch.index! + firstMatch[0].length
        const remainingContent = content.substring(startIndex)
        
        // Check if code block is closed
        const endIndex = remainingContent.indexOf('```')
        const code = endIndex !== -1 ? remainingContent.substring(0, endIndex) : remainingContent
        
        // Only update if code has changed
        const codeHash = `${language}:${code}`
        if (codeHash !== lastProcessedCodeRef.current && code.length > 0) {
          lastProcessedCodeRef.current = codeHash
          
          console.log('[Canvas Chat] Streaming code to canvas:', language, `(${code.length} chars)`)
          
          // Dispatch event to Canvas component for LIVE streaming
          const event = new CustomEvent('canvasCodeStream', {
            detail: {
              language,
              code,
              isComplete: !isStreaming && endIndex !== -1
            }
          })
          window.dispatchEvent(event)
          
          // Update current code block reference
          currentCodeBlockRef.current = { language, code }
        }
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
          content: `You are in Canvas Mode. When writing code, use markdown code blocks with the language specified.
Example:
\`\`\`javascript
console.log('Hello World');
\`\`\`

The code will automatically appear in the interactive canvas editor. Always use proper language tags for code blocks.`,
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
