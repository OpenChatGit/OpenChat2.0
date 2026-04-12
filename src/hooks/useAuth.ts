import { useState, useEffect } from 'react'
import { supabase } from '../lib/supabase'

export interface AppUser {
  id: string
  name: string
  fullname: string
  email?: string
  avatarUrl?: string
  isPro: boolean
  provider: 'supabase'
}

export function useAuth() {
  const [user, setUser] = useState<AppUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  useEffect(() => {
    const initAuth = async () => {
      setIsLoading(true)
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session?.user) {
          const nameMetadata = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0]
          setUser({
            id: session.user.id,
            name: session.user.user_metadata?.user_name || nameMetadata || 'User',
            fullname: nameMetadata || 'User',
            email: session.user.email,
            avatarUrl: session.user.user_metadata?.avatar_url,
            isPro: false,
            provider: 'supabase'
          })
          setIsAuthenticated(true)
        } else {
          setUser(null)
          setIsAuthenticated(false)
        }
      } catch (error) {
        console.error('Auth init failed:', error)
        setUser(null)
        setIsAuthenticated(false)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        const nameMetadata = session.user.user_metadata?.full_name || session.user.user_metadata?.name || session.user.email?.split('@')[0]
        setUser({
          id: session.user.id,
          name: session.user.user_metadata?.user_name || nameMetadata || 'User',
          fullname: nameMetadata || 'User',
          email: session.user.email,
          avatarUrl: session.user.user_metadata?.avatar_url,
          isPro: false,
          provider: 'supabase'
        })
        setIsAuthenticated(true)
      } else {
        setUser(null)
        setIsAuthenticated(false)
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  const logout = async () => {
    await supabase.auth.signOut()
    setUser(null)
    setIsAuthenticated(false)
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    login: () => {}, // No longer needed for HF
    logout
  }
}
