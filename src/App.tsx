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
import { cn } from './lib/utils'
import { Globe, Sparkles } from 'lucide-react'
import { ChatHub } from './components/ChatHub'
import { HubSidebar } from './components/HubSidebar'
import type { ActivityTab } from './components/ActivityBar'


function App() {
  const [activeTab, setActiveTab] = useState<ActivityTab>('chat')
  const [showSettings, setShowSettings] = useState(false)
  const [initialSettingsTab, setInitialSettingsTab] = useState<string | undefined>(undefined)
  const [showUpdateModal, setShowUpdateModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [hubView, setHubView] = useState<'home' | 'explore' | 'friends' | 'rules' | 'messages'>('home')

  const isSidebarOpen = ['chat', 'hub'].includes(activeTab)

  const [pendingPrompt, setPendingPrompt] = useState<string | undefined>(undefined)

  const handleRunPrompt = (prompt: string) => {
    setPendingPrompt(prompt)
    setActiveTab('chat')
  }

  const handleTabChange = (tab: ActivityTab) => {
    if (tab === 'settings') {
      setInitialSettingsTab('general')
      setShowSettings(true)
    } else if (tab === 'account') {
      setInitialSettingsTab('account')
      setShowSettings(true)
    } else {
      setActiveTab(tab)
    }
  }

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

  // Hub Messaging States (Lifted for Sidebar integration)
  const [hubFriendsList, setHubFriendsList] = useState<any[]>([])
  const [activeChatUserId, setActiveChatUserId] = useState<string | null>(null)
  const [activeProfileUserId, setActiveProfileUserId] = useState<string | null>(null)
  const [onlineUserIds, setOnlineUserIds] = useState<string[]>([])

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
      {/* Sidebar Container */}
      <div 
        className="flex-shrink-0 transition-all duration-300 ease-in-out border-r flex flex-col"
        style={{ 
          width: isSidebarOpen ? '320px' : '0px', // Slightly wider for the new layout
          overflow: 'hidden',
          borderColor: 'var(--color-border)',
          backgroundColor: 'var(--color-sidebar)'
        }}
      >
        {/* New Top Switche (replacing ActivityBar) */}
        <div className="p-4 border-b border-white/5 flex gap-2">
            {[
                { id: 'chat' as ActivityTab, icon: Sparkles, label: 'AI Chat' },
                { id: 'hub' as ActivityTab, icon: Globe, label: 'Social Hub' }
            ].map((tab) => (
                <button
                    key={tab.id}
                    onClick={() => handleTabChange(tab.id)}
                    className={cn(
                        "flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl transition-all font-bold text-[10px] uppercase tracking-widest",
                        activeTab === tab.id 
                            ? "bg-primary text-primary-foreground shadow-lg shadow-primary/10" 
                            : "text-muted-foreground hover:bg-white/5"
                    )}
                >
                    <tab.icon size={14} />
                    {tab.label}
                </button>
            ))}
        </div>

        <div className="flex-1 overflow-hidden flex flex-col">
            {activeTab === 'chat' ? (
              <Sidebar
                sessions={sessions}
                currentSession={currentSession}
                onNewChat={handleNewChat}
                onSelectSession={setCurrentSession}
                onDeleteSession={deleteSession}
                onRenameSession={updateSessionTitle}
                onOpenSettings={() => setShowSettings(true)}
              />
            ) : activeTab === 'hub' ? (
              <HubSidebar 
                activeSubTab={hubView}
                onSubTabChange={(tab) => {
                  setHubView(tab);
                  if (tab !== 'messages') setActiveChatUserId(null);
                  if (tab !== 'friends') setActiveProfileUserId(null);
                }}
                onOpenSettings={() => setShowSettings(true)} 
                friendsList={hubFriendsList}
                activeChatUserId={activeChatUserId}
                setActiveChatUserId={setActiveChatUserId}
                activeProfileUserId={activeProfileUserId}
                setActiveProfileUserId={setActiveProfileUserId}
                onlineUserIds={onlineUserIds}
              />
            ) : null}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-full relative" style={{ backgroundColor: 'var(--color-main)' }}>
        {activeTab === 'chat' ? (
          <>
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
              pendingPrompt={pendingPrompt}
              onPromptConsumed={() => setPendingPrompt(undefined)}
            />
          </>
        ) : activeTab === 'hub' ? (
          <ChatHub 
            view={hubView} 
            onRunPrompt={handleRunPrompt}
            friendsList={hubFriendsList}
            onUpdateFriendsList={setHubFriendsList}
            activeChatUserId={activeChatUserId}
            onSetActiveChatUserId={setActiveChatUserId}
            activeProfileUserId={activeProfileUserId}
            onSetActiveProfileUserId={setActiveProfileUserId}
            onlineUserIds={onlineUserIds}
            onUpdateOnlineUserIds={setOnlineUserIds}
          />
        ) : (
          <div className="flex-1 flex flex-col overflow-y-auto">
             <div className="p-8">
                <h2 className="text-2xl font-bold mb-4 capitalize">{activeTab}</h2>
                <p className="text-muted-foreground">Select a section from the activity bar.</p>
             </div>
          </div>
        )}
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
          defaultTab={initialSettingsTab}
          onClose={() => {
            setShowSettings(false)
            setInitialSettingsTab(undefined)
          }}
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
