// Enhanced useChat hook with Tool Call support

import { useState, useCallback, useRef, useEffect } from 'react'
import type { ChatSession, Message, ProviderConfig, ImageAttachment } from '../types'
import { generateId } from '../lib/utils'
import { AutoSearchAdapter } from '../lib/web-search/AutoSearchAdapter'
import type { WebSearchSettings } from '../components/WebSearchSettings'
import { loadWebSearchSettings, saveWebSearchSettings } from '../lib/web-search/settingsStorage'
import { Tokenizer } from '../lib/tokenizer'
import { pushSessionToEdge as cloudPush, loadSessionFromEdge as cloudLoad } from '../services/cloudSync'
import { ChatEngine } from '../lib/langchain/ChatEngine'
import { getSafeSession } from '../lib/supabase'

const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Default system prompt constant
const getSystemPrompt = () => `You are OpenChat 2.0, a highly capable and friendly AI assistant.
Your goal is to provides accurate, helpful, and concise responses.

### GUIDELINES:
1. CITATIONS: When using external information or searching the web, always cite your sources using [N] notation.
2. TONE: Be professional, helpful, and direct.
3. STRUCTURE: Use markdown to structure long responses for better readability.
4. REASONING: If you need to think through a complex problem, do so clearly.`



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
    setCurrentSessionState(prev => {
      const next = typeof sessionOrUpdater === 'function' ? sessionOrUpdater(prev) : sessionOrUpdater;
      
      // Only clear SourceRegistry when switching to a different session ID
      if (next?.id !== prev?.id) {
        const sourceRegistry = autoSearchManager.current.getOrchestrator().getSourceRegistry()
        sourceRegistry.clear()
        console.log('[useChatWithTools] SourceRegistry cleared for session switch', {
          oldId: prev?.id,
          newId: next?.id
        })
      }
      
      return next
    })
  }, [])

  const [isGenerating, setIsGenerating] = useState(false)
  const [registryVersion, setRegistryVersion] = useState(0)
  const [autoSearchEnabled, setAutoSearchEnabled] = useState(false)
  const [webSearchSettings, setWebSearchSettings] = useState<WebSearchSettings | null>(null)

  const streamingContentRef = useRef<string>('')
  const autoSearchManager = useRef(new AutoSearchAdapter())
  const settingsInitialized = useRef(false)
  const abortControllerRef = useRef<AbortController | null>(null)

  const cancelGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort()
      abortControllerRef.current = null
    }
    setIsGenerating(false)
  }, [])

  const saveSessionsTimer = useRef<NodeJS.Timeout | null>(null)
  const saveCurrentSessionTimer = useRef<NodeJS.Timeout | null>(null)

  // Save sessions to localStorage whenever they change (Debounced)
  useEffect(() => {
    if (saveSessionsTimer.current) {
      clearTimeout(saveSessionsTimer.current)
    }

    saveSessionsTimer.current = setTimeout(() => {
      try {
        const serialized = JSON.stringify(sessions)
        const sizeInBytes = new Blob([serialized]).size
        const sizeInMB = sizeInBytes / (1024 * 1024)

        if (sizeInMB > 4) {
          console.warn(`Session storage size is ${sizeInMB.toFixed(2)}MB. Consider clearing old sessions with images.`)
        }

        localStorage.setItem('chat-sessions', serialized)
      } catch (error) {
        console.error('Failed to save sessions to localStorage:', error)
      }
    }, 1000) // Debounce for 1 second

    return () => {
      if (saveSessionsTimer.current) clearTimeout(saveSessionsTimer.current)
    }
  }, [sessions])

  // Save current session to localStorage whenever it changes (Debounced)
  useEffect(() => {
    if (saveCurrentSessionTimer.current) {
      clearTimeout(saveCurrentSessionTimer.current)
    }

    saveCurrentSessionTimer.current = setTimeout(() => {
      try {
        if (currentSession) {
          const serialized = JSON.stringify(currentSession)
          const sizeInBytes = new Blob([serialized]).size
          const sizeInMB = sizeInBytes / (1024 * 1024)

          if (sizeInMB > 2) {
            console.warn(`Current session size is ${sizeInMB.toFixed(2)}MB. Images are contributing to storage size.`)
          }

          localStorage.setItem('current-session', serialized)
        } else {
          localStorage.removeItem('current-session')
        }
      } catch (error) {
        console.error('Failed to save current session to localStorage:', error)
      }
    }, 500) // Debounce for 500ms for current session

    return () => {
      if (saveCurrentSessionTimer.current) clearTimeout(saveCurrentSessionTimer.current)
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

  const updateMessage = useCallback((sessionId: string, messageId: string, content: string, updates: Partial<Message> = {}) => {
    setSessions(prev =>
      prev.map(s =>
        s.id === sessionId
          ? {
            ...s,
            messages: s.messages.map(m =>
              m.id === messageId ? { ...m, content, ...updates } : m
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
            m.id === messageId ? { ...m, content, ...updates } : m
          ),
          updatedAt: Date.now(),
        }
      }
      return prev
    })
  }, [])

  // ==========================================
  // Cloud Sync Methods (Edge Functions)
  // ==========================================

  const syncSessionToCloud = useCallback(async (session: ChatSession) => {
    try {
      const cloudId = await cloudPush(session)
      
      // If the cloud returned a different ID, we update our local session to match
      if (cloudId && cloudId !== session.id) {
        setSessions(prev => prev.map(s => s.id === session.id ? { ...s, id: cloudId } : s))
        setCurrentSession(prev => (prev?.id === session.id ? { ...prev, id: cloudId } : prev))
      }
      return cloudId
    } catch (error) {
      console.error('Cloud Sync failed:', error)
      throw error
    }
  }, [setSessions, setCurrentSession])

  const loadCloudSession = useCallback(async (sessionId: string) => {
    try {
      const cloudMessages = await cloudLoad(sessionId)
      
      // Update current session or create one if it doesn't exist
      setCurrentSession(prev => {
        if (prev?.id === sessionId) {
          return { ...prev, messages: cloudMessages, updatedAt: Date.now() }
        }
        return prev
      })

      setSessions(prev => prev.map(s => s.id === sessionId ? { ...s, messages: cloudMessages, updatedAt: Date.now() } : s))
      
      return cloudMessages
    } catch (error) {
      console.error('Load Cloud Session failed:', error)
      throw error
    }
  }, [setSessions, setCurrentSession])



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

  /*
  const cleanAndValidateTitle = (rawTitle: string): string | null => {
    ... (removed for brevity)
  }

  const prepareMessageForTitle = (message: string): string => {
    ... (removed for brevity)
  }
  */

  /**
   * Generate a concise session title using AI with timeout and detailed error logging
   */
  const generateSessionTitle = async (
    _sessionId: string,
    _firstMessage: string,
    _providerConfig: ProviderConfig,
    _model: string
  ) => {
    // Disabled to save costs and prevent errors
    return;
  }

  /*
  const generateSessionTitle_Disabled = async (
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

        return `You are OpenChat 2.0, a highly capable AI assistant. 
    You have access to a variety of tools to help you answer questions more accurately.

    ### Guidelines:
    - If you need up-to-date information, use the web_search tool.
    - When asked about software versions, drivers, or libraries, ALWAYS distinguish between the highest version number (which might be a Beta, Dev, or Preview release) and the **current STABLE or LTS (Long Term Support)** version. 
    - Prioritize recommending the version that is most widely used and considered "Stable" or "Recommended for Production".
    - Clearly state if a version you mention is a pre-release or experimental version.
    - Be concise and provide citations [N] for information gathered via tools.
    - If images are provided, analyze them to give better context.`; cleanTitle = cleanAndValidateTitle(response)
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
  */

  /**
   * Send message with tool support
   */
  const sendMessage = useCallback(async (
    content: string,
    providerConfig: ProviderConfig,
    model: string,
    targetSession?: ChatSession,
    images?: ImageAttachment[],
    existingAssistantId?: string
  ) => {
    let isRecursing = false;
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

    const assistantMessageId = existingAssistantId || generateId()
    const assistantMessage: Message = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      timestamp: Date.now(),
    }

    setIsGenerating(true)

    if (!existingAssistantId) {
      addMessage(session.id, assistantMessage)
    }

    try {
      // Configure AutoSearchManager
      autoSearchManager.current.configure({ enabled: autoSearchEnabled })
      

      // Helper: format messages for the provider
      // IMPORTANT: Explicitly include the userMessage we just created to avoid async state lag
      const rawMessages = [
        ...session.messages.filter(m => m.id !== userMessage.id && m.id !== assistantMessage.id),
        userMessage
      ];

      const modelMessages: Array<{
        role: 'system' | 'user' | 'assistant' | 'tool';
        content: string;
        tool_call_id?: string;
        tool_calls?: any[];
        images?: any[];
      }> = rawMessages.map(m => ({
          role: m.role as any,
          content: m.content || '',
          tool_call_id: m.toolCallId,
          tool_calls: m.toolCalls,
          images: m.images
        }))

      // Ensure system message is first
      if (!modelMessages.some(m => m.role === 'system')) {
        modelMessages.unshift({
          role: 'system',
          content: getSystemPrompt(),
        })
      }

      const messages = modelMessages;

      // Reset streaming content only if starting fresh
      if (!existingAssistantId) {
        streamingContentRef.current = ''
      }
      let isThinkingMode = false
      const streamStartTime = Date.now()
      
      let lastUpdate = 0
      const throttledUpdate = (force = false) => {
        const now = Date.now()
        if (force || now - lastUpdate > 16) { // 60fps updates for smoother llm-ui feeding
          updateMessage(session.id, assistantMessage.id, streamingContentRef.current)
          lastUpdate = now
        }
      }

      const { SupabaseWebSearchTool } = await import('../lib/tools/SupabaseWebSearch')
      const registry = autoSearchManager.current.getOrchestrator().getSourceRegistry();
      const tools = [new SupabaseWebSearchTool(registry)]

      abortControllerRef.current = new AbortController()

      const authSession = await getSafeSession();
      const userToken = authSession?.access_token;

      const chatEngine = new ChatEngine({
        provider: providerConfig.type as any,
        model: model,
        apiKey: providerConfig.apiKey,
        baseUrl: providerConfig.baseUrl,
        temperature: 0.4,
        headers: {
          'X-User-Token': userToken || '',
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
        }
      });

      console.log('[useChatWithTools] Request messages:', JSON.stringify(messages, null, 2));
      console.log('[useChatWithTools] Request tools:', JSON.stringify(tools, null, 2));

      let streamingToolCalls: any[] = [];
      try {
        const stream = await chatEngine.chat(messages, tools, abortControllerRef.current?.signal);
        
        for await (const wrappedChunk of stream) {
          if (wrappedChunk.type === 'tool') {
            console.log('[useChatWithTools] Tool execution finished, updating registry version');
            setRegistryVersion(v => v + 1);
            
            // 1. Add tool output as a message to the history (hidden from UI but available for context)
            const toolOutput = wrappedChunk.data;
            const toolMsg: Message = {
              id: generateId(),
              role: 'tool',
              content: typeof toolOutput === 'string' ? toolOutput : JSON.stringify(toolOutput),
              toolCallId: 'search',
              timestamp: Date.now(),
              isHidden: true
            };
            addMessage(session.id, toolMsg);

            // 2. Extract sources from the tool output string for specific message metadata
            let foundSources: Array<{title: string, url: string, domain: string}> = [];
            if (typeof toolOutput === 'string') {
              const blocks = toolOutput.split(/---|\n---\n/);
              for (const block of blocks) {
                const titleMatch = block.match(/Source\s*\[\d+\]:\s*(.*)/i);
                const urlMatch = block.match(/URL:\s*([^\s\n]+)/i);
                
                if (titleMatch && urlMatch) {
                  try {
                    const url = urlMatch[1].trim();
                    const domain = new URL(url).hostname;
                    foundSources.push({
                      title: titleMatch[1].trim(),
                      url: url,
                      domain: domain
                    });
                  } catch (e) {}
                }
              }

              // AGGRESSIVE FALLBACK: If no sources found with block parsing, just find all URLs
              if (foundSources.length === 0) {
                 const urlLines = toolOutput.split('\n').filter(line => line.toLowerCase().includes('url:'));
                 urlLines.forEach((line, idx) => {
                   const match = line.match(/URL:\s*([^\s\n]+)/i);
                   if (match) {
                     try {
                       const url = match[1].trim();
                       foundSources.push({
                         title: `Source ${idx + 1}`,
                         url: url,
                         domain: new URL(url).hostname
                       });
                     } catch (e) {}
                   }
                 });
              }
            }

            console.log(`[useChatWithTools] Extracted ${foundSources.length} sources for UI display`);

            // 3. Mark assistant message as completed and attach FOUND sources to metadata
            updateMessage(session.id, assistantMessage.id, streamingContentRef.current, {
               status: 'completed',
               toolCalls: [{ id: 'search', type: 'function', function: { name: 'web_search', arguments: '{}' } }] as any,
               metadata: {
                 autoSearch: {
                   triggered: true,
                   query: '',
                   sources: foundSources,
                   chunkCount: foundSources.length,
                   searchTime: 0
                 }
               }
            });
            continue;
          }

          const chunk = wrappedChunk.data;
          // Debug: log raw chunks if needed, but throttle it
          // console.log('[useChatWithTools] Chunk:', chunk);

          const addKwargs = chunk.additional_kwargs as any;
          const reasoningContent = addKwargs?.reasoning_content || addKwargs?.thinking || addKwargs?.reasoning || (chunk as any).reasoning_content || (chunk as any).thinking;
          
          const content = chunk.content as string;
          
          if (reasoningContent) {
            if (!isThinkingMode) {
              isThinkingMode = true;
              streamingContentRef.current += '<think>';
            }
            streamingContentRef.current += reasoningContent;
          }

          if (content && content.length > 0) {
            // Check if we are switching from thinking to content
            if (isThinkingMode) {
              isThinkingMode = false;
              streamingContentRef.current += '</think>\n\n';
            }
            streamingContentRef.current += content;
          }

          // 1. Native Tool Call Check (via LangChain structured output)
          if (chunk.additional_kwargs?.tool_calls) {
            console.log('[useChatWithTools] Tool calls detected in additional_kwargs:', chunk.additional_kwargs.tool_calls);
            streamingToolCalls = chunk.additional_kwargs.tool_calls;
            
            if (isThinkingMode) {
              isThinkingMode = false;
              streamingContentRef.current += '</think>\n\n';
            }

            // Update status to searching
            updateMessage(session.id, assistantMessage.id, streamingContentRef.current, {
               status: 'searching',
               toolCalls: streamingToolCalls
            });

            throttledUpdate(true);
          }

          // 2. Fallback: Check if tool call is hiding in accumulated content (for models like Qwen)
          const accumulatedSoFar = streamingContentRef.current;
          if (accumulatedSoFar.includes('{"name":') || accumulatedSoFar.includes('<tool_call>')) {
            try {
              const toolCallMatch = accumulatedSoFar.match(/<tool_call>([\s\S]*?)<\/tool_call>/i) || 
                                   accumulatedSoFar.match(/\{[\s\S]*"name"[\s\S]*?"arguments"[\s\S]*?\}/);
              
              if (toolCallMatch) {
                 const rawJson = toolCallMatch[1] || toolCallMatch[0];
                 // Basic validation to avoid early partial JSON parsing
                 if (rawJson.includes('}') || rawJson.includes('</tool_call>')) {
                    const call = JSON.parse(rawJson.trim());
                    const toolName = call.name || call.function?.name;
                    const toolArgs = call.arguments || call.function?.arguments;

                    if (toolName && toolArgs) {
                      console.log('[useChatWithTools] Tool call recovered from content string:', toolName);
                      streamingToolCalls = [{
                        id: 'call_' + Math.random().toString(36).substr(2, 9),
                        type: 'function',
                        function: {
                          name: toolName,
                          arguments: typeof toolArgs === 'string' ? toolArgs : JSON.stringify(toolArgs)
                        }
                      } as any];
                      
                      // Remove the tool call from content to prevent rendering JSON as text
                      streamingContentRef.current = streamingContentRef.current.replace(toolCallMatch[0], '');
                      
                      if (isThinkingMode) {
                        isThinkingMode = false;
                        streamingContentRef.current += '</think>\n\n';
                      }

                      // Update status to searching
                      updateMessage(session.id, assistantMessage.id, streamingContentRef.current, {
                         status: 'searching',
                         toolCalls: streamingToolCalls
                      });

                      throttledUpdate(true);
                    }
                 }
              }
            } catch (e) {
              // Ignore partial/invalid JSON until more chunks arrive
            }
          }
          
          if (reasoningContent || (content && content.length > 0)) {
            throttledUpdate();
          }
        }
        console.log('[useChatWithTools] Stream loop finished. Total tool calls found:', streamingToolCalls.length);
        if (streamingToolCalls.length === 0 && streamingContentRef.current.length > 0) {
          console.log('[useChatWithTools] Final accumulated content (no tool calls detected):', streamingContentRef.current);
        }
        // Final update to ensure everything is flushed
        throttledUpdate(true);
      } catch (error) {
        console.error('[useChatWithTools] Stream error:', error);
        setIsGenerating(false);
        throw error;
      }

      // Ensure reasoning block is closed if stream ends during reasoning
      if (isThinkingMode) {
        isThinkingMode = false;
        streamingContentRef.current += '</think>\n\n';
        throttledUpdate(true);
      }

      if (streamingToolCalls.length > 0) {
        // If it was a tool call, we already handled the message update above.
        // We don't want to overwrite it with technical JSON content.
        console.log('[useChatWithTools] Tool call detected, skipping final content update')
      } else {
        const finalContent = streamingContentRef.current
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
            content: streamingContentRef.current
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
        const citations = CitationParser.parse(streamingContentRef.current)
        const citationMetadata = citations.length > 0 ? {
          sourceIds: CitationParser.extractSourceIds(streamingContentRef.current),
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
      console.error('Error in sendMessage:', error)
      const err = error as Error
      
      if (err.name === 'AbortError' || err.message?.includes('aborted') || err.message?.includes('cancelled')) {
         // Handle cancellation safely
         updateMessage(session.id, assistantMessage.id, streamingContentRef.current + "\n\n*[Generation cancelled]*")
         setSessions(prev => prev.map(s => {
           if (s.id === session.id) {
             const messages = s.messages.map(m =>
                m.id === assistantMessage.id ? { ...m, status: 'cancelled' as const } : m
              );
             return { ...s, messages };
           }
           return s;
         }))
      } else {
        updateMessage(
          session.id,
          assistantMessage.id,
          streamingContentRef.current + "\n\n*[Error: Failed to fetch response. Please check your connection to the model provider.]*"
        )
      }
      } finally {
        if (!isRecursing) {
          setIsGenerating(false)
          abortControllerRef.current = null
        }
      }
    }, [addMessage, updateMessage, currentSession, setSessions, autoSearchEnabled, webSearchSettings])

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
    registryVersion,
    createSession,
    sendMessage,
    regenerateMessage,
    deleteSession,
    updateSessionTitle,
    getSourceRegistry,
    cancelGeneration,
    syncSessionToCloud,
    loadCloudSession,
  }
}
