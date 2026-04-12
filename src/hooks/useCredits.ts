import { useState, useEffect } from 'react'
import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

export function useCredits() {
  const [credits, setCredits] = useState<number | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  const fetchCredits = async () => {
    setIsLoading(true)
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) {
      setCredits(null)
      setIsLoading(false)
      return
    }

    const { data, error } = await supabase
      .from('user_settings')
      .select('credits')
      .eq('user_id', session.user.id)
      .maybeSingle()

    if (error) {
      console.error('Error fetching credits:', error)
    } else if (data) {
      setCredits(data.credits)
    } else {
      // If no settings exist yet, we show 0 or trigger an init
      setCredits(0)
    }
    setIsLoading(false)
  }

  useEffect(() => {
    fetchCredits()

    // Realtime update when credits change
    const subscription = supabase
      .channel('credit-updates')
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'user_settings' },
        (payload) => {
          if (payload.new && 'credits' in payload.new) {
            setCredits(payload.new.credits)
          }
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [])

  return { credits, isLoading, refresh: fetchCredits }
}
