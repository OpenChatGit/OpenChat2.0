import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Wrench } from 'lucide-react'
import type { ProviderConfig, ModelInfo } from '../types'
import { cn } from '../lib/utils'

interface CanvasModelSelectorProps {
  providers: ProviderConfig[]
  selectedProvider: ProviderConfig | null
  selectedModel: string
  models: ModelInfo[]
  onSelectProvider: (provider: ProviderConfig) => void
  onSelectModel: (model: string) => void
  onLoadModels: (provider: ProviderConfig) => void
  isLoadingModels?: boolean
}

// Tool-capable models (models that support function calling)
const TOOL_CAPABLE_MODELS = [
  // Ollama local models with tool support
  'llama3.1',
  'llama3.2',
  'llama3.3',
  'llama-3',
  'mistral',
  'mixtral',
  'qwen2.5',
  'qwen2',
  'qwen',
  'qwq',
  'command-r',
  'command-r-plus',
  'firefunction',
  'granite3-dense',
  'granite3-moe',
  'granite',
  // Ollama cloud models (via ollama.com)
  'claude',
  'gpt',
  'gemini',
  'deepseek',
  'deepseek-r1',
  'o1',
  'o3',
  // LM Studio models (most modern models support tools)
  'hermes',
  'nous',
  'dolphin',
  'openchat',
  'neural',
  'yi',
  'phi',
]

