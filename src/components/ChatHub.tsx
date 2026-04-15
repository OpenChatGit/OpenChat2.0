import { MessageSquare, MessageCircle, Play, Code, Copy, Trash2, ShieldCheck, Home as HomeIcon, Terminal, Flame, Compass, RefreshCw, MoreHorizontal, Flag, ChevronUp, Check, Maximize2, Users, Eye, ArrowUp, Heart, Zap, Share, ShieldAlert } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { cn } from '../lib/utils'
import { VerifiedBadge, type UserRole } from './VerifiedBadge'
import { HubModal } from './HubModal'
import { useAuth } from '../hooks/useAuth'
import { supabase, getSafeSession } from '../lib/supabase'
import { HubTooltip } from './HubTooltip'
import { StackBadges } from './StackBadges'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { ChatInput } from './ChatInput'
import ProfileView from './ProfileView'

interface HubCardProps {
  id: string
  user: {
    id: string
    name: string
    avatar: string
    role: UserRole
    stack?: string[]
  }
  content: {
    prompt: string
    response_preview: string
  }
  timestamp: string
  stats: {
    likes: number
    forks: number
    replies: number
  }
  isLiked?: boolean
  isForked?: boolean
  isFollowing?: boolean
  isFriend?: 'none' | 'sent_pending' | 'received_pending' | 'accepted'
  isModerator?: boolean
  currentUserId?: string
  onRun?: (prompt: string) => void
  onDelete?: (id: string) => void
  onLike?: (id: string, currentlyLiked: boolean) => void
  onFork?: (id: string, currentlyForked: boolean) => void
  onReport?: (id: string, authorId: string) => void
  onFollow?: (targetId: string, currentlyFollowing: boolean) => void
  onFriendRequest?: (targetId: string, currentStatus: 'none' | 'sent_pending' | 'received_pending' | 'accepted') => void
  onBlock?: (userId: string) => void
  onSetActiveProfileUserId?: (id: string | null) => void
}

const slugify = (text: any): string => {
  if (!text) return '';
  const str = typeof text === 'string' ? text : String(text);
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
};

