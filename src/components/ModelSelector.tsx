import { useState, useRef, useEffect, useMemo } from 'react'
import { ChevronDown, Eye, Search, Activity, Globe, Cpu, Server, Brain, Info } from 'lucide-react'
import type { ProviderConfig, ModelInfo } from '../types'
import { cn } from '../lib/utils'
import { ProviderHealthMonitor, type ProviderHealthStatus } from '../services/ProviderHealthMonitor'

interface ModelSelectorProps {
  providers: ProviderConfig[]
  selectedProvider: ProviderConfig | null
  selectedModel: string
  models: ModelInfo[]
  onSelectProvider: (provider: ProviderConfig) => void
  onSelectModel: (model: string) => void
  onLoadModels: (provider: ProviderConfig) => void
  isLoadingModels?: boolean
}

export function ModelSelector({
  providers,
  selectedProvider,
  selectedModel,
  models,
  onSelectProvider,
  onSelectModel,
  onLoadModels,
}: ModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [connectionStatus, setConnectionStatus] = useState<Map<string, ProviderHealthStatus>>(new Map())
  const dropdownRef = useRef<HTMLDivElement>(null)
  const healthMonitor = ProviderHealthMonitor.getInstance()

  const cleanModelName = (modelName: string): string => {
    if (!modelName) return ''
    // 1. Remove emojis and special characters
    let cleaned = modelName.replace(/[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F900}-\u{1F9FF}\u{1F1E6}-\u{1F1FF}]/gu, '');

    // 2. Remove common provider prefixes
    const prefixes = ['google/', 'meta-llama/', 'mistralai/', 'cohere/', 'huggingface/', 'meta/', 'deepseek/']
    for (const prefix of prefixes) {
      if (cleaned.startsWith(prefix)) {
        cleaned = cleaned.substring(prefix.length)
        break
      }
    }
    return cleaned.trim()
  }

  useEffect(() => {
    setConnectionStatus(healthMonitor.getAllStatuses())
    const unsubscribe = healthMonitor.subscribe((statuses) => {
      setConnectionStatus(new Map(statuses))
    })
    return unsubscribe
  }, [healthMonitor])

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) setIsOpen(false)
    }
    if (isOpen) document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const filteredModels = useMemo(() => {
    const hiddenModels = selectedProvider?.hiddenModels || []
    return models
      .filter(m => !hiddenModels.includes(m.name))
      .filter(m => m.name.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [models, selectedProvider, searchQuery])

  const getProviderIcon = (type: string, size = 16) => {
    switch (type) {
      case 'ollama': return <Cpu size={size} className="opacity-70" />
      case 'supabase-premium': return <Server size={size} className="opacity-70" />
      case 'huggingface': return <Globe size={size} className="opacity-70" />
      default: return <Search size={size} className="opacity-70" />
    }
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "h-10 px-2 flex items-center gap-2 transition-all hover:opacity-60 active:scale-[0.95] group"
        )}
      >
        <span className="text-[14px] font-bold tracking-tight text-foreground/80 group-hover:text-foreground transition-colors">
          {(() => {
            if (!selectedModel) return 'Select Model';
            const model = models.find(m => m.id === selectedModel || m.name === selectedModel);
            return model ? model.name : cleanModelName(selectedModel);
          })()}
        </span>
        <ChevronDown size={14} className={cn("transition-transform text-foreground/40 group-hover:text-foreground/80", isOpen && "-rotate-90")} />
      </button>

      {isOpen && (
        <div
          className={cn(
            "absolute z-[100] animate-in fade-in zoom-in-95 slide-in-from-left-2 duration-200",
            "top-0 left-full ml-4 min-w-[400px] max-w-[400px]"
          )}
          style={{
            backgroundColor: 'var(--color-popover)',
            borderRadius: '20px',
            border: '1px solid var(--color-border)',
            boxShadow: '20px 0 50px -10px rgba(0,0,0,0.5)'
          }}
        >
          <div className="p-3 border-b border-border/40">
            <div className="flex gap-1 overflow-x-auto no-scrollbar mb-3">
              {providers.map((p) => (
                <button
                  key={p.type}
                  onClick={() => { onSelectProvider(p); onLoadModels(p); setSearchQuery(''); }}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-2 rounded-lg text-[10px] font-bold transition-colors border whitespace-nowrap flex-shrink-0",
                    selectedProvider?.type === p.type ? "bg-muted border-border text-foreground" : "border-transparent text-muted-foreground hover:bg-muted/50"
                  )}
                >
                  {getProviderIcon(p.type, 14)}
                  {p.name}
                  {connectionStatus.get(p.type)?.status === true && <div className="w-1 h-1 rounded-full bg-foreground/50" />}
                </button>
              ))}
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 opacity-30" />
              <input
                type="text" placeholder="Search models..." value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full h-9 pl-9 pr-3 rounded-xl bg-muted/30 border border-border/30 focus:outline-none text-xs"
              />
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto no-scrollbar p-1.5 space-y-1">
            {filteredModels.length === 0 ? (
              <div className="py-10 text-center text-xs opacity-30">No models found</div>
            ) : (
              filteredModels.map((model) => {
                const modelId = model.id || model.name;
                const isActive = selectedModel === model.id || selectedModel === model.name;

                const inputPrice = parseFloat(model.pricing?.prompt || "0") * 1000000;
                const outputPrice = parseFloat(model.pricing?.completion || "0") * 1000000;

                // Dynamic precision: more decimals for cheaper models
                const formatPrice = (p: number) => {
                  if (p === 0) return "0.00";
                  if (p < 0.1) return p.toFixed(4);
                  if (p < 1) return p.toFixed(3);
                  return p.toFixed(2);
                };

                const pricingDisplay = `$${formatPrice(inputPrice)} / $${formatPrice(outputPrice)}`;

                return (
                  <button
                    key={modelId}
                    onClick={() => {
                      onSelectModel(modelId);
                      setIsOpen(false);
                    }}
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all group",
                      isActive ? "bg-muted/60" : "hover:bg-muted/30"
                    )}
                  >
                    <div className="flex-1 text-left min-w-0">
                      <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center w-full">
                        <span className={cn(
                          "text-[13px] font-bold truncate mr-2",
                          isActive ? "text-foreground" : "text-foreground/80 group-hover:text-foreground"
                        )}>
                          {model.name}
                        </span>
                        
                        {model.description && (
                          <div 
                            className="ml-auto p-1 hover:text-primary transition-colors cursor-help shrink-0 opacity-40 hover:opacity-100" 
                            title={model.description}
                          >
                            <Info size={14} />
                          </div>
                        )}
                      </div>
                      </div>

                      <div className="flex items-center gap-2.5 mt-1">
                        <span className="text-[11px] font-black uppercase tracking-widest opacity-70 dark:opacity-60">
                          {model.size || 'Standard'}
                        </span>
                        {model.provider && (
                          <span className="text-[11px] font-bold opacity-70 dark:opacity-60">
                            {model.provider}
                          </span>
                        )}
                        <div className="flex items-center gap-1.5 opacity-70 dark:opacity-60">
                          {model.capabilities?.vision && <Eye size={11} className="cursor-help" title="Supports Vision / Images" />}
                          {model.capabilities?.reasoning && <Brain size={11} className="cursor-help" title="Advanced Reasoning / MoE" />}
                        </div>
                        <span className="text-[11px] font-mono font-bold opacity-90 dark:opacity-80 ml-auto whitespace-nowrap flex items-center gap-1.5">
                          <span className="flex items-center gap-0.5">
                            <span className="text-blue-600 dark:text-blue-400 opacity-80">↓</span>
                            <span>${formatPrice(inputPrice)}</span>
                          </span>
                          <span className="opacity-30">/</span>
                          <span className="flex items-center gap-0.5">
                            <span className="text-green-600 dark:text-green-400 opacity-80">↑</span>
                            <span>${formatPrice(outputPrice)}</span>
                          </span>
                          <span className="text-[10px] opacity-60 ml-1">/ 1M</span>
                        </span>
                      </div>
                    </div>
                  </button>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}
