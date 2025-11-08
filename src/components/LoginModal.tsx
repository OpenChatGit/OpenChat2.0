import { useState } from 'react'
import { X } from 'lucide-react'
import { cn } from '../lib/utils'
import huggingfaceIcon from '../assets/huggingface-color.svg'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (token: string) => Promise<void>
}

export function LoginModal({ isOpen, onClose, onLogin }: LoginModalProps) {
  const [token, setToken] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!isOpen) return null

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    if (!token.trim()) {
      setError('Please enter a token')
      return
    }

    setIsLoading(true)
    try {
      await onLogin(token.trim())
      setToken('')
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to login')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div
        className="relative w-full max-w-md rounded-xl shadow-2xl border"
        style={{
          backgroundColor: 'var(--color-sidebar)',
          borderColor: 'var(--color-dropdown-border)'
        }}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        {/* Content */}
        <form onSubmit={handleSubmit} className="p-8 space-y-6">
          {/* Hugging Face Icon */}
          <div className="flex justify-center">
            <img 
              src={huggingfaceIcon} 
              alt="Hugging Face" 
              className="w-16 h-16"
            />
          </div>

          {/* Title */}
          <div className="text-center space-y-2">
            <h2 className="text-xl font-semibold">Login to your Hugging Face Account</h2>
            <p className="text-sm text-muted-foreground">
              Enter your access token to continue
            </p>
          </div>

          {/* Token Input */}
          <div className="space-y-2">
            <input
              id="token"
              type="password"
              value={token}
              onChange={(e) => setToken(e.target.value)}
              placeholder="hf_..."
              className={cn(
                "w-full px-4 py-3 rounded-lg border bg-background text-foreground",
                "focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                "placeholder:text-muted-foreground",
                error && "border-red-500 focus:ring-red-500"
              )}
              disabled={isLoading}
              autoFocus
            />
            {error && (
              <p className="text-sm text-red-400 flex items-center gap-1">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                {error}
              </p>
            )}
            <p className="text-xs text-muted-foreground">
              Get your token from{' '}
              <a 
                href="https://huggingface.co/settings/tokens" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary hover:underline"
              >
                huggingface.co/settings/tokens
              </a>
            </p>
          </div>

          {/* Actions */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 rounded-lg border font-medium transition-colors hover:bg-white/10"
              style={{ borderColor: 'var(--color-dropdown-border)' }}
              disabled={isLoading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium transition-all hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
              disabled={isLoading}
            >
              {isLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Logging in...
                </span>
              ) : (
                'Login'
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
