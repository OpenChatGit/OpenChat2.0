import { useState, useEffect } from 'react'
import { BookOpen, X, Settings as SettingsIcon, ChevronDown, ChevronRight, Search, Cpu, Zap, User } from 'lucide-react'
import { Button } from './ui/Button'
import type { ProviderConfig, ModelInfo } from '../types'
import { cn } from '../lib/utils'

// Import the Settings components
import { Settings as SettingsContent } from './Settings'
import { WebSearchSettings, type WebSearchSettings as WebSearchSettingsType } from './WebSearchSettings'
import { ProviderSettings } from './ProviderSettings'
import { CudaSettings } from './CudaSettings'
import { AccountSettings } from './AccountSettings'
import { DocsCloudSettings } from './DocsCloudSettings'
import { DocsPricingSettings } from './DocsPricingSettings'

interface SettingsModalProps {
  // Settings props
  providers: ProviderConfig[]
  selectedProvider: ProviderConfig | null
  models: ModelInfo[]
  selectedModel: string
  isLoadingModels: boolean
  webSearchSettings?: WebSearchSettingsType
  onSelectProvider: (provider: ProviderConfig) => void
  onSelectModel: (model: string) => void
  onUpdateProvider: (provider: ProviderConfig) => void
  onTestProvider: (provider: ProviderConfig) => Promise<boolean>
  onLoadModels: (provider: ProviderConfig) => void
  onUpdateWebSearchSettings?: (settings: WebSearchSettingsType) => void

  // Modal props
  onClose: () => void
  defaultTab?: string
}

type Tab = 'settings' | 'websearch' | 'cuda' | 'account' | 'provider-ollama' | 'docs-cloud' | 'docs-pricing'
type ProviderType = 'ollama'

export function SettingsModal({
  providers,
  selectedProvider,
  models,
  selectedModel,
  isLoadingModels,
  webSearchSettings,
  onSelectProvider,
  onSelectModel,
  onUpdateProvider,
  onTestProvider,
  onLoadModels,
  onUpdateWebSearchSettings,
  onClose,
  defaultTab
}: SettingsModalProps) {
  const [activeTab, setActiveTab] = useState<Tab>((defaultTab as Tab) || 'account')
  const [providersExpanded, setProvidersExpanded] = useState(false)
  const [docsExpanded, setDocsExpanded] = useState(false)

  // Auto-expand sections when an internal tab is active
  useEffect(() => {
    if (providerTabs.some(t => t.id === activeTab)) {
      setProvidersExpanded(true)
    }
    if (activeTab === 'docs-cloud' || activeTab === 'docs-pricing') {
      setDocsExpanded(true)
    }
  }, [activeTab])

  const tabs = [
    { id: 'account' as Tab, label: 'Account', icon: User },
    { id: 'settings' as Tab, label: 'General', icon: SettingsIcon },
    { id: 'websearch' as Tab, label: 'Web Search', icon: Search },
    { id: 'cuda' as Tab, label: 'CUDA', icon: Cpu }
  ]

  const providerTabs = [
    { id: 'provider-ollama' as Tab, label: 'Ollama', providerType: 'ollama' as ProviderType }
  ]

  const docsTabs = [
    { id: 'docs-cloud' as Tab, label: 'Cloud & Privacy' },
    { id: 'docs-pricing' as Tab, label: 'Pricing Transparency' }
  ]

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-background border border-border rounded-lg shadow-lg w-full max-w-5xl h-[85vh] flex overflow-hidden">
        {/* Sidebar with Tabs */}
        <div
          className="w-52 flex-shrink-0 border-r border-border p-4"
          style={{ backgroundColor: 'var(--color-sidebar)' }}
        >
          <div className="space-y-1">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  activeTab === tab.id
                    ? 'bg-primary text-primary-foreground'
                    : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                )}
              >
                <tab.icon className="w-4 h-4" />
                <span>{tab.label}</span>
              </button>
            ))}

            {/* Providers Dropdown */}
            <div className="pt-2">
              <button
                onClick={() => setProvidersExpanded(!providersExpanded)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  providerTabs.some(t => t.id === activeTab)
                    ? 'bg-primary/20 text-foreground'
                    : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                )}
              >
                <SettingsIcon className="w-4 h-4" />
                <span className="flex-1 text-left">Providers</span>
                {providersExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {providersExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {providerTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                      )}
                    >
                      <span className="flex-1 text-left">{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Docs Dropdown */}
            <div className="pt-2">
              <button
                onClick={() => setDocsExpanded(!docsExpanded)}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  activeTab.startsWith('docs-')
                    ? 'bg-primary/20 text-foreground'
                    : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                )}
              >
                <BookOpen className="w-4 h-4" />
                <span className="flex-1 text-left">Internal Docs</span>
                {docsExpanded ? (
                  <ChevronDown className="w-4 h-4" />
                ) : (
                  <ChevronRight className="w-4 h-4" />
                )}
              </button>

              {docsExpanded && (
                <div className="ml-4 mt-1 space-y-1">
                  {docsTabs.map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={cn(
                        'w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs font-medium transition-colors',
                        activeTab === tab.id
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-white/10 hover:text-foreground'
                      )}
                    >
                      <span className="flex-1 text-left">{tab.label}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <div className="flex items-center justify-between py-3 px-6 border-b border-border flex-shrink-0 bg-background/50 backdrop-blur-md sticky top-0 z-10">
            <h2 className="text-xl font-semibold">
              {tabs.find(t => t.id === activeTab)?.label ||
                providerTabs.find(t => t.id === activeTab)?.label ||
                docsTabs.find(t => t.id === activeTab)?.label ||
                'Settings'}
            </h2>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          </div>

          {/* Content Area */}
          <div className="flex-1 overflow-y-auto">
            {activeTab === 'settings' && (
              <div className="p-6">
                <SettingsContent />
              </div>
            )}

            {activeTab === 'websearch' && (
              <div className="p-6">
                <WebSearchSettings
                  settings={webSearchSettings}
                  onUpdateSettings={onUpdateWebSearchSettings}
                />
              </div>
            )}

            {activeTab === 'cuda' && (
              <CudaSettings />
            )}


            {activeTab === 'account' && (
              <AccountSettings />
            )}

            {activeTab === 'docs-cloud' && (
              <div className="p-6">
                <DocsCloudSettings />
              </div>
            )}

            {activeTab === 'docs-pricing' && (
              <div className="p-6">
                <DocsPricingSettings />
              </div>
            )}

            {providerTabs.some(t => t.id === activeTab) && (
              <div className="p-6">
                {(() => {
                  const providerTab = providerTabs.find(t => t.id === activeTab)
                  const provider = providers.find(p => p.type === providerTab?.providerType)

                  if (!provider || !providerTab) {
                    return (
                      <div className="text-center py-12">
                        <p className="text-muted-foreground">Provider not found</p>
                      </div>
                    )
                  }

                  return (
                    <ProviderSettings
                      key={provider.type}
                      provider={provider}
                      selectedModel={selectedModel}
                      onUpdateProvider={onUpdateProvider}
                      onTestProvider={onTestProvider}
                      onSelectModel={onSelectModel}
                      onLoadModels={onLoadModels}
                    />
                  )
                })()}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
