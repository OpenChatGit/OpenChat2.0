import React, { useState, useEffect } from 'react';
import { 
    ArrowLeft, 
    Zap, 
    MessageSquare, 
    Edit3,
    UserPlus,
    UserMinus,
    Code
} from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import { getSafeSession, supabaseAnonKey } from '../lib/supabase';
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

    const isOwnProfile = userId === currentUserId;
    const isFullLayout = profile?.theme === 'canvas';

    useEffect(() => {
        fetchProfileData();
    }, [userId]);

    const hubBridgeScript = `
        window.hub = {
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
                    const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

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
                const [pRes, cRes, fCountRes, fIngRes, fStatRes] = await Promise.all([
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
                    }) : Promise.resolve({ ok: true, json: () => Promise.resolve([]) } as any)
                ]);
                return { pRes, cRes, fCountRes, fIngRes, fStatRes };
            };

            let results = await makeRequest(token);

            // If any critical request failed with 401, try one refresh
            if (results.pRes.status === 401 || results.cRes.status === 401) {
                console.warn('[ProfileView] 401 Detected. Forcing session refresh...');
                const { data: { session: newSession } } = await import('../lib/supabase').then(m => m.supabase.auth.refreshSession());
                if (newSession?.access_token) {
                    results = await makeRequest(newSession.access_token);
                }
            }

            const { pRes, cRes, fCountRes, fIngRes, fStatRes } = results;

            let mergedProfile = null;

            if (pRes.ok) {
                const profiles = await pRes.json();
                if (profiles[0]) {
                    mergedProfile = { ...profiles[0] };
                    setReadmeContent(profiles[0].readme || '');
                }
            }

            if (cRes.ok) {
                const canvasData = await cRes.json();
                if (canvasData[0]) {
                    setCanvasCode(canvasData[0].content || '');
                    if (mergedProfile) {
                        mergedProfile.theme = canvasData[0].layout_type;
                    }
                }
            }

            if (mergedProfile) {
                setProfile(mergedProfile);
            }

            if (fCountRes.ok) {
                const data = await fCountRes.json();
                setFollowersCount(data.length);
            }
            if (fIngRes.ok) {
                const data = await fIngRes.json();
                setFollowingCount(data.length);
            }
            if (fStatRes.ok) {
                const data = await fStatRes.json();
                setIsFollowing(data.length > 0);
            }

        } catch (error) {
            console.error('Error fetching profile:', error);
        } finally {
            setIsLoading(false);
        }
    };

    const sanitizeCustomCode = (code: string) => {
        // PREVENTION: "Glassworm" Unicode / Bidi Attack detection
        // These characters (RTL Override, etc.) can be used to hide malicious logic
        const bidiChars = /[\u202A-\u202E\u2066-\u2069]/g;
        if (bidiChars.test(code)) {
            console.warn('[Security] Detected suspicious Unicode Bidi characters. Neutralizing...');
            return code.replace(bidiChars, '');
        }
        return code;
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

            const cleanCanvasCode = sanitizeCustomCode(canvasCode);

            await fetch(`${supabaseUrl}/rest/v1/hub_profile_custom?apikey=${supabaseAnonKey}`, {
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

            await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}&apikey=${supabaseAnonKey}`, {
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

    const renderCanvasIFrame = (content: string) => {
        const safeContent = sanitizeCustomCode(content);
        const fullContent = `
            <!DOCTYPE html>
            <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <meta http-equiv="Content-Security-Policy" content="default-src 'self' https: 'unsafe-inline' 'unsafe-eval' data:; img-src 'self' https: data:;">
                <script src="https://cdn.tailwindcss.com"></script>
                <link href="https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;600;900&display=swap" rel="stylesheet">
                <script>${hubBridgeScript}</script>
                <style>
                    body { 
                        margin: 0; 
                        padding: 0; 
                        background: transparent; 
                        min-height: 100vh;
                        font-family: 'Outfit', sans-serif;
                    }
                    ::-webkit-scrollbar { width: 8px; }
                    ::-webkit-scrollbar-track { background: transparent; }
                    ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 10px; }
                    ::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.2); }
                </style>
            </head>
            <body>
                ${safeContent}
            </body>
            </html>
        `;

        return (
            <iframe 
                srcDoc={fullContent}
                title="Profile Canvas"
                className="w-full h-screen border-none overflow-auto"
                sandbox="allow-scripts allow-popups allow-forms"
            />
        );
    };

    const renderMarkdown = (content: string) => {
        try {
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
            !profile?.profile_banner_url ? "bg-background/95 backdrop-blur-3xl" : "bg-[#0a0a0a]"
        )}>
            {/* Steam-Style Wallpaper Engine */}
            {profile?.profile_banner_url && (
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
                    {/* Minimal Darkening for contrast - NO BLUR */}
                    <div className="absolute inset-0 bg-black/30" />
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
                            onClick={() => {
                                setProfile({ ...profile, theme: 'standard' });
                            }}
                            className={cn(
                                "px-3 py-1.5 rounded-lg text-[8px] font-black uppercase tracking-widest transition-all",
                                !isFullLayout ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20" : "text-white/30 hover:text-white/60"
                            )}
                        >
                            Standard
                        </button>
                        <button 
                            onClick={() => {
                                setProfile({ ...profile, theme: 'canvas' });
                            }}
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
                                <div className="p-8 max-w-5xl mx-auto pt-24">
                                    <div className="flex items-center justify-between mb-4">
                                        <div className="flex flex-col gap-1">
                                            <h3 className="text-2xl font-black uppercase tracking-tighter text-white">Profile <span className="text-primary italic">Designer</span></h3>
                                            <div className="flex p-1.5 bg-black/40 border border-white/10 rounded-2xl w-fit gap-1 mt-2">
                                                <button 
                                                    onClick={() => setProfile({ ...profile, theme: 'standard' })}
                                                    className={cn(
                                                        "px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                                        !isFullLayout ? "bg-blue-600 text-white shadow-lg shadow-blue-600/20 border border-blue-400/20" : "text-white/30 hover:text-white/60 hover:bg-white/5"
                                                    )}
                                                >
                                                    Standard
                                                </button>
                                                <button 
                                                    onClick={() => setProfile({ ...profile, theme: 'canvas' })}
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
                                            <button onClick={() => setIsEditingReadme(false)} className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-[10px] font-black uppercase">Cancel</button>
                                            <button onClick={saveLayout} disabled={isSaving} className="px-6 py-2 rounded-xl bg-blue-600 text-white text-[10px] font-black uppercase disabled:opacity-50 shadow-lg shadow-blue-600/20 border border-blue-400/20">
                                                {isSaving ? "Saving..." : (isFullLayout ? "Apply & Save" : "Save Changes")}
                                            </button>
                                        </div>
                                    </div>
                                    <div className="w-full h-[70vh] rounded-2xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
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
                                                padding: { top: 20 },
                                                fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
                                                cursorStyle: 'block',
                                                wordWrap: 'on',
                                                scrollbar: {
                                                    vertical: 'hidden',
                                                    horizontal: 'hidden'
                                                }
                                            }}
                                        />
                                    </div>
                                </div>
                            ) : (
                                <div className="animate-in fade-in duration-1000 w-full h-full min-h-screen bg-black">
                                    {renderCanvasIFrame(canvasCode || '')}
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12 pt-12">
                            {/* Profile Identity Hero */}
                            <div className="flex flex-col lg:flex-row items-start gap-12">
                                <div className="relative group/avatar">
                                    <div className="w-48 h-48 rounded-[40px] overflow-hidden bg-white/5 border border-white/10 shadow-2xl relative z-10 transition-transform duration-500 group-hover/avatar:scale-105">
                                        <img 
                                            src={profile?.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${userId}`}
                                            className="w-full h-full object-cover"
                                            alt={profile?.display_name}
                                        />
                                    </div>
                                    <div className="absolute inset-x-0 bottom-0 h-1/2 bg-gradient-to-t from-blue-600/20 to-transparent blur-2xl opacity-0 group-hover/avatar:opacity-100 transition-opacity duration-700" />
                                </div>

                                <div className="flex-1 space-y-6">
                                    <div className="space-y-2">
                                        <div className="flex items-center gap-4">
                                            <h1 className="text-6xl font-black italic uppercase tracking-tighter text-white leading-none">
                                                {profile?.display_name || 'Anonymous User'}
                                            </h1>
                                            {isFollowing && (
                                                <div className="px-3 py-1 rounded-lg bg-blue-500/10 border border-blue-500/20 text-[10px] font-black text-blue-400 uppercase tracking-widest animate-pulse">
                                                    Following
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex items-center gap-3 text-white/30 text-sm font-black uppercase tracking-[0.3em] pl-1">
                                            <span>@{profile?.username || 'user'}</span>
                                            <span className="w-1 h-1 rounded-full bg-white/10" />
                                            <span className="text-blue-400/60">Hub Pioneer</span>
                                        </div>
                                    </div>

                                    <div className="flex flex-wrap gap-4">
                                        <div className="flex gap-4 p-1.5 bg-white/5 border border-white/5 rounded-2xl backdrop-blur-3xl">
                                            <div className="px-6 py-3 text-center border-r border-white/5">
                                                <p className="text-2xl font-black text-white">{followersCount}</p>
                                                <p className="text-[9px] uppercase font-black tracking-widest text-white/20 mt-1">Followers</p>
                                            </div>
                                            <div className="px-6 py-3 text-center">
                                                <p className="text-2xl font-black text-white">{followingCount}</p>
                                                <p className="text-[9px] uppercase font-black tracking-widest text-white/20 mt-1">Following</p>
                                            </div>
                                        </div>

                                        <div className="flex gap-3">
                                            {!isOwnProfile && (
                                                <button 
                                                    onClick={handleToggleFollow}
                                                    className={cn(
                                                        "px-8 py-4 rounded-2xl font-black uppercase text-xs tracking-widest transition-all shadow-2xl flex items-center gap-3",
                                                        isFollowing 
                                                            ? "bg-white/5 text-white border border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20" 
                                                            : "bg-blue-600 text-white shadow-blue-600/20 hover:scale-[1.02] active:scale-[0.98]"
                                                    )}
                                                >
                                                    {isFollowing ? <UserMinus size={16} /> : <UserPlus size={16} />}
                                                    {isFollowing ? "Unfollow" : "Follow"}
                                                </button>
                                            )}
                                            <button 
                                                onClick={() => onSetActiveChatUserId(userId)}
                                                className="px-8 py-4 rounded-2xl bg-white/5 text-white border border-white/10 font-black uppercase text-xs tracking-widest hover:bg-white/10 transition-all shadow-2xl flex items-center gap-3"
                                            >
                                                <MessageSquare size={16} />
                                                Send Message
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Dashboard Content Grid */}
                            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
                                {/* Side Column: Navigation & Info */}
                                <div className="lg:col-span-3 space-y-10">
                                    <div className="space-y-4">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20 pl-4">Directory</p>
                                        <div className="space-y-1.5">
                                            {['overview', 'posts', 'prompts'].map((tab) => (
                                                <button 
                                                    key={tab}
                                                    onClick={() => setActiveTab(tab as any)}
                                                    className={cn(
                                                        "w-full flex items-center gap-4 px-6 py-4 rounded-3xl text-xs font-black uppercase tracking-widest transition-all",
                                                        activeTab === tab 
                                                            ? "bg-blue-600 text-white shadow-xl shadow-blue-600/20" 
                                                            : "text-white/40 hover:bg-white/5 hover:text-white/60"
                                                    )}
                                                >
                                                    <div className={cn("w-1.5 h-1.5 rounded-full", activeTab === tab ? "bg-white" : "bg-white/10")} />
                                                    {tab}
                                                </button>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="p-8 rounded-[40px] bg-white/5 border border-white/5 backdrop-blur-md space-y-6">
                                        <p className="text-[10px] font-black uppercase tracking-[0.4em] text-white/20">Discovery Stats</p>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-white/40">Total Reach</span>
                                                <span className="text-sm font-black text-white italic">2.4k</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-white/40">Forks</span>
                                                <span className="text-sm font-black text-white italic">128</span>
                                            </div>
                                            <div className="flex items-center justify-between">
                                                <span className="text-[11px] font-bold text-white/40">Likes</span>
                                                <span className="text-sm font-black text-white italic">892</span>
                                            </div>
                                        </div>
                                    </div>
                                </div>

                                {/* Main Column: Biography / Feed */}
                                <div className="lg:col-span-9">
                                    <div className="p-10 md:p-14 rounded-[50px] bg-white/[0.03] border border-white/5 backdrop-blur-3xl shadow-2xl relative overflow-hidden min-h-[600px]">
                                        <div className="absolute top-0 right-0 p-12">
                                            <Zap size={64} className="text-white/[0.02] rotate-12" />
                                        </div>

                                        <div className="relative">
                                            <div className="flex items-center justify-between mb-12">
                                                <div className="flex items-center gap-4">
                                                    <div className="w-10 h-1 bg-blue-600 rounded-full" />
                                                    <h2 className="text-[11px] font-black uppercase tracking-[0.5em] text-white/30 italic">User Biography</h2>
                                                </div>
                                                
                                                {isOwnProfile && !isEditingReadme && (
                                                    <button 
                                                        onClick={() => setIsEditingReadme(true)}
                                                        className="px-6 py-2.5 rounded-xl bg-blue-600/10 text-blue-400 text-[10px] font-black uppercase tracking-widest hover:bg-blue-600 hover:text-white transition-all border border-blue-600/20"
                                                    >
                                                        <Edit3 size={14} className="mr-2 inline-block" />
                                                        Modify
                                                    </button>
                                                )}
                                            </div>

                                            <div className="prose prose-invert max-w-none">
                                                {isEditingReadme ? (
                                                        <div className="space-y-4">
                                                            <div className="space-y-2">
                                                                <p className="text-[10px] font-black uppercase tracking-widest text-white/20 pl-4">Custom Wallpaper URL (GIF/MP4 supported)</p>
                                                                <input 
                                                                    type="text"
                                                                    value={profile?.profile_banner_url || ''}
                                                                    onChange={(e) => setProfile({ ...profile, profile_banner_url: e.target.value })}
                                                                    placeholder="Paste GIF or Video Link here..."
                                                                    className="w-full px-6 py-4 rounded-2xl bg-black/40 border border-white/10 text-xs font-bold text-white focus:border-blue-500/50 transition-all outline-none"
                                                                />
                                                            </div>

                                                            <div className="w-full h-[500px] rounded-3xl overflow-hidden border border-white/10 bg-black/40 backdrop-blur-md shadow-2xl">
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
                                                                    className="px-8 py-3 rounded-2xl bg-white/5 hover:bg-white/10 text-xs font-black uppercase tracking-widest text-white/40 transition-all"
                                                                >
                                                                    Discard
                                                                </button>
                                                                <button 
                                                                    onClick={saveLayout} 
                                                                    disabled={isSaving} 
                                                                    className="px-10 py-3 rounded-2xl bg-blue-600 text-white text-xs font-black uppercase tracking-widest shadow-xl shadow-blue-600/40 disabled:opacity-50 transition-all hover:scale-105 active:scale-95"
                                                                >
                                                                    {isSaving ? "Syncing..." : "Save Biography"}
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
