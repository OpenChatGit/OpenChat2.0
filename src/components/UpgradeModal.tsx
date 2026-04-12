import { X, Check, Zap, Crown, Sparkles, Cpu } from 'lucide-react'
import { cn } from '../lib/utils'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  onPurchase?: (amount: number, tokens: number) => void
}

const packages = [
  {
    id: 'starter',
    name: 'Starter',
    icon: Sparkles,
    price: '$10',
    tokens: '12 Million',
    rawTokens: 12000000,
    bonus: null,
    features: [
      '12,000,000 Cloud Tokens',
      'Claude Haiku 4.5 Support',
      'GPT-4o mini Support',
      'Unlimited Local Models',
      'Standard Cloud Priority'
    ],
    popular: false
  },
  {
    id: 'pro',
    name: 'Professional',
    icon: Zap,
    price: '$25',
    tokens: '35 Million',
    rawTokens: 35000000,
    bonus: '+2M Bonus',
    features: [
      '35,000,000 Cloud Tokens',
      'Claude Sonnet 4.6 Support',
      'GPT-4o (Omni) Support',
      'High Cloud Priority',
      'Unlimited Local Models'
    ],
    popular: true
  },
  {
    id: 'ultimate',
    name: 'Ultimate',
    icon: Crown,
    price: '$50',
    tokens: '80 Million',
    rawTokens: 80000000,
    bonus: '+10M Bonus',
    features: [
      '80,000,000 Cloud Tokens',
      'Claude Opus 4.6 Support',
      'Advanced Reasoning Access',
      'Highest Cloud Priority',
      'Dedicated Cloud Instance'
    ],
    popular: false
  }
]

export function UpgradeModal({ isOpen, onClose, onPurchase }: UpgradeModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80 backdrop-blur-md animate-in fade-in duration-200"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-3xl shadow-2xl border animate-in zoom-in-95 duration-200"
        style={{ 
          backgroundColor: 'var(--color-popover)',
          borderColor: 'var(--color-border)'
        }}
      >
        {/* Header */}
        <div className="px-8 pt-8 pb-6 flex justify-between items-center border-b border-white/5" style={{ backgroundColor: 'rgba(255, 255, 255, 0.02)' }}>
          <div>
            <h2 className="text-2xl font-bold tracking-tight text-foreground">Cloud Tokens</h2>
            <p className="opacity-40 text-[10px] font-black uppercase tracking-[0.2em] mt-1 text-foreground">Acquire compute power for frontier models</p>
          </div>
          <button onClick={onClose} className="p-2 rounded-full hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
            <X className="w-5 h-5 opacity-40 text-foreground" />
          </button>
        </div>

        {/* Packages Grid */}
        <div className="p-8 overflow-y-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
            {packages.map((pkg) => {
              const Icon = pkg.icon
              
              return (
                <div
                  key={pkg.id}
                  className={cn(
                    'flex flex-col h-full rounded-2xl p-6 border transition-all duration-300',
                    pkg.popular 
                      ? 'bg-primary/5 border-primary/20' 
                      : 'bg-muted/30 border-border/50'
                  )}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <h3 className="text-lg font-bold leading-none text-foreground">{pkg.name}</h3>
                      {pkg.bonus && (
                        <span className="text-[9px] font-black bg-primary/10 text-primary px-1.5 py-0.5 rounded mt-2 inline-block">
                          {pkg.bonus}
                        </span>
                      )}
                    </div>
                    <div className="w-10 h-10 rounded-xl bg-primary/5 border border-primary/10 flex items-center justify-center">
                      <Icon className="w-5 h-5 opacity-60 text-foreground" />
                    </div>
                  </div>

                  <div className="mb-8">
                    <div className="flex items-baseline gap-1">
                      <span className="text-3xl font-bold text-foreground">{pkg.price}</span>
                    </div>
                    <div className="flex items-center gap-2 mt-2">
                       <Cpu className="w-3 h-3 opacity-30 text-foreground" />
                       <span className="text-[12px] font-black opacity-80 text-foreground">
                         {pkg.tokens} Tokens
                       </span>
                    </div>
                  </div>

                  <div className="flex-1 space-y-3 mb-10">
                    {pkg.features.map((feature, index) => (
                      <div key={index} className="flex items-center gap-2.5">
                        <Check className="w-3.5 h-3.5 opacity-30 shrink-0 text-foreground" />
                        <span className="text-[12px] font-medium opacity-50 text-foreground">{feature}</span>
                      </div>
                    ))}
                  </div>

                  <button
                    onClick={() => onPurchase?.(parseInt(pkg.price.replace('$', '')), pkg.rawTokens)}
                    className={cn(
                      'w-full py-4 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all duration-200',
                      pkg.popular
                        ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg'
                        : 'bg-secondary text-secondary-foreground border border-border hover:bg-secondary/80'
                    )}
                  >
                    Get Tokens
                  </button>
                </div>
              )
            })}
          </div>

          <div className="mt-8 pt-6 border-t border-border/40 flex justify-between items-center opacity-30">
            <div className="flex items-center gap-4">
              <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">Global Compute</span>
              <div className="w-1 h-1 rounded-full bg-current opacity-20" />
              <span className="text-[9px] font-bold uppercase tracking-widest text-foreground">No Expiration</span>
            </div>
            <p className="text-[10px] font-medium italic text-foreground">1 Token ≈ 1 Request Unit (Lite)</p>
          </div>
        </div>
      </div>
    </div>
  )
}
