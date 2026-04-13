import { useAuth as useAuthFromProvider } from '../AuthProvider'

/**
 * useAuth Hook
 * Now a simple wrapper around the centralized AuthProvider context.
 * This prevents the redundant execution of auth listeners and state updates.
 */
export interface UserSettings {
  display_name: string
  avatar_url: string
  role: 'user' | 'moderator' | 'owner' | 'admin'
  stack: string[]
}

export function useAuth() {
  return useAuthFromProvider();
}

// Re-export types for convenience
export type { AppUser } from '../AuthProvider'
