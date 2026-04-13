import { useEffect, useRef, useState } from 'react'
import { ChatMessage } from './ChatMessage'
import { ChatInput } from './ChatInput'
import type { ChatSession, ProviderConfig, ModelInfo, ImageAttachment } from '../types'
import type { SourceRegistry } from '../lib/web-search/sourceRegistry'

interface ChatAreaProps {
  session: ChatSession | null
  isGenerating: boolean
  onSendMessage: (content: string, images?: ImageAttachment[]) => void
  onSendMessageWithNewChat: (content: string, images?: ImageAttachment[]) => void
  onRegenerateMessage?: (messageId: string) => void
  onStop?: () => void
  autoSearchEnabled?: boolean
  onToggleAutoSearch?: () => void
  getSourceRegistry: () => SourceRegistry
  registryVersion?: number
  pendingPrompt?: string
  onPromptConsumed?: () => void
}

export function ChatArea({ 
  session, 
  isGenerating, 
  onSendMessage, 
  onSendMessageWithNewChat,
  onRegenerateMessage,
  onStop,
  autoSearchEnabled = false,
  onToggleAutoSearch = () => {},
  getSourceRegistry,
  registryVersion = 0,
  pendingPrompt,
  onPromptConsumed
}: ChatAreaProps) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const [modelCapabilities, setModelCapabilities] = useState<ModelInfo['capabilities']>()

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (isGenerating) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'auto' })
    } else {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [session?.messages, isGenerating])

  // Show centered input only when no session exists
  const showCenteredInput = !session

  if (showCenteredInput) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-semibold mb-2" style={{ color: 'var(--color-foreground)' }}>
            How can I help you today?
          </h2>
        </div>
        <div className="w-full max-w-3xl px-4">
          <ChatInput
            onSend={onSendMessageWithNewChat}
            onStop={onStop}
            disabled={isGenerating}
            isGenerating={isGenerating}
            centered={true}
            autoSearchEnabled={autoSearchEnabled}
            onToggleAutoSearch={onToggleAutoSearch}
            modelCapabilities={modelCapabilities}
            onCapabilitiesChange={setModelCapabilities}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={onPromptConsumed}
          />
          <p className="text-[11.5px] text-gray-500 text-center mt-2 max-w-md mx-auto leading-relaxed px-4 opacity-80">
            OpenChat 2.0 Web Search is currently in development. AI can make mistakes. <br/> Always cross-check important information for accuracy.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full relative">
      {/* Messages */}
      <div className="flex-1 overflow-y-auto relative">

        {session.messages.length === 0 ? (
          <div className="flex-1"></div>
        ) : (
          <div>
            {session.messages.map((message, index) => {
              // Get previous message for autoSearch metadata
              const previousMessage = index > 0 ? session.messages[index - 1] : undefined
              
              // Show system messages only if they have a status (like 'searching')
              const shouldShowMessage = message.role !== 'system' || message.status === 'searching'
              
              return (
                <div key={message.id}>
                  {shouldShowMessage && (
                    <ChatMessage 
                      message={message} 
                      previousMessage={previousMessage}
                      sourceRegistry={getSourceRegistry()}
                      registryVersion={registryVersion}
                      onRegenerateMessage={onRegenerateMessage}
                      isGenerating={isGenerating}
                    />
                  )}
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input Container */}
      <div className="w-full flex flex-col items-center">
        <div className="w-full max-w-3xl px-4 pt-2 pb-1">
          <ChatInput
            onSend={onSendMessage}
            onStop={onStop}
            disabled={isGenerating}
            isGenerating={isGenerating}
            autoSearchEnabled={autoSearchEnabled}
            onToggleAutoSearch={onToggleAutoSearch}
            modelCapabilities={modelCapabilities}
            onCapabilitiesChange={setModelCapabilities}
            pendingPrompt={pendingPrompt}
            onPromptConsumed={onPromptConsumed}
          />
          <p className="text-[11.5px] text-gray-500/80 text-center mt-1 mb-0.5 max-w-md mx-auto leading-relaxed">
            Web Search is in experimental phase. AI can make mistakes. Cross-check facts.
          </p>
        </div>
      </div>
    </div>
  )
}