export function CanvasModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  models,
  onSelectProvider,
  onSelectModel,
  onLoadModels,
  isLoadingModels = false,
}: CanvasModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Clean model name by removing provider prefixes
  const cleanModelName = (modelName: string): string => {
    const prefixes = [
      'google/',
      'meta-llama/',
      'mistralai/',
      'cohere/',
      'huggingface/',
      'qwen/',
      'alibaba/',
      'microsoft/',
      'meta/',
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

  // Check if a model is tool-capable
  const isToolCapable = (modelName: string): boolean => {
    const lowerName = modelName.toLowerCase()
    return TOOL_CAPABLE_MODELS.some(pattern => lowerName.includes(pattern.toLowerCase()))
  }

  // Filter models to only show tool-capable ones
  const toolCapableModels = models.filter(model => isToolCapable(model.name))

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  // Load models when opening
  useEffect(() => {
    if (!isOpen) return
    if (models.length === 0 && selectedProvider) {
      onLoadModels(selectedProvider)
    }
  }, [isOpen, models.length, selectedProvider, onLoadModels])

  const handleProviderClick = (provider: ProviderConfig) => {
    onSelectProvider(provider)
    onLoadModels(provider)
  }

  const handleModelClick = (model: string) => {
    onSelectModel(model)
    setIsOpen(false)
  }

  const getProviderIcon = (type: string) => {
    switch (type) {
      case 'ollama':
        return (
          <svg fill="currentColor" height="16" width="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M7.905 1.09c.216.085.411.225.588.41.295.306.544.744.734 1.263.191.522.315 1.1.362 1.68a5.054 5.054 0 012.049-.636l.051-.004c.87-.07 1.73.087 2.48.474.101.053.2.11.297.17.05-.569.172-1.134.36-1.644.19-.52.439-.957.733-1.264a1.67 1.67 0 01.589-.41c.257-.1.53-.118.796-.042.401.114.745.368 1.016.737.248.337.434.769.561 1.287.23.934.27 2.163.115 3.645l.053.04.026.019c.757.576 1.284 1.397 1.563 2.35.435 1.487.216 3.155-.534 4.088l-.018.021.002.003c.417.762.67 1.567.724 2.4l.002.03c.064 1.065-.2 2.137-.814 3.19l-.007.01.01.024c.472 1.157.62 2.322.438 3.486l-.006.039a.651.651 0 01-.747.536.648.648 0 01-.54-.742c.167-1.033.01-2.069-.48-3.123a.643.643 0 01.04-.617l.004-.006c.604-.924.854-1.83.8-2.72-.046-.779-.325-1.544-.8-2.273a.644.644 0 01.18-.886l.009-.006c.243-.159.467-.565.58-1.12a4.229 4.229 0 00-.095-1.974c-.205-.7-.58-1.284-1.105-1.683-.595-.454-1.383-.673-2.38-.61a.653.653 0 01-.632-.371c-.314-.665-.772-1.141-1.343-1.436a3.288 3.288 0 00-1.772-.332c-1.245.099-2.343.801-2.67 1.686a.652.652 0 01-.61.425c-1.067.002-1.893.252-2.497.703-.522.39-.878.935-1.066 1.588a4.07 4.07 0 00-.068 1.886c.112.558.331 1.02.582 1.269l.008.007c.212.207.257.53.109.785-.36.622-.629 1.549-.673 2.44-.05 1.018.186 1.902.719 2.536l.016.019a.643.643 0 01.095.69c-.576 1.236-.753 2.252-.562 3.052a.652.652 0 01-1.269.298c-.243-1.018-.078-2.184.473-3.498l.014-.035-.008-.012a4.339 4.339 0 01-.598-1.309l-.005-.019a5.764 5.764 0 01-.177-1.785c.044-.91.278-1.842.622-2.59l.012-.026-.002-.002c-.293-.418-.51-.953-.63-1.545l-.005-.024a5.352 5.352 0 01.093-2.49c.262-.915.777-1.701 1.536-2.269.06-.045.123-.09.186-.132-.159-1.493-.119-2.73.112-3.67.127-.518.314-.95.562-1.287.27-.368.614-.622 1.015-.737.266-.076.54-.059.797.042zm4.116 9.09c.936 0 1.8.313 2.446.855.63.527 1.005 1.235 1.005 1.94 0 .888-.406 1.58-1.133 2.022-.62.377-1.463.577-2.318.577-.855 0-1.698-.2-2.318-.577-.727-.442-1.133-1.134-1.133-2.022 0-.705.375-1.413 1.005-1.94.646-.542 1.51-.855 2.446-.855zm-2.727 2.795c0 .387.203.737.584.99.394.262.937.41 1.543.41.606 0 1.149-.148 1.543-.41.381-.253.584-.603.584-.99 0-.387-.203-.737-.584-.99-.394-.262-.937-.41-1.543-.41-.606 0-1.149.148-1.543.41-.381.253-.584.603-.584.99z"/>
          </svg>
        )
      case 'lmstudio':
        return (
          <svg fill="currentColor" height="16" width="16" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <path d="M2.84 2a1.273 1.273 0 100 2.547h10.287a1.274 1.274 0 000-2.547H2.84zM7.935 5.33a1.273 1.273 0 000 2.548H18.22a1.274 1.274 0 000-2.547H7.935zM3.624 9.935c0-.704.57-1.274 1.274-1.274h10.286a1.273 1.273 0 010 2.547H4.898c-.703 0-1.274-.57-1.274-1.273zM1.273 12.188a1.273 1.273 0 100 2.547H11.56a1.274 1.274 0 000-2.547H1.273zM3.624 16.792c0-.704.57-1.274 1.274-1.274h10.286a1.273 1.273 0 110 2.547H4.898c-.703 0-1.274-.57-1.274-1.273zM13.029 18.849a1.273 1.273 0 100 2.547h5.78a1.273 1.273 0 100-2.547h-5.78z"/>
          </svg>
        )
      default:
        return null
    }
  }

  return (
    <div className="relative" ref={dropdownRef} style={{ zIndex: 1000 }}>
      {/* Model Selector Button - Compact */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="h-7 px-2 rounded-lg flex items-center gap-1.5 transition-all hover:bg-white/10 text-xs"
        title="Select Tool Model"
      >
        <Wrench className="w-3.5 h-3.5" style={{ color: 'var(--color-muted-foreground)' }} />
        <span style={{ color: 'var(--color-muted-foreground)' }}>
          {selectedModel && toolCapableModels.some(m => m.name === selectedModel) 
            ? cleanModelName(selectedModel) 
            : 'Tool Model'}
        </span>
        <ChevronDown className={cn(
          "w-3 h-3 transition-transform",
          isOpen && "rotate-180"
        )} style={{ color: 'var(--color-muted-foreground)' }} />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div 
          className="absolute left-0 bottom-full mb-2 rounded-xl shadow-2xl overflow-hidden"
          style={{ 
            backgroundColor: 'var(--color-dropdown-bg)',
            minWidth: '280px',
            maxHeight: '350px',
            border: '1px solid var(--color-dropdown-border)',
            zIndex: 99999
          }}
        >
          {/* Provider Icons Bar */}
          <div className="flex items-center justify-center gap-2 p-2 border-b" style={{ borderColor: 'var(--color-dropdown-border)' }}>
            {providers.map((provider) => {
              const icon = getProviderIcon(provider.type)
              if (!icon) return null
              
              return (
                <button
                  key={provider.type}
                  onClick={() => handleProviderClick(provider)}
                  className={cn(
                    "p-1.5 rounded-lg transition-all flex items-center justify-center",
                    selectedProvider?.type === provider.type
                      ? "bg-white/20"
                      : "hover:bg-white/10"
                  )}
                  title={provider.name}
                >
                  {icon}
                </button>
              )
            })}
          </div>

          {/* Models List */}
          <div className="max-h-64 overflow-y-auto">
            {isLoadingModels ? (
              <div className="p-3 text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                Loading models…
              </div>
            ) : toolCapableModels.length === 0 ? (
              <div className="p-3 text-center text-xs" style={{ color: 'var(--color-muted-foreground)' }}>
                <div className="mb-2">No tool-capable models found</div>
                <div className="text-[10px] opacity-70">
                  Install models like llama3.1, mistral, or qwen2.5
                </div>
              </div>
            ) : (
              <div className="p-1.5">
                {toolCapableModels.map((model) => (
                  <button
                    key={model.name}
                    onClick={() => handleModelClick(model.name)}
                    className={cn(
                      "w-full text-left px-2.5 py-1.5 rounded-lg text-xs transition-all",
                      selectedModel === model.name
                        ? "bg-white/20"
                        : "hover:bg-white/10"
                    )}
                    style={{
                      color: selectedModel === model.name ? 'var(--color-foreground)' : 'var(--color-muted-foreground)'
                    }}
                  >
                    <div className="flex items-center gap-2">
                      <Wrench className="w-3 h-3 flex-shrink-0 text-purple-400" />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium truncate">
                          {cleanModelName(model.name)}
                        </div>
                        {model.size && (
                          <div className="text-[10px] mt-0.5" style={{ color: 'var(--color-muted-foreground)', opacity: 0.7 }}>
                            {model.size}
                          </div>
                        )}
                      </div>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Info Footer */}
          <div className="p-2 border-t text-[10px] text-center" style={{ 
            borderColor: 'var(--color-dropdown-border)',
            color: 'var(--color-muted-foreground)',
            opacity: 0.7
          }}>
            Only models with tool support are shown
          </div>
        </div>
      )}
    </div>
  )
}
