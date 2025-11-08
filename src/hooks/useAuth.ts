import { useState, useEffect } from 'react'
import { getApiKey, setApiKey, removeApiKey } from '../lib/secureStorage'
import { validateToken, type HuggingFaceUser } from '../services/huggingface'

const AUTH_KEY = 'huggingface'
const USER_CACHE_KEY = 'hf.user'

export function useAuth() {
  const [user, setUser] = useState<HuggingFaceUser | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [isAuthenticated, setIsAuthenticated] = useState(false)

  // Load user from cache and validate token on mount
  useEffect(() => {
    const initAuth = async () => {
      try {
        // Try to load cached user
        const cachedUser = localStorage.getItem(USER_CACHE_KEY)
        if (cachedUser) {
          setUser(JSON.parse(cachedUser))
        }

        // Check if token exists
        const token = getApiKey(AUTH_KEY)
        if (token) {
          // Validate token and get fresh user info
          const userInfo = await validateToken(token)
          setUser(userInfo)
          setIsAuthenticated(true)
          // Update cache
          localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userInfo))
        } else {
          setUser(null)
          setIsAuthenticated(false)
          localStorage.removeItem(USER_CACHE_KEY)
        }
      } catch (error) {
        console.error('Failed to validate token:', error)
        // Token is invalid, clear it
        removeApiKey(AUTH_KEY)
        setUser(null)
        setIsAuthenticated(false)
        localStorage.removeItem(USER_CACHE_KEY)
      } finally {
        setIsLoading(false)
      }
    }

    initAuth()
  }, [])

  const login = async (token: string) => {
    setIsLoading(true)
    try {
      const userInfo = await validateToken(token)
      setApiKey(AUTH_KEY, token)
      setUser(userInfo)
      setIsAuthenticated(true)
      localStorage.setItem(USER_CACHE_KEY, JSON.stringify(userInfo))
    } catch (error) {
      throw error
    } finally {
      setIsLoading(false)
    }
  }

  const logout = () => {
    removeApiKey(AUTH_KEY)
    setUser(null)
    setIsAuthenticated(false)
    localStorage.removeItem(USER_CACHE_KEY)
  }

  return {
    user,
    isLoading,
    isAuthenticated,
    login,
    logout
  }
}
