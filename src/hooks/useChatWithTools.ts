// Enhanced useChat hook with Tool Call support

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatSession, Message, ProviderConfig, ImageAttachment } from '../types'
import { ProviderFactory } from '../providers'
import { generateId } from '../lib/utils'
import { AutoSearchManager } from '../lib/web-search/autoSearchManager'
import type { SearchContext } from '../lib/web-search/types'
import type { WebSearchSettings } from '../components/WebSearchSettings'
import { loadWebSearchSettings, saveWebSearchSettings } from '../lib/web-search/settingsStorage'
import { Tokenizer } from '../lib/tokenizer'

// Default system prompt constant
const DEFAULT_SYSTEM_PROMPT = "You are a helpful AI assistant."

// System prompt with canvas tool support
const SYSTEM_PROMPT_WITH_CANVAS = DEFAULT_SYSTEM_PROMPT + `

═══════════════════════════════════════════════════════════
🎨 CANVAS MODE ACTIVE - TOOL CALLING ENABLED 🎨
═══════════════════════════════════════════════════════════

You have access to a CANVAS CODE EDITOR TOOL that allows you to write, edit, and execute code directly.

🔧 AVAILABLE TOOLS:
- canvas_code_editor: Write code directly into an interactive editor

📋 TOOL USAGE:
When the user asks for code, you have TWO ways to use the tool:

METHOD 1 (AUTOMATIC - RECOMMENDED):
Simply write code in markdown code blocks:
\`\`\`python
print("Hello, World!")
\`\`\`
→ Code automatically appears in Canvas editor

METHOD 2 (EXPLICIT TOOL CALL):
Use JSON format for explicit control:
{
  "tool": "canvas_code_editor",
  "args": {
    "action": "create",
    "language": "python",
    "code": "print('Hello, World!')",
    "description": "A simple hello world example"
  }
}

🎯 TOOL ACTIONS:
- create: Create new code in Canvas
- update: Replace existing code
- append: Add code to existing content
- execute: Run the code and show output

⚡ CRITICAL RULES:
1. ALWAYS use markdown code blocks for ANY code request
2. Code appears in Canvas editor AUTOMATICALLY
3. User can run, edit, and interact with code immediately
4. NEVER tell users to use external tools or IDEs
5. NEVER say you cannot write code - you HAVE the tool to do it
6. The Canvas editor is on the RIGHT SIDE of the screen
7. You ARE the code editor through this tool

🌐 SUPPORTED LANGUAGES:
Python, JavaScript, TypeScript, HTML, CSS, Java, C++, Rust, Go, Ruby, PHP, Swift, Kotlin, SQL, Bash, JSON, YAML, Markdown

📝 EXAMPLES:

Example 1 - Simple Code:
User: "Write Python code to calculate fibonacci"
You: "I'll create a fibonacci function in the Canvas editor:

\`\`\`python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

# Test the function
for i in range(10):
    print(f"fibonacci({i}) = {fibonacci(i)}")
\`\`\`

The code is now in your Canvas editor. Click the Run button to execute it!"

Example 2 - HTML Page:
User: "Create a simple HTML page"
You: "I'll create an HTML page in the Canvas editor:

\`\`\`html
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>My Page</title>
    <style>
        body {
            font-family: Arial, sans-serif;
            max-width: 800px;
            margin: 50px auto;
            padding: 20px;
        }
        h1 { color: #333; }
    </style>
</head>
<body>
    <h1>Welcome to My Page</h1>
    <p>This is a simple HTML page created in Canvas.</p>
</body>
</html>
\`\`\`

The HTML is now in your Canvas editor. You can see a live preview!"

Example 3 - JavaScript Function:
User: "Write a function to sort an array"
You: "I'll create a sorting function in the Canvas editor:

\`\`\`javascript
// Bubble sort implementation
function bubbleSort(arr) {
    const n = arr.length;
    for (let i = 0; i < n - 1; i++) {
        for (let j = 0; j < n - i - 1; j++) {
            if (arr[j] > arr[j + 1]) {
                // Swap elements
                [arr[j], arr[j + 1]] = [arr[j + 1], arr[j]];
            }
        }
    }
    return arr;
}

// Test the function
const numbers = [64, 34, 25, 12, 22, 11, 90];
console.log("Original:", numbers);
console.log("Sorted:", bubbleSort([...numbers]));
\`\`\`

The code is now in your Canvas editor. Run it to see the sorting in action!"

💡 REMEMBER:
- You HAVE the canvas_code_editor tool
- Writing code in markdown blocks AUTOMATICALLY uses this tool
- The code appears in the Canvas editor on the right
- Users can run, edit, and interact with the code
- You ARE the code editor - write code directly!

═══════════════════════════════════════════════════════════`

