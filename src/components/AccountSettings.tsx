import { useState, useEffect } from 'react'
import { User, Cloud, Coins, Github, Mail, ShieldCheck, LogOut } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { fetchUserSettings, updateUserSettings, type CloudUserSettings } from '../services/cloudSync'
import huggingfaceIcon from '../assets/huggingface-color.svg'
import { cn } from '../lib/utils'

export function AccountSettings() {
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState<CloudUserSettings | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user?.provider === 'supabase') {
      loadSettings()
    }
  }, [user])

  async function loadSettings() {
    setIsLoading(true)
    try {
      const data = await fetchUserSettings()
      setSettings(data)
    } catch (error) {
      console.error('Failed to load user settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleCloudSync() {
    if (!settings) return
    setIsSaving(true)
    try {
      const newStatus = !settings.cloud_sync_enabled
      await updateUserSettings({ cloud_sync_enabled: newStatus })
      setSettings(prev => prev ? { ...prev, cloud_sync_enabled: newStatus } : null)
    } catch (error) {
      console.error('Failed to update cloud sync:', error)
    } finally {
      setIsSaving(false)
    }
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
          <User className="w-8 h-8 text-muted-foreground" />
        </div>
        <div className="space-y-2">
          <h3 className="text-xl font-semibold">Not Authenticated</h3>
          <p className="text-muted-foreground max-w-sm">
            Please log in to access account settings and enable cloud features.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-8 max-w-2xl mx-auto">
      {/* Profile Header */}
      <div className="flex items-center gap-6 pb-8 border-b border-white/10">
        <div className="relative group">
          {user.avatarUrl ? (
            <img 
              src={user.avatarUrl} 
              alt={user.fullname} 
              className="w-24 h-24 rounded-2xl object-cover ring-2 ring-primary/20"
            />
          ) : (
            <div className="w-24 h-24 rounded-2xl bg-primary/10 flex items-center justify-center ring-2 ring-primary/20">
              <User className="w-10 h-10 text-primary" />
            </div>
          )}
          <div className="absolute -bottom-2 -right-2 p-1.5 bg-background border rounded-lg shadow-lg">
             {user.provider === 'huggingface' ? (
                <img src={huggingfaceIcon} alt="HF" className="w-5 h-5" />
             ) : user.email?.includes('github') ? (
                <Github className="w-5 h-5" />
             ) : (
                <Mail className="w-5 h-5" />
             )}
          </div>
        </div>
        
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="text-2xl font-bold">{user.fullname}</h3>
            {user.isPro && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">
                PRO
              </span>
            )}
          </div>
          <p className="text-muted-foreground text-sm flex items-center gap-2">
            @{user.name} • {user.email || 'No email provided'}
          </p>
          <div className="pt-2 flex gap-2">
            <div className="px-2 py-1 rounded-md bg-white/5 text-[10px] font-medium border flex items-center gap-1.5 uppercase">
              <ShieldCheck className="w-3 h-3 text-emerald-400" />
              Verified {user.provider}
            </div>
          </div>
        </div>
      </div>

      {/* Cloud & Premium Features */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Cloud Sync Card */}
        <div 
          className={cn(
            "p-5 rounded-2xl border transition-all duration-300 relative overflow-hidden",
            settings?.cloud_sync_enabled ? "bg-primary/5 border-primary/20" : "bg-white/5 border-white/10"
          )}
        >
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-xl bg-primary/10">
              <Cloud className="w-5 h-5 text-primary" />
            </div>
            <button
              onClick={toggleCloudSync}
              disabled={isSaving || user.provider !== 'supabase'}
              className={cn(
                "relative inline-flex h-6 w-11 items-center rounded-full transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2",
                settings?.cloud_sync_enabled ? "bg-primary" : "bg-white/20",
                user.provider !== 'supabase' && "opacity-50 cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "inline-block h-4 w-4 transform rounded-full bg-white transition-transform",
                  settings?.cloud_sync_enabled ? "translate-x-6" : "translate-x-1"
                )}
              />
            </button>
          </div>
          <h4 className="font-semibold mb-1">Cloud Sync</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Synchronize your chat history and settings across all platforms.
          </p>
          {user.provider !== 'supabase' && (
            <div className="absolute inset-0 bg-background/60 backdrop-blur-[1px] flex items-center justify-center p-4 text-center">
                <p className="text-[10px] font-medium text-amber-400 uppercase tracking-widest leading-relaxed">
                  Available for Supabase Login only
                </p>
            </div>
          )}
        </div>

        {/* RAG Credits Card */}
        <div className="p-5 rounded-2xl border bg-white/5 border-white/10 group hover:border-primary/30 transition-all duration-300">
          <div className="flex justify-between items-start mb-4">
            <div className="p-2.5 rounded-xl bg-amber-500/10">
              <Coins className="w-5 h-5 text-amber-500" />
            </div>
            <div className="text-right">
              <div className="text-xl font-bold text-amber-500">
                ${settings?.rag_credits?.toFixed(2) || "0.00"}
              </div>
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-tighter">
                Credits
              </div>
            </div>
          </div>
          <h4 className="font-semibold mb-1">RAG Memory Balance</h4>
          <p className="text-xs text-muted-foreground mb-4">
            Pay-per-token credits for high-performance cloud document indexing.
          </p>
          <button className="w-full py-2 rounded-lg bg-white/10 hover:bg-white/20 text-xs font-semibold transition-colors">
            Top Up Balance
          </button>
        </div>
      </div>

      {/* Account Actions */}
      <div className="pt-6 space-y-4">
        <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Account Actions</h4>
        <div className="space-y-2">
            <button 
                onClick={logout}
                className="w-full flex items-center gap-3 p-4 rounded-xl bg-red-500/5 border border-red-500/20 text-red-500 transition-all hover:bg-red-500/10 group"
            >
                <div className="p-2 rounded-lg bg-red-500/10 group-hover:bg-red-500/20 transition-colors">
                    <LogOut className="w-5 h-5" />
                </div>
                <div className="flex-1 text-left">
                    <div className="font-semibold">Sign Out</div>
                    <p className="text-[10px] text-red-500/60 uppercase font-bold tracking-widest">
                        End current session
                    </p>
                </div>
            </button>
        </div>
      </div>

      {isLoading && (
        <div className="absolute inset-0 bg-background/50 backdrop-blur-sm flex items-center justify-center">
            <div className="flex flex-col items-center gap-3">
                <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                <p className="text-xs font-semibold uppercase tracking-widest animate-pulse">Syncing Cloud Profile...</p>
            </div>
        </div>
      )}
    </div>
  )
}
