import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Zap, 
    MessageSquare, 
    Edit3,
    UserPlus,
    UserMinus,
    Code,
    LayoutGrid,
    X
} from 'lucide-react';
import { VerifiedBadge } from './VerifiedBadge';
import { useAuth } from '../hooks/useAuth';
import { supabase, getSafeSession, supabaseAnonKey } from '../lib/supabase';
import { cn } from '../lib/utils';
import DOMPurify from 'dompurify';
import { marked } from 'marked';
import Editor from '@monaco-editor/react';

interface ProfileViewProps {
    userId: string;
    onClose: () => void;
    onSetActiveChatUserId: (id: string | null) => void;
}

export const ProfileView: React.FC<ProfileViewProps> = ({
    userId,
    onClose,
    onSetActiveChatUserId
}) => {
    const { user: currentUser } = useAuth();
    const currentUserId = currentUser?.id;
    
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isFollowing, setIsFollowing] = useState(false);
    const [followersCount, setFollowersCount] = useState(0);
    const [followingCount, setFollowingCount] = useState(0);
    const [isEditingReadme, setIsEditingReadme] = useState(false);
    const [readmeContent, setReadmeContent] = useState('');
    const [canvasCode, setCanvasCode] = useState('');
    const [isSaving, setIsSaving] = useState(false);
    const [activeTab, setActiveTab] = useState<'overview' | 'posts' | 'prompts'>('overview');
    const [isFullLayout, setIsFullLayout] = useState(false);
    const isOwnProfile = userId === currentUserId;

    useEffect(() => {
        fetchProfileData();
    }, [userId]);

    const hubBridgeScript = `
        window.hub = {
            profileId: "${userId}",
            fetch: (options) => {
                return new Promise((resolve, reject) => {
                    const id = Math.random().toString(36).substring(7);
                    const handler = (event) => {
                        if (event.data.type === 'HUB_RESPONSE' && event.data.id === id) {
                            window.removeEventListener('message', handler);
                            if (event.data.error) reject(event.data.error);
                            else resolve(event.data.data);
                        }
                    };
                    window.addEventListener('message', handler);
                    window.parent.postMessage({ type: 'HUB_FETCH', id, options }, '*');
                });
            }
        };
    `;

    useEffect(() => {
        const handleBridgeMessage = async (event: MessageEvent) => {
            if (event.data?.type === 'HUB_FETCH') {
                const { id, options } = event.data;
                try {
                    const session = await getSafeSession();
                    const token = session?.access_token;
                    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

                    const response = await fetch(`${supabaseUrl}${options.endpoint}`, {
                        method: options.method || 'GET',
                        headers: {
                            'apikey': supabaseAnonKey,
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json',
                            ...options.headers
                        },
                        body: options.body ? JSON.stringify(options.body) : undefined
                    });
                    const data = await response.json();
                    event.source?.postMessage({ type: 'HUB_RESPONSE', id, data }, { targetOrigin: '*' });
                } catch (error: any) {
                    event.source?.postMessage({ type: 'HUB_RESPONSE', id, error: error.message }, { targetOrigin: '*' });
                }
            }
        };

        window.addEventListener('message', handleBridgeMessage);
        return () => window.removeEventListener('message', handleBridgeMessage);
    }, []);

    const fetchProfileData = async () => {
        try {
            setIsLoading(true);
            const session = await getSafeSession();
            const token = session?.access_token;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;

            if (!token) {
                console.warn('[ProfileView] No token found, skipping fetch.');
                setIsLoading(false);
                return;
            }

            const makeRequest = async (currentSafeToken: string) => {
                const [pRes, cRes, fCountRes, fIngRes, fStatRes, pCountRes] = await Promise.all([
                    fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}&select=*`, {
                        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${currentSafeToken}` }
                    }),
                    fetch(`${supabaseUrl}/rest/v1/hub_profile_custom?user_id=eq.${userId}&select=*`, {
                        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${currentSafeToken}` }
                    }),
                    fetch(`${supabaseUrl}/rest/v1/hub_follows?following_id=eq.${userId}&select=follower_id`, {
                        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${currentSafeToken}` }
                    }),
                    fetch(`${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${userId}&select=following_id`, {
                        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${currentSafeToken}` }
                    }),
                    currentUserId ? fetch(`${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${currentUserId}&following_id=eq.${userId}&select=*`, {
                        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${currentSafeToken}` }
                    }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any),
                    fetch(`${supabaseUrl}/rest/v1/hub_posts?user_id=eq.${userId}&select=likes_count,forks_count`, {
                        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${currentSafeToken}` }
                    })
                ]);
                return { pRes, cRes, fCountRes, fIngRes, fStatRes, pCountRes };
            };

            let results = await makeRequest(token);

            // If any critical request failed with 401, try one refresh
            if (results.pRes.status === 401 || results.cRes.status === 401) {
                console.warn('[ProfileView] 401 Detected. Forcing session refresh...');
                const { data: { session: newSession } } = await supabase.auth.refreshSession();
                if (newSession?.access_token) {
                    results = await makeRequest(newSession.access_token);
                }
            }

            const { pRes, cRes, fCountRes, fIngRes, fStatRes, pCountRes } = results;

            // Read all data properly (exactly once)
            const userData = pRes.ok ? (await pRes.json())[0] : null;
            const canvasData = cRes.ok ? (await cRes.json())[0] : null;
            const followers = fCountRes.ok ? await fCountRes.json() : [];
            const following = fIngRes.ok ? await fIngRes.json() : [];
            const followStatus = fStatRes.ok ? await fStatRes.json() : [];
            const postsData = pCountRes.ok ? await pCountRes.json() : [];

            if (!userData) {
                console.error('[ProfileView] Failed to load essential user data');
                setIsLoading(false);
                return;
            }

            // Calculate Aggregates
            const totalPosts = postsData.length;
            const totalLikes = postsData.reduce((sum: number, p: any) => sum + (p.likes_count || 0), 0);
            const totalForks = postsData.reduce((sum: number, p: any) => sum + (p.forks_count || 0), 0);

            // Merge into final profile state
            const mergedProfile = {
                ...userData,
                canvas: canvasData,
                theme: canvasData?.layout_type || 'standard',
                followers,
                following,
                isFollowing: followStatus.length > 0,
                totalPosts,
                totalLikes,
                totalForks
            };

            setProfile(mergedProfile);
            setFollowersCount(followers.length);
            setFollowingCount(following.length);
            setIsFollowing(followStatus.length > 0);
            setReadmeContent(userData.readme || '');
            if (canvasData) setCanvasCode(canvasData.content || '');
            setIsFullLayout(mergedProfile.theme === 'canvas' || mergedProfile.theme === 'full');
            setIsLoading(false);

        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const isPremium = profile?.role === 'premium' || profile?.role === 'admin' || profile?.role === 'vip' || profile?.role === 'owner';
    
    // DEBUG: Remove this in production
    if (profile) console.log(`[ProfileView] Viewer status for @${profile.username}: ${isPremium ? 'PREMIUM (Scripts Enabled)' : 'STANDARD (Scripts Blocked)'} | Role: ${profile.role}`);

    const sanitizeCustomCode = (code: string, forcePremium?: boolean) => {
        if (!code) return '';
        
        // Premium bypass - Ultimate freedom for paying users/admins
        if (isPremium || forcePremium) return code;

        const config = {
            ALLOWED_TAGS: ['div', 'span', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'p', 'br', 'b', 'i', 'strong', 'em', 'video', 'source', 'iframe', 'img', 'canvas', 'a'],
            ALLOWED_ATTR: ['class', 'id', 'src', 'href', 'title', 'alt', 'width', 'height', 'style', 'autoplay', 'loop', 'muted', 'playsinline', 'controls']
        };
        return DOMPurify.sanitize(code, config);
    };

    const handleToggleFollow = async () => {
        if (!currentUserId) return;
        try {
            const session = await getSafeSession();
            const token = session?.access_token;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            if (!token) return;

            if (isFollowing) {
                await fetch(`${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${currentUserId}&following_id=eq.${userId}&apikey=${supabaseAnonKey}`, {
                    method: 'DELETE',
                    headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                });
                setFollowersCount((prev: number) => Math.max(0, prev - 1));
            } else {
                await fetch(`${supabaseUrl}/rest/v1/hub_follows?apikey=${supabaseAnonKey}`, {
                    method: 'POST',
                    headers: { 
                        'apikey': supabaseAnonKey, 
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    },
                    body: JSON.stringify({ follower_id: currentUserId, following_id: userId })
                });
                setFollowersCount((prev: number) => prev + 1);
            }
            setIsFollowing(!isFollowing);
        } catch (error) {
            console.error('Error toggling follow:', error);
        }
    };

    const saveLayout = async () => {
        try {
            setIsSaving(true);
            const session = await getSafeSession();
            const token = session?.access_token;
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
            
            if (!token) return;

            const cleanCanvasCode = sanitizeCustomCode(canvasCode, isPremium);

            // 1. Update Custom Canvas (UPSERT)
            await fetch(`${supabaseUrl}/rest/v1/hub_profile_custom`, {
                method: 'POST',
                headers: { 
                    'apikey': supabaseAnonKey, 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json',
                    'Prefer': 'resolution=merge-duplicates'
                },
                body: JSON.stringify({ 
                    user_id: userId,
                    content: cleanCanvasCode,
                    layout_type: profile.theme || 'standard',
                    updated_at: new Date().toISOString()
                })
            });

            // 2. Update User Settings (Bio & Banner)
            await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}`, {
                method: 'PATCH',
                headers: { 
                    'apikey': supabaseAnonKey, 
                    'Authorization': `Bearer ${token}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ 
                    readme: readmeContent,
                    profile_banner_url: profile?.profile_banner_url
                })
            });
            
            setProfile({ ...profile, readme: readmeContent });
            setIsEditingReadme(false);
        } catch (error) {
            console.error('Error saving profile layout:', error);
        } finally {
            setIsSaving(false);
        }
    };

    const blobUrl = React.useMemo(() => {
        const fullContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="referrer" content="no-referrer">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <script>
                    ${hubBridgeScript}
                </script>
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@100;300;400;700;900&display=swap" rel="stylesheet">
                <style>
                    body { 
                        margin: 0; padding: 0; min-height: 100vh;
                        font-family: 'Outfit', sans-serif;
                        background: #000;
                        position: relative; overflow-x: hidden;
                    }
                    video { 
                        position: fixed; top: 0; left: 0;
                        width: 100%; height: 100%; object-fit: cover;
                        z-index: -10; 
                    }
                </style>
                <script>
                    window.addEventListener('load', () => {
                        const v = document.querySelector('video');
                        if (v) {
                            v.oncanplay = () => v.play().catch(console.error);
                            if (v.readyState >= 3) v.play().catch(console.error);
                        }
                    });
                </script>
            </head>
            <body>
                ${sanitizeCustomCode(canvasCode, isPremium)}
            </body>
            </html>
        `;
        const blob = new Blob([fullContent], { type: 'text/html' });
        return URL.createObjectURL(blob);
    }, [canvasCode]);

    const renderCanvasIFrame = () => {
        if (isLoading || !profile) return null;

        return (
            <iframe 
                key={isPremium ? 'premium-canvas' : 'standard-canvas'}
                src={blobUrl}
                title="Profile Canvas"
                className="w-full h-screen border-none overflow-hidden bg-black"
                sandbox={cn(
                    "allow-popups allow-forms allow-modals allow-same-origin",
                    isPremium && "allow-scripts"
                )}
                allow="autoplay; encrypted-media; fullscreen"
            />
        );
    };

    const renderMarkdown = (content: string) => {
        try {
            // Configure marked for better GFM support
            marked.setOptions({
                gfm: true,
                breaks: true,
            });

            const rawHtml = marked.parse(content) as string;
            const standardConfig = {
                ALLOWED_TAGS: [
                    'p', 'br', 'b', 'i', 'em', 'strong', 'a', 'ul', 'ol', 'li', 'code', 'pre', 'blockquote', 
                    'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'img', 'hr', 'table', 'thead', 'tbody', 'tr', 'th', 'td',
                    'video', 'source', 'iframe', 'div', 'span', 'canvas'
                ],
                ALLOWED_ATTR: ['href', 'src', 'alt', 'title', 'class', 'target', 'width', 'height', 'autoplay', 'loop', 'muted', 'playsinline', 'controls', 'frameborder', 'allow', 'style']
            };

            const cleanHtml = DOMPurify.sanitize(rawHtml, standardConfig);
            return <div className="profile-canvas-render prose prose-invert max-w-none font-['Outfit']" dangerouslySetInnerHTML={{ __html: cleanHtml }} />;
        } catch (err) {
            console.error('Markdown parse error:', err);
            return <div className="text-red-400/50 text-xs italic">Error rendering markdown</div>;
        }
    };

    if (isLoading) {
        return (
            <div className="h-full flex items-center justify-center bg-background/50 backdrop-blur-xl">
                <div className="w-12 h-12 border-4 border-primary/20 border-t-primary rounded-full animate-spin" />
            </div>
        );
    }

    return (
        <div className={cn(
            "h-full flex flex-col overflow-hidden font-['Outfit'] relative",
            isFullLayout ? "bg-transparent" : (!profile?.profile_banner_url ? "bg-background/95 backdrop-blur-3xl" : "bg-[#0a0a0a]")
        )}>
            {/* Steam-Style Wallpaper Engine - Only in Standard view */}
            {profile?.profile_banner_url && !isFullLayout && (
                <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                    {profile.profile_banner_url.match(/\.(mp4|webm|ogg)$/) ? (
                        <video 
                            src={profile.profile_banner_url}
                            autoPlay
                            loop
                            muted
                            playsInline
                            className="w-full h-full object-cover opacity-100"
                            onCanPlay={(e) => (e.target as HTMLVideoElement).play()}
                        />
                    ) : (
                        <img 
                            src={profile.profile_banner_url}
                            className="w-full h-full object-cover opacity-100"
                            alt="Background"
                        />
                    )}
                    {/* Minimal Darkening for contrast - Stronger for readability */}
                    <div className="absolute inset-0 bg-black/50" />
                </div>
            )}

            <div className={cn(
                "absolute top-0 left-0 right-0 z-50 flex items-center justify-between p-4 transition-all",
                isFullLayout ? "opacity-0 hover:opacity-100 bg-gradient-to-b from-black/80 to-transparent" : "bg-transparent"
            )}>
                <button 
                    onClick={onClose}
                    className="p-3 rounded-2xl bg-black/50 hover:bg-black/80 text-white backdrop-blur-xl transition-all border border-white/10 hover:border-primary/50 group shadow-2xl"
                >
                    <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
                </button>
                
                {isOwnProfile && (
                    <div className="flex p-1 bg-black/40 border border-white/10 rounded-xl gap-1">
                        <button 
                            onClick={() => setIsFullLayout(false)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                !isFullLayout ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-white/30 hover:text-white/60"
                            )}
                        >
                            Standard
                        </button>
                        <button 
                            onClick={() => setIsFullLayout(true)}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                isFullLayout ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-white/30 hover:text-white/60"
                            )}
                        >
                            Canvas
                        </button>
                    </div>
                )}

                {isOwnProfile && (
                    <button 
                        onClick={() => setIsEditingReadme(true)}
                        className={cn(
                            "px-5 py-2.5 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] flex items-center gap-2 transition-all shadow-2xl",
                            isFullLayout 
                                ? "bg-black/50 hover:bg-blue-600 text-white border border-white/10 hover:border-blue-600/50 backdrop-blur-xl" 
                                : "bg-blue-600 text-white hover:scale-105 active:scale-95 shadow-blue-600/20"
                        )}
                    >
                        <Code className="w-4 h-4" />
                        {isFullLayout ? "Modify Canvas" : "Edit Design"}
                    </button>
                )}
            </div>

            <div className="flex-1 overflow-y-auto overflow-x-hidden relative z-10">
                <div className={cn("transition-all duration-500 min-h-full", isFullLayout ? "w-full" : "max-w-[1400px] mx-auto p-6 md:p-12")}>
                    
                    {isFullLayout ? (
                        <div className="relative group/readme min-h-screen">
                            {isEditingReadme ? (
                                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-3xl p-6 md:p-12">
                                    <div className="max-w-7xl mx-auto h-full flex flex-col gap-6">
                                        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
                                            <div className="space-y-1">
                                                <h3 className="text-3xl font-black uppercase tracking-tighter text-white">Profile <span className="text-primary italic">Designer</span></h3>
                                                <div className="flex p-1.5 bg-black/40 border border-white/10 rounded-2xl w-fit gap-1 mt-2">
                                                    <button 
                                                        onClick={() => setIsFullLayout(false)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            !isFullLayout ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-400/20" : "text-white/30 hover:text-white/60 hover:bg-white/5"
                                                        )}
                                                    >
                                                        Standard
                                                    </button>
                                                    <button 
                                                        onClick={() => setIsFullLayout(true)}
                                                        className={cn(
                                                            "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                            isFullLayout ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-400/20" : "text-white/30 hover:text-white/60 hover:bg-white/5"
                                                        )}
                                                    >
                                                        Custom Canvas
                                                    </button>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <button onClick={() => setIsEditingReadme(false)} className="px-6 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase tracking-widest text-white/40">Cancel</button>
                                                <button onClick={saveLayout} disabled={isSaving} className="px-10 py-3 rounded-2xl bg-blue-600 text-white text-[10px] font-black uppercase tracking-widest shadow-xl shadow-blue-600/30 hover:scale-105 active:scale-95 transition-all">
                                                    {isSaving ? "Saving..." : "Apply & Save"}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="flex-1 rounded-[40px] border border-white/10 bg-black/60 backdrop-blur-md p-1 shadow-2xl overflow-hidden relative min-h-0">
                                            <Editor
                                                height="100%"
                                                defaultLanguage={isFullLayout ? "html" : "markdown"}
                                                value={isFullLayout ? canvasCode : readmeContent}
                                                theme="vs-dark"
                                                onChange={(value) => isFullLayout ? setCanvasCode(value || '') : setReadmeContent(value || '')}
                                                options={{
                                                    minimap: { enabled: false },
                                                    fontSize: 14,
                                                    lineNumbers: 'on',
                                                    roundedSelection: true,
                                                    scrollBeyondLastLine: false,
                                                    padding: { top: 40, left: 40 },
                                                    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                    cursorStyle: 'block',
                                                    wordWrap: 'on',
                                                    scrollbar: {
                                                        vertical: 'auto',
                                                        horizontal: 'hidden'
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in fade-in duration-1000 w-full h-full min-h-screen bg-transparent relative">
                                    {renderCanvasIFrame()}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-8 pt-10">
                            {/* Compact Profile Identity */}
                            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end px-4">
                                <div className="relative group">
                                    <div className="absolute -inset-1 bg-gradient-to-tr from-blue-600 to-purple-600 rounded-3xl blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
                                    <img 
                                        src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`} 
                                        className="relative w-20 h-20 md:w-32 md:h-32 rounded-3xl object-cover border border-white/20 shadow-xl"
                                        alt={profile?.display_name}
                                    />
                                </div>
                                <div className="flex-1 space-y-3">
                                    <div className="space-y-1">
                                        <h1 className="text-3xl md:text-5xl font-black italic tracking-tighter text-white uppercase leading-none drop-shadow-xl">
                                            {profile?.display_name || 'Anonymous User'}
                                        </h1>
                                        <div className="flex items-center gap-3">
                                            <p className="text-[10px] md:text-xs font-black uppercase tracking-[0.4em] text-white/40">
                                                @{profile?.username || 'user'}
                                            </p>
                                            <VerifiedBadge role={profile?.role} />
                                        </div>
                                    </div>
                                    
                                    <div className="flex flex-wrap gap-3">
                                        <div className="flex gap-4 p-2.5 bg-black/40 border border-white/10 rounded-xl backdrop-blur-md">
                                            <div className="flex items-center gap-2 px-2 border-r border-white/10">
                                                <span className="text-xs font-black text-white">{followersCount}</span>
                                                <span className="text-[8px] uppercase font-black tracking-widest text-white/20">Followers</span>
                                            </div>
                                            <div className="flex items-center gap-2 px-2">
                                                <span className="text-xs font-black text-white">{followingCount}</span>
                                                <span className="text-[8px] uppercase font-black tracking-widest text-white/20">Following</span>
                                            </div>
                                        </div>

                                        {!isOwnProfile && (
                                            <button 
                                                onClick={handleToggleFollow}
                                                className={cn(
                                                    "px-6 py-2.5 rounded-xl font-black uppercase text-[10px] tracking-widest transition-all shadow-xl flex items-center gap-2",
                                                    isFollowing 
                                                        ? "bg-white/5 text-white border border-white/10 hover:text-red-500 hover:border-red-500/20" 
                                                        : "bg-blue-600 text-white shadow-blue-600/20 hover:scale-105"
                                                )}
                                            >
                                                {isFollowing ? <UserMinus size={14} /> : <UserPlus size={14} />}
                                                {isFollowing ? "Unfollow" : "Follow"}
                                            </button>
                                        )}
                                        <button 
                                            onClick={() => onSetActiveChatUserId(userId)}
                                            className="px-6 py-2.5 rounded-xl bg-black/40 text-white border border-white/10 font-black uppercase text-[10px] tracking-widest hover:bg-white/10 transition-all shadow-xl flex items-center gap-2"
                                        >
                                            <MessageSquare size={14} />
                                            Message
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Dashboard Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 px-2">
                                {/* Side Column: Navigation & Stats */}
                                <div className="lg:col-span-3 space-y-6">
                                    <div className="rounded-[40px] border border-white/10 bg-black/60 backdrop-blur-xl p-6 shadow-2xl">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 mb-6 pl-4">Directory</p>
                                        <div className="space-y-1">
                                            {[
                                                { id: 'overview', icon: LayoutGrid, label: 'Overview' },
                                                { id: 'posts', icon: MessageSquare, label: 'Posts' },
                                                { id: 'prompts', icon: Code, label: 'Prompts' }
                                            ].map((item) => (
                                                <button 
                                                    key={item.id}
                                                    onClick={() => setActiveTab(item.id as any)}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 px-6 py-4 rounded-2xl transition-all duration-300",
                                                        activeTab === item.id 
                                                            ? "bg-blue-600 text-white shadow-lg shadow-blue-600/30 translate-x-1" 
                                                            : "text-white/40 hover:text-white hover:bg-white/5"
                                                    )}
                                                >
                                                    <item.icon className={cn("w-4 h-4", activeTab === item.id ? "text-white" : "text-white/20")} />
                                                    <span className="text-[10px] font-black uppercase tracking-widest">{item.label}</span>
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="rounded-[40px] border border-white/10 bg-black/60 backdrop-blur-xl p-8 shadow-2xl transition-all hover:border-white/20">
                                        <div className="flex items-center justify-between mb-8">
                                            <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/30">Social Activity</p>
                                            <Zap className="w-3 h-3 text-yellow-400 group-hover:scale-125 transition-transform" />
                                        </div>
                                        <div className="space-y-6">
                                            {[
                                                { label: 'Beiträge', value: profile?.totalPosts || 0 },
                                                { label: 'Community Likes', value: profile?.totalLikes || 0 },
                                                { label: 'Forks', value: profile?.totalForks || 0 }
                                            ].map((stat) => (
                                                <div key={stat.label} className="flex justify-between items-end group/stat">
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-white/20 italic group-hover/stat:text-white/40 transition-colors">{stat.label}</span>
                                                    <span className="text-2xl font-black text-white/90 font-mono tracking-tighter drop-shadow-md group-hover/stat:text-blue-400 transition-colors">
                                                        {typeof stat.value === 'number' && stat.value > 999 ? (stat.value / 1000).toFixed(1) + 'k' : stat.value}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </div>

                                {/* Main Column: Biography / Tab Content */}
                                <div className="lg:col-span-9">
                                    <div className="p-10 md:p-14 rounded-[50px] bg-black/60 border border-white/10 backdrop-blur-3xl shadow-2xl relative overflow-hidden min-h-[600px]">
                                        <div className="absolute top-0 right-0 p-12 pointer-events-none">
                                            <Zap size={120} className="text-white/[0.03] rotate-12" />
                                        </div>

                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-12">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-12 h-1.5 bg-blue-600 rounded-full" />
                                                    <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/40 italic">User Biography</h2>
                                                </div>
                                                
                                                {isOwnProfile && !isEditingReadme && (
                                                    <button 
                                                        onClick={() => setIsEditingReadme(true)}
                                                        className="px-8 py-3 rounded-2xl bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20 shadow-xl"
                                                    >
                                                        <Edit3 size={14} className="mr-2 inline-block" />
                                                        Modify Bio
                                                    </button>
                                                )}
                                            </div>

                                            <div className="prose prose-invert max-w-none">
                                                {isEditingReadme ? (
                                                        <div className="space-y-6">
                                                            <div className="space-y-3">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/30 pl-4">Custom Wallpaper URL (GIF/MP4 supported)</p>
                                                                <input 
                                                                    type="text"
                                                                    value={profile?.profile_banner_url || ''}
                                                                    onChange={(e) => setProfile({ ...profile, profile_banner_url: e.target.value })}
                                                                    placeholder="Paste GIF or Video Link here..."
                                                                    className="w-full px-8 py-5 rounded-3xl bg-black/60 border border-white/10 text-xs font-bold text-white focus:border-blue-500/50 transition-all outline-none shadow-inner"
                                                                />
                                                            </div>
                                                            <div className="w-full h-[500px] rounded-[40px] overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
                                                                <Editor
                                                                    height="100%"
                                                                    defaultLanguage={isFullLayout ? "html" : "markdown"}
                                                                    value={isFullLayout ? canvasCode : readmeContent}
                                                                    theme="vs-dark"
                                                                    onChange={(val) => isFullLayout ? setCanvasCode(val || '') : setReadmeContent(val || '')}
                                                                    options={{
                                                                        minimap: { enabled: false },
                                                                        fontSize: 14,
                                                                        wordWrap: 'on',
                                                                        padding: { top: 20, left: 20 },
                                                                        fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                                        lineNumbers: 'on',
                                                                        cursorStyle: 'block',
                                                                        scrollbar: {
                                                                            vertical: 'hidden',
                                                                            horizontal: 'hidden'
                                                                        }
                                                                    }}
                                                                />
                                                            </div>
                                                            <div className="flex justify-end gap-3">
                                                                <button 
                                                                    onClick={() => setIsEditingReadme(false)} 
                                                                    className="px-10 py-4 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-white/40 transition-all"
                                                                >
                                                                    Discard
                                                                </button>
                                                                <button 
                                                                    onClick={saveLayout} 
                                                                    disabled={isSaving} 
                                                                    className="px-12 py-4 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/40 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                                                                >
                                                                    {isSaving ? "Syncing..." : "Save Profile"}
                                                                </button>
                                                            </div>
                                                        </div>
                                                ) : (
                                                    <div className="animate-in fade-in duration-1000">
                                                        {readmeContent ? (
                                                            renderMarkdown(readmeContent)
                                                        ) : (
                                                            <div className="flex flex-col items-center justify-center py-32 opacity-10">
                                                                <div className="w-20 h-20 rounded-full border-2 border-dashed border-white mb-6 animate-pulse" />
                                                                <p className="font-black uppercase tracking-widest text-xs">Awaiting transmission...</p>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default ProfileView;
