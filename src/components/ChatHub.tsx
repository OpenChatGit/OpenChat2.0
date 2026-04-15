import { MessageSquare, MessageCircle, Play, Code, Copy, Trash2, ShieldCheck, Home as HomeIcon, Terminal, Flame, Compass, RefreshCw, MoreHorizontal, Flag, ChevronUp, Check, Maximize2, UserCheck, Users, Eye, ArrowUp, Heart, Zap, Share, Search, ShieldAlert, ArrowLeft, Github, Globe, ChevronDown } from 'lucide-react'
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
  isFriend?: 'none' | 'pending' | 'accepted'
  isModerator?: boolean
  currentUserId?: string
  onRun?: (prompt: string) => void
  onDelete?: (id: string) => void
  onLike?: (id: string, currentlyLiked: boolean) => void
  onFork?: (id: string, currentlyForked: boolean) => void
  onReport?: (id: string, authorId: string) => void
  onFollow?: (targetId: string, currentlyFollowing: boolean) => void
  onFriendRequest?: (targetId: string, currentStatus: 'none' | 'pending' | 'accepted') => void
  onBlock?: (userId: string) => void
}

const slugify = (text: any): string => {
  if (!text) return '';
  const str = typeof text === 'string' ? text : String(text);
  return str.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s+/g, '-');
};

