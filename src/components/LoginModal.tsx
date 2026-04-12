import { useState } from 'react'
import { X, Github, Mail, Key, ArrowLeft } from 'lucide-react'
import { cn } from '../lib/utils'
import { supabase } from '../lib/supabase'

interface LoginModalProps {
  isOpen: boolean
  onClose: () => void
  onLogin: (token: string) => Promise<void>
}

type AuthMode = 'options' | 'email'

export function LoginModal({ isOpen, onClose }: LoginModalProps) {
  const [mode, setMode] = useState<AuthMode>('options')
  
  // Email State
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  
  // Shared State
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)

  if (!isOpen) return null

  const resetState = () => {
    setError(null)
    setMessage(null)
    setIsLoading(false)
  }

  const handleClose = () => {
    setMode('options')
    setEmail('')
    setPassword('')
    resetState()
    onClose()
  }

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    resetState()

    if (!email.trim() || !password.trim()) {
      setError('Please enter email and password')
      return
    }

    setIsLoading(true)
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim()
        })
        if (error) throw error
        setMessage('Check your email for the confirmation link.')
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim()
        })
        if (error) throw error
        handleClose()
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleGithubLogin = async () => {
    resetState()
    setIsLoading(true)
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'github',
        options: {
          redirectTo: window.location.origin
        }
      })
      if (error) throw error
    } catch (err) {
      setError(err instanceof Error ? err.message : 'GitHub login failed')
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
        {/* Header Actions */}
        <div className="absolute top-4 left-4 z-10 flex gap-2">
          {mode !== 'options' && (
            <button
              onClick={() => {
                setMode('options')
                resetState()
              }}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
              disabled={isLoading}
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>
        <button
          onClick={handleClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-white/10 transition-colors z-10"
          disabled={isLoading}
        >
          <X className="w-5 h-5" />
        </button>

        <div className="p-8 pt-10 space-y-6">
          {/* Logo */}
          <div className="flex justify-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg">
              <Key className="w-8 h-8 text-white" />
            </div>
          </div>

          <div className="text-center space-y-2">
            <h2 className="text-2xl font-semibold">
              {mode === 'options' && 'Welcome to OpenChat'}
              {mode === 'email' && (isSignUp ? 'Create an Account' : 'Welcome Back')}
            </h2>
            <p className="text-sm text-muted-foreground">
              {mode === 'options' && 'Sign in to sync your chats and access premium models'}
              {mode === 'email' && 'Enter your email and password to continue'}
            </p>
          </div>

          {/* Error and Message Display */}
          {error && (
            <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm flex items-center gap-2">
              <X className="w-4 h-4 shrink-0" />
              <p>{error}</p>
            </div>
          )}
          {message && (
            <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 text-sm">
              <p>{message}</p>
            </div>
          )}

          {/* Options Mode */}
          {mode === 'options' && (
            <div className="space-y-3">
              <button
                onClick={handleGithubLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg bg-[#24292e] hover:bg-[#2c3137] text-white font-medium transition-colors disabled:opacity-50"
              >
                <Github className="w-5 h-5" />
                Continue with GitHub
              </button>
              
              <button
                onClick={() => setMode('email')}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-3 px-4 py-3 rounded-lg border hover:bg-white/5 font-medium transition-colors disabled:opacity-50 text-foreground"
                style={{ borderColor: 'var(--color-dropdown-border)' }}
              >
                <Mail className="w-5 h-5" />
                Continue with Email
              </button>
            </div>
          )}

          {/* Email Mode */}
          {mode === 'email' && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div className="space-y-3">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email address"
                  className={cn(
                    "w-full px-4 py-3 rounded-lg border bg-background text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                    "placeholder:text-muted-foreground"
                  )}
                  disabled={isLoading}
                  autoFocus
                />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  className={cn(
                    "w-full px-4 py-3 rounded-lg border bg-background text-foreground",
                    "focus:outline-none focus:ring-2 focus:ring-primary transition-all",
                    "placeholder:text-muted-foreground"
                  )}
                  disabled={isLoading}
                />
              </div>
              <button
                type="submit"
                className="w-full px-4 py-3 rounded-lg bg-primary text-primary-foreground font-medium transition-all hover:opacity-90 disabled:opacity-50"
                disabled={isLoading}
              >
                {isLoading ? 'Processing...' : (isSignUp ? 'Create Account' : 'Sign In')}
              </button>
              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => { setIsSignUp(!isSignUp); resetState(); }}
                  className="text-sm text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
