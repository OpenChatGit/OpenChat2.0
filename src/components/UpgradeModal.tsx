import { X, Check, Zap, Crown, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'

interface UpgradeModalProps {
  isOpen: boolean
  onClose: () => void
  currentPlan?: 'free' | 'pro' | 'pro+'
}

const plans = [
  {
    id: 'free',
    name: 'Free',
    icon: Sparkles,
    price: '$0',
    period: 'forever',
    description: 'Everything you need to get started',
    features: [
      'Unlimited local AI models (Ollama, LM Studio)',
      'Unlimited Canvas sessions',
      'Code execution & package management',
      'Full offline functionality',
      'Community support',
      'No SERP web search'
    ],
    color: 'from-gray-500 to-gray-600',
    buttonText: 'Current Plan',
    popular: false
  },
  {
    id: 'pro',
    name: 'Pro',
    icon: Zap,
    price: '$9.99',
    period: 'per month',
    description: 'Enhanced web search capabilities',
    features: [
      'Everything in Free',
      '1,000 SERP searches/month',
      'Advanced web search results',
      'Search result caching',
      'Priority support',
      'Early access to features'
    ],
    color: 'from-blue-500 to-blue-600',
    buttonText: 'Upgrade to Pro',
    popular: true
  },
  {
    id: 'pro+',
    name: 'Pro+',
    icon: Crown,
    price: '$19.99',
    period: 'per month',
    description: 'Maximum search power',
    features: [
      'Everything in Pro',
      '3,000 SERP searches/month',
      'Unlimited search result storage',
      'API access for integrations',
      'Dedicated support',
      'Custom search configurations',
      'Team collaboration features'
    ],
    color: 'from-purple-500 to-pink-500',
    buttonText: 'Upgrade to Pro+',
    popular: false
  }
]

export function UpgradeModal({ isOpen, onClose, currentPlan = 'free' }: UpgradeModalProps) {
  if (!isOpen) return null

  const handleUpgrade = (planId: string) => {
    // TODO: Implement upgrade logic
    console.log('Upgrading to:', planId)
    // For now, just close the modal
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        onClick={onClose}
      />
      
      {/* Modal */}
      <div 
        className="relative w-full max-w-6xl max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ 
          backgroundColor: 'var(--color-sidebar)',
          border: '1px solid var(--color-dropdown-border)'
        }}
      >
        {/* Header */}
        <div className="sticky top-0 z-10 px-6 py-4 border-b backdrop-blur-sm" 
          style={{ 
            backgroundColor: 'var(--color-sidebar)',
            borderColor: 'var(--color-dropdown-border)' 
          }}
        >
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Upgrade Your Plan</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Choose the perfect plan for your needs
              </p>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Plans Grid */}
        <div className="p-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {plans.map((plan) => {
              const Icon = plan.icon
              const isCurrentPlan = plan.id === currentPlan
              
              return (
                <div
                  key={plan.id}
                  className={cn(
                    'relative rounded-xl p-6 border-2 transition-all duration-300',
                    'hover:scale-105 hover:shadow-xl',
                    plan.popular 
                      ? 'border-primary shadow-lg' 
                      : 'border-transparent',
                    isCurrentPlan && 'opacity-75'
                  )}
                  style={{
                    backgroundColor: 'var(--color-background)',
                    borderColor: plan.popular ? 'var(--color-primary)' : 'var(--color-dropdown-border)'
                  }}
                >
                  {/* Popular Badge */}
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <div className="px-3 py-1 rounded-full text-xs font-semibold bg-primary text-primary-foreground">
                        Most Popular
                      </div>
                    </div>
                  )}

                  {/* Icon */}
                  <div className="flex justify-center mb-4">
                    <div 
                      className={cn(
                        'w-16 h-16 rounded-2xl flex items-center justify-center',
                        'bg-gradient-to-br',
                        plan.color
                      )}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                  </div>

                  {/* Plan Name */}
                  <h3 className="text-2xl font-bold text-center mb-2">
                    {plan.name}
                  </h3>

                  {/* Price */}
                  <div className="text-center mb-4">
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      <span className="text-sm text-muted-foreground">/{plan.period}</span>
                    </div>
                  </div>

                  {/* Description */}
                  <p className="text-sm text-muted-foreground text-center mb-6">
                    {plan.description}
                  </p>

                  {/* Features */}
                  <ul className="space-y-3 mb-6">
                    {plan.features.map((feature, index) => (
                      <li key={index} className="flex items-start gap-2">
                        <Check className="w-5 h-5 text-green-500 flex-shrink-0 mt-0.5" />
                        <span className="text-sm">{feature}</span>
                      </li>
                    ))}
                  </ul>

                  {/* Button */}
                  <button
                    onClick={() => handleUpgrade(plan.id)}
                    disabled={isCurrentPlan}
                    className={cn(
                      'w-full py-3 px-4 rounded-lg font-semibold transition-all duration-200',
                      'disabled:opacity-50 disabled:cursor-not-allowed',
                      plan.popular
                        ? 'bg-primary text-primary-foreground hover:opacity-90 shadow-lg'
                        : 'bg-white/10 hover:bg-white/20'
                    )}
                  >
                    {isCurrentPlan ? 'Current Plan' : plan.buttonText}
                  </button>
                </div>
              )
            })}
          </div>

          {/* Footer Note */}
          <div className="mt-8 text-center">
            <div className="inline-block px-4 py-2 rounded-lg mb-4" style={{ backgroundColor: 'var(--color-background)' }}>
              <p className="text-sm font-semibold text-green-400">
                ✨ Local AI models are always 100% free and unlimited
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                Subscriptions only unlock SERP web search API access
              </p>
            </div>
            <div className="text-sm text-muted-foreground">
              <p>All plans include a 14-day money-back guarantee</p>
              <p className="mt-1">Cancel anytime, no questions asked</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
