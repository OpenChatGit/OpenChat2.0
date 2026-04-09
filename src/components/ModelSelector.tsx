import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Eye, Brain, MoreVertical, Trash2 } from 'lucide-react'
import type { ProviderConfig, ModelInfo } from '../types'
import { cn } from '../lib/utils'
import { ProviderHealthMonitor, type ProviderHealthStatus } from '../services/ProviderHealthMonitor'
import { ProviderFactory } from '../providers'
import { useTheme } from '../hooks/useTheme'
import hfIcon from '../assets/huggingface.svg'
import hfIconDark from '../assets/huggingface-dark.svg'

interface ModelSelectorProps {
  providers: ProviderConfig[]
  selectedProvider: ProviderConfig | null
  selectedModel: string
  models: ModelInfo[]
  onSelectProvider: (provider: ProviderConfig) => void
  onSelectModel: (model: string) => void
  onLoadModels: (provider: ProviderConfig) => void
  openUpwards?: boolean
  isLoadingModels?: boolean
  onCapabilitiesChange?: (capabilities: ModelInfo['capabilities']) => void
}

export function ModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  models,
  onSelectProvider,
  onSelectModel,
  onLoadModels,
  openUpwards = true,
  isLoadingModels = false,
  onCapabilitiesChange,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<Map<string, ProviderHealthStatus>>(new Map())
  const [openMenuModelName, setOpenMenuModelName] = useState<string | null>(null)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const healthMonitor = ProviderHealthMonitor.getInstance()
  const { effectiveTheme } = useTheme()

  // Clean model name by removing provider prefixes
  const cleanModelName = (modelName: string): string => {
    // Remove common provider prefixes
    const prefixes = [
      'google/',
      'meta-llama/',
      'mistralai/',
      'cohere/',
      'ai21/',
      'huggingface/',
      'amazon/',
      'nvidia/',
      'perplexity/',
      'deepseek/',
      'x-ai/',
      'xai/',
      'qwen/',
      'alibaba/',
      'microsoft/',
      'meta/',
      'inflection/',
      'databricks/',
      '01-ai/',
      'cognitivecomputations/',
      'minimax/',
    ]
    
    let cleaned = modelName
    for (const prefix of prefixes) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length)
        break
      }
    }
    
    return cleaned
  }

  // Load initial status from monitor on mount
  useEffect(() => {
    const initialStatus = healthMonitor.getAllStatuses()
    setConnectionStatus(initialStatus)
  }, [healthMonitor])

  // Subscribe to monitor updates
  useEffect(() => {
    const unsubscribe = healthMonitor.subscribe((statuses) => {
      setConnectionStatus(new Map(statuses))
    })

    return unsubscribe
  }, [healthMonitor])

  // Trigger checks when dropdown opens if cache is stale
  useEffect(() => {
    if (!isOpen) return

    const needsRefresh = providers.some(provider => {
      const status = healthMonitor.getStatus(provider.type)
      return !status || !healthMonitor.isCacheValid(status)
    })

    if (needsRefresh) {
      healthMonitor.checkProviders(providers, { timeout: 2000 })
    }
  }, [isOpen, providers, healthMonitor])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setOpenMenuModelName(null)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // When opening and no models yet, trigger a load for the selected provider
  useEffect(() => {
    if (!isOpen) return
    if (models.length === 0 && selectedProvider) {
      onLoadModels(selectedProvider)
    }
  }, [isOpen, models.length, selectedProvider, onLoadModels])

  // Notify parent of capability changes when selected model changes
  useEffect(() => {
    if (!onCapabilitiesChange) return
    
    const currentModel = models.find(m => m.name === selectedModel)
    onCapabilitiesChange(currentModel?.capabilities)
  }, [selectedModel, models, onCapabilitiesChange])

  const handleProviderClick = (provider: ProviderConfig) => {
    onSelectProvider(provider)
    onLoadModels(provider)
  }

  const handleModelClick = (model: string) => {
    onSelectModel(model)
    setIsOpen(false)
  }

  const handleDeleteModel = async (modelName: string, event: React.MouseEvent) => {
    event.stopPropagation()
    
    if (!selectedProvider) return
    
    // Confirm deletion
    if (!confirm(`Are you sure you want to delete the model "${modelName}"? This action cannot be undone.`)) {
      setOpenMenuModelName(null)
      return
    }

    setIsDeleting(modelName)
    setOpenMenuModelName(null)

    try {
      const provider = ProviderFactory.createProvider(selectedProvider)
      
      // Check if provider supports deleteModel
      if (provider.deleteModel) {
        await provider.deleteModel(modelName)
        
        // Reload models after deletion
        onLoadModels(selectedProvider)
        
        // If deleted model was selected, clear selection
        if (selectedModel === modelName) {
          onSelectModel('')
        }
      } else {
        alert('This provider does not support deleting models.')
      }
    } catch (error) {
      console.error('Failed to delete model:', error)
      alert(`Failed to delete model: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsDeleting(null)
    }
  }

  const toggleMenu = (modelName: string, event: React.MouseEvent) => {
    event.stopPropagation()
    setOpenMenuModelName(openMenuModelName === modelName ? null : modelName)
  }

  const renderStatusIndicator = (provider: ProviderConfig) => {
    const status = connectionStatus.get(provider.type)
    
    return (
      <div 
        className={cn(
          "w-1.5 h-1.5 rounded-full mt-1 transition-all",
          status?.checking && "animate-pulse"
        )}
        style={{ 
          backgroundColor: 
            status?.status === true ? '#10B981' :   // Green
            status?.status === false ? '#EF4444' :  // Red
            '#6B7280'                                // Gray (unknown)
        }}
      />
    )
  }

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'ollama':
        return (
          <svg fill="currentColor" height="20" width="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg" style={{ minWidth: '20px', minHeight: '20px' }}>
            <path d="M7.905 1.09c.216.085.411.225.588.41.295.306.544.744.734 1.263.191.522.315 1.1.362 1.68a5.054 5.054 0 012.049-.636l.051-.004c.87-.07 1.73.087 2.48.474.101.053.2.11.297.17.05-.569.172-1.134.36-1.644.19-.52.439-.957.733-1.264a1.67 1.67 0 01.589-.41c.257-.1.53-.118.796-.042.401.114.745.368 1.016.737.248.337.434.769.561 1.287.23.934.27 2.163.115 3.645l.053.04.026.019c.757.576 1.284 1.397 1.563 2.35.435 1.487.216 3.155-.534 4.088l-.018.021.002.003c.417.762.67 1.567.724 2.4l.002.03c.064 1.065-.2 2.137-.814 3.19l-.007.01.01.024c.472 1.157.62 2.322.438 3.486l-.006.039a.651.651 0 01-.747.536.648.648 0 01-.54-.742c.167-1.033.01-2.069-.48-3.123a.643.643 0 01.04-.617l.004-.006c.604-.924.854-1.83.8-2.72-.046-.779-.325-1.544-.8-2.273a.644.644 0 01.18-.886l.009-.006c.243-.159.467-.565.58-1.12a4.229 4.229 0 00-.095-1.974c-.205-.7-.58-1.284-1.105-1.683-.595-.454-1.383-.673-2.38-.61a.653.653 0 01-.632-.371c-.314-.665-.772-1.141-1.343-1.436a3.288 3.288 0 00-1.772-.332c-1.245.099-2.343.801-2.67 1.686a.652.652 0 01-.61.425c-1.067.002-1.893.252-2.497.703-.522.39-.878.935-1.066 1.588a4.07 4.07 0 00-.068 1.886c.112.558.331 1.02.582 1.269l.008.007c.212.207.257.53.109.785-.36.622-.629 1.549-.673 2.44-.05 1.018.186 1.902.719 2.536l.016.019a.643.643 0 01.095.69c-.576 1.236-.753 2.252-.562 3.052a.652.652 0 01-1.269.298c-.243-1.018-.078-2.184.473-3.498l.014-.035-.008-.012a4.339 4.339 0 01-.598-1.309l-.005-.019a5.764 5.764 0 01-.177-1.785c.044-.91.278-1.842.622-2.59l.012-.026-.002-.002c-.293-.418-.51-.953-.63-1.545l-.005-.024a5.352 5.352 0 01.093-2.49c.262-.915.777-1.701 1.536-2.269.06-.045.123-.09.186-.132-.159-1.493-.119-2.73.112-3.67.127-.518.314-.95.562-1.287.27-.368.614-.622 1.015-.737.266-.076.54-.059.797.042zm4.116 9.09c.936 0 1.8.313 2.446.855.63.527 1.005 1.235 1.005 1.94 0 .888-.406 1.58-1.133 2.022-.62.377-1.463.577-2.318.577-.855 0-1.698-.2-2.318-.577-.727-.442-1.133-1.134-1.133-2.022 0-.705.375-1.413 1.005-1.94.646-.542 1.51-.855 2.446-.855zm-2.727 2.795c0 .387.203.737.584.99.394.262.937.41 1.543.41.606 0 1.149-.148 1.543-.41.381-.253.584-.603.584-.99 0-.387-.203-.737-.584-.99-.394-.262-.937-.41-1.543-.41-.606 0-1.149.148-1.543.41-.381.253-.584.603-.584.99z"/>
          </svg>
        )
      case 'huggingface':
        return (
          <div className="w-full h-full flex items-center justify-center">
            <img 
              src={hfIconDark} 
              alt="Hugging Face" 
              className="w-full h-full object-contain hf-logo"
              style={{ 
                transform: 'scale(1.2)'
              }} 
            />
          </div>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Premium Model Selector Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-9 px-4 rounded-xl flex items-center gap-2 transition-all duration-200 shadow-sm border",
          "bg-card hover:bg-muted active:scale-[0.98]"
        )}
      >
        <div className="flex items-center gap-2 text-sm font-medium" style={{ color: 'var(--color-foreground)' }}>
          {selectedProvider && (
            <div className="w-4 h-4 opacity-70 flex items-center justify-center shrink-0">
              {getProviderIcon(selectedProvider.type)}
            </div>
          )}
          <span>
            {selectedModel && selectedModel.trim() !== '' && selectedModel !== 'llama.cpp-model' && models.some(m => m.name === selectedModel) 
              ? cleanModelName(selectedModel) 
              : 'Select Model'}
          </span>
        </div>
        <ChevronDown className={cn(
          "w-3.5 h-3.5 ml-1 transition-transform duration-300 opacity-50",
          isOpen && "rotate-180"
        )} />
      </button>

      {/* Modern Popover */}
      {isOpen && (
        <div 
          className={cn(
            "absolute left-0 overflow-hidden z-50 transition-all duration-200 animate-in fade-in zoom-in-95",
            openUpwards ? "bottom-full mb-3" : "top-full mt-3"
          )}
          style={{ 
            backgroundColor: 'color-mix(in srgb, var(--color-popover) 85%, transparent)',
            backdropFilter: 'blur(16px)',
            minWidth: '340px',
            maxHeight: '450px',
            borderRadius: '16px',
            border: '1px solid var(--color-border)',
            boxShadow: '0 10px 40px -10px rgba(0,0,0,0.5)'
          }}
        >
          {/* Provider Tabs Bar */}
          <div className="flex items-center gap-1 p-2 border-b overflow-x-auto no-scrollbar" style={{ borderColor: 'var(--color-border)' }}>
            {providers.map((provider) => {
              const status = connectionStatus.get(provider.type)
              const isSelected = selectedProvider?.type === provider.type
              
              return (
                <button
                  key={provider.type}
                  onClick={() => handleProviderClick(provider)}
                  className={cn(
                    "relative flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-200 flex-shrink-0",
                    isSelected
                      ? "bg-accent text-accent-foreground"
                      : "text-muted-foreground hover:text-foreground hover:bg-muted"
                  )}
                >
                  <div className="w-3.5 h-3.5 flex items-center justify-center opacity-80">
                    {getProviderIcon(provider.type)}
                  </div>
                  {provider.name}
                  
                  {/* Subtle Status Dot */}
                  <div 
                    className={cn(
                      "w-1.5 h-1.5 rounded-full ml-1",
                      status?.checking && "animate-pulse"
                    )}
                    style={{ 
                      backgroundColor: 
                        status?.status === true ? '#10B981' :   // Green
                        status?.status === false ? '#EF4444' :  // Red
                        'var(--color-muted-foreground)'         // Gray 
                    }}
                  />
                </button>
              )
            })}
          </div>

          {/* Models List */}
          <div className="max-h-80 overflow-y-auto">
            {isLoadingModels ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 opacity-50">
                <div className="w-5 h-5 rounded-full border-2 border-muted border-t-primary animate-spin" />
                <span className="text-sm">Loading models...</span>
              </div>
            ) : models.length === 0 ? (
              <div className="p-8 text-center text-sm opacity-50">No models available</div>
            ) : (() => {
              const hiddenModels = selectedProvider?.hiddenModels || []
              const visibleModels = models.filter(model => !hiddenModels.includes(model.name))
              
              if (visibleModels.length === 0) {
                return (
                  <div className="p-8 text-center text-sm opacity-50">
                    All models are hidden. Configure in settings.
                  </div>
                )
              }
              
              return (
                <div className="p-2 space-y-1">
                  {visibleModels.map((model) => {
                  const hasVision = model.capabilities?.vision ?? false
                  const hasReasoning = model.capabilities?.reasoning ?? false
                  const canDelete = selectedProvider?.type === 'ollama'
                  const isBeingDeleted = isDeleting === model.name
                  const isActive = selectedModel === model.name
                  
                  return (
                    <div key={model.name} className="relative group">
                      <button
                        onClick={() => handleModelClick(model.name)}
                        disabled={isBeingDeleted}
                        className={cn(
                          "w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-200 border border-transparent",
                          isActive
                            ? "bg-blue-500/10 border-blue-500/20"
                            : "hover:bg-muted",
                          isBeingDeleted && "opacity-50 cursor-not-allowed"
                        )}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className={cn(
                              "font-medium truncate transition-colors",
                              isActive ? "text-blue-500 dark:text-blue-400" : "text-foreground"
                            )}>
                              {isBeingDeleted ? 'Deleting...' : cleanModelName(model.name)}
                            </div>
                            
                            {/* Capabilities & Size Badges */}
                            <div className="flex flex-wrap items-center gap-2 mt-1.5 opacity-60 text-xs">
                              {model.size && (
                                <span>{model.size}</span>
                              )}
                              {hasVision && (
                                <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-md">
                                  <Eye className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Vision
                                </span>
                              )}
                              {hasReasoning && (
                                <span className="flex items-center gap-1 bg-muted px-1.5 py-0.5 rounded-md">
                                  <Brain className="w-3 h-3 text-purple-500 dark:text-purple-400" /> Reasoning
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Active Indicator + Menu */}
                          <div className="flex items-center gap-2 flex-shrink-0 pt-0.5">
                            {isActive && !isBeingDeleted && (
                              <div className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
                            )}
                            
                            {canDelete && !isBeingDeleted && (
                              <button
                                onClick={(e) => toggleMenu(model.name, e)}
                                className="p-1.5 -mr-1 rounded-md opacity-0 group-hover:opacity-100 hover:bg-muted transition-all text-muted-foreground hover:text-foreground"
                                title="More options"
                              >
                                <MoreVertical className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </div>
                      </button>

                      {/* Dropdown Menu */}
                      {openMenuModelName === model.name && canDelete && (
                        <div
                          ref={menuRef}
                          className="absolute right-2 top-full mt-1 z-50 rounded-lg shadow-xl overflow-hidden border"
                          style={{ 
                            backgroundColor: 'var(--color-dropdown-bg)', 
                            minWidth: '150px',
                            borderColor: 'var(--color-dropdown-border)'
                          }}
                        >
                          <button
                            onClick={(e) => handleDeleteModel(model.name, e)}
                            className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Model
                          </button>
                        </div>
                      )}
                    </div>
                  )
                })}
                </div>
              )
            })()}
          </div>
        </div>
      )}
    </div>
  )
}