function AIHubCard({ id, user, content, timestamp, stats, isLiked, isForked, isFollowing, isFriend, isModerator, currentUserId, onRun, onDelete, onLike, onFork, onReport, onFollow, onFriendRequest, onBlock }: HubCardProps & { currentUserId?: string }) {
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
    <div className="mx-6 my-4 p-6 rounded-[32px] bg-card hover:bg-accent/50 transition-all group relative border border-border/50 hover:border-primary/20 shadow-sm hover:shadow-xl hover:shadow-primary/5">
      <div className="flex gap-6">
        <div className="flex flex-col items-center gap-2 flex-shrink-0">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center border border-primary/10 shadow-xl shadow-black/5 overflow-hidden">
                {user.avatar ? (
                    <img src={user.avatar} alt={user.name} className="w-full h-full object-cover" />
                ) : (
                    <span className="text-xl font-black text-primary italic">{user.name[0]}</span>
                )}
            </div>
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="font-black text-sm tracking-tight truncate text-foreground italic leading-none mb-0.5">{user.name}</span>
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <VerifiedBadge role={user.role} />
                <StackBadges stack={user.stack} />
              </div>
              <span className="text-muted-foreground text-[10px] font-medium opacity-40 leading-none">· {timestamp}</span>
            </div>
            
            <div className="flex items-center gap-2 relative" ref={dropdownRef}>
                {onFollow && user.id !== currentUserId && (
                    <button 
                        onClick={(e) => {
                            e.stopPropagation();
                            onFollow(user.id, !!isFollowing);
                        }}
                        className={cn(
                            "flex items-center gap-1.5 px-3 py-1 rounded-xl border text-[9px] font-black uppercase tracking-widest transition-all active:scale-95 shadow-sm shadow-black/5",
                            isFollowing 
                                ? "bg-primary/10 border-primary/20 text-primary" 
                                : "bg-white/5 border-white/10 text-muted-foreground/60 hover:border-primary/40 hover:text-primary"
                        )}
                    >
                        {isFollowing ? <><UserCheck size={10} /> Following</> : '+ Follow'}
                    </button>
                )}

                <HubTooltip text="More Options">
                    <button 
                        onClick={() => setShowDropdown(!showDropdown)}
                        className="p-1.5 rounded-lg text-muted-foreground/40 hover:text-foreground hover:bg-accent transition-all outline-none"
                    >
                        <MoreHorizontal size={18} />
                    </button>
                </HubTooltip>

                {showDropdown && (
                    <div className="absolute right-0 mt-2 top-full w-48 rounded-2xl bg-popover border border-border shadow-2xl p-1.5 z-20 animate-in fade-in zoom-in-95 duration-200">
                        {onFriendRequest && user.id !== currentUserId && (
                            <button 
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onFriendRequest(user.id, isFriend || 'none');
                                    setShowDropdown(false);
                                }}
                                className={cn(
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left",
                                    isFriend === 'accepted' ? "text-emerald-500 hover:bg-emerald-500/10" :
                                    isFriend === 'pending' ? "text-amber-500 hover:bg-amber-500/10" :
                                    "text-muted-foreground hover:text-foreground hover:bg-accent"
                                )}
                            >
                                <Users size={14} />
                                {isFriend === 'accepted' ? 'Joined Friends' : isFriend === 'pending' ? 'Request Sent' : 'Add Friend'}
                            </button>
                        )}

                        <div className="h-px bg-border/20 my-1 mx-2" />

                        <button 
                            onClick={() => {
                                onReport?.(id, user.id);
                                setShowDropdown(false);
                            }}
                            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all text-left"
                        >
                            <Flag size={14} />
                            Report Post
                        </button>

                        {user.id !== currentUserId && (
                            <button 
                                onClick={() => {
                                    onBlock?.(user.id);
                                    setShowDropdown(false);
                                }}
                                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold text-muted-foreground hover:text-red-500 hover:bg-red-500/10 transition-all text-left"
                            >
                                <ShieldAlert size={14} />
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
                                    "w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs font-bold transition-all text-left mt-0.5",
                                    showConfirmDelete ? "text-white bg-red-500" : "text-muted-foreground hover:text-red-500 hover:bg-red-500/10"
                                )}
                            >
                                <Trash2 size={14} />
                                {showConfirmDelete ? 'Confirm Delete' : 'Delete Post'}
                            </button>
                        )}
                    </div>
                )}
            </div>
          </div>

          <div className="space-y-4 mb-6">
               <div className="markdown-content w-full text-foreground/90">
                    <ReactMarkdown 
                        remarkPlugins={[remarkGfm]}
                        components={MarkdownComponents}
                    >
                        {content.prompt}
                    </ReactMarkdown>
               </div>

               {content.response_preview?.trim() && (
                 <div className="space-y-3 mt-6">
                    <div className="relative group/response">
                        <div className={cn(
                            "rounded-3xl bg-muted/40 dark:bg-black/40 p-6 border border-border/50 relative transition-all duration-300",
                            !isExpanded && "max-h-[160px] overflow-hidden"
                        )}>
                            <div className="text-xs leading-relaxed text-muted-foreground pr-12">
                                {viewMode === 'markdown' ? (
                                    <div className="markdown-content system-prompt-markdown opacity-70">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {content.response_preview}
                                        </ReactMarkdown>
                                    </div>
                                ) : (
                                    <div className="font-mono whitespace-pre-wrap break-words opacity-50">
                                        {content.response_preview}
                                    </div>
                                )}
                            </div>
                            {!isExpanded && content.response_preview.length > 200 && (
                                <div className="absolute inset-x-0 bottom-0 h-12 bg-gradient-to-t from-card/60 to-transparent pointer-events-none" />
                            )}
                        </div>
                        
                        <div className="absolute top-4 right-4 flex items-center gap-2 opacity-0 group-hover/response:opacity-100 transition-opacity z-10">
                            <HubTooltip text={viewMode === 'markdown' ? "Show Raw" : "Show Formatted"}>
                                <button 
                                    onClick={() => setViewMode(viewMode === 'markdown' ? 'raw' : 'markdown')}
                                    className={cn(
                                        "p-2 rounded-xl bg-background/80 backdrop-blur-md border border-border transition-all flex items-center shadow-xl",
                                        viewMode === 'raw' ? "text-primary border-primary/30" : "text-muted-foreground hover:text-primary"
                                    )}
                                >
                                    {viewMode === 'markdown' ? <Code size={12} /> : <Eye size={12} />}
                                </button>
                            </HubTooltip>

                            <HubTooltip text={isExpanded ? "Collapse" : "Expand"}>
                                <button 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="p-2 rounded-xl bg-background/80 backdrop-blur-md border border-border text-muted-foreground hover:text-primary transition-all flex items-center shadow-xl"
                                >
                                    {isExpanded ? <ChevronUp size={12} /> : <Maximize2 size={12} />}
                                </button>
                            </HubTooltip>
                        </div>

                        <div className="flex items-center justify-between gap-2 p-2.5 bg-muted/20 rounded-2xl border border-border/20 mt-3">
                             <div className="flex items-center gap-2 px-3 text-[10px] font-black text-muted-foreground/30 uppercase tracking-widest italic">
                                 <Terminal size={12} />
                                 System Prompt ({viewMode})
                             </div>
                             <div className="flex gap-2">
                                 <button 
                                    onClick={handleCopy}
                                    className={cn(
                                        "flex items-center gap-2 px-4 py-2 rounded-xl bg-accent text-foreground hover:text-primary transition-all text-[10px] font-black uppercase tracking-widest outline-none shadow-sm shadow-black/5",
                                        isCopied && "text-emerald-500"
                                    )}
                                 >
                                    {isCopied ? <><Check size={12} /> Copied</> : <><Copy size={12} /> Copy Prompt</>}
                                 </button>
                                 <button 
                                    onClick={() => onRun?.(content.response_preview)}
                                    className="flex items-center gap-3 px-5 py-2 rounded-xl bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all text-[10px] font-black uppercase tracking-widest outline-none shadow-xl shadow-primary/20"
                                 >
                                    <Play size={12} fill="currentColor" /> Run
                                 </button>
                             </div>
                        </div>
                    </div>
                 </div>
               )}
          </div>

          <div className="flex items-center justify-between text-foreground/60 pr-2">
            <div className="flex items-center gap-8">
                <HubTooltip text="Reply">
                    <button className="flex items-center gap-2 hover:text-primary transition-colors group/btn outline-none">
                        <MessageCircle size={16} className="group-hover/btn:scale-110 transition-transform opacity-60 group-hover/btn:opacity-100" />
                        <span className="text-[10px] font-bold opacity-60 group-hover/btn:opacity-100">{stats.replies}</span>
                    </button>
                </HubTooltip>
                {content.response_preview?.trim() && (
                  <HubTooltip text={isForked ? "Prompts Shared" : "Share Prompt"}>
                    <button className={cn(
                        "flex items-center gap-2 transition-colors group/btn outline-none",
                        isForked ? "text-amber-400" : "hover:text-amber-400"
                    )}>
                        <Zap size={16} className={cn(
                            "transition-all duration-300",
                            isForked ? "fill-current scale-110" : "group-hover/btn:scale-110 opacity-60 group-hover/btn:opacity-100"
                        )} />
                        <span className="text-[10px] font-bold opacity-60 group-hover/btn:opacity-100">{stats.forks}</span>
                    </button>
                  </HubTooltip>
                )}
                <HubTooltip text={isLiked ? "Unlike" : "Like"}>
                    <button 
                    onClick={(e) => {
                        e.stopPropagation();
                        onLike?.(id, !!isLiked);
                    }}
                    className={cn(
                        "flex items-center gap-2 transition-colors group/btn outline-none",
                        isLiked ? "text-pink-500" : "hover:text-pink-500"
                    )}
                    >
                        <Heart 
                        size={16} 
                        className={cn(
                            "transition-all duration-300", 
                            isLiked ? "animate-heart-pop fill-current" : "group-hover/btn:scale-110 opacity-60 group-hover/btn:opacity-100"
                        )} 
                        />
                        <span className="text-[10px] font-bold opacity-60 group-hover/btn:opacity-100">{stats.likes}</span>
                    </button>
                </HubTooltip>
            </div>
            
            <div className="flex items-center gap-4 opacity-40 group-hover:opacity-100 transition-opacity">
                <HubTooltip text="Share Post">
                    <button className="p-2 rounded-xl hover:bg-accent transition-colors outline-none">
                        <Share size={14} />
                    </button>
                </HubTooltip>
            </div>
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

