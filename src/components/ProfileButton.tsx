import { useState, useRef, useEffect } from 'react'
import { Settings, User, LogOut, HelpCircle, LogIn, Sparkles } from 'lucide-react'
import { cn } from '../lib/utils'
import { useAuth } from '../hooks/useAuth'
import { LoginModal } from './LoginModal'
import { UpgradeModal } from './UpgradeModal'

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
  const { user, isAuthenticated, login, logout } = useAuth()

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
          className="absolute bottom-full left-0 mb-2 w-56 rounded-lg shadow-lg border overflow-hidden"
          style={{
            backgroundColor: 'var(--color-sidebar)',
            borderColor: 'var(--color-dropdown-border)'
          }}
        >
          {/* User Info Section */}
          {isAuthenticated && user && (
            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-dropdown-border)' }}>
              <div className="flex items-center gap-3">
                <AvatarWithFallback
                  src={user.avatarUrl}
                  alt={user.name}
                  size="w-10 h-10"
                />
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm truncate">{user.fullname}</div>
                  <div className="text-xs text-muted-foreground truncate">@{user.name}</div>
                </div>
              </div>
            </div>
          )}

          {/* Menu Items */}
          <div className="py-1 px-2">
            {menuItems.map((item, index) => (
              <button
                key={index}
                onClick={item.onClick}
                className={cn(
                  'w-full flex items-center gap-3 px-3 py-2.5 text-sm transition-colors rounded-lg',
                  item.highlight 
                    ? 'bg-gradient-to-r from-blue-500/20 to-purple-500/20 font-semibold hover:from-blue-500/30 hover:to-purple-500/30'
                    : 'hover:bg-white/10',
                  item.danger && 'text-red-400'
                )}
              >
                <item.icon className={cn('w-4 h-4', item.highlight && 'text-blue-400')} />
                <span>{item.label}</span>
                {item.highlight && (
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-blue-500 text-white">
                    New
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Profile Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'w-full flex items-center gap-3 p-3 rounded-lg transition-colors',
          'hover:bg-white/10',
          isOpen && 'bg-white/10'
        )}
        title="Account"
      >
        {isAuthenticated && user ? (
          <>
            <AvatarWithFallback
              src={user.avatarUrl}
              alt={user.name}
              size="w-8 h-8"
            />
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium truncate">{user.fullname}</div>
              <div className="text-xs text-muted-foreground truncate">
                {user.isPro ? 'Pro' : 'Free'} Plan
              </div>
            </div>
          </>
        ) : (
          <>
            <div
              className="w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0"
              style={{ backgroundColor: 'rgba(255, 255, 255, 0.1)' }}
            >
              <User className="w-4 h-4" />
            </div>
            <div className="flex-1 text-left min-w-0">
              <div className="text-sm font-medium truncate">Guest</div>
              <div className="text-xs text-muted-foreground truncate">Not logged in</div>
            </div>
          </>
        )}
      </button>
      </div>
    </>
  )
}
