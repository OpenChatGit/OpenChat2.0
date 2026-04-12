import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { ModelSelector } from './components/ModelSelector'
import { SettingsModal } from './components/SettingsModal'
import { UpdateModal } from './components/UpdateModal'
import { UpgradeModal } from './components/UpgradeModal'

import { useChatWithTools } from './hooks/useChatWithTools'
import { useProviders } from './hooks/useProviders'
import { useUpdateChecker } from './hooks/useUpdateChecker'
import type { ImageAttachment } from './types'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const isSidebarOpen = true // Locked open for Pro look, or we can add toggle back

  // Clean up old unsupported providers from localStorage on app start
  useEffect(() => {
    const cleanupOldProviders = () => {
      const supportedProviders = new Set(['ollama', 'supabase-premium'])
      try {
        const providers = localStorage.getItem('providers')
        if (providers) {
          const parsed = JSON.parse(providers)
          if (Array.isArray(parsed)) {
            const cleaned = parsed.filter((p: any) => 
              p && typeof p === 'object' && 'type' in p && supportedProviders.has(p.type)
            )
            if (cleaned.length !== parsed.length) {
              localStorage.setItem('providers', JSON.stringify(cleaned))
            }
          }
        }
      } catch (error) {
        console.warn('Failed to clean providers list:', error)
      }
    }
    cleanupOldProviders()
  }, [])

  const { updateInfo } = useUpdateChecker()
  const {
    sessions,
    currentSession,
    setCurrentSession,
    isGenerating,
    autoSearchEnabled,
    setAutoSearchEnabled,
    createSession,
    sendMessage,
    regenerateMessage,
    deleteSession,
    updateSessionTitle,
    getSourceRegistry,
    registryVersion,
    cancelGeneration
  } = useChatWithTools()

  const {
    providers,
    selectedProvider,
    setSelectedProvider,
    models,
    selectedModel,
    setSelectedModel,
    isLoadingModels,
    loadModels,
    testProvider,
    updateProvider,
  } = useProviders()

  useEffect(() => {
    if (selectedProvider) {
      loadModels(selectedProvider)
    }
  }, [selectedProvider, loadModels])


  const handleNewChat = () => {
    if (!selectedProvider || !selectedModel) {
      setShowSettings(true)
      return
    }
    const session = createSession(selectedProvider, selectedModel)
    setCurrentSession(session)
    return session
  }

  const handleSendMessage = async (content: string, images?: ImageAttachment[]) => {
    if (!selectedProvider || !selectedModel) return
    if (!currentSession) {
      const newSession = createSession(selectedProvider, selectedModel)
      await sendMessage(content, selectedProvider, selectedModel, newSession, images)
    } else {
      await sendMessage(content, selectedProvider, selectedModel, currentSession, images)
    }
  }

  const handleSendMessageWithNewChat = async (content: string, images?: ImageAttachment[]) => {
    if (!selectedProvider || !selectedModel) {
      setShowSettings(true)
      return
    }
    const userMessage = {
      id: `${Date.now()}-init`,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
      images: images && images.length > 0 ? images : undefined,
    }
    const newSession = createSession(selectedProvider, selectedModel, userMessage)
    await sendMessage(content, selectedProvider, selectedModel, newSession, images)
  }

  return (
    <div className="flex h-screen overflow-hidden text-foreground relative" style={{ backgroundColor: 'var(--color-main)' }}>
      {/* Left Sidebar */}
      <div 
        className="flex-shrink-0 transition-all duration-300 ease-in-out border-r"
        style={{ 
          width: isSidebarOpen ? '260px' : '0px',
          overflow: 'hidden',
          borderColor: 'var(--color-border)'
        }}
      >
        <Sidebar
          sessions={sessions}
          currentSession={currentSession}
          onNewChat={handleNewChat}
          onSelectSession={setCurrentSession}
          onDeleteSession={deleteSession}
          onRenameSession={updateSessionTitle}
          onOpenSettings={() => setShowSettings(true)}
          onOpenUpgrade={() => setShowUpgradeModal(true)}
        />
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative" style={{ backgroundColor: 'var(--color-main)' }}>
        {/* Floating Model Selector */}
        <div className="absolute top-[14px] left-4 z-50">
          <ModelSelector
            providers={providers}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            models={models}
            onSelectProvider={setSelectedProvider}
            onSelectModel={setSelectedModel}
            onLoadModels={loadModels}
            isLoadingModels={isLoadingModels}
          />
        </div>

        <ChatArea
          session={currentSession}
          isGenerating={isGenerating}
          onSendMessage={handleSendMessage}
          onSendMessageWithNewChat={handleSendMessageWithNewChat}
          onStop={cancelGeneration}
          onRegenerateMessage={(messageId) => selectedProvider && selectedModel && regenerateMessage(messageId, selectedProvider, selectedModel)}
          autoSearchEnabled={autoSearchEnabled}
          onToggleAutoSearch={() => setAutoSearchEnabled(!autoSearchEnabled)}
          getSourceRegistry={getSourceRegistry}
          registryVersion={registryVersion}
        />
      </div>

      {/* Modals */}
      <UpgradeModal 
        isOpen={showUpgradeModal} 
        onClose={() => setShowUpgradeModal(false)} 
      />
      
      {showSettings && (
        <SettingsModal
          providers={providers}
          selectedProvider={selectedProvider}
          models={models}
          selectedModel={selectedModel}
          isLoadingModels={isLoadingModels}
          onClose={() => setShowSettings(false)}
          onSelectProvider={setSelectedProvider}
          onSelectModel={setSelectedModel}
          onUpdateProvider={updateProvider}
          onTestProvider={testProvider}
          onLoadModels={loadModels}
        />
      )}

      {showUpdateModal && updateInfo?.available && (
        <UpdateModal
          updateInfo={updateInfo}
          onClose={() => setShowUpdateModal(false)}
        />
      )}
    </div>
  )
}

export default App
