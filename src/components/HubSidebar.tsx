import { MessageSquare, Users, Home, Compass, ShieldCheck } from 'lucide-react'
import { useState, useEffect } from 'react'
import { cn } from '../lib/utils'
import { ProfileButton } from './ProfileButton'
import { getSafeSession } from '../lib/supabase'
import { HubTooltip } from './HubTooltip'

interface HubSidebarProps {
  onOpenSettings: () => void
  activeSubTab: 'home' | 'explore' | 'rules' | 'friends' | 'messages'
  onSubTabChange: (tab: 'home' | 'explore' | 'rules' | 'friends' | 'messages') => void
}

export function HubSidebar({ onOpenSettings, activeSubTab, onSubTabChange }: HubSidebarProps) {
  const [followedUsers, setFollowedUsers] = useState<{ name: string, handle: string, avatar?: string }[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
  }, [])

  return (
    <div className="flex flex-col h-full overflow-y-auto custom-scrollbar" style={{ backgroundColor: 'var(--color-sidebar)' }}>
      {/* Search Hub Header */}
      <div className="p-6 pb-2">
          <h2 className="text-sm font-black uppercase tracking-[0.3em] opacity-40 mb-4 text-foreground/60">Hub Navigation</h2>
          
          <div className="space-y-1">
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
      </div>

      <div className="px-3 py-4">
        <div className="mx-3 h-px bg-white/5 mb-6" />
      </div>

      <div className="flex-1 px-4 py-6 space-y-12">
        {/* Followed Users Section */}
        <section className="space-y-4">
          <div className="flex items-center gap-2 px-2 text-muted-foreground/60">
            <Users size={14} strokeWidth={3} />
            <h3 className="text-[10px] font-black uppercase tracking-widest leading-none">Followed</h3>
          </div>

          <div className="space-y-4">
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
        </section>
      </div>

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