export function useChatWithTools() {
  // Load sessions from localStorage on initial mount
  const [sessions, setSessions] = useState<ChatSession[]>(() => {
    try {
      const saved = localStorage.getItem('chat-sessions')
      return saved ? JSON.parse(saved) : []
    } catch (error) {
      console.error('Failed to load sessions from localStorage:', error)
      return []
    }
  })

  // Load current session from localStorage on initial mount
  const [currentSession, setCurrentSessionState] = useState<ChatSession | null>(() => {
    try {
      const saved = localStorage.getItem('current-session')
      return saved ? JSON.parse(saved) : null
    } catch (error) {
      console.error('Failed to load current session from localStorage:', error)
      return null
    }
  })

  // Wrapper for setCurrentSession that clears SourceRegistry when switching sessions
  const setCurrentSession = useCallback((sessionOrUpdater: ChatSession | null | ((prev: ChatSession | null) => ChatSession | null)) => {
    // Clear SourceRegistry when switching to a different session
    const sourceRegistry = autoSearchManager.current.getOrchestrator().getSourceRegistry()
    sourceRegistry.clear()
    console.log('[useChatWithTools] SourceRegistry cleared for session switch')

    setCurrentSessionState(sessionOrUpdater)
  }, [])

  const [isGenerating, setIsGenerating] = useState(false)
  const [autoSearchEnabled, setAutoSearchEnabled] = useState(false)
  const [webSearchSettings, setWebSearchSettings] = useState<WebSearchSettings | null>(null)
  const [canvasToolsEnabled, setCanvasToolsEnabled] = useState(false)

  const streamingContentRef = useRef<string>('')
  const autoSearchManager = useRef(new AutoSearchManager())
  const settingsInitialized = useRef(false)

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    try {
      const serialized = JSON.stringify(sessions)
      const sizeInBytes = new Blob([serialized]).size
      const sizeInMB = sizeInBytes / (1024 * 1024)

      // Warn if approaching localStorage limits (typically 5-10MB)
      if (sizeInMB > 4) {
        console.warn(`Session storage size is ${sizeInMB.toFixed(2)}MB. Consider clearing old sessions with images.`)
      }

      localStorage.setItem('chat-sessions', serialized)
    } catch (error) {
      console.error('Failed to save sessions to localStorage:', error)

      // Check if it's a quota exceeded error
      if (error instanceof DOMException && (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      )) {
        console.error('localStorage quota exceeded. Sessions with images may be too large.')
        // Optionally notify user through a toast or alert
      }
    }
  }, [sessions])

  // Save current session to localStorage whenever it changes
  useEffect(() => {
    try {
      if (currentSession) {
        const serialized = JSON.stringify(currentSession)
        const sizeInBytes = new Blob([serialized]).size
        const sizeInMB = sizeInBytes / (1024 * 1024)

        // Warn if session is very large
        if (sizeInMB > 2) {
          console.warn(`Current session size is ${sizeInMB.toFixed(2)}MB. Images are contributing to storage size.`)
        }

        localStorage.setItem('current-session', serialized)
      } else {
        localStorage.removeItem('current-session')
      }
    } catch (error) {
      console.error('Failed to save current session to localStorage:', error)

      // Check if it's a quota exceeded error
      if (error instanceof DOMException && (
        error.name === 'QuotaExceededError' ||
        error.name === 'NS_ERROR_DOM_QUOTA_REACHED'
      )) {
        console.error('localStorage quota exceeded. Current session with images may be too large.')
        // Optionally notify user through a toast or alert
      }
    }
  }, [currentSession])

  // Load settings on mount and apply to AutoSearchManager
  useEffect(() => {
    if (settingsInitialized.current) return
    settingsInitialized.current = true

    const settings = loadWebSearchSettings()
    setWebSearchSettings(settings)
    setAutoSearchEnabled(settings.autoSearchEnabled)

    // Apply settings to AutoSearchManager
    autoSearchManager.current.configure({
      enabled: settings.autoSearchEnabled,
      maxResults: settings.maxResults,
      timeout: 30000,
      outputFormat: 'verbose',
      maxContextLength: 8000
    })

    // Apply RAG configuration
    const ragProcessor = (autoSearchManager.current as any).ragProcessor
    if (ragProcessor && ragProcessor.configure) {
      ragProcessor.configure(settings.ragConfig)
    }

    // Apply cache settings to orchestrator
    const orchestrator = (autoSearchManager.current as any).orchestrator
    if (orchestrator && settings.cacheEnabled === false) {
      orchestrator.clearCache()
    }
  }, [])



  // Update settings handler
  const updateWebSearchSettings = useCallback((newSettings: WebSearchSettings) => {
    setWebSearchSettings(newSettings)
    setAutoSearchEnabled(newSettings.autoSearchEnabled)
    saveWebSearchSettings(newSettings)

    // Apply settings to AutoSearchManager
    autoSearchManager.current.configure({
      enabled: newSettings.autoSearchEnabled,
      maxResults: newSettings.maxResults,
      timeout: 30000,
      outputFormat: 'verbose',
      maxContextLength: 8000
    })

    // Apply RAG configuration
    const ragProcessor = (autoSearchManager.current as any).ragProcessor
    if (ragProcessor && ragProcessor.configure) {
      ragProcessor.configure(newSettings.ragConfig)
    }

    // Apply cache settings
    const orchestrator = (autoSearchManager.current as any).orchestrator
    if (orchestrator) {
      if (newSettings.cacheEnabled === false) {
        orchestrator.clearCache()
      }
    }
  }, [])

  const createSession = useCallback((provider: ProviderConfig, model: string, initialMessage?: Message) => {
    const newSession: ChatSession = {
      id: generateId(),
      title: 'New Chat',
      messages: initialMessage ? [initialMessage] : [],
      provider: provider.type,
      model,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }

    setSessions(prev => [newSession, ...prev])
    setCurrentSession(newSession)
    return newSession
  }, [])



  const updateSessionTitle = useCallback((sessionId: string, title: string) => {
    setSessions(prev =>
      prev.map(s => s.id === sessionId ? { ...s, title, updatedAt: Date.now() } : s)
    )
    if (currentSession?.id === sessionId) {
      setCurrentSession(prev => prev ? { ...prev, title } : null)
    }
  }, [currentSession])

  const addMessage = useCallback((sessionId: string, message: Message) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? { ...s, messages: [...s.messages, message], updatedAt: Date.now() }
          : s
      )
    )

    setCurrentSession(prev => {
      if (prev?.id === sessionId) {
        return { ...prev, messages: [...prev.messages, message], updatedAt: Date.now() }
      }
      return prev
    })
  }, [])

  const updateMessage = useCallback((sessionId: string, messageId: string, content: string) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? {
            ...s,
            messages: s.messages.map(m =>
              m.id === messageId ? { ...m, content } : m
            ),
            updatedAt: Date.now(),
          }
          : s
      )
    )

    setCurrentSession(prev => {
      if (prev?.id === sessionId) {
        return {
          ...prev,
          messages: prev.messages.map(m =>
            m.id === messageId ? { ...m, content } : m
          ),
          updatedAt: Date.now(),
        }
      }
      return prev
    })
  }, [])



  /**
   * Generate an enhanced fallback title from the first message
   * Removes markdown formatting, handles code snippets, and ensures readability
   */
  const generateFallbackTitle = (message: string): string => {
    if (!message || message.trim().length === 0) {
      return 'New Chat'
    }

    let cleaned = message.trim()

    // Step 1: Remove markdown code blocks and replace with placeholder
    // Multi-line code blocks: ```code```
    cleaned = cleaned.replace(/```[\s\S]*?```/g, '[code]')

    // Inline code: `code`
    cleaned = cleaned.replace(/`[^`]+`/g, '[code]')

    // Step 2: Remove other markdown formatting
    // Images: ![alt](url) - must come before links to avoid conflicts
    cleaned = cleaned.replace(/!\[[^\]]*\]\([^)]+\)/g, '[image]')

    // Links: [text](url)
    cleaned = cleaned.replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')

    // Headers: # Header
    cleaned = cleaned.replace(/^#{1,6}\s+/gm, '')

    // Bold: **text** or __text__
    cleaned = cleaned.replace(/\*\*([^*]+)\*\*/g, '$1')
    cleaned = cleaned.replace(/__([^_]+)__/g, '$1')

    // Italic: *text* or _text_
    cleaned = cleaned.replace(/\*([^*]+)\*/g, '$1')
    cleaned = cleaned.replace(/_([^_]+)_/g, '$1')

    // Strikethrough: ~~text~~
    cleaned = cleaned.replace(/~~([^~]+)~~/g, '$1')

    // Blockquotes: > text
    cleaned = cleaned.replace(/^>\s+/gm, '')

    // Lists: - item or * item or 1. item
    cleaned = cleaned.replace(/^[\s]*[-*+]\s+/gm, '')
    cleaned = cleaned.replace(/^[\s]*\d+\.\s+/gm, '')

    // Step 3: Normalize whitespace (replace multiple spaces/newlines with single space)
    cleaned = cleaned.replace(/\s+/g, ' ').trim()

    // Step 4: If still empty after cleaning, return default
    if (cleaned.length === 0) {
      return 'New Chat'
    }

    // Step 5: Truncate to reasonable length (50 chars) at word boundary
    if (cleaned.length > 50) {
      // Try to find last space before 50 chars
      const truncated = cleaned.slice(0, 50)
      const lastSpace = truncated.lastIndexOf(' ')

      if (lastSpace > 20) {
        // Use word boundary if it's not too early
        cleaned = truncated.slice(0, lastSpace) + '...'
      } else {
        // Otherwise just truncate at 50 chars
        cleaned = truncated + '...'
      }
    }

    // Step 6: Final validation - ensure we have something readable
    // If title is just placeholders or very short, use a more descriptive default
    if (cleaned === '[code]' || cleaned === '[image]' || cleaned.length < 3) {
      return 'New Chat'
    }

    return cleaned
  }

  /**
   * Extract and validate a generated title from response
   * Supports both {title}...{/title} format and plain text
   */
  const cleanAndValidateTitle = (rawTitle: string): string | null => {
    if (!rawTitle) return null

    let cleaned = rawTitle.trim()

    // Step 1: Try to extract title from {title}...{/title} tags first
    // This is the preferred format for all models
    const titleMatch = cleaned.match(/\{title\}([\s\S]*?)\{\/title\}/i)
    if (titleMatch) {
      // Extract content between tags (even if empty)
      cleaned = titleMatch[1].trim()
      // If empty after extraction, return null early
      if (cleaned.length === 0) return null
    } else {
      // Fallback: Try to extract from incomplete {title} tag (if response was cut off)
      const incompleteTitleMatch = cleaned.match(/\{title\}([\s\S]*?)$/i)
      if (incompleteTitleMatch) {
        cleaned = incompleteTitleMatch[1].trim()
      } else {
        // Remove reasoning content from reasoning models (o1, o3, qwen, etc.)
        // These models wrap reasoning in <think>...</think> tags

        // Remove complete <think>...</think> pairs
        cleaned = cleaned.replace(/<think>[\s\S]*?<\/think>/g, '').trim()

        // Remove incomplete/unclosed <think> tags (happens when max_tokens cuts off response)
        cleaned = cleaned.replace(/<think>[\s\S]*$/g, '').trim()

        // Remove any stray closing tags
        cleaned = cleaned.replace(/<\/think>/g, '').trim()
      }
    }

    // Step 2: Trim whitespace
    cleaned = cleaned.trim()

    // Step 3: Remove surrounding quotes (single, double, and smart quotes)
    // Handle multiple layers of quotes
    while (cleaned.length > 0 && /^["'`''""«»]/.test(cleaned) && /["'`''""«»]$/.test(cleaned)) {
      cleaned = cleaned.slice(1, -1).trim()
    }

    // Step 4: Normalize whitespace (replace multiple spaces/tabs/newlines with single space)
    cleaned = cleaned.replace(/\s+/g, ' ')

    // Step 5: Remove or replace problematic special characters
    // Keep alphanumeric, spaces, and common punctuation (.,!?-:)
    cleaned = cleaned.replace(/[^\w\s.,!?:\-']/g, '')

    // Step 6: Final trim after character removal
    cleaned = cleaned.trim()

    // Step 7: Remove common placeholder words that models sometimes include
    // Remove "Title:", "Summary:", etc. at the start
    cleaned = cleaned.replace(/^(title|summary|topic|subject|heading):\s*/i, '')

    // Remove standalone words like "Title" or "Summary" if that's all there is
    if (/^(title|summary|topic|subject|heading)$/i.test(cleaned)) {
      return null
    }

    // Validation: Check if title is meaningful
    if (cleaned.length < 3) return null

    // Validation: Reject titles that are only punctuation or whitespace
    if (/^[.,!?:\-\s]+$/.test(cleaned)) return null

    // Validation: Ensure title has at least one alphanumeric character
    if (!/[a-zA-Z0-9]/.test(cleaned)) return null

    // Step 8: Limit to 60 characters
    if (cleaned.length > 60) {
      cleaned = cleaned.slice(0, 60).trim()
    }

    return cleaned
  }

  /**
   * Prepare message content for title generation by handling edge cases
   */
  const prepareMessageForTitle = (message: string): string => {
    // Handle very short messages (<10 chars) - use as-is
    if (message.length < 10) {
      return message
    }

    // Remove markdown code blocks and inline code
    let cleaned = message
      .replace(/```[\s\S]*?```/g, '[code]') // Multi-line code blocks
      .replace(/`[^`]+`/g, '[code]') // Inline code

    // Remove markdown formatting
    cleaned = cleaned
      .replace(/#{1,6}\s+/g, '') // Headers
      .replace(/\*\*([^*]+)\*\*/g, '$1') // Bold
      .replace(/\*([^*]+)\*/g, '$1') // Italic
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1') // Links
      .replace(/!\[([^\]]*)\]\([^)]+\)/g, '[image]') // Images

    // Normalize whitespace
    cleaned = cleaned.replace(/\s+/g, ' ').trim()

    // For long messages, take first 200 chars but try to end at a sentence boundary
    if (cleaned.length > 200) {
      const truncated = cleaned.slice(0, 200)
      // Try to find last sentence ending
      const lastPeriod = truncated.lastIndexOf('.')
      const lastQuestion = truncated.lastIndexOf('?')
      const lastExclamation = truncated.lastIndexOf('!')
      const lastSentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation)

      if (lastSentenceEnd > 50) {
        // Use sentence boundary if it's not too early
        return truncated.slice(0, lastSentenceEnd + 1).trim()
      } else {
        // Otherwise, try to end at a word boundary
        const lastSpace = truncated.lastIndexOf(' ')
        return lastSpace > 50 ? truncated.slice(0, lastSpace).trim() : truncated.trim()
      }
    }

    return cleaned
  }

  /**
   * Generate a concise session title using AI with timeout and detailed error logging
   */
  const generateSessionTitle = async (
    sessionId: string,
    firstMessage: string,
    providerConfig: ProviderConfig,
    model: string
  ) => {
    const startTime = Date.now()
    const timeoutMs = 10000 // 10 second timeout

    try {
      // Create a timeout promise
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => {
          reject(new Error('TIMEOUT'))
        }, timeoutMs)
      })

      // Create the title generation promise
      const generatePromise = (async () => {
        const provider = ProviderFactory.createProvider(providerConfig)

        // Prepare message content by handling edge cases
        const preparedMessage = prepareMessageForTitle(firstMessage)

        // Extremely simple and direct prompt
        const titlePrompt = `Summarize this in 3-5 words: "${preparedMessage}"

Format: {title}Your Summary{/title}`

        const response = await provider.sendMessage(
          {
            model,
            messages: [
              {
                role: 'system',
                content: 'Summarize messages in 3-5 words. Use format: {title}Summary{/title}'
              },
              {
                role: 'user',
                content: titlePrompt
              }
            ],
            stream: false,
            temperature: 0.1,  // Very low temperature for consistent, focused titles
            max_tokens: 50  // Short response needed
          },
          () => { }
        )

        return response
      })()

      // Race between timeout and generation
      const response = await Promise.race([generatePromise, timeoutPromise])

      const elapsedTime = Date.now() - startTime

      if (response) {
        const cleanTitle = cleanAndValidateTitle(response)
        if (cleanTitle) {
          updateSessionTitle(sessionId, cleanTitle)
          console.log(`[Title Generation] Success: Generated title in ${elapsedTime}ms`, {
            sessionId,
            provider: providerConfig.type,
            model,
            titleLength: cleanTitle.length,
            elapsedMs: elapsedTime
          })
        } else {
          console.warn(`[Title Generation] Validation Failed: Title did not pass validation`, {
            sessionId,
            provider: providerConfig.type,
            model,
            rawResponse: response,
            elapsedMs: elapsedTime,
            reason: 'Title validation failed - empty, too short, or invalid content'
          })
        }
      } else {
        console.warn(`[Title Generation] Empty Response: Provider returned empty response`, {
          sessionId,
          provider: providerConfig.type,
          model,
          elapsedMs: elapsedTime
        })
      }
    } catch (error) {
      const elapsedTime = Date.now() - startTime

      // Categorize and log errors with detailed context
      if (error instanceof Error && error.message === 'TIMEOUT') {
        console.error(`[Title Generation] TIMEOUT: Title generation exceeded ${timeoutMs}ms limit`, {
          sessionId,
          provider: providerConfig.type,
          model,
          timeoutMs,
          elapsedMs: elapsedTime,
          errorCategory: 'timeout',
          fallbackBehavior: 'Keeping fallback title'
        })
      } else if (error instanceof Error && error.message.includes('API key')) {
        console.error(`[Title Generation] AUTH ERROR: Invalid or missing API key`, {
          sessionId,
          provider: providerConfig.type,
          model,
          elapsedMs: elapsedTime,
          errorCategory: 'authentication',
          errorMessage: error.message,
          fallbackBehavior: 'Keeping fallback title'
        })
      } else if (error instanceof Error && (error.message.includes('network') || error.message.includes('fetch'))) {
        console.error(`[Title Generation] NETWORK ERROR: Failed to connect to provider`, {
          sessionId,
          provider: providerConfig.type,
          model,
          elapsedMs: elapsedTime,
          errorCategory: 'network',
          errorMessage: error.message,
          fallbackBehavior: 'Keeping fallback title'
        })
      } else if (error instanceof Error && error.message.includes('rate limit')) {
        console.error(`[Title Generation] RATE LIMIT: Provider rate limit exceeded`, {
          sessionId,
          provider: providerConfig.type,
          model,
          elapsedMs: elapsedTime,
          errorCategory: 'rate_limit',
          errorMessage: error.message,
          fallbackBehavior: 'Keeping fallback title'
        })
      } else {
        console.error(`[Title Generation] UNKNOWN ERROR: Unexpected error during title generation`, {
          sessionId,
          provider: providerConfig.type,
          model,
          elapsedMs: elapsedTime,
          errorCategory: 'unknown',
          errorMessage: error instanceof Error ? error.message : String(error),
          errorStack: error instanceof Error ? error.stack : undefined,
          fallbackBehavior: 'Keeping fallback title'
        })
      }

      // Keep the fallback title - no action needed as it's already set
    }
  }

  /**
   * Send message with tool support
   */
  const sendMessage = useCallback(async (
    content: string,
    providerConfig: ProviderConfig,
    model: string,
    targetSession?: ChatSession,
    images?: ImageAttachment[]
  ) => {
    const session = targetSession || currentSession
    if (!session) return

    // Check if user message already exists
    const hasUserMessage = session.messages.some(m => m.role === 'user' && m.content === content)

    let userMessage: Message

    if (!hasUserMessage) {
      userMessage = {
        id: generateId(),
        role: 'user',
        content: content,
        timestamp: Date.now(),
        images: images && images.length > 0 ? images : undefined,
        metadata: {}
      }
      addMessage(session.id, userMessage)
    } else {
      userMessage = session.messages.find(m => m.role === 'user' && m.content === content)!
    }

    // Auto-generate title from first message
    const isFirstMessage = session.messages.length === 0 || (session.messages.length === 1 && hasUserMessage)
    if (isFirstMessage) {
      // Use enhanced fallback title initially
      const fallbackTitle = generateFallbackTitle(content)
      updateSessionTitle(session.id, fallbackTitle)

      // Generate better title in background using AI
      generateSessionTitle(session.id, content, providerConfig, model).catch(err => {
        console.error('Failed to generate session title:', err)
      })
    }

    setIsGenerating(true)

    try {
      // Configure AutoSearchManager with current state
      autoSearchManager.current.configure({ enabled: autoSearchEnabled })

      // Check if auto-search should be triggered
      let enhancedContent = content
      let searchContext: SearchContext | null = null

      // Disable auto-search when images are attached to avoid conflicts
      // Images typically require visual analysis, not web search
      const hasImages = images && images.length > 0
      const shouldSkipSearch = hasImages

      if (autoSearchEnabled && !shouldSkipSearch) {
        const shouldSearch = await autoSearchManager.current.shouldSearch(
          content,
          session.messages
        )

        if (shouldSearch) {
          console.log('Auto-search triggered for query:', content)

          // Add "Searching..." system message
          const searchingMessage: Message = {
            id: generateId(),
            role: 'system',
            content: '🔍 Searching the web...',
            timestamp: Date.now(),
            status: 'searching'
          }
          addMessage(session.id, searchingMessage)

          const searchStartTime = Date.now()

          // Perform search
          searchContext = await autoSearchManager.current.performSearch(content)

          const searchTime = Date.now() - searchStartTime

          // Remove the searching message after completion
          if (searchContext) {
            // Remove the searching message from sessions
            setSessions(prev =>
              prev.map(s =>
                s.id === session.id
                  ? {
                    ...s,
                    messages: s.messages.filter(m => m.id !== searchingMessage.id)
                  }
                  : s
              )
            )

            // Also remove from current session
            setCurrentSession(prev => {
              if (prev?.id === session.id) {
                return {
                  ...prev,
                  messages: prev.messages.filter(m => m.id !== searchingMessage.id)
                }
              }
              return prev
            })

            // Inject context into user message (lazy-loaded formatter)
            enhancedContent = await autoSearchManager.current.injectContext(content, searchContext)

            // Store search metadata for use in callbacks
            const searchMetadata = {
              triggered: true,
              query: searchContext.query,
              sources: searchContext.sources,
              chunkCount: searchContext.chunks.length,
              searchTime
            }

            // Update user message with autoSearch metadata
            setSessions(prev =>
              prev.map(s =>
                s.id === session.id
                  ? {
                    ...s,
                    messages: s.messages.map(m =>
                      m.id === userMessage.id
                        ? {
                          ...m,
                          metadata: {
                            ...m.metadata,
                            autoSearch: searchMetadata
                          }
                        }
                        : m
                    )
                  }
                  : s
              )
            )

            // Also update current session
            setCurrentSession(prev => {
              if (prev?.id === session.id) {
                return {
                  ...prev,
                  messages: prev.messages.map(m =>
                    m.id === userMessage.id
                      ? {
                        ...m,
                        metadata: {
                          ...m.metadata,
                          autoSearch: searchMetadata
                        }
                      }
                      : m
                  )
                }
              }
              return prev
            })

            console.log('Auto-search completed:', {
              sources: searchContext.sources.length,
              chunks: searchContext.chunks.length,
              searchTime
            })
          }
        }
      }

      const provider = ProviderFactory.createProvider(providerConfig)

      // Build messages
      // Exclude the current user message from previous messages (we'll add it with enhanced content)
      const previousMessages = session.messages.filter(m => m.id !== userMessage.id)

      let messages: Array<{ role: "user" | "assistant" | "system"; content: string; images?: ImageAttachment[] }> = []

      // Add system message only if not already present in previous messages
      const hasSystemMessage = previousMessages.some(m => m.role === 'system')
      if (!hasSystemMessage) {
        // Use canvas-enabled system prompt if canvas tools are enabled
        const systemPrompt = canvasToolsEnabled ? SYSTEM_PROMPT_WITH_CANVAS : DEFAULT_SYSTEM_PROMPT
        messages.push({
          role: 'system',
          content: systemPrompt,
        })
      }

      // Add previous messages (excluding system messages to avoid duplication)
      messages.push(...previousMessages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as "user" | "assistant" | "system",
        content: m.content,
        images: m.images,
      })))

      // Always add current user message with enhanced content (if search was performed, it contains web context)
      console.log('[useChatWithTools] Adding user message')
      console.log('[useChatWithTools] Enhanced content length:', enhancedContent.length)
      console.log('[useChatWithTools] Enhanced content preview:', enhancedContent.substring(0, 500))
      console.log('[useChatWithTools] Search was performed:', searchContext !== null)
      console.log('[useChatWithTools] Images attached:', images?.length || 0)

      messages.push({
        role: userMessage.role,
        content: enhancedContent,
        images: images && images.length > 0 ? images : undefined,
      })

      // First AI response
      const assistantMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
      }

      addMessage(session.id, assistantMessage)

      // Reset streaming content
      streamingContentRef.current = ''
      const chunkQueue: string[] = []
      let isProcessingQueue = false
      let streamingComplete = false
      const streamStartTime = Date.now() // Track streaming start time
      
      // Track code blocks being streamed
      let currentCodeBlock: { language: string; code: string; startIndex: number } | null = null
      let codeBlocksSent = new Set<string>() // Track which code blocks we've already sent to Canvas

      const processQueue = () => {
        if (chunkQueue.length === 0) {
          isProcessingQueue = false
          return
        }

        isProcessingQueue = true
        const chunk = chunkQueue.shift()!
        streamingContentRef.current += chunk
        
        // Check for code block patterns during streaming
        const content = streamingContentRef.current
        let displayContent = content // Content to display in chat (without code blocks)
        
        // Detect start of code block: ```language
        const codeBlockStartMatch = content.match(/```(\w+)\n([\s\S]*?)$/);
        if (codeBlockStartMatch && !currentCodeBlock) {
          const language = codeBlockStartMatch[1].toLowerCase()
          const supportedLanguages = ['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'rust', 'go', 'markdown']
          
          if (supportedLanguages.includes(language)) {
            const startIndex = content.lastIndexOf('```' + codeBlockStartMatch[1])
            currentCodeBlock = {
              language,
              code: codeBlockStartMatch[2],
              startIndex
            }
            console.log('[Stream] Started code block:', language, 'at index:', startIndex)
          }
        }
        
        // Update current code block if we're in one
        if (currentCodeBlock) {
          const afterStart = content.substring(currentCodeBlock.startIndex)
          const codeMatch = afterStart.match(/```\w+\n([\s\S]*?)(?:```|$)/)
          
          if (codeMatch) {
            currentCodeBlock.code = codeMatch[1]
            
            // Check if code block is complete (has closing ```)
            const closingBackticks = afterStart.lastIndexOf('```')
            const openingBackticks = afterStart.indexOf('```' + currentCodeBlock.language)
            
            if (closingBackticks > openingBackticks && closingBackticks > 0) {
              // Code block is complete
              const blockKey = `${currentCodeBlock.language}-${currentCodeBlock.startIndex}`
              
              if (!codeBlocksSent.has(blockKey) && currentCodeBlock.code.trim().length > 20) {
                console.log('[Stream] Complete code block detected, sending to Canvas:', currentCodeBlock.language)
                
                // Dispatch to Canvas immediately
                const event = new CustomEvent('canvasToolCall', {
                  detail: {
                    toolName: 'canvas_code_editor',
                    args: {
                      action: 'create',
                      language: currentCodeBlock.language,
                      code: currentCodeBlock.code.trim()
                    }
                  }
                })
                window.dispatchEvent(event)
                
                codeBlocksSent.add(blockKey)
                console.log('[Stream] Code sent to Canvas')
                
                // Remove the complete code block from display content
                const beforeBlock = content.substring(0, currentCodeBlock.startIndex).trim()
                const afterBlock = content.substring(currentCodeBlock.startIndex + afterStart.substring(0, closingBackticks + 3).length).trim()
                
                // Build display content with proper spacing
                displayContent = beforeBlock
                if (beforeBlock) displayContent += '\n\n'
                displayContent += `[Code written to Canvas: ${currentCodeBlock.language}]`
                if (afterBlock) displayContent += '\n\n' + afterBlock
              }
              
              // Reset for next code block
              currentCodeBlock = null
            } else {
              // Code block is still being streamed - send partial code to Canvas for live update
              if (currentCodeBlock.code.trim().length > 10) {
                // Dispatch partial code to Canvas for live streaming effect
                const event = new CustomEvent('canvasToolCall', {
                  detail: {
                    toolName: 'canvas_code_editor',
                    args: {
                      action: 'update', // Use update for streaming
                      language: currentCodeBlock.language,
                      code: currentCodeBlock.code.trim()
                    }
                  }
                })
                window.dispatchEvent(event)
              }
              
              // Show text before code block while streaming
              const beforeBlock = content.substring(0, currentCodeBlock.startIndex).trim()
              
              // Build display content - show text before code block + indicator
              displayContent = beforeBlock
              if (beforeBlock) displayContent += '\n\n'
              displayContent += `[Writing code to Canvas: ${currentCodeBlock.language}...]`
              
              console.log('[Stream] Displaying:', displayContent.substring(0, 100))
            }
          }
        }
        
        updateMessage(session.id, assistantMessage.id, displayContent)

        let delay = streamingComplete && chunkQueue.length > 20 ? 5 : 20
        setTimeout(processQueue, delay)
      }

      console.log('[useChatWithTools] Sending messages to provider:', messages.length, 'messages')
      console.log('[useChatWithTools] Last message content length:', messages[messages.length - 1]?.content.length)
      console.log('[useChatWithTools] Last message preview:', messages[messages.length - 1]?.content.substring(0, 300))
      console.log('[useChatWithTools] Canvas tools enabled:', canvasToolsEnabled)

      // Prepare tools array if canvas tools are enabled
      const tools = canvasToolsEnabled ? [
        {
          type: 'function' as const,
          function: {
            name: 'canvas_code_editor',
            description: 'Write, edit, and execute code in the Canvas editor. Use this when the user asks for code.',
            parameters: {
              type: 'object',
              properties: {
                action: {
                  type: 'string',
                  enum: ['create', 'update', 'append', 'execute'],
                  description: 'The action to perform: create (new code), update (replace code), append (add code), execute (run code)'
                },
                language: {
                  type: 'string',
                  description: 'Programming language (e.g., python, javascript, html, css)'
                },
                code: {
                  type: 'string',
                  description: 'The code content'
                },
                description: {
                  type: 'string',
                  description: 'Optional description of what the code does'
                }
              },
              required: ['action']
            }
          }
        }
      ] : undefined

      await provider.sendMessage(
        {
          model,
          messages,
          stream: true,
          temperature: 0.7,
          tools,
        },
        (chunk) => {
          chunkQueue.push(chunk)
          if (!isProcessingQueue) {
            processQueue()
          }
        }
      )

      streamingComplete = true

      // Wait for queue to finish
      while (chunkQueue.length > 0 || isProcessingQueue) {
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      const finalContent = streamingContentRef.current
      
      // Remove code blocks from chat that were sent to Canvas during streaming
      try {
        const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g
        const codeMatches = Array.from(finalContent.matchAll(codeBlockRegex))
        
        console.log('[useChatWithTools] Final: Found code blocks:', codeMatches.length)
        
        if (codeMatches.length > 0) {
          let chatContent = finalContent
          
          for (const match of codeMatches) {
            const language = match[1].toLowerCase()
            const code = match[2].trim()
            
            const supportedLanguages = ['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'rust', 'go', 'markdown']
            if (supportedLanguages.includes(language) && code.length > 20) {
              // Remove code block from chat content and replace with indicator
              chatContent = chatContent.replace(match[0], `\n[Code written to Canvas: ${language}]\n`)
            }
          }
          
          // Update message with cleaned content
          updateMessage(session.id, assistantMessage.id, chatContent.trim())
        } else {
          updateMessage(session.id, assistantMessage.id, finalContent)
        }
      } catch (error) {
        console.error('[useChatWithTools] Error cleaning code blocks:', error)
        updateMessage(session.id, assistantMessage.id, finalContent)
      }

      // Calculate token usage and citation metadata after streaming completes
      try {
        // Calculate streaming duration and tokens per second
        const streamEndTime = Date.now()
        const streamDuration = streamEndTime - streamStartTime

        // Include the assistant's response in the token calculation
        const messagesWithResponse = [
          ...messages,
          {
            role: 'assistant' as const,
            content: finalContent
          }
        ]

        const tokenUsage = Tokenizer.countMessageTokens(
          messagesWithResponse,
          model,
          providerConfig.type
        )

        // Calculate tokens per second (only for output tokens)
        const tokensPerSecond = streamDuration > 0 
          ? (tokenUsage.outputTokens / (streamDuration / 1000))
          : 0

        // Add streaming metrics to token usage
        const tokenUsageWithMetrics = {
          ...tokenUsage,
          tokensPerSecond: Math.round(tokensPerSecond * 100) / 100, // Round to 2 decimal places
          streamDuration
        }

        // Extract citation metadata from the assistant's response
        const { CitationParser } = await import('../lib/citations/citationParser')
        const citations = CitationParser.parse(finalContent)
        const citationMetadata = citations.length > 0 ? {
          sourceIds: CitationParser.extractSourceIds(finalContent),
          citationCount: citations.length
        } : undefined

        // Update assistant message with token usage and citation metadata
        setSessions(prev =>
          prev.map(s =>
            s.id === session.id
              ? {
                ...s,
                messages: s.messages.map(m =>
                  m.id === assistantMessage.id
                    ? {
                      ...m,
                      metadata: {
                        ...m.metadata,
                        tokenUsage: tokenUsageWithMetrics,
                        model,
                        provider: providerConfig.type,
                        citations: citationMetadata
                      }
                    }
                    : m
                )
              }
              : s
          )
        )

        // Also update current session
        setCurrentSession(prev => {
          if (prev?.id === session.id) {
            return {
              ...prev,
              messages: prev.messages.map(m =>
                m.id === assistantMessage.id
                  ? {
                    ...m,
                    metadata: {
                      ...m.metadata,
                      tokenUsage: tokenUsageWithMetrics,
                      model,
                      provider: providerConfig.type,
                      citations: citationMetadata
                    }
                  }
                  : m
              )
            }
          }
          return prev
        })

        console.log('[Token Usage] Calculated tokens:', tokenUsageWithMetrics)
        if (citationMetadata) {
          console.log('[Citations] Extracted citation metadata:', citationMetadata)
        }
      } catch (error) {
        console.warn('[Token Usage] Failed to calculate token usage:', error)
        // Gracefully handle error - token usage will remain undefined
      }

    } catch (error) {
      console.error('Failed to send message:', error)
      const errorMessage: Message = {
        id: generateId(),
        role: 'assistant',
        content: `Error: ${error instanceof Error ? error.message : 'Unknown error'}`,
        timestamp: Date.now(),
      }
      addMessage(session.id, errorMessage)
    } finally {
      setIsGenerating(false)
    }
  }, [currentSession, addMessage, updateMessage, updateSessionTitle, autoSearchEnabled])

  const deleteSession = useCallback((sessionId: string) => {
    setSessions(prev => prev.filter(s => s.id !== sessionId))
    if (currentSession?.id === sessionId) {
      setCurrentSession(null)
    }
  }, [currentSession])

  // Get SourceRegistry from the AutoSearchManager's orchestrator
  const getSourceRegistry = useCallback(() => {
    return autoSearchManager.current.getOrchestrator().getSourceRegistry()
  }, [])

  /**
   * Regenerate a specific assistant message
   */
  const regenerateMessage = useCallback(async (
    messageId: string,
    providerConfig: ProviderConfig,
    model: string
  ) => {
    const session = currentSession
    if (!session) return

    // Find the assistant message to regenerate
    const messageIndex = session.messages.findIndex(m => m.id === messageId)
    if (messageIndex === -1) return

    const messageToRegenerate = session.messages[messageIndex]
    if (messageToRegenerate.role !== 'assistant') return

    // Find the previous user message
    let userMessageIndex = messageIndex - 1
    while (userMessageIndex >= 0 && session.messages[userMessageIndex].role !== 'user') {
      userMessageIndex--
    }

    if (userMessageIndex < 0) return

    const userMessage = session.messages[userMessageIndex]

    // Remove the assistant message and all messages after it
    const messagesBeforeAssistant = session.messages.slice(0, messageIndex)
    
    // Update session with messages up to (but not including) the assistant message
    setSessions(prev =>
      prev.map(s =>
        s.id === session.id
          ? { ...s, messages: messagesBeforeAssistant, updatedAt: Date.now() }
          : s
      )
    )
    setCurrentSession(prev =>
      prev?.id === session.id
        ? { ...prev, messages: messagesBeforeAssistant, updatedAt: Date.now() }
        : prev
    )

    // Create a temporary session with the truncated messages for regeneration
    const tempSession: ChatSession = {
      ...session,
      messages: messagesBeforeAssistant
    }

    // Regenerate by sending the user message again
    await sendMessage(
      userMessage.content,
      providerConfig,
      model,
      tempSession,
      userMessage.images
    )
  }, [currentSession, sendMessage, setSessions, setCurrentSession])

  return {
    sessions,
    currentSession,
    setCurrentSession,
    isGenerating,
    autoSearchEnabled,
    setAutoSearchEnabled,
    webSearchSettings,
    updateWebSearchSettings,
    canvasToolsEnabled,
    setCanvasToolsEnabled,
    createSession,
    sendMessage,
    regenerateMessage,
    deleteSession,
    updateSessionTitle,
    getSourceRegistry,
  }
}