function AIHubCard({ id, user, content, timestamp, stats, isLiked, isForked, isFollowing, isFriend, isModerator, currentUserId, onRun, onDelete, onLike, onFork, onReport, onFollow, onFriendRequest, onBlock, onSetActiveProfileUserId }: HubCardProps & { currentUserId?: string }) {
  const [showDropdown, setShowDropdown] = useState(false)
  const [showConfirmDelete, setShowConfirmDelete] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const [viewMode, setViewMode] = useState<'raw' | 'markdown'>('markdown')
  const [isCopied, setIsCopied] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false)
        setShowConfirmDelete(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const handleCopy = () => {
    navigator.clipboard.writeText(content.response_preview);
    setIsCopied(true);
    onFork?.(id, !!isForked);
    setTimeout(() => setIsCopied(false), 2000);
  }

  const MarkdownComponents = {
    h1: ({ children, ...props }: any) => <h1 id={`post-${id}-${slugify(children)}`} {...props}>{children}</h1>,
    h2: ({ children, ...props }: any) => <h2 id={`post-${id}-${slugify(children)}`} {...props}>{children}</h2>,
    h3: ({ children, ...props }: any) => <h3 id={`post-${id}-${slugify(children)}`} {...props}>{children}</h3>,
    h4: ({ children, ...props }: any) => <h4 id={`post-${id}-${slugify(children)}`} {...props}>{children}</h4>,
    a: ({ href, children, ...props }: any) => {
        const isInternal = href?.startsWith('#');
        if (isInternal) {
            return (
                <a 
                  href={href} 
                  className="cursor-pointer hover:underline text-primary"
                  onClick={(e) => {
                    e.preventDefault();
                    const targetId = `post-${id}-${href.substring(1)}`;
                    const element = document.getElementById(targetId);
                    if (element) {
                        element.scrollIntoView({ behavior: 'smooth', block: 'center' });
                        element.classList.add('highlight-flash');
                        setTimeout(() => element.classList.remove('highlight-flash'), 1500);
                    }
                  }}
                >
                    {children}
                </a>
            );
        }
        return <a href={href} target="_blank" rel="noopener noreferrer" {...props}>{children}</a>;
    }
  };

  return (
    <div className="w-full border-b border-border/40 hover:bg-white/[0.02] transition-colors group relative py-8 px-8">
      <div className="flex gap-4">
        {/* Avatar Section */}
        <div className="flex-shrink-0">
            <div 
                onClick={() => onSetActiveProfileUserId?.(user.id)}
                className="w-12 h-12 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/10 shadow-sm overflow-hidden cursor-pointer hover:scale-105 transition-transform"
            >
                {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-lg font-black text-primary italic">{user.name[0]}</span>
                )}
            </div>
        </div>

        {/* Content Section */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-1">
            <div className="flex items-center gap-1.5 min-w-0">
              <span 
                onClick={() => onSetActiveProfileUserId?.(user.id)}
                className="font-black text-[15px] tracking-tight truncate text-foreground hover:underline cursor-pointer"
              >
                {user.name}
              </span>
              <div className="flex items-center gap-1 flex-shrink-0 opacity-80 scale-90 origin-left">
                <VerifiedBadge role={user.role} />
                <StackBadges stack={user.stack} />
              </div>
              <span className="text-muted-foreground text-[13px] font-medium opacity-40">· {timestamp}</span>
            </div>
            
            <div className="flex items-center gap-3 relative" ref={dropdownRef}>
                {onFollow && user.id !== currentUserId && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onFollow(user.id, !!isFollowing);
                        }}
                        className={cn(
                            "px-4 py-1.5 rounded-full text-[11px] font-black transition-all active:scale-95",
                            isFollowing 
                                ? "bg-white/5 text-foreground border border-white/10 hover:bg-red-500/10 hover:text-red-500 hover:border-red-500/20 hover:after:content-['Unfollow'] after:content-['Following']" 
                                : "bg-foreground text-background hover:bg-foreground/90"
                        )}
                    >
                        {isFollowing ? "" : 'Follow'}
                    </button>
                )}

                <button 
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="p-2 -mr-2 rounded-full text-muted-foreground/30 hover:text-primary hover:bg-primary/10 transition-all outline-none"
                >
                    <MoreHorizontal size={18} />
                </button>

                {showDropdown && (
                    <div className="absolute right-0 mt-2 top-full w-56 rounded-2xl bg-popover/90 backdrop-blur-xl border border-white/10 shadow-2xl p-2 z-20 animate-in fade-in zoom-in-95 duration-200">
                        {onFriendRequest && user.id !== currentUserId && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFriendRequest(user.id, isFriend || 'none');
                                    setShowDropdown(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left",
                                    isFriend === 'accepted' ? "text-emerald-500 hover:bg-emerald-500/10" :
                                    isFriend === 'sent_pending' || isFriend === 'received_pending' ? "text-amber-500 hover:bg-amber-500/10" :
                                    "text-muted-foreground hover:text-foreground hover:bg-white/5"
                                )}
                            >
                                <Users size={16} />
                                {isFriend === 'accepted' ? 'Joined Friends' : isFriend === 'sent_pending' ? 'Request Sent' : isFriend === 'received_pending' ? 'Accept Request' : 'Add Friend'}
                            </button>
                        )}

                        <div className="h-px bg-white/5 my-1.5 mx-2" />

                        <button 
                            onClick={() => {
                                onReport?.(id, user.id);
                                setShowDropdown(false);
                            }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all text-left"
                        >
                            <Flag size={16} />
                            Report Post
                        </button>

                        {user.id !== currentUserId && (
                            <button 
                                onClick={() => {
                                    onBlock?.(user.id);
                                    setShowDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all text-left"
                            >
                                <ShieldAlert size={16} />
                                Block User
                            </button>
                        )}
                        
                        {(isModerator || user.id === currentUserId) && (
                            <button 
                                onClick={() => {
                                    if (showConfirmDelete) {
                                        onDelete?.(id);
                                    } else {
                                        setShowConfirmDelete(true);
                                    }
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all text-left mt-0.5",
                                    showConfirmDelete ? "bg-red-500 text-white" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                )}
                            >
                                <Trash2 size={16} />
                                {showConfirmDelete ? 'Confirm Delete' : 'Delete Post'}
                            </button>
                        )}
                    </div>
                )}
            </div>
          </div>

          <div className="mb-4">
               <div className="text-[15px] leading-relaxed text-foreground/90 whitespace-pre-wrap break-words">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                    >
                        {content.prompt}
                    </ReactMarkdown>
               </div>

               {content.response_preview?.trim() && (
                  <div className="mt-4 border border-border/50 rounded-2xl overflow-hidden bg-white/[0.02] group/quoted transition-all hover:bg-white/[0.04]">
                        <div className="flex items-center gap-2 px-4 py-3 border-b border-border/50 bg-white/[0.02]">
                            <Terminal size={14} className="text-muted-foreground/40" />
                            <span className="text-[10px] font-black uppercase tracking-[0.2em] text-muted-foreground/40 italic">System Prompt Preview</span>
                            
                            <div className="ml-auto flex gap-1">
                                <button 
                                    onClick={() => setViewMode(viewMode === 'markdown' ? 'raw' : 'markdown')}
                                    className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-primary transition-all"
                                >
                                    {viewMode === 'markdown' ? <Code size={12} /> : <Eye size={12} />}
                                </button>
                                <button 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-1.5 rounded-lg text-muted-foreground/30 hover:text-primary transition-all"
                                >
                                    {isExpanded ? <ChevronUp size={12} /> : <Maximize2 size={12} />}
                                </button>
                            </div>
                        </div>

                        <div className={cn(
                            "p-4 relative",
                            !isExpanded && "max-h-[120px] overflow-hidden"
                        )}>
                            <div className="text-sm leading-relaxed text-muted-foreground/60">
                                {viewMode === 'markdown' ? (
                                    <div className="markdown-content system-prompt-markdown opacity-80 prose-sm">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {content.response_preview}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="font-mono text-xs whitespace-pre-wrap break-words opacity-60">
                                        {content.response_preview}
                                    </div>
                                )}
                            </div>
                            {!isExpanded && content.response_preview.length > 200 && (
                                <div className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-background/40 to-transparent" />
                            )}
                        </div>

                        <div className="flex p-2 gap-2 bg-white/[0.02] border-t border-border/50">
                             <button 
                                onClick={handleCopy}
                                className={cn(
                                    "flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all",
                                    isCopied ? "text-emerald-500 bg-emerald-500/10" : "text-muted-foreground/60 hover:text-foreground hover:bg-white/5"
                                )}
                             >
                                {isCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy</>}
                             </button>
                             <button 
                                onClick={() => onRun?.(content.response_preview)}
                                className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl bg-primary/10 text-primary hover:bg-primary text-primary-foreground transition-all text-[10px] font-black uppercase tracking-widest"
                             >
                                <Play size={12} fill="currentColor" /> Run Prompt
                             </button>
                        </div>
                  </div>
               )}
          </div>

          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-10">
                <button className="flex items-center gap-2 text-muted-foreground/40 hover:text-primary transition-all group/btn outline-none">
                    <div className="p-2 rounded-full group-hover/btn:bg-primary/10 transition-colors">
                        <MessageCircle size={18} className="transition-transform group-hover/btn:scale-110" />
                    </div>
                    <span className="text-xs font-medium">{stats.replies || ''}</span>
                </button>

                {content.response_preview?.trim() && (
                  <button 
                      onClick={() => onFork?.(id, !!isForked)}
                      className={cn(
                          "flex items-center gap-2 transition-all group/btn outline-none",
                          isForked ? "text-amber-500" : "text-muted-foreground/40 hover:text-amber-500"
                      )}
                  >
                      <div className={cn("p-2 rounded-full transition-colors", isForked ? "bg-amber-500/10" : "group-hover/btn:bg-amber-500/10")}>
                          <Zap size={18} className={cn("transition-transform group-hover/btn:scale-110", isForked && "fill-current")} />
                      </div>
                      <span className="text-xs font-medium">{stats.forks || ''}</span>
                  </button>
                )}

                <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onLike?.(id, !!isLiked);
                    }}
                    className={cn(
                        "flex items-center gap-2 transition-all group/btn outline-none",
                        isLiked ? "text-pink-500" : "text-muted-foreground/40 hover:text-pink-500"
                    )}
                >
                    <div className={cn("p-2 rounded-full transition-colors", isLiked ? "bg-pink-500/10" : "group-hover/btn:bg-pink-500/10")}>
                        <Heart size={18} className={cn("transition-all", isLiked ? "fill-current animate-heart-pop" : "group-hover/btn:scale-110")} />
                    </div>
                    <span className="text-xs font-medium">{stats.likes || ''}</span>
                </button>
            </div>
            
            <button className="p-2 -mr-2 text-muted-foreground/30 hover:text-primary hover:bg-primary/10 rounded-full transition-all outline-none">
                <Share size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function RulesView() {
    const rules = [
        { title: "Safe & Respectful Haven", desc: "No harassment, bullying, or hate speech. Threats of violence and extremism are strictly prohibited." },
        { title: "Zero Child Harm", desc: "Absolute zero-tolerance for content that endangers or exploits minors. This is a global red line." },
        { title: "Legal & Digital Integrity", desc: "No fraud, scams, or distribution of malware. Promoting illegal goods or services is restricted." },
        { title: "Privacy & Data Protection", desc: "Respect the privacy of others. No Doxing or sharing of non-consensual private information." },
        { title: "Authentic Identity", desc: "Be yourself. Do not impersonate others or create fake profiles to deceive our community." },
        { title: "Spam & Info-Security", desc: "Keep the hub clean. No spamming, phishing, or spreading harmful deepfake misinformation." },
        { title: "Intellectual Property", desc: "Respect copyrights and trademarks. Do not share content that you don't have the right to distribute." },
        { title: "Self-Harm Prevention", desc: "We care about you. No content that encourages self-harm, suicide, or eating disorders." },
        { title: "Graphic Content", desc: "No excessive gore, disturbing violence, or gratuitous graphic content that shocks the audience." },
        { title: "Advertising Etiquette", desc: "No unsolicited commercial promotions. Marketing must follow designated community channels." },
        { title: "Enforcement Integrity", desc: "Do not attempt to evade bans or restrictions. Alt-accounts used for evasion will be terminated." },
        { title: "Medical Misinformation", desc: "No spread of dangerous medical or health misinformation that could lead to physical harm." }
    ];

    return (
        <div className="max-w-4xl mx-auto px-10 py-16 space-y-12 animate-in fade-in duration-500">
            <div className="border-l-4 border-primary pl-6 space-y-2">
                <h1 className="text-3xl font-black uppercase tracking-tighter italic">Community Guidelines</h1>
                <p className="text-muted-foreground text-xs font-bold uppercase tracking-widest opacity-60 italic">Last updated April 2026</p>
            </div>
            <div className="space-y-10">
                {rules.map((rule, i) => (
                    <div key={i} className="flex gap-8 group">
                        <div className="text-4xl font-black text-primary/10 group-hover:text-primary/30 transition-colors italic w-12 flex-shrink-0">{String(i + 1).padStart(2, '0')}</div>
                        <div className="space-y-2 flex-1 pt-1">
                            <h3 className="text-lg font-black uppercase tracking-tight italic text-foreground/90">{rule.title}</h3>
                            <p className="text-sm text-muted-foreground leading-relaxed max-w-2xl">{rule.desc}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
}

type HubView = 'home' | 'explore' | 'rules' | 'friends' | 'messages' | 'profile';

interface MessagesViewProps {
    user: any;
    activeChatUserId: string | null;
    chatMessages: any[];
    setMsgInput: (val: string) => void;
    handleSendMessage: () => void;
    friendsList: any[];
    blockedByMe: string[];
    whoBlockedMe: string[];
}

function MessagesView({
    user,
    activeChatUserId,
    chatMessages,
    setMsgInput,
    handleSendMessage,
    friendsList,
    blockedByMe,
    whoBlockedMe
}: MessagesViewProps) {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatMessages]);

    const activeFriend = friendsList.find(f => f.user_id === activeChatUserId);

    return (
        <div className="flex-1 flex flex-col h-full overflow-hidden bg-transparent relative">
            {!activeChatUserId ? (
                <div className="flex-1 flex flex-col items-center justify-center p-12 text-center h-full relative">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(var(--primary),0.03),transparent_70%)] pointer-events-none" />
                    <div className="relative z-10 flex flex-col items-center max-w-sm">
                        <div className="w-20 h-20 rounded-[32px] bg-white/5 border border-white/10 flex items-center justify-center mb-8 shadow-2xl animate-pulse">
                            <MessageSquare size={32} className="text-muted-foreground/40" />
                        </div>
                        <h3 className="text-3xl font-black uppercase tracking-tighter italic mb-3">Connect & Create</h3>
                        <p className="text-sm font-bold text-muted-foreground uppercase tracking-widest leading-loose opacity-40">
                            Select a friend to start a real-time conversation.
                        </p>
                    </div>
                </div>
            ) : (
                <>

                    {/* Messages Area */}
                    <div className="flex-1 overflow-y-auto px-6 pb-8 custom-scrollbar">
                            <div className="max-w-4xl mx-auto space-y-6 pt-8">
                            {chatMessages.length === 0 ? (
                                <div className="flex flex-col items-center justify-center p-12 text-center opacity-20 h-full mt-20">
                                    <MessageCircle size={48} className="mb-4" />
                                    <p className="text-xs font-black uppercase tracking-widest italic font-medium">Start the conversation</p>
                                </div>
                            ) : (
                                chatMessages.map((msg, i) => {
                                    const isMe = msg.sender_id === user?.id;
                                    const showAvatar = i === 0 || chatMessages[i - 1].sender_id !== msg.sender_id;
                                    const isBlocked = blockedByMe.includes(msg.sender_id) || whoBlockedMe.includes(msg.sender_id);

                                    if (isBlocked) return null;

                                    return (
                                        <div 
                                            key={msg.id} 
                                            className={cn(
                                                "flex flex-col animate-in fade-in slide-in-from-bottom-2 duration-300",
                                                isMe ? "items-end" : "items-start"
                                            )}
                                        >
                                            <div className={cn(
                                                "flex gap-3 max-w-[80%]",
                                                isMe ? "flex-row-reverse" : "flex-row"
                                            )}>
                                                {showAvatar && !isMe ? (
                                                    <div className="w-8 h-8 rounded-full bg-primary/20 flex-shrink-0 flex items-center justify-center border border-primary/10 overflow-hidden shadow-lg mt-1">
                                                        {activeFriend?.avatar_url ? (
                                                            <img src={activeFriend.avatar_url} className="w-full h-full object-cover" />
                                                        ) : (
                                                            <span className="text-[10px] font-black italic text-primary">{activeFriend?.display_name[0]}</span>
                                                        )}
                                                    </div>
                                                ) : !isMe && <div className="w-8" />}
                                                
                                                <div className="flex flex-col gap-1">
                                                    <div 
                                                        className={cn(
                                                            "px-4 py-2.5 rounded-2xl text-sm font-medium shadow-sm border",
                                                            isMe 
                                                                ? "bg-primary text-primary-foreground border-primary/20 rounded-tr-none" 
                                                                : "bg-white/5 border-white/10 rounded-tl-none"
                                                        )}
                                                    >
                                                        {msg.content}
                                                    </div>
                                                    <div className={cn(
                                                        "text-[9px] font-bold uppercase tracking-widest opacity-20 px-1",
                                                        isMe ? "text-right" : "text-left"
                                                    )}>
                                                        {new Date(msg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    );
                                })
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </div>

                    {/* Input Container (Pinned to bottom and centered) */}
                    <div className="w-full flex flex-col items-center bg-transparent pb-4 pt-4">
                        <div className="w-full max-w-3xl px-4">
                            {blockedByMe.includes(activeChatUserId) || whoBlockedMe.includes(activeChatUserId) ? (
                                <div className="text-center p-4 bg-red-500/10 text-red-500 rounded-2xl text-xs font-black uppercase tracking-widest italic border border-red-500/20">
                                    Connection blocked.
                                </div>
                            ) : (
                                <ChatInput 
                                    onSend={(content) => {
                                        setMsgInput(content);
                                        // Trigger handleSendMessage after local state sync
                                        setTimeout(() => {
                                            const btn = document.getElementById('chat-hub-send-trigger');
                                            btn?.click();
                                        }, 0);
                                    }}
                                    showWebSearch={false}
                                    modelCapabilities={{ vision: true, reasoning: false }}
                                />
                            )}
                            <p className="text-[10px] text-muted-foreground/30 text-center mt-2 font-bold uppercase tracking-widest italic">
                                Private messaging on OpenChat Social
                            </p>
                        </div>
                    </div>
                    {/* Hidden trigger to use existing handleSendMessage logic without modification */}
                    <button id="chat-hub-send-trigger" onClick={handleSendMessage} className="hidden" />
                </>
            )}
        </div>
    );
}

export function ChatHub({ 
  onRunPrompt, 
  view,
  friendsList,
  onUpdateFriendsList,
  activeChatUserId,
  onSetActiveChatUserId,
  activeProfileUserId,
  onSetActiveProfileUserId,
  onlineUserIds,
  onUpdateOnlineUserIds
}: { 
  onRunPrompt: (prompt: string) => void, 
  view: HubView,
  friendsList: any[],
  onUpdateFriendsList: (list: any[]) => void,
  activeChatUserId: string | null,
  onSetActiveChatUserId: (id: string | null) => void,
  activeProfileUserId: string | null,
  onSetActiveProfileUserId: (id: string | null) => void,
  onlineUserIds: string[],
  onUpdateOnlineUserIds: (ids: string[]) => void
}) {
  const { user } = useAuth()
  const [posts, setPosts] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [postPrompt, setPostPrompt] = useState('')
  const [attachedPrompt, setAttachedPrompt] = useState('')
  const [showPromptField, setShowPromptField] = useState(false)
  const [isPosting, setIsPosting] = useState(false)
  const [errorStatus, setErrorStatus] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<'recent' | 'popular' | 'prompts'>('recent')
  const [friendsTab, setFriendsTab] = useState<'list' | 'requests'>('list')
  const [followedIds, setFollowedIds] = useState<string[]>([])
  const [friendContext, setFriendContext] = useState<any[]>([])
  const [friendRequests, setFriendRequests] = useState<any[]>([])
  const [reportModal, setReportModal] = useState<{ isOpen: boolean; postId: string | null; reportedUserId: string | null }>({
    isOpen: false,
    postId: null,
    reportedUserId: null
  });
  const [blockedByMe, setBlockedByMe] = useState<string[]>([])
  const [whoBlockedMe, setWhoBlockedMe] = useState<string[]>([])
  const [chatMessages, setChatMessages] = useState<any[]>([])
  const [msgInput, setMsgInput] = useState('')

  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

  const fetchPosts = async () => {
    try {
      setIsLoading(true)
      const session = await getSafeSession()
      const token = session?.access_token
      if (!token) {
          setIsLoading(false);
          return;
      }

      let followIds: string[] = []
      
      if (user?.id) {
          try {
              const [followRes, friendRes, blockRes] = await Promise.all([
                  fetch(`${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${user.id}&select=following_id&apikey=${supabaseAnonKey}`, {
                      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                  }),
                  fetch(`${supabaseUrl}/rest/v1/hub_friends?or=(user_id.eq.${user.id},friend_id.eq.${user.id})&select=user_id,friend_id,status&apikey=${supabaseAnonKey}`, {
                      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                  }),
                  fetch(`${supabaseUrl}/rest/v1/hub_blocks?or=(blocker_id.eq.${user.id},blocked_id.eq.${user.id})&apikey=${supabaseAnonKey}`, {
                    headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                  })
              ]);
              if (followRes.ok) {
                  const followData = await followRes.json();
                  followIds = followData.map((f: any) => f.following_id);
                  setFollowedIds(followIds);
              }
              if (friendRes.ok) {
                  const fCtx = await friendRes.json();
                  setFriendContext(fCtx);
              }
              if (blockRes.ok) {
                const blockData = await blockRes.json();
                setBlockedByMe(blockData.filter((b: any) => b.blocker_id === user.id).map((b: any) => b.blocked_id));
                setWhoBlockedMe(blockData.filter((b: any) => b.blocked_id === user.id).map((b: any) => b.blocker_id));
              }
          } catch (socialErr) { console.warn(socialErr); }
      }

      const allBlockedIds = [...blockedByMe, ...whoBlockedMe];

      if ((view === 'friends' || view === 'messages') && user?.id) {
          try {
              if (friendsTab === 'list' || view === 'messages') {
                  const friendsShipRes = await fetch(`${supabaseUrl}/rest/v1/hub_friends?or=(user_id.eq.${user.id},friend_id.eq.${user.id})&status=eq.accepted&select=user_id,friend_id&apikey=${supabaseAnonKey}`, {
                      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                  });
                  if (friendsShipRes.ok) {
                      const shipData = await friendsShipRes.json();
                      const friendIds = shipData.map((s: any) => s.user_id === user.id ? s.friend_id : s.user_id).filter((id: string) => !allBlockedIds.includes(id));
                      if (friendIds.length > 0) {
                          const profilesRes = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=in.(${friendIds.join(',')})&select=*&apikey=${supabaseAnonKey}`, {
                              headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                          });
                           if (profilesRes.ok) onUpdateFriendsList(await profilesRes.json());
                      } else onUpdateFriendsList([]);
                  }
              } 
              
              if (view === 'friends' && friendsTab === 'requests') {
                  const requestsRes = await fetch(`${supabaseUrl}/rest/v1/hub_friends?friend_id=eq.${user.id}&status=eq.pending&select=user_id&apikey=${supabaseAnonKey}`, {
                      headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                  });
                  if (requestsRes.ok) {
                      const reqData = await requestsRes.json();
                      const fromIds = reqData.map((r: any) => r.user_id).filter((id: string) => !allBlockedIds.includes(id));
                      if (fromIds.length > 0) {
                          const profilesRes = await fetch(`${supabaseUrl}/rest/v1/user_settings?user_id=in.(${fromIds.join(',')})&select=*&apikey=${supabaseAnonKey}`, {
                              headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
                          });
                          if (profilesRes.ok) setFriendRequests(await profilesRes.json());
                      } else setFriendRequests([]);
                  }
              }
          } catch (err) { console.error(err); }
          if (view === 'friends') { setIsLoading(false); return; }
      }

      // Pre-fetch requests for counter
      if (user?.id && view !== 'friends') {
          fetch(`${supabaseUrl}/rest/v1/hub_friends?friend_id=eq.${user.id}&status=eq.pending&select=user_id&apikey=${supabaseAnonKey}`, {
              headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
          }).then(res => res.json()).then(data => setFriendRequests(data)).catch(() => {});
      }

      const order = activeTab === 'popular' ? 'likes_count.desc' : 'created_at.desc'
      let url = `${supabaseUrl}/rest/v1/hub_posts?select=*,user:user_settings(display_name,avatar_url,role,stack),hub_post_likes(user_id),hub_post_forks(user_id)&order=${order}&apikey=${supabaseAnonKey}`
      if (allBlockedIds.length > 0) url += `&user_id=not.in.(${allBlockedIds.join(',')})`;
      
      if (activeTab === 'popular') url += '&likes_count=gt.0'
      if (view === 'home' && user?.id) {
          const filterIds = [user.id, ...followIds];
          url += `&user_id=in.(${filterIds.join(',')})`;
      }
      if (activeTab === 'prompts') url += '&response_preview=not.is.null'

      const response = await fetch(url, {
          headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` },
          signal: AbortSignal.timeout(5000)
      })

      if (response.ok) {
          setPosts(await response.json());
          setErrorStatus(null);
      }
    } catch (err) { 
        setErrorStatus('Connection unstable.');
        console.error(err);
    } finally { 
        setIsLoading(false); 
    }
  }

  useEffect(() => { 
    if (user && view !== 'rules') {
        fetchPosts(); 
    }
  }, [user, view, activeTab, friendsTab])

  const handlePost = async () => {
    if (!postPrompt.trim() || !user) return
    setIsPosting(true)
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      if (!token) return;

      const response = await fetch(`${supabaseUrl}/rest/v1/hub_posts?apikey=${supabaseAnonKey}`, {
        method: 'POST',
        headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
            user_id: user.id,
            prompt: postPrompt,
            response_preview: attachedPrompt.trim() || null,
            likes_count: 0, forks_count: 0, replies_count: 0
        })
      });
      if (response.ok) {
        setPostPrompt(''); setAttachedPrompt(''); setShowPromptField(false);
        fetchPosts();
      }
    } catch (err) { setErrorStatus('Post failed.'); }
    finally { setIsPosting(false); }
  }

  const handleToggleLike = async (postId: string, currentlyLiked: boolean) => {
    if (!user) return
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      if (currentlyLiked) {
        await fetch(`${supabaseUrl}/rest/v1/hub_post_likes?post_id=eq.${postId}&user_id=eq.${user.id}&apikey=${supabaseAnonKey}`, {
            method: 'DELETE', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
        });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/hub_post_likes?apikey=${supabaseAnonKey}`, {
            method: 'POST', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ post_id: postId, user_id: user.id })
        });
      }
      fetchPosts();
    } catch (err) { console.error(err); }
  }

  const handleIncrementFork = async (postId: string, currentlyForked: boolean) => {
    if (!user || currentlyForked) return;
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      await fetch(`${supabaseUrl}/rest/v1/rpc/increment_fork_count?apikey=${supabaseAnonKey}`, {
        method: 'POST', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({ post_id_val: postId, user_id_val: user.id })
      });
      fetchPosts();
    } catch (err) { console.error(err); }
  }

  const handleToggleFollow = async (targetId: string, currentlyFollowing: boolean) => {
    if (!user || targetId === user.id) return
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      if (currentlyFollowing) {
        await fetch(`${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${user.id}&following_id=eq.${targetId}&apikey=${supabaseAnonKey}`, {
            method: 'DELETE', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
        });
      } else {
        await fetch(`${supabaseUrl}/rest/v1/hub_follows?apikey=${supabaseAnonKey}`, {
            method: 'POST', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ follower_id: user.id, following_id: targetId })
        });
      }
      fetchPosts();
    } catch (err) { console.error(err); }
  }

  const handleToggleFriend = async (targetId: string, currentStatus: 'none' | 'sent_pending' | 'received_pending' | 'accepted') => {
    if (!user || targetId === user.id) return
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      
      if (currentStatus === 'received_pending') {
        // Automatically accept instead of toggling/deleting
        handleAcceptRequest(targetId);
        return;
      }

      if (currentStatus === 'none') {
        await fetch(`${supabaseUrl}/rest/v1/hub_friends?apikey=${supabaseAnonKey}`, {
            method: 'POST', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
            body: JSON.stringify({ user_id: user.id, friend_id: targetId, status: 'pending' })
        });
      } else {
        // Unfriend/Remove: Delete BOTH directions in one call
        await fetch(`${supabaseUrl}/rest/v1/hub_friends?or=(and(user_id.eq.${user.id},friend_id.eq.${targetId}),and(user_id.eq.${targetId},friend_id.eq.${user.id}))&apikey=${supabaseAnonKey}`, {
            method: 'DELETE', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
        });
      }
      fetchPosts();
    } catch (err) { console.error(err); }
  }

  const handleAcceptRequest = async (fromUserId: string) => {
    if (!user) return
    setIsLoading(true)
    const backup = [...friendRequests]
    try {
      // Optimistic update
      setFriendRequests(prev => prev.filter((req: any) => req.user_id !== fromUserId));

      const session = await getSafeSession();
      const token = session?.access_token;
      
      const res1 = await fetch(`${supabaseUrl}/rest/v1/hub_friends?user_id=eq.${fromUserId}&friend_id=eq.${user.id}&apikey=${supabaseAnonKey}`, {
          method: 'PATCH', 
          headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'accepted' })
      });
      
      if (!res1.ok) throw new Error('Failed to accept');

      await fetch(`${supabaseUrl}/rest/v1/hub_friends?apikey=${supabaseAnonKey}`, {
          method: 'POST',
          headers: { 
              'apikey': supabaseAnonKey, 
              'Authorization': `Bearer ${token}`, 
              'Content-Type': 'application/json',
              'Prefer': 'resolution=merge-duplicates'
          },
          body: JSON.stringify({ user_id: user.id, friend_id: fromUserId, status: 'accepted' })
      });
      
      await fetchPosts();
    } catch (err) { 
        setFriendRequests(backup);
        setErrorStatus('Failed to accept request. Check your connection.');
        console.error(err); 
    }
    finally { setIsLoading(false); }
  }

  const handleDeclineRequest = async (fromUserId: string) => {
    if (!user) return
    setIsLoading(true)
    const backup = [...friendRequests]
    try {
      // Optimistic update
      setFriendRequests(prev => prev.filter(req => req.user_id !== fromUserId));

      const session = await getSafeSession();
      const token = session?.access_token;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/hub_friends?or=(and(user_id.eq.${user.id},friend_id.eq.${fromUserId}),and(user_id.eq.${fromUserId},friend_id.eq.${user.id}))&apikey=${supabaseAnonKey}`, {
          method: 'DELETE', 
          headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
      });

      if (!response.ok) throw new Error('Delete failed');
      
      await fetchPosts();
      setErrorStatus(null);
    } catch (err) { 
        setFriendRequests(backup);
        setErrorStatus('Failed to decline. You might not have permission to delete this.');
        console.error(err); 
    }
    finally { setIsLoading(false); }
  }

  const handleDeletePost = async (postId: string) => {
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      await fetch(`${supabaseUrl}/rest/v1/hub_posts?id=eq.${postId}&apikey=${supabaseAnonKey}`, {
        method: 'DELETE', headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
      });
      fetchPosts();
    } catch (err) { console.error(err); }
  }

  // Realtime Presence Logic
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase.channel('hub-presence', {
        config: { presence: { key: user.id } }
    });

    channel
        .on('presence', { event: 'sync' }, () => {
            const newState = channel.presenceState();
            const onlineIds = Object.keys(newState);
            onUpdateOnlineUserIds(onlineIds);
        })
        .subscribe(async (status) => {
            if (status === 'SUBSCRIBED') {
                await channel.track({
                    user_id: user.id,
                    online_at: new Date().toISOString(),
                });
            }
        });

    return () => { channel.unsubscribe(); };
  }, [user?.id]);

  const handleReportPost = (postId: string | null, reportedUserId: string) => {
    setReportModal({ isOpen: true, postId, reportedUserId });
  }

  const handleBlockUser = async (targetUserId: string | null) => {
    if (!user || !targetUserId) return;
    if (!window.confirm("Are you sure you want to block this user? You won't see their posts and they won't be able to message you.")) return;

    try {
        const session = await getSafeSession();
        const token = session?.access_token;
        
        const response = await fetch(`${supabaseUrl}/rest/v1/hub_blocks?apikey=${supabaseAnonKey}`, {
            method: 'POST',
            headers: { 
                'apikey': supabaseAnonKey, 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                blocker_id: user.id,
                blocked_id: targetUserId
            })
        });

        if (response.ok) {
            setBlockedByMe(prev => [...prev, targetUserId]);
            setErrorStatus('User blocked successfully.');
            setTimeout(() => setErrorStatus(null), 3000);
            fetchPosts(); // Refresh to hide posts
        }
    } catch (err) { console.error('Block failed', err); }
  }

  const fetchMessages = async (otherUserId: string) => {
    if (!user) return;
    try {
        const session = await getSafeSession();
        const token = session?.access_token;
        const res = await fetch(`${supabaseUrl}/rest/v1/hub_private_messages?or=(and(sender_id.eq.${user.id},receiver_id.eq.${otherUserId}),and(sender_id.eq.${otherUserId},receiver_id.eq.${user.id}))&order=created_at.asc&apikey=${supabaseAnonKey}`, {
            headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` }
        });
        if (res.ok) {
            setChatMessages(await res.json());
        }
    } catch (err) { console.error('Fetch messages failed', err); }
  }

  const handleSendMessage = async () => {
    if (!user || !activeChatUserId || !msgInput.trim()) return;
    const content = msgInput.trim();
    setMsgInput(''); // Clear immediately for UX

    try {
        const session = await getSafeSession();
        const token = session?.access_token;
        await fetch(`${supabaseUrl}/rest/v1/hub_private_messages?apikey=${supabaseAnonKey}`, {
            method: 'POST',
            headers: { 
                'apikey': supabaseAnonKey, 
                'Authorization': `Bearer ${token}`, 
                'Content-Type': 'application/json' 
            },
            body: JSON.stringify({
                sender_id: user.id,
                receiver_id: activeChatUserId,
                content: content
            })
        });
        // Realtime will pick it up or we can optimistically append
        // fetchMessages(activeChatUserId); 
    } catch (err) { console.error('Send message failed', err); }
  }

  // Realtime Messages Logic
  useEffect(() => {
    if (!user || !activeChatUserId) return;

    fetchMessages(activeChatUserId);

    const channel = supabase.channel(`chat-${activeChatUserId}`)
        .on('postgres_changes', { 
            event: 'INSERT', 
            schema: 'public', 
            table: 'hub_private_messages'
        }, (payload) => {
            const newMsg = payload.new;
            // Only add if it belongs to current conversation
            if ((newMsg.sender_id === user.id && newMsg.receiver_id === activeChatUserId) || 
                (newMsg.sender_id === activeChatUserId && newMsg.receiver_id === user.id)) {
                setChatMessages(prev => [...prev, newMsg]);
            }
        })
        .subscribe();

    return () => { channel.unsubscribe(); };
  }, [user?.id, activeChatUserId]);

  const submitReport = async (reason: string) => {
    if (!user || !reportModal.reportedUserId) return;
    
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
      
      const response = await fetch(`${supabaseUrl}/rest/v1/hub_reports?apikey=${supabaseAnonKey}`, {
        method: 'POST',
        headers: { 
            'apikey': supabaseAnonKey, 
            'Authorization': `Bearer ${token}`, 
            'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
            post_id: reportModal.postId,
            reporter_id: user.id,
            reported_user_id: reportModal.reportedUserId,
            reason: reason,
            status: 'pending'
        })
      });

      if (response.ok) {
          setErrorStatus(reportModal.postId ? 'Post reported.' : 'User reported. Thank you for keeping the community safe.');
          setTimeout(() => setErrorStatus(null), 5000);
      }
    } catch (err) { console.error('Reporting failed', err); }
  }

  const renderComposer = () => {
    // Only show the input on the Home feed
    if (view !== 'home') return null;
    return (
        <div className="mb-8 group/creator px-6 md:px-0">
            <div className="p-5 rounded-3xl bg-card border border-border/50 shadow-lg shadow-primary/5 focus-within:border-primary/30 transition-all duration-300">
                <div className="flex gap-4 items-start">
                    <div className="flex-1 space-y-3">
                        <textarea 
                            value={postPrompt}
                            onChange={(e) => setPostPrompt(e.target.value)}
                            placeholder="What's your latest AI discovery?"
                            className="w-full bg-transparent border-none focus:ring-0 focus:outline-none text-base font-medium placeholder:text-muted-foreground/30 resize-none hub-textarea-auto min-h-[40px]"
                        />
                        {showPromptField && (
                            <div className="pt-3 border-t border-border/10 animate-in slide-in-from-top-1 duration-200">
                                <div className="flex items-center gap-2 mb-2 text-[9px] font-black text-primary uppercase tracking-widest italic opacity-50">
                                    <Terminal size={12} />
                                    Initial System Prompt
                                </div>
                                <textarea 
                                    value={attachedPrompt}
                                    onChange={(e) => setAttachedPrompt(e.target.value)}
                                    placeholder="Paste the prompt that started it all..."
                                    className="w-full bg-transparent rounded-xl p-4 border border-border/10 text-xs font-mono focus:border-primary/20 focus:ring-1 focus:ring-primary/10 focus:outline-none transition-all min-h-[100px]"
                                />
                            </div>
                        )}
                        <div className="flex items-center justify-between pt-3 border-t border-border/5">
                            <button 
                                onClick={() => setShowPromptField(!showPromptField)}
                                className={cn(
                                    "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all outline-none",
                                    showPromptField ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
                                )}
                            >
                                <Code size={12} />
                                {showPromptField ? "Remove Prompt" : "Attach Prompt"}
                            </button>
                            <button 
                                onClick={handlePost}
                                disabled={isPosting || !postPrompt.trim()}
                                className="w-10 h-10 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-lg shadow-primary/10 hover:scale-105 active:scale-95 disabled:opacity-30 disabled:scale-100 transition-all outline-none group"
                            >
                                {isPosting ? <RefreshCw size={16} className="animate-spin" /> : <ArrowUp size={18} strokeWidth={3} className="group-hover:-translate-y-0.5 transition-transform" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
  };


  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
        {view !== 'messages' && !activeProfileUserId && (
            <div className="flex-shrink-0 h-20 border-b border-border/5 bg-background/50 backdrop-blur-3xl z-30 flex items-center px-12">
                <div className="flex items-center justify-between w-full text-left">
                    <div className="flex items-center gap-8">
                        <div className="flex items-center gap-4 group">
                            <div className="transition-transform duration-500 group-hover:scale-110">
                                {view === 'home' ? <HomeIcon size={24} className="text-primary" /> : 
                                 view === 'friends' ? <Users size={24} className="text-primary" /> : 
                                 view === 'rules' ? <ShieldCheck size={24} className="text-primary" /> : 
                                 <Compass size={24} className="text-primary" />}
                            </div>
                            <div className="flex items-center gap-4">
                                <h2 className="text-2xl font-black italic uppercase tracking-tighter leading-none">
                                    {view === 'home' ? 'Home Feed' : 
                                     view === 'explore' ? 'Discovery Hub' : 
                                     view === 'friends' ? 'Friends' : 
                                     (view as string) === 'messages' ? 'Private Messages' :
                                     'Community Rules'}
                                </h2>
                                
                                {view !== 'rules' && (
                                    <HubTooltip text="Refresh Feed" position="bottom">
                                        <button onClick={fetchPosts} className="p-2 rounded-full hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all group outline-none">
                                            <RefreshCw size={18} className={cn("transition-transform duration-500", isLoading && "animate-spin")} />
                                        </button>
                                    </HubTooltip>
                                )}
                            </div>
                        </div>

                        <div className="flex gap-8 ml-4 border-l border-border/10 pl-8">
                            {view === 'home' || view === 'explore' ? (
                                <>
                                    <button onClick={() => { setPosts([]); setActiveTab('recent'); }} className={cn("text-[10px] font-black uppercase tracking-[0.2em] relative transition-all outline-none", activeTab === 'recent' ? "text-foreground" : "text-muted-foreground opacity-50")}>
                                        Recent {activeTab === 'recent' && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full transition-all" />}
                                    </button>
                                    <button onClick={() => { setPosts([]); setActiveTab('popular'); }} className={cn("text-[10px] font-black uppercase tracking-[0.2em] relative transition-all outline-none", activeTab === 'popular' ? "text-foreground" : "text-muted-foreground opacity-50")}>
                                        Popular {activeTab === 'popular' && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full transition-all" />}
                                    </button>
                                    <button onClick={() => { setPosts([]); setActiveTab('prompts'); }} className={cn("text-[10px] font-black uppercase tracking-[0.2em] relative transition-all outline-none", activeTab === 'prompts' ? "text-foreground" : "text-muted-foreground opacity-50")}>
                                        Prompts {activeTab === 'prompts' && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full" />}
                                    </button>
                                </>
                            ) : view === 'friends' ? (
                                <>
                                    <button onClick={() => { onUpdateFriendsList([]); setFriendsTab('list'); }} className={cn("text-[10px] font-black uppercase tracking-[0.2em] relative transition-all outline-none", friendsTab === 'list' ? "text-foreground" : "text-muted-foreground opacity-50")}>
                                        Accepted Friends {friendsTab === 'list' && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full transition-all" />}
                                    </button>
                                    <button onClick={() => { setFriendRequests([]); setFriendsTab('requests'); }} className={cn("text-[10px] font-black uppercase tracking-[0.2em] relative transition-all outline-none", friendsTab === 'requests' ? "text-foreground" : "text-muted-foreground opacity-50")}>
                                        Requests 
                                        {friendRequests.length > 0 && <span className="absolute -top-1 -right-2 w-1.5 h-1.5 bg-red-500 rounded-full animate-pulse" />}
                                        {friendsTab === 'requests' && <div className="absolute -bottom-2 left-0 right-0 h-0.5 bg-primary rounded-full transition-all" />}
                                    </button>
                                </>
                            ) : null}
                        </div>
                    </div>
                </div>
            </div>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar scroll-smooth">
          {view === 'rules' ? (
              <RulesView />          ) : activeProfileUserId ? (
              <ProfileView 
                userId={activeProfileUserId} 
                onClose={() => onSetActiveProfileUserId(null)}
                onSetActiveChatUserId={onSetActiveChatUserId}
              />
          ) : view === 'messages' ? (
              <div className="max-w-6xl mx-auto pb-6 px-6 h-full">
                  <MessagesView 
                    user={user}
                    activeChatUserId={activeChatUserId}
                    chatMessages={chatMessages}
                    setMsgInput={setMsgInput}
                    handleSendMessage={handleSendMessage}
                    friendsList={friendsList}
                    blockedByMe={blockedByMe}
                    whoBlockedMe={whoBlockedMe}
                  />
              </div>
          ) : (
            <div className="max-w-5xl mx-auto pt-6 pb-6 px-6 md:px-0">
                {renderComposer()}
                {errorStatus && <div className="mx-6 mb-8 p-6 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-center text-xs font-bold uppercase tracking-widest">{errorStatus}</div>}
                
                {(() => {
                    if (view === 'friends') {
                        if (friendsTab === 'requests') {
                            if (friendRequests.length === 0) {
                                return (
                                    <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-20 min-h-[400px]">
                                        <Users size={48} className="mb-6 opacity-20" />
                                        <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-3">No Requests</h3>
                                        <p className="text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                                            You're all caught up! New friend requests will appear here.
                                        </p>
                                    </div>
                                );
                            }
                            return (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                                    {friendRequests.map(req => (
                                        <div key={req.user_id} className="p-6 rounded-[32px] bg-white/5 border border-white/5 flex flex-col items-center text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
                                            <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-primary/20 shadow-xl">
                                                <img src={req.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${req.display_name}`} alt={req.display_name} className="w-full h-full object-cover" />
                                            </div>
                                            <h4 className="text-lg font-black italic uppercase tracking-tighter">{req.display_name}</h4>
                                            <div className="flex gap-2 mt-4 w-full">
                                                <button 
                                                    onClick={() => handleDeclineRequest(req.user_id)}
                                                    className="flex-1 py-3 rounded-2xl bg-white/5 text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all outline-none"
                                                >
                                                    Decline
                                                </button>
                                                <button 
                                                    onClick={() => handleAcceptRequest(req.user_id)}
                                                    className="flex-1 py-3 rounded-2xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all outline-none"
                                                >
                                                    Accept
                                                </button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            );
                        }

                        // Friends List Tab
                        if (friendsList.length === 0) {
                            return (
                                <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-20 min-h-[400px]">
                                    <Users size={48} className="mb-6 opacity-20" />
                                    <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-3">No Friends Yet</h3>
                                    <p className="text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                                        Discover new connections in the "Explore" tab or share your profile to make new friends!
                                    </p>
                                </div>
                            );
                        }

                        return (
                            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                                {friendsList.map(friend => (
                                    <div 
                                        key={friend.user_id} 
                                        onClick={() => onSetActiveProfileUserId(friend.user_id)}
                                        className="p-6 rounded-[32px] bg-white/5 border border-white/5 flex flex-col items-center text-center group cursor-pointer hover:bg-white/[0.07] transition-all animate-in fade-in duration-500"
                                    >
                                        <div className="w-20 h-20 rounded-full overflow-hidden mb-4 border-2 border-primary/10 group-hover:border-primary/40 group-hover:scale-105 transition-all shadow-xl">
                                            <img src={friend.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${friend.display_name}`} alt={friend.display_name} className="w-full h-full object-cover" />
                                        </div>
                                        <h4 className="text-lg font-black italic uppercase tracking-tighter group-hover:text-primary transition-colors">{friend.display_name}</h4>
                                        <div className="flex gap-4 mt-4 opacity-40 group-hover:opacity-100 transition-all">
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    onSetActiveChatUserId(friend.user_id);
                                                }}
                                                className="p-2 rounded-xl bg-primary/10 text-primary hover:bg-primary/20 transition-all"
                                            >
                                                <MessageSquare size={16} />
                                            </button>
                                            <button 
                                                onClick={(e) => {
                                                    e.stopPropagation();
                                                    handleToggleFriend(friend.user_id, 'accepted');
                                                }}
                                                className="p-2 rounded-xl bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-all"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        );
                    }
                    if (isLoading && posts.length === 0) return (
                        <div className="flex flex-col items-center justify-center p-20 opacity-40">
                            <RefreshCw size={32} className="animate-spin mb-4" />
                            <p className="text-xs font-black uppercase tracking-widest italic">Syncing...</p>
                        </div>
                    );
                    if (posts.length === 0) return (
                        <div className="flex flex-col items-center justify-center p-32 text-center animate-in fade-in zoom-in duration-700">
                            <div className="w-20 h-20 rounded-[32px] bg-primary/5 flex items-center justify-center border border-primary/10 mb-6 group-hover:rotate-12 transition-transform">
                                {activeTab === 'popular' ? <Flame size={32} className="text-primary opacity-20" /> : <Compass size={32} className="text-primary opacity-20" />}
                            </div>
                            <h3 className="text-2xl font-black uppercase tracking-tighter italic text-foreground/40 mb-2">{activeTab === 'popular' ? 'Silence in the Charts' : 'The Frontier is Quiet'}</h3>
                            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground/30 max-w-xs leading-relaxed mx-auto">
                                {view === 'home' ? 'Follow more creators to see their latest discoveries right here.' : activeTab === 'popular' ? 'No posts have gained traction yet.' : "Looks like we're at the edge of the known hub."}
                            </p>
                        </div>
                    );
                    return (
                        <>
                            {posts.map(post => {
                                const rel = friendContext.find((c: any) => (c.user_id === user?.id && c.friend_id === post.user_id) || (c.user_id === post.user_id && c.friend_id === user?.id));
                                const friendStatus = rel ? (
                                    rel.status === 'accepted' ? 'accepted' :
                                    rel.user_id === user?.id ? 'sent_pending' : 'received_pending'
                                ) : 'none';
                                
                                return (
                                    <AIHubCard 
                                        key={post.id} id={post.id}
                                        user={{ id: post.user_id, name: post.user?.display_name || 'Anonymous', avatar: post.user?.avatar_url || '', role: post.user?.role || 'user', stack: post.user?.stack }}
                                        content={{ prompt: post.prompt, response_preview: post.response_preview }}
                                        timestamp={new Date(post.created_at).toLocaleDateString()}
                                        stats={{ likes: post.likes_count, forks: post.forks_count, replies: post.replies_count }}
                                        isLiked={post.hub_post_likes?.some((l: any) => l.user_id === user?.id)}
                                        isForked={post.hub_post_forks?.some((f: any) => f.user_id === user?.id)}
                                        isFollowing={followedIds.includes(post.user_id)}
                                        isFriend={friendStatus}
                                        isModerator={false}
                                        currentUserId={user?.id}
                                        onRun={onRunPrompt}
                                        onDelete={handleDeletePost}
                                        onLike={handleToggleLike}
                                        onFork={handleIncrementFork}
                                        onReport={() => handleReportPost(post.id, post.user_id)}
                                        onFollow={handleToggleFollow}
                                        onFriendRequest={handleToggleFriend}
                                        onBlock={handleBlockUser}
                                        onSetActiveProfileUserId={onSetActiveProfileUserId}
                                    />
                                );
                            })}
                            {posts.length > 0 && <div className="p-10 text-center opacity-10 pointer-events-none"><h3 className="text-2xl font-black uppercase tracking-tighter italic">End of Feed</h3></div>}
                        </>
                    );
                })()}
            </div>
          )}
        </div>

        <HubModal 
            isOpen={reportModal.isOpen}
            onClose={() => setReportModal({ ...reportModal, isOpen: false })}
            onConfirm={submitReport}
            title={reportModal.postId ? "Report Post" : "Report User"}
            placeholder="Why are you reporting this? (e.g. Spam, Harassment...)"
        />
    </div>
  );
}
