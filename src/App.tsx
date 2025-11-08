import { useState, useEffect } from 'react'
import { Sidebar } from './components/Sidebar'
import { ChatArea } from './components/ChatArea'
import { SettingsModal } from './components/SettingsModal'
import { UpdateModal } from './components/UpdateModal'
import { Canvas } from './components/Canvas'

import { useChatWithTools } from './hooks/useChatWithTools'
import { useProviders } from './hooks/useProviders'
import { useUpdateChecker } from './hooks/useUpdateChecker'
import { useCanvasManager } from './hooks/useCanvasManager'
import { ProviderHealthMonitor } from './services/ProviderHealthMonitor'
import type { ImageAttachment } from './types'

function App() {
  const [showSettings, setShowSettings] = useState(false)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [isSidebarOpen, setIsSidebarOpen] = useState(true)

  // Clean up old unsupported providers from localStorage on app start
  useEffect(() => {
    const cleanupOldProviders = () => {
      const supportedProviders = new Set(['ollama', 'lmstudio'])
      
      // Clean up provider health cache
      try {
        const healthCache = localStorage.getItem('oc.providerHealth')
        if (healthCache) {
          const parsed = JSON.parse(healthCache)
          const cleaned: Record<string, any> = {}
          let hasChanges = false
          
          for (const [key, value] of Object.entries(parsed)) {
            if (value && typeof value === 'object' && 'type' in value) {
              if (supportedProviders.has((value as any).type)) {
                cleaned[key] = value
              } else {
                hasChanges = true
                console.log(`Removed unsupported provider from health cache: ${(value as any).type}`)
              }
            }
          }
          
          if (hasChanges) {
            localStorage.setItem('oc.providerHealth', JSON.stringify(cleaned))
          }
        }
      } catch (error) {
        console.warn('Failed to clean provider health cache:', error)
      }
      
      // Clean up providers list
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
              console.log(`Removed ${parsed.length - cleaned.length} unsupported provider(s) from config`)
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
  } = useChatWithTools()

  // Canvas Manager Hook - completely independent from main chat
  // Uses useCanvasChat internally for its own message handling
  const {
    isCanvasMode,
    setIsCanvasMode,
    canvasSessions,
    currentCanvasSession,
    isCanvasGenerating,
    handleNewCanvasSession,
    handleSelectCanvasSession,
    handleCanvasSendMessage,
    handleCanvasRegenerateMessage,
    handleDeleteCanvasSession,
    handleRenameCanvasSession,
    handleSaveCanvasState,
  } = useCanvasManager({
    setCanvasToolsEnabled,
  })

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

  // Load models when provider is selected
  useEffect(() => {
    if (selectedProvider) {
      loadModels(selectedProvider)
    }
  }, [selectedProvider, loadModels])

  // Initialize ProviderHealthMonitor on app mount
  useEffect(() => {
    const healthMonitor = ProviderHealthMonitor.getInstance()
    
    // Start monitoring with current providers
    healthMonitor.start(providers)
    
    // Cleanup: stop monitoring on unmount
    return () => {
      healthMonitor.stop()
    }
  }, [providers])

  const handleNewChat = () => {
    if (!selectedProvider || !selectedModel) {
      // Show settings if no provider/model is configured
      setShowSettings(true)
      return
    }
    const session = createSession(selectedProvider, selectedModel)
    setCurrentSession(session)
    return session
  }

  const handleSendMessage = async (content: string, images?: ImageAttachment[]) => {
    if (!selectedProvider || !selectedModel) return
    
    // If no current session, create one (important for Canvas mode)
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
    
    // Create user message first with stable, unique ID
    const userMessage = {
      id: `${Date.now()}-init`,
      role: 'user' as const,
      content,
      timestamp: Date.now(),
      images: images && images.length > 0 ? images : undefined,
    }
    
    // Create session WITH the user message already in it
    const newSession = createSession(selectedProvider, selectedModel, userMessage)
    
    // Now send to AI (reuse existing user message to avoid duplicates)
    await sendMessage(content, selectedProvider, selectedModel, newSession, images)
  }



  return (
    <div className="flex h-screen overflow-hidden text-foreground relative" style={{ backgroundColor: 'var(--color-main)' }}>
      {/* Left Sidebar - Hidden in Canvas Mode */}
      {!isCanvasMode && (
        <div 
          className="flex-shrink-0 transition-all duration-300 ease-in-out"
          style={{ 
            width: isSidebarOpen ? '256px' : '0px',
            overflow: 'hidden'
          }}
        >
          <Sidebar
            sessions={sessions.filter((s: any) => !s.isCanvas)}
            currentSession={(currentSession as any)?.isCanvas ? null : currentSession}
            updateInfo={updateInfo}
            onNewChat={handleNewChat}
            onSelectSession={setCurrentSession}
            onDeleteSession={deleteSession}
            onRenameSession={updateSessionTitle}
            onOpenSettings={() => setShowSettings(true)}
            onToggleSidebar={() => setIsSidebarOpen(!isSidebarOpen)}
            onOpenUpdate={() => setShowUpdateModal(true)}
            onOpenBrowser={() => setIsCanvasMode(!isCanvasMode)}
          />
        </div>
      )}

      {/* Floating Toggle Button (when sidebar is closed and not in Canvas mode) */}
      {!isSidebarOpen && !isCanvasMode && (
        <button
          onClick={() => setIsSidebarOpen(true)}
          className="absolute top-3 left-3 z-50 p-2 rounded-lg hover:bg-white/10 transition-colors"
          style={{ backgroundColor: 'var(--color-sidebar)' }}
          title="Open Sidebar"
        >
          <svg xmlns="http://www.w3.org/2000/svg" height="20px" viewBox="0 -960 960 960" width="20px" fill="currentColor">
            <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm440-80h120v-560H640v560Zm-80 0v-560H200v560h360Zm80 0h120-120Z"/>
          </svg>
        </button>
      )}

      {/* Main Content Area - Chat or Canvas */}
      <div className="flex-1 flex flex-col min-w-0" style={{ backgroundColor: 'var(--color-main)' }}>
        {isCanvasMode ? (
          <Canvas
            language="javascript"
            onSendMessage={(content, images) => handleCanvasSendMessage(content, selectedProvider, selectedModel, setShowSettings, images)}
            isGenerating={isCanvasGenerating}
            onExit={() => setIsCanvasMode(false)}
            providers={providers}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            models={models}
            onSelectProvider={setSelectedProvider}
            onSelectModel={setSelectedModel}
            onLoadModels={loadModels}
            isLoadingModels={isLoadingModels}
            canvasToolsEnabled={canvasToolsEnabled}
            currentSession={currentCanvasSession || (canvasSessions.length > 0 ? canvasSessions[0] : null)}
            onRegenerateMessage={(messageId) => handleCanvasRegenerateMessage(messageId, selectedProvider, selectedModel)}
            getSourceRegistry={getSourceRegistry}
            canvasSessions={canvasSessions}
            onSelectCanvasSession={handleSelectCanvasSession}
            onCreateCanvasSession={() => handleNewCanvasSession(selectedProvider, selectedModel, setShowSettings)}
            onDeleteCanvasSession={handleDeleteCanvasSession}
            onRenameCanvasSession={handleRenameCanvasSession}
            onSaveCanvasState={handleSaveCanvasState}
          />
        ) : (
          <ChatArea
            session={currentSession}
            isGenerating={isGenerating}
            onSendMessage={handleSendMessage}
            onSendMessageWithNewChat={handleSendMessageWithNewChat}
            onRegenerateMessage={(messageId) => {
              if (selectedProvider && selectedModel) {
                regenerateMessage(messageId, selectedProvider, selectedModel)
              }
            }}
            providers={providers}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            models={models}
            onSelectProvider={setSelectedProvider}
            onSelectModel={setSelectedModel}
            onLoadModels={loadModels}
            isLoadingModels={isLoadingModels}
            autoSearchEnabled={autoSearchEnabled}
            onToggleAutoSearch={() => setAutoSearchEnabled(!autoSearchEnabled)}
            getSourceRegistry={getSourceRegistry}
          />
        )}
      </div>

      {/* Settings Modal */}
      {showSettings && (
        <SettingsModal
          providers={providers}
          selectedProvider={selectedProvider}
          models={models}
          selectedModel={selectedModel}
          isLoadingModels={isLoadingModels}
          webSearchSettings={webSearchSettings || undefined}
          onClose={() => setShowSettings(false)}
          onSelectProvider={setSelectedProvider}
          onSelectModel={setSelectedModel}
          onUpdateProvider={updateProvider}
          onTestProvider={testProvider}
          onLoadModels={loadModels}
          onUpdateWebSearchSettings={updateWebSearchSettings}
        />
      )}

      {/* Update Modal */}
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
