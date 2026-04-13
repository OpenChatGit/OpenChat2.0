import { useState, useEffect } from 'react'
import { User, Cloud, Coins, Github, Mail, ShieldCheck, LogOut, Check, Cpu } from 'lucide-react'
import { useAuth } from '../hooks/useAuth'
import { fetchUserSettings, updateUserSettings, type CloudUserSettings } from '../services/cloudSync'
import { cn } from '../lib/utils'

const CDN_BASE = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/'

const STACK_OPTIONS = [
  { id: 'ollama', label: 'Ollama', slug: 'ollama', color: '#ffffff' },
  { id: 'lm-studio', label: 'LM Studio', slug: 'lmstudio', color: '#6C78EF' },
  { id: 'open-webui', label: 'OpenWebUI', slug: 'openwebui', color: '#ffffff' },
  { id: 'other', label: 'Custom Stack', fallbackIcon: Cpu, color: '#9455d3' },
]

interface FriendRequest {
  id: string
  user_id: string
  user: {
    display_name: string
    avatar_url: string
  }
}

export function AccountSettings() {
  const { user, logout } = useAuth()
  const [settings, setSettings] = useState<CloudUserSettings | null>(null)
  const [friendRequests, setFriendRequests] = useState<FriendRequest[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (user?.id) {
      loadSettings()
      loadFriendRequests()
    }
  }, [user?.id])

  async function loadFriendRequests() {
    if (!user?.id) return
    try {
      const session = await getSafeSession()
      const token = session?.access_token
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

      const res = await fetch(
        `${supabaseUrl}/rest/v1/hub_friends?friend_id=eq.${user.id}&status=eq.pending&select=id,user_id,user:user_settings(display_name,avatar_url)`,
        { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } }
      )
      if (res.ok) setFriendRequests(await res.json())
    } catch (err) {
      console.error('Failed to load friend requests', err)
    }
  }

  async function handleRequest(requestId: string, requesterId: string, action: 'accept' | 'decline') {
     setIsSaving(true)
     try {
        const session = await getSafeSession()
        const token = session?.access_token
        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        if (action === 'accept') {
            // Update original to accepted
            await fetch(`${supabaseUrl}/rest/v1/hub_friends?id=eq.${requestId}`, {
                method: 'PATCH',
                headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'accepted' })
            })
            // Create reverse link
            await fetch(`${supabaseUrl}/rest/v1/hub_friends`, {
                method: 'POST',
                headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
                body: JSON.stringify({ user_id: user.id, friend_id: requesterId, status: 'accepted' })
            })
        } else {
            await fetch(`${supabaseUrl}/rest/v1/hub_friends?id=eq.${requestId}`, {
                method: 'DELETE',
                headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
            })
        }
        loadFriendRequests()
     } catch (err) {
        console.error('Failed to handle request', err)
     } finally {
        setIsSaving(false)
     }
  }

  async function loadSettings() {
    if (!user?.id) return
    setIsLoading(true)
    try {
      const data = await fetchUserSettings(user.id)
      setSettings(data)
    } catch (error) {
      console.error('Failed to load user settings:', error)
    } finally {
      setIsLoading(false)
    }
  }

  async function toggleStackItem(id: string) {
    if (!settings || !user?.id) return
    
    const currentStack = settings.stack || []
    const newStack = currentStack.includes(id) 
      ? currentStack.filter(item => item !== id)
      : [...currentStack, id]
      
    setIsSaving(true)
    try {
      await updateUserSettings(user.id, { stack: newStack })
      setSettings(prev => prev ? { ...prev, stack: newStack } : null)
    } catch (error) {
      console.error('Failed to update stack:', error)
    } finally {
      setIsSaving(false)
    }
  }

  async function toggleCloudSync() {
    if (!settings || !user?.id) return
    setIsSaving(true)
    try {
      const newStatus = !settings.cloud_sync_enabled
      await updateUserSettings(user.id, { cloud_sync_enabled: newStatus })
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
    <div className="p-6 space-y-10 max-w-3xl mx-auto pb-20">
      {/* Profile Header */}
      <div className="flex items-center gap-8 pb-10 border-b border-white/5">
        <div className="relative">
          <div className="w-28 h-28 rounded-[32px] overflow-hidden ring-4 ring-primary/10 shadow-2xl">
            {user.avatarUrl ? (
              <img src={user.avatarUrl} alt={user.fullname} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <User className="w-12 h-12 text-primary" />
              </div>
            )}
          </div>
          <div className="absolute -bottom-2 -right-2 p-2 bg-popover border border-border rounded-2xl shadow-xl">
             {user.email?.includes('github') ? <Github size={20} /> : <Mail size={20} />}
          </div>
        </div>

        <div className="space-y-2">
           <div className="flex items-center gap-3">
              <h2 className="text-3xl font-black tracking-tight italic">{user.fullname}</h2>
              <div className="px-3 py-1 rounded-full bg-primary/10 border border-primary/20 text-primary text-[10px] font-black uppercase tracking-widest">
                {user.role}
              </div>
           </div>
           <p className="text-muted-foreground/60 font-medium italic">@{user.name} • {user.email}</p>
           <div className="flex gap-2 pt-2">
               <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/5 border border-emerald-500/10 text-[10px] font-bold text-emerald-500 uppercase tracking-widest">
                  <ShieldCheck size={14} />
                  Verified Entity
               </div>
           </div>
        </div>
      </div>

      {/* Community Stack Section */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
           <div className="space-y-1">
              <h3 className="text-sm font-black uppercase tracking-[0.2em] italic">Community Stack</h3>
              <p className="text-xs text-muted-foreground">Select the tools you use to get badges next to your name.</p>
           </div>
           {isSaving && <div className="text-[10px] font-black text-primary animate-pulse uppercase tracking-widest italic">Syncing...</div>}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {STACK_OPTIONS.map((option) => {
            const isSelected = settings?.stack?.includes(option.id);
            const iconUrl = option.slug ? `${CDN_BASE}${option.slug}.svg` : null;
            return (
              <button
                key={option.id}
                onClick={() => toggleStackItem(option.id)}
                disabled={isSaving}
                className={cn(
                  "flex items-center justify-between p-4 rounded-3xl border transition-all duration-300 group text-left",
                  isSelected 
                    ? "bg-card border-primary/40 shadow-xl shadow-primary/5" 
                    : "bg-white/5 border-white/5 hover:border-white/20"
                )}
              >
                <div className="flex items-center gap-4">
                   <div className="w-12 h-12 flex items-center justify-center p-2 transition-transform group-hover:scale-110">
                      {iconUrl ? (
                        <div 
                          style={{
                            width: '100%',
                            height: '100%',
                            backgroundColor: option.color,
                            maskImage: `url(${iconUrl})`,
                            WebkitMaskImage: `url(${iconUrl})`,
                            maskSize: 'contain',
                            WebkitMaskSize: 'contain',
                            maskRepeat: 'no-repeat',
                            WebkitMaskRepeat: 'no-repeat',
                            maskPosition: 'center',
                            WebkitMaskPosition: 'center'
                          }}
                        />
                      ) : (
                        <option.fallbackIcon size={32} style={{ color: option.color }} strokeWidth={2} />
                      )}
                   </div>
                   <span className={cn("text-sm font-black uppercase tracking-tight italic", isSelected ? "text-foreground" : "text-muted-foreground/60")}>
                      {option.label}
                   </span>
                </div>
                <div className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all",
                  isSelected ? "bg-primary border-primary" : "border-white/10"
                )}>
                  {isSelected && <Check size={14} className="text-primary-foreground" strokeWidth={4} />}
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Friend Requests Card */}
        {friendRequests.length > 0 && (
            <div className="md:col-span-2 p-6 rounded-[32px] border border-amber-500/20 bg-amber-500/5 shadow-xl shadow-amber-500/5 animate-in slide-in-from-bottom-4 duration-500">
                <div className="flex items-center justify-between mb-6">
                    <div className="flex items-center gap-3">
                        <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
                            <Users size={24} />
                        </div>
                        <div>
                            <h4 className="text-lg font-black italic uppercase tracking-tight">Social Requests</h4>
                            <p className="text-[10px] font-black uppercase tracking-widest text-amber-500/60">Incoming connections</p>
                        </div>
                    </div>
                </div>
                <div className="space-y-3">
                    {friendRequests.map((req) => (
                        <div key={req.id} className="flex items-center justify-between p-4 rounded-2xl bg-white/5 border border-white/5">
                            <div className="flex items-center gap-3">
                                {req.user.avatar_url ? (
                                    <img src={req.user.avatar_url} className="w-10 h-10 rounded-xl object-cover" />
                                ) : (
                                    <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center text-primary font-black italic">
                                        {req.user.display_name[0]}
                                    </div>
                                )}
                                <span className="text-sm font-black italic">{req.user.display_name}</span>
                            </div>
                            <div className="flex gap-2">
                                <button 
                                    onClick={() => handleRequest(req.id, req.user_id, 'decline')}
                                    className="px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-red-500 transition-colors"
                                >
                                    Decline
                                </button>
                                <button 
                                    onClick={() => handleRequest(req.id, req.user_id, 'accept')}
                                    className="px-6 py-2 rounded-xl bg-amber-500 text-black text-[10px] font-black uppercase tracking-widest shadow-lg shadow-amber-500/20 hover:scale-105 active:scale-95 transition-all"
                                >
                                    Accept
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        )}

        {/* Cloud Sync Card */}
        <div className={cn(
          "p-6 rounded-[32px] border transition-all duration-500 relative overflow-hidden",
          settings?.cloud_sync_enabled ? "bg-primary/5 border-primary/20 shadow-xl shadow-primary/5" : "bg-white/5 border-white/10"
        )}>
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 rounded-2xl bg-primary/10 text-primary border border-primary/20">
              <Cloud size={24} />
            </div>
            <button
              onClick={toggleCloudSync}
              disabled={isSaving}
              className={cn(
                "relative inline-flex h-7 w-12 items-center rounded-full transition-all focus:outline-none ring-offset-background focus:ring-2 focus:ring-primary",
                settings?.cloud_sync_enabled ? "bg-primary" : "bg-white/10"
              )}
            >
              <span className={cn(
                "inline-block h-5 w-5 transform rounded-full bg-white transition-all shadow-lg",
                settings?.cloud_sync_enabled ? "translate-x-6" : "translate-x-1"
              )} />
            </button>
          </div>
          <h4 className="text-lg font-black italic uppercase tracking-tight mb-1">Cloud Sync</h4>
          <p className="text-xs text-muted-foreground leading-relaxed italic opacity-60">
            Keep your chats and settings synchronized across all your devices seamlessly.
          </p>
        </div>

        {/* Credits Card */}
        <div className="p-6 rounded-[32px] border bg-white/5 border-white/10 hover:border-amber-500/30 transition-all duration-500 group">
          <div className="flex justify-between items-start mb-6">
            <div className="p-3 rounded-2xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Coins size={24} />
            </div>
            <div className="text-right">
                <div className="text-3xl font-black italic tracking-tighter text-amber-500">
                    ${settings?.credits?.toFixed(2) || "0.00"}
                </div>
                <div className="text-[10px] font-black uppercase text-amber-500/40 tracking-widest">Balance</div>
            </div>
          </div>
          <h4 className="text-lg font-black italic uppercase tracking-tight mb-1">RAG Memory</h4>
          <p className="text-xs text-muted-foreground leading-relaxed italic opacity-60">
            Current balance for high-speed cloud document indexing and retrieval.
          </p>
        </div>
      </div>

      {/* Account Actions */}
      <div className="pt-10 border-t border-white/5 space-y-4">
        <button
            onClick={logout}
            className="w-full flex items-center gap-4 p-5 rounded-[32px] bg-red-500/5 border border-red-500/10 text-red-500 hover:bg-red-500/10 transition-all group active:scale-[0.98]"
        >
            <div className="p-3 rounded-2xl bg-red-500/10 group-hover:bg-red-500/20 transition-all">
                <LogOut size={24} />
            </div>
            <div className="flex-1 text-left">
                <div className="font-black italic uppercase tracking-tight">Sign Out</div>
                <p className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40 italic">End current work session</p>
            </div>
        </button>
      </div>
    </div>
  )
}
