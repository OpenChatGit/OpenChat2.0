import { useState, useRef, useEffect } from 'react'
import { Settings, User, LogOut, HelpCircle, LogIn, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import { LoginModal } from './LoginModal'
import { UpgradeModal } from './UpgradeModal'
import { VerifiedBadge } from './VerifiedBadge'
import { HubTooltip } from './HubTooltip'
import { StackBadges } from './StackBadges'

interface ProfileButtonProps {
  onOpenSettings: () => void
}

function AvatarWithFallback({ src, alt, size }: { src?: string; alt: string; size: string }) {
  const [imageError, setImageError] = useState(false)

  useEffect(() => {
    setImageError(false)
  }, [src])

  if (!src || imageError) {
    return (
      <div
        className={cn(size, "rounded-full flex items-center justify-center flex-shrink-0")}
        style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
      >
        <User className="w-4 h-4" />
      </div>
    )
  }

  return (
    <img
      src={src}
      alt={alt}
      className={cn(size, "rounded-full object-cover flex-shrink-0")}
      onError={() => {
        console.log('[Avatar] Failed to load:', src)
        setImageError(true)
      }}
    />
  )
}

export function ProfileButton({ onOpenSettings }: ProfileButtonProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [showLoginModal, setShowLoginModal] = useState(false)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const dropupRef = useRef<HTMLDivElement>(null)
  const { user, isAuthenticated, isLoading, login, logout } = useAuth()

  // Close dropup when clicking outside
  useEffect(() => {
    if (!isOpen) return

    const handleClickOutside = (event: MouseEvent) => {
      if (dropupRef.current && !dropupRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [isOpen])

  const menuItems = isAuthenticated ? [
    {
      icon: Sparkles,
      label: 'Upgrade',
      onClick: () => {
        setShowUpgradeModal(true)
        setIsOpen(false)
      },
      highlight: !user?.isPro
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        onOpenSettings()
        setIsOpen(false)
      }
    },
    {
      icon: HelpCircle,
      label: 'Help & Support',
      onClick: () => {
        // TODO: Open help modal
        setIsOpen(false)
      }
    },
    {
      icon: LogOut,
      label: 'Sign Out',
      onClick: () => {
        logout()
        setIsOpen(false)
      },
      danger: true
    }
  ] : [
    {
      icon: Sparkles,
      label: 'Upgrade',
      onClick: () => {
        setShowUpgradeModal(true)
        setIsOpen(false)
      },
      highlight: true
    },
    {
      icon: LogIn,
      label: 'Login',
      onClick: () => {
        setShowLoginModal(true)
        setIsOpen(false)
      }
    },
    {
      icon: Settings,
      label: 'Settings',
      onClick: () => {
        onOpenSettings()
        setIsOpen(false)
      }
    }
  ]

  return (
    <>
      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onLogin={login}
      />
      
      <UpgradeModal
        isOpen={showUpgradeModal}
        onClose={() => setShowUpgradeModal(false)}
        currentPlan={user?.isPro ? 'pro' : 'free'}
      />
      
      <div ref={dropupRef} className="relative">
        {/* Dropup Menu */}
        {isOpen && (
        <div
          className="absolute bottom-full left-0 mb-4 w-64 rounded-[32px] shadow-2xl border overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-300 z-50"
          style={{
            backgroundColor: 'var(--color-sidebar)',
            borderColor: 'var(--color-dropdown-border)'
          }}
        >
          {/* User Info Section */}
          {isAuthenticated && user && (
            <div className="px-6 py-5 border-b" style={{ borderColor: 'var(--color-dropdown-border)' }}>
              <div className="flex items-center gap-4">
                <AvatarWithFallback
                  src={user.avatarUrl}
                  alt={user.name}
                  size="w-12 h-12"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 min-w-0 mb-1">
                    <div className="font-black text-sm truncate italic">{user.fullname}</div>
                    <VerifiedBadge role={user.role} />
                  </div>
                  <StackBadges stack={user.stack} className="mt-1" />
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-3 px-3">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center gap-4 px-4 py-3 text-xs font-black uppercase tracking-tight transition-all rounded-2xl relative group/item italic',
                  item.highlight 
                    ? 'bg-gradient-to-r from-primary/10 to-purple-500/10 hover:from-primary/20 hover:to-purple-500/20'
                    : 'hover:bg-white/5',
                  item.danger && 'text-red-400 hover:bg-red-400/10'
                )}
              >
                <item.icon className={cn('w-4 h-4', item.highlight && 'text-primary')} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto text-[8px] px-2 py-0.5 rounded-full bg-primary text-primary-foreground font-black uppercase">
                    New
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile Button with Premium Tooltip */}
      <HubTooltip text={isAuthenticated ? "Account" : "Authenticate"} position="top" className="w-full">
        <button
          onClick={() => !isLoading && setIsOpen(!isOpen)}
          className={cn(
            'w-full flex items-center gap-4 p-4 rounded-[32px] transition-all border border-transparent shadow-sm',
            'hover:bg-white/5 hover:border-white/5 hover:shadow-xl',
            isOpen && 'bg-white/5 border-white/5 shadow-xl',
            isLoading && 'opacity-50 cursor-wait'
          )}
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <div className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/5">
                 <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              </div>
              <div className="flex-1 text-left min-w-0">
                 <div className="text-xs font-black uppercase tracking-widest animate-pulse italic">Syncing...</div>
                 <div className="text-[9px] text-muted-foreground/30 font-medium italic">Please wait</div>
              </div>
            </>
          ) : isAuthenticated && user ? (
            <>
              <div className="relative flex-shrink-0">
                  <AvatarWithFallback
                    src={user.avatarUrl}
                    alt={user.name}
                    size="w-10 h-10"
                  />
                  <div className="absolute -bottom-1 -right-1 w-3.5 h-3.5 bg-emerald-500 rounded-full border-2 border-[var(--color-sidebar)]" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="text-sm font-black truncate tracking-tight italic">{user.fullname}</div>
                  <VerifiedBadge role={user.role} />
                </div>
                <div className="flex items-center gap-2">
                   <div className="text-[9px] text-muted-foreground/40 truncate font-black uppercase tracking-widest italic">
                      {user.role} Status
                   </div>
                   {user.stack && user.stack.length > 0 && (
                       <StackBadges stack={user.stack} size={8} />
                   )}
                </div>
              </div>
            </>
          ) : (
            <>
              <div
                className="w-10 h-10 rounded-2xl flex items-center justify-center flex-shrink-0 bg-white/5 border border-white/5 shadow-inner"
              >
                <User className="w-5 h-5 opacity-40" />
              </div>
              <div className="flex-1 text-left min-w-0">
                <div className="text-xs font-black uppercase tracking-widest italic">Guest</div>
                <div className="text-[9px] text-muted-foreground/30 font-medium italic">Not identified</div>
              </div>
            </>
          )}
        </button>
      </HubTooltip>
      </div>
    </>
  )
}
