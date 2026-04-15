import { MessageSquare, Users, Home, Compass, ShieldCheck, ChevronUp, ArrowLeft, RefreshCw } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import { ProfileButton } from './ProfileButton'
import { getSafeSession } from '../lib/supabase'
import { HubTooltip } from './HubTooltip'
import { VerifiedBadge } from './VerifiedBadge'

interface HubSidebarProps {
  onOpenSettings: () => void
  activeSubTab: 'home' | 'explore' | 'rules' | 'friends' | 'messages'
  onSubTabChange: (tab: 'home' | 'explore' | 'rules' | 'friends' | 'messages') => void
  friendsList?: any[]
  activeChatUserId?: string | null
  setActiveChatUserId?: (id: string | null) => void
  activeProfileUserId?: string | null
  setActiveProfileUserId?: (id: string | null) => void
  onlineUserIds?: string[]
}

export function HubSidebar({ 
  onOpenSettings, 
  activeSubTab, 
  onSubTabChange,
  friendsList = [],
  activeChatUserId = null,
  setActiveChatUserId,
  activeProfileUserId = null,
  setActiveProfileUserId,
  onlineUserIds = []
}: HubSidebarProps) {
  const [followedUsers, setFollowedUsers] = useState<{ name: string, handle: string, avatar?: string }[]>([])
  const [socialStats, setSocialStats] = useState({ followers: 0, following: 0 })
  const [isLoading, setIsLoading] = useState(true)
  const [refreshKey, setRefreshKey] = useState(0)
  const [isNavCollapsed, setIsNavCollapsed] = useState(() => {
    const saved = localStorage.getItem('oc.hub.navCollapsed')
    return saved === 'true'
  })
  const [isFollowedCollapsed, setIsFollowedCollapsed] = useState(() => {
    const saved = localStorage.getItem('oc.hub.followedCollapsed')
    return saved === 'true'
  })

  // Persist collapse states
  useEffect(() => {
    localStorage.setItem('oc.hub.navCollapsed', isNavCollapsed.toString())
  }, [isNavCollapsed])

  useEffect(() => {
    localStorage.setItem('oc.hub.followedCollapsed', isFollowedCollapsed.toString())
  }, [isFollowedCollapsed])

  useEffect(() => {
    const fetchData = async () => {
      try {
        const session = await getSafeSession()
        const token = session?.access_token
        const currentUserId = session?.user?.id;
        if (!token || !currentUserId) return

        const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
        const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

        // Fetch Social Stats
        const [followersRes, followingRes] = await Promise.all([
            fetch(`${supabaseUrl}/rest/v1/hub_follows?following_id=eq.${currentUserId}&select=count`, {
                headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Prefer': 'count=exact' }
            }),
            fetch(`${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${currentUserId}&select=count`, {
                headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Prefer': 'count=exact' }
            })
        ])
        
        const followersCount = parseInt(followersRes.headers.get('content-range')?.split('/')[1] || '0')
        const followingCount = parseInt(followingRes.headers.get('content-range')?.split('/')[1] || '0')
        setSocialStats({ followers: followersCount, following: followingCount })

        // Fetch Followed Profiles
        const followsRes = await fetch(
            `${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${currentUserId}&select=following_id&apikey=${supabaseAnonKey}`,
            { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } }
        )
        
        if (followsRes.ok) {
            const followData = await followsRes.json();
            const followingIds = followData.map((f: any) => f.following_id);
            
            if (followingIds.length > 0) {
                const profilesRes = await fetch(
                    `${supabaseUrl}/rest/v1/user_settings?user_id=in.(${followingIds.join(',')})&select=display_name,avatar_url,user_id&apikey=${supabaseAnonKey}`,
                    { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } }
                )
                if (profilesRes.ok) {
                    const profilesData = await profilesRes.json();
                    setFollowedUsers(profilesData.map((p: any) => ({
                        name: p.display_name,
                        handle: `@${p.display_name.toLowerCase().replace(/\s/g, '_')}`,
                        avatar: p.avatar_url
                    })));
                }
            } else {
                setFollowedUsers([]);
            }
        }

      } catch (err) {
        console.error('Sidebar fetch failed', err)
      } finally {
        setIsLoading(false)
      }
    }

    fetchData()
  }, [refreshKey])

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--color-sidebar)' }}>
      {/* Search Hub Header */}
      <div className="p-6 pb-2">
          {activeSubTab === 'messages' || activeSubTab === 'friends' ? (
              <div className="flex items-center gap-4 mb-4 animate-in fade-in slide-in-from-left-4 duration-500">
                  <button 
                    onClick={() => onSubTabChange('home')}
                    className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-muted-foreground hover:text-foreground transition-all flex items-center justify-center"
                  >
                    <ArrowLeft size={16} />
                  </button>
                  <div className="flex-1 flex items-center justify-between">
                    <h2 className="text-xl font-black italic uppercase tracking-tighter">{activeSubTab === 'messages' ? 'Chats' : 'Friends'}</h2>
                    <HubTooltip text={activeSubTab === 'messages' ? 'Refresh Chats' : 'Refresh Friends'}>
                        <button 
                            onClick={() => setRefreshKey(prev => prev + 1)}
                            className="p-2 rounded-xl hover:bg-white/5 text-muted-foreground hover:text-primary transition-all active:rotate-180 duration-500"
                        >
                            <RefreshCw size={14} className={isLoading ? "animate-spin" : ""} />
                        </button>
                    </HubTooltip>
                  </div>
              </div>
          ) : (
            <div 
                className="flex items-center justify-between mb-4 group/navheader cursor-pointer select-none" 
                onClick={() => setIsNavCollapsed(!isNavCollapsed)}
            >
                <h2 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-foreground/60">Hub Navigation</h2>
                <div className="p-1 rounded-md hover:bg-white/5 transition-colors">
                    {isNavCollapsed ? (
                    <ChevronUp size={14} className="opacity-40 rotate-180 transition-transform duration-300" />
                    ) : (
                    <ChevronUp size={14} className="opacity-40 transition-transform duration-300" />
                    )}
                </div>
            </div>
          )}
      </div>
      
      {(activeSubTab === 'messages' || activeSubTab === 'friends') ? (
        <div className="flex-1 overflow-y-auto custom-scrollbar px-6 pb-6 pt-2 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-500">
            {!friendsList || friendsList.length === 0 ? (
                <div className="p-8 text-center opacity-20">
                    <Users size={32} className="mx-auto mb-4 p-2" />
                    <p className="text-[10px] font-black uppercase tracking-widest">No Friends</p>
                </div>
            ) : (
                friendsList.map(f => {
                    const isActive = activeSubTab === 'messages' 
                        ? activeChatUserId === f.user_id 
                        : activeProfileUserId === f.user_id;
                    
                    return (
                        <div 
                            key={f.user_id}
                            onClick={() => {
                                if (activeSubTab === 'messages') {
                                    setActiveChatUserId?.(f.user_id);
                                } else {
                                    setActiveProfileUserId?.(f.user_id);
                                }
                            }}
                            className={cn(
                                "p-3 rounded-2xl cursor-pointer transition-all flex items-center gap-3 group/item border",
                                isActive 
                                    ? "bg-primary/10 border-primary/20 shadow-sm" 
                                    : "border-transparent hover:bg-white/5"
                            )}
                        >
                            <div className="relative flex-shrink-0">
                                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/10 text-primary font-black italic text-lg overflow-hidden relative group-hover/item:scale-105 transition-transform">
                                    {f.avatar_url ? (
                                        <img src={f.avatar_url} alt={f.display_name} className="w-full h-full object-cover" />
                                    ) : (
                                        <span>{f.display_name[0]}</span>
                                    )}
                                    {onlineUserIds?.includes(f.user_id) && (
                                        <div className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-green-500 rounded-full border-2 border-black" />
                                    )}
                                </div>
                            </div>
                            <div className="flex-1 min-w-0 text-left">
                                <div className="flex items-center gap-1.5 min-w-0">
                                    <span className={cn(
                                        "text-xs font-black italic uppercase tracking-tighter truncate leading-none",
                                        isActive ? "text-primary" : "text-foreground"
                                    )}>{f.display_name}</span>
                                    <VerifiedBadge role={f.role} className="scale-75 origin-left shrink-0" />
                                </div>
                                <div className="text-[9px] font-bold uppercase tracking-widest truncate opacity-40 mt-0.5">
                                    {activeSubTab === 'messages' 
                                        ? (onlineUserIds?.includes(f.user_id) ? 'Online now' : 'Click to chat')
                                        : (onlineUserIds?.includes(f.user_id) ? 'Online' : 'View Profile')}
                                </div>
                            </div>
                        </div>
                    );
                })
            )}
        </div>
      ) : (
        <div className="px-6 pb-2">
          {!isNavCollapsed && (
            <div className="space-y-1 animate-in fade-in slide-in-from-top-2 duration-300">
                <button 
                    onClick={() => onSubTabChange('home')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all outline-none",
                        activeSubTab === 'home' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                >
                    <Home size={16} strokeWidth={activeSubTab === 'home' ? 3 : 2} />
                    Home
                </button>
                
                <button 
                    onClick={() => onSubTabChange('explore')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all outline-none",
                        activeSubTab === 'explore' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                >
                    <Compass size={16} strokeWidth={activeSubTab === 'explore' ? 3 : 2} />
                    Explore
                </button>

                <button 
                    onClick={() => onSubTabChange('friends')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all outline-none",
                        activeSubTab === 'friends' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                >
                    <Users size={16} strokeWidth={activeSubTab === 'friends' ? 3 : 2} />
                    Friends
                </button>

                <button 
                    onClick={() => onSubTabChange('messages')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all outline-none",
                        activeSubTab === 'messages' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                >
                    <MessageSquare size={16} strokeWidth={activeSubTab === 'messages' ? 3 : 2} />
                    Messages
                </button>

                <button 
                    onClick={() => onSubTabChange('rules')}
                    className={cn(
                        "w-full flex items-center gap-3 px-4 py-2.5 rounded-2xl text-sm font-bold transition-all outline-none",
                        activeSubTab === 'rules' ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                    )}
                >
                    <ShieldCheck size={16} strokeWidth={activeSubTab === 'rules' ? 3 : 2} />
                    Rules
                </button>
            </div>
          )}
        </div>
      )}

      {!isNavCollapsed && activeSubTab !== 'messages' && (
        <>
            <div className="px-3">
                <div className="mx-3 h-px bg-white/5" />
            </div>

            <div className="flex-1 px-4 py-4 space-y-12">
                {/* Followed Users Section */}
                <section className="space-y-4">
                <div 
                    className="flex items-center justify-between px-2 cursor-pointer group/followheader select-none mb-4" 
                    onClick={() => setIsFollowedCollapsed(!isFollowedCollapsed)}
                >
                    <div className="flex items-center gap-2">
                        <Users size={14} className="opacity-40" />
                        <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-40 text-foreground/60">Followed</h3>
                    </div>
                    <div className="p-1 rounded-md hover:bg-white/5 transition-colors">
                    {isFollowedCollapsed ? (
                        <ChevronUp size={14} className="opacity-40 rotate-180 transition-transform duration-300" />
                    ) : (
                        <ChevronUp size={14} className="opacity-40 transition-transform duration-300" />
                    )}
                    </div>
                </div>

                {!isFollowedCollapsed && (
                    <div className="space-y-4 animate-in fade-in slide-in-from-top-2 duration-300">
                        {isLoading ? (
                            <div className="px-2 space-y-4 opacity-20">
                                <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 rounded-full bg-white/10 animate-pulse" />
                                    <div className="h-3 w-20 bg-white/10 rounded animate-pulse" />
                                </div>
                            </div>
                        ) : followedUsers.length > 0 ? (
                            followedUsers.map((user, i) => (
                                <div key={i} className="flex items-center gap-3 group cursor-pointer px-2 transition-all">
                                    {user.avatar ? (
                                        <img src={user.avatar} className="w-10 h-10 rounded-2xl border border-white/5 object-cover flex-shrink-0 shadow-lg" />
                                    ) : (
                                        <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-primary/10 to-purple-500/10 border border-white/5 flex-shrink-0 group-hover:border-primary/40 transition-all flex items-center justify-center text-[10px] font-black text-primary italic shadow-lg">
                                            {user.name[0]}
                                        </div>
                                    )}
                                    <div className="flex-1 min-w-0">
                                    <div className="text-xs font-black truncate group-hover:text-primary transition-colors tracking-tight">{user.name}</div>
                                    <div className="text-[10px] text-muted-foreground/30 truncate font-bold uppercase tracking-tighter">{user.handle}</div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="px-2 text-[10px] font-bold text-muted-foreground/30 italic">Not following anyone yet.</div>
                        )}
                    </div>
                )}
                </section>
            </div>
        </>
      )}

      {/* Minimal Footer */}
      <div className="p-4 space-y-4">
          <HubTooltip text="Invite others" position="top" className="w-full">
            <button className="w-full py-3 rounded-2xl border border-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-primary/10 hover:text-primary hover:border-primary/20 transition-all active:scale-[0.98] italic">
                Share Community
            </button>
          </HubTooltip>
          
          <div className="">
              <ProfileButton onOpenSettings={onOpenSettings} />
          </div>
      </div>
    </div>
  )
}