type HubView = 'home' | 'explore' | 'rules' | 'friends' | 'messages';

interface MessagesViewProps {
    user: any;
    activeChatUserId: string | null;
    onlineUserIds: string[];
    handleReportPost: (postId: string | null, reportedUserId: string) => void;
    handleBlockUser: (targetUserId: string | null) => void;
    chatMessages: any[];
    msgInput: string;
    setMsgInput: (val: string) => void;
    handleSendMessage: () => void;
    friendsList: any[];
    blockedByMe: string[];
    whoBlockedMe: string[];
}

function MessagesView({
    user,
    activeChatUserId,
    onlineUserIds,
    handleReportPost,
    handleBlockUser,
    chatMessages,
    msgInput,
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
                                                    <div className="w-8 h-8 rounded-xl bg-primary/20 flex-shrink-0 flex items-center justify-center border border-primary/10 overflow-hidden shadow-lg mt-1">
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

function ProfileView({ 
    userId, 
    currentUserId,
    onClose
}: { 
    userId: string, 
    currentUserId?: string,
    onClose: () => void 
}) {
    const [profile, setProfile] = useState<any>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isEditingReadme, setIsEditingReadme] = useState(false);
    const [tempReadme, setTempReadme] = useState("");
    const [showDesignDrawer, setShowDesignDrawer] = useState(false);
    const [tempThemeColor, setTempThemeColor] = useState("#3b82f6");
    const [tempBannerUrl, setTempBannerUrl] = useState("");
    const [tempBio, setTempBio] = useState("");

    const handleSaveDesign = async () => {
        try {
            const session = await getSafeSession();
            const token = session?.access_token;
            if (!token || !profile) return;

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const res = await fetch(
                `${supabaseUrl}/rest/v1/user_settings?user_id=eq.${profile.user_id}&apikey=${supabaseAnonKey}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ 
                        profile_theme_color: tempThemeColor,
                        profile_banner_url: tempBannerUrl,
                        bio: tempBio
                    })
                }
            );

            if (res.ok) {
                setProfile({ 
                    ...profile, 
                    profile_theme_color: tempThemeColor, 
                    profile_banner_url: tempBannerUrl,
                    bio: tempBio
                });
                setShowDesignDrawer(false);
            }
        } catch (err) {
            console.error('Failed to save design', err);
        }
    };

    const handleSaveReadme = async () => {
        try {
            const session = await getSafeSession();
            const token = session?.access_token;
            if (!token || !profile) return;

            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
            const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

            const res = await fetch(
                `${supabaseUrl}/rest/v1/user_settings?user_id=eq.${profile.user_id}&apikey=${supabaseAnonKey}`,
                {
                    method: 'PATCH',
                    headers: {
                        'apikey': supabaseAnonKey,
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json',
                        'Prefer': 'return=minimal'
                    },
                    body: JSON.stringify({ readme: tempReadme })
                }
            );

            if (res.ok) {
                setProfile({ ...profile, readme: tempReadme });
                setIsEditingReadme(false);
            }
        } catch (err) {
            console.error('Failed to save readme', err);
        }
    };

    useEffect(() => {
        const fetchProfile = async () => {
            try {
                const session = await getSafeSession();
                const token = session?.access_token;
                if (!token) return;

                const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
                const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

                // Fetch profile data first (robustly)
                const res = await fetch(
                    `${supabaseUrl}/rest/v1/user_settings?user_id=eq.${userId}&select=*&apikey=${supabaseAnonKey}`,
                    { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } }
                );

                if (res.ok) {
                    const data = await res.json();
                    if (data[0]) {
                        setTempReadme(data[0].readme || "");
                        setTempThemeColor(data[0].profile_theme_color || "#3b82f6");
                        setTempBannerUrl(data[0].profile_banner_url || "");
                        setTempBio(data[0].bio || "");
                        
                        // Fetch stats in parallel to keep it fast but separate
                        const [postsRes, followersRes, followingRes] = await Promise.all([
                            fetch(`${supabaseUrl}/rest/v1/hub_posts?user_id=eq.${userId}&select=count&apikey=${supabaseAnonKey}`, { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } }),
                            fetch(`${supabaseUrl}/rest/v1/hub_follows?following_id=eq.${userId}&select=count&apikey=${supabaseAnonKey}`, { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } }),
                            fetch(`${supabaseUrl}/rest/v1/hub_follows?follower_id=eq.${userId}&select=count&apikey=${supabaseAnonKey}`, { headers: { 'apikey': supabaseAnonKey, 'Authorization': `Bearer ${token}` } })
                        ]);

                        const postsCount = postsRes.ok ? (await postsRes.json())[0]?.count || 0 : 0;
                        const followersCount = followersRes.ok ? (await followersRes.json())[0]?.count || 0 : 0;
                        const followingCount = followingRes.ok ? (await followingRes.json())[0]?.count || 0 : 0;

                        setProfile({
                            ...data[0],
                            posts_count: postsCount,
                            followers_count: followersCount,
                            following_count: followingCount
                        });
                    }
                }
            } catch (err) {
                console.error('Failed to fetch profile', err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [userId]);

    if (isLoading) return (
        <div className="h-full flex flex-col items-center justify-center opacity-20">
            <RefreshCw size={48} className="animate-spin mb-4" />
            <p className="text-sm font-black uppercase tracking-widest italic">Loading Profile...</p>
        </div>
    );

    if (!profile) return (
        <div className="h-full flex flex-col items-center justify-center opacity-20">
            <ShieldAlert size={48} className="mb-4" />
            <p className="text-sm font-black uppercase tracking-widest italic">User not found</p>
        </div>
    );

    const isOwnProfile = userId === currentUserId;
    const themeColor = profile?.profile_theme_color || '#3b82f6';

    return (
        <div 
            className="h-full flex flex-col animate-in fade-in slide-in-from-bottom-4 duration-700 bg-background/30 backdrop-blur-md overflow-hidden transition-colors"
            style={{ '--profile-theme': themeColor } as any}
        >
            {/* Profile Banner & Header */}
            <div className="relative h-64 flex-shrink-0 group/banner">
                {profile.profile_banner_url ? (
                    <img src={profile.profile_banner_url} className="absolute inset-0 w-full h-full object-cover opacity-60" />
                ) : (
                    <div 
                        className="absolute inset-0 opacity-20"
                        style={{ background: `linear-gradient(to bottom right, ${themeColor}, transparent)` }}
                    />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-background via-background/40 to-transparent" />
                
                <div className="absolute bottom-0 left-0 right-0 p-12 flex items-end gap-8">
                    <div className="relative group/avatar">
                        <div 
                            className="w-32 h-32 rounded-[40px] flex items-center justify-center border-4 border-background shadow-2xl text-4xl font-black italic overflow-hidden transition-transform duration-500 group-hover/avatar:scale-105"
                            style={{ 
                                backgroundColor: `${themeColor}20`,
                                color: themeColor,
                                borderColor: 'var(--background)'
                            }}
                        >
                            {profile.avatar_url ? (
                                <img src={profile.avatar_url} className="w-full h-full object-cover" />
                            ) : (
                                <span>{profile.display_name?.[0]}</span>
                            )}
                        </div>
                    </div>
                    <div className="flex-1 pb-2 text-left">
                        <div className="flex items-center gap-3 mb-2">
                            <h1 className="text-5xl font-black italic uppercase tracking-tighter leading-none">{profile.display_name}</h1>
                            <VerifiedBadge role={profile.role} className="scale-125" />
                        </div>
                        <p className="text-xs font-bold text-muted-foreground uppercase tracking-[0.3em] opacity-60">
                             @{profile.display_name.toLowerCase().replace(/\s/g, '_')} • {profile.role}
                        </p>
                    </div>
                    <div className="flex gap-4 pb-4">
                        {isOwnProfile ? (
                            <button 
                                onClick={() => setShowDesignDrawer(true)}
                                className="px-8 py-3 rounded-2xl bg-white/5 border border-white/10 text-xs font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center gap-2"
                            >
                                <Maximize2 size={14} /> Customize Page
                            </button>
                        ) : (
                            <button 
                                className="px-8 py-3 rounded-2xl text-white text-xs font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                                style={{ 
                                    backgroundColor: themeColor,
                                    boxShadow: `0 10px 25px -5px ${themeColor}40`
                                }}
                            >
                                Follow
                            </button>
                        )}
                    </div>
                </div>
                
                <button 
                  onClick={onClose}
                  className="absolute top-6 right-6 p-2 rounded-xl bg-white/5 border border-white/10 text-muted-foreground hover:text-foreground transition-all z-50"
                >
                    <ArrowLeft size={20} />
                </button>
            </div>

            {/* Customizer Drawer */}
            {isOwnProfile && showDesignDrawer && (
                <div className="fixed inset-0 z-[100] flex items-center justify-end animate-in fade-in duration-300">
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowDesignDrawer(false)} />
                    <div className="relative w-[400px] h-full bg-background border-l border-white/5 p-12 flex flex-col animate-in slide-in-from-right duration-500 shadow-2xl">
                        <div className="flex items-center justify-between mb-12">
                            <h2 className="text-2xl font-black italic uppercase tracking-tighter">Design Hub</h2>
                            <button onClick={() => setShowDesignDrawer(false)} className="p-2 opacity-40 hover:opacity-100 transition-all"><ChevronDown size={24} className="rotate-270" /></button>
                        </div>

                        <div className="flex-1 space-y-10 overflow-y-auto custom-scrollbar pr-4">
                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-4">Theme Color</h3>
                                <div className="flex flex-wrap gap-3">
                                    {['#3b82f6', '#8b5cf6', '#ec4899', '#f97316', '#10b981', '#ef4444', '#f59e0b', '#06b6d4'].map(color => (
                                        <button 
                                            key={color} 
                                            onClick={() => setTempThemeColor(color)}
                                            className={cn("w-10 h-10 rounded-xl transition-all", tempThemeColor === color ? "scale-110 ring-2 ring-white ring-offset-4 ring-offset-background" : "hover:scale-105 opacity-60 hover:opacity-100")}
                                            style={{ backgroundColor: color }}
                                        />
                                    ))}
                                    <input 
                                        type="color" 
                                        value={tempThemeColor} 
                                        onChange={(e) => setTempThemeColor(e.target.value)}
                                        className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 p-1 cursor-pointer"
                                    />
                                </div>
                            </section>

                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-4">Banner Image URL</h3>
                                <input 
                                    type="text" 
                                    value={tempBannerUrl}
                                    onChange={(e) => setTempBannerUrl(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-xs font-bold focus:outline-none focus:border-white/20 transition-all"
                                    placeholder="https://images.unsplash.com/..."
                                />
                            </section>

                            <section>
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-4">Short Bio</h3>
                                <textarea 
                                    value={tempBio}
                                    onChange={(e) => setTempBio(e.target.value)}
                                    className="w-full bg-white/5 border border-white/5 rounded-2xl p-4 text-xs font-bold h-24 focus:outline-none focus:border-white/20 transition-all"
                                    placeholder="Tell the community who you are..."
                                />
                            </section>
                        </div>

                        <div className="pt-8 mt-auto flex gap-4 border-t border-white/5">
                            <button 
                                onClick={() => setShowDesignDrawer(false)}
                                className="flex-1 py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-all"
                            >
                                Cancel
                            </button>
                            <button 
                                onClick={handleSaveDesign}
                                className="flex-1 py-4 rounded-2xl text-white text-[10px] font-black uppercase tracking-widest shadow-xl transition-all hover:scale-105 active:scale-95"
                                style={{ backgroundColor: tempThemeColor }}
                            >
                                Apply Design
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Content Area */}
            <div className="flex-1 px-12 py-8 overflow-y-auto custom-scrollbar">
                <div className="max-w-6xl mx-auto grid grid-cols-12 gap-12">
                    {/* Left Column: Info & Stats */}
                    <div className="col-span-12 lg:col-span-4 space-y-8">
                        {/* Stat Cards */}
                        <div className="grid grid-cols-2 gap-4">
                            <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 text-center group/stat hover:scale-105 transition-all cursor-default">
                                <div className="text-2xl font-black italic transition-colors" style={{ color: themeColor }}>{profile.followers_count || 0}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-40">Followers</div>
                            </div>
                            <div className="p-6 rounded-[32px] bg-white/5 border border-white/5 text-center group/stat hover:scale-105 transition-all cursor-default">
                                <div className="text-2xl font-black italic transition-colors" style={{ color: themeColor }}>{profile.following_count || 0}</div>
                                <div className="text-[9px] font-black uppercase tracking-widest opacity-40">Following</div>
                            </div>
                        </div>

                        {/* Quick Info Card */}
                        <div className="p-8 rounded-[40px] bg-white/5 border border-white/5 border-l-4" style={{ borderLeftColor: themeColor }}>
                            <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 mb-6 font-bold">About</h3>
                            <p className="text-sm font-medium opacity-60 leading-relaxed">
                                {profile.bio || "No bio provided yet. Add one to introduce yourself to the community!"}
                            </p>
                        </div>
                    </div>

                    {/* Right Column: Readme/Profile Details */}
                    <div className="col-span-12 lg:col-span-8 space-y-8 text-left">
                        <div className="p-12 rounded-[48px] bg-white/5 border border-white/5 min-h-[600px] relative overflow-hidden group/readme">
                            <div className="flex items-center justify-between mb-8">
                                <h3 className="text-[10px] font-black uppercase tracking-[0.3em] opacity-30 flex items-center gap-2 font-bold">
                                    <Code size={12} /> README.md
                                </h3>
                                {isOwnProfile && (
                                    <button 
                                        onClick={() => setIsEditingReadme(!isEditingReadme)}
                                        className="px-4 py-1.5 rounded-xl bg-primary/10 text-primary text-[10px] font-black uppercase tracking-widest hover:bg-primary/20 transition-all opacity-0 group-hover/readme:opacity-100"
                                    >
                                        {isEditingReadme ? "View MD" : "Edit MD"}
                                    </button>
                                )}
                            </div>

                            <div className="prose prose-invert max-w-none">
                                {isEditingReadme ? (
                                    <textarea 
                                        value={tempReadme}
                                        onChange={(e) => setTempReadme(e.target.value)}
                                        className="w-full h-[400px] bg-black/20 border border-white/10 rounded-3xl p-8 focus:outline-none focus:border-primary/40 transition-all font-mono text-sm leading-relaxed custom-scrollbar"
                                        placeholder="# Hello World! 🚀\nWrite your community profile here using Markdown..."
                                    />
                                ) : (
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                        {profile.readme || `# Welcome to ${profile.display_name}'s Profile\n\nThis user hasn't created a README yet. Check back soon for more info!`}
                                    </ReactMarkdown>
                                )}
                            </div>

                            {isEditingReadme && (
                                <div className="mt-8 flex justify-end gap-4">
                                    <button 
                                        onClick={() => setIsEditingReadme(false)}
                                        className="px-6 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest text-muted-foreground hover:text-foreground transition-all"
                                    >
                                        Cancel
                                    </button>
                                    <button 
                                        onClick={handleSaveReadme}
                                        className="px-8 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest shadow-lg shadow-primary/20 hover:scale-105 active:scale-95 transition-all"
                                    >
                                        Save Profile
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
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

  const handleToggleFriend = async (targetId: string, currentStatus: 'none' | 'pending' | 'accepted') => {
    if (!user || targetId === user.id) return
    try {
      const session = await getSafeSession();
      const token = session?.access_token;
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
              <RulesView />
          ) : activeProfileUserId ? (
              <ProfileView 
                userId={activeProfileUserId} 
                currentUserId={user?.id}
                onClose={() => onSetActiveProfileUserId(null)} 
              />
          ) : view === 'messages' ? (
              <div className="max-w-6xl mx-auto pb-6 px-6 h-full">
                  <MessagesView 
                    user={user}
                    activeChatUserId={activeChatUserId}
                    onlineUserIds={onlineUserIds}
                    handleReportPost={handleReportPost}
                    handleBlockUser={handleBlockUser}
                    chatMessages={chatMessages}
                    msgInput={msgInput}
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
                        return (
                            <div className="flex-1 flex flex-col items-center justify-center p-20 text-center opacity-20 min-h-[400px]">
                                <Users size={48} className="mb-6 opacity-20" />
                                <h3 className="text-2xl font-black uppercase tracking-tighter italic mb-3">Friends</h3>
                                <p className="text-xs font-bold uppercase tracking-widest max-w-xs leading-relaxed">
                                    Select a friend from the sidebar to view their profile or discover new connections in the "Explore" tab.
                                </p>
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
                                const friendStatus = rel ? rel.status : 'none';
                                
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
