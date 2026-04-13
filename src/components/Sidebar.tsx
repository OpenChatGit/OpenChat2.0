import { useState } from 'react'
import { 
  Plus, 
  MessageSquare, 
  Search, 
  Zap,
  Cpu,
  MoreVertical,
  Trash2,
  Edit2
} from 'lucide-react'
import { cn } from '../lib/utils'
import type { ChatSession } from '../types'
import { ProfileButton } from './ProfileButton'

interface SidebarProps {
  sessions: ChatSession[]
  currentSession: ChatSession | null
  onNewChat: () => void
  onSelectSession: (session: ChatSession) => void
  onDeleteSession: (sessionId: string) => void
  onRenameSession: (sessionId: string, newTitle: string) => void
  onOpenSettings: () => void
}

export function Sidebar({ 
  sessions, 
  currentSession, 
  onNewChat, 
  onSelectSession, 
  onDeleteSession, 
  onRenameSession,
  onOpenSettings
}: SidebarProps) {
  const [searchQuery, setSearchQuery] = useState('')
  const [openMenuId, setOpenMenuId] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editTitle, setEditTitle] = useState('')

  const handleRename = (id: string, title: string) => {
    setEditingId(id)
    setEditTitle(title)
    setOpenMenuId(null)
  }

  const submitRename = (id: string) => {
    if (editTitle.trim()) {
      onRenameSession(id, editTitle)
    }
    setEditingId(null)
  }

  const filteredSessions = sessions.filter(s => 
    s.title.toLowerCase().includes(searchQuery.toLowerCase())
  )

  return (
    <div className="flex flex-col h-full border-r" style={{ backgroundColor: 'var(--color-sidebar)', borderColor: 'var(--color-border)' }}>
      {/* Header */}
      <div className="p-3 mb-2">
        <button
          onClick={onNewChat}
          className="w-full h-11 flex items-center gap-3 px-4 rounded-xl transition-all group"
          style={{ backgroundColor: 'var(--color-secondary)', border: '1px solid var(--color-border)' }}
        >
          <Plus size={18} className="opacity-60 group-hover:opacity-100" />
          <span className="text-sm font-semibold opacity-80 group-hover:opacity-100">New Chat</span>
        </button>
      </div>

      {/* Search */}
      <div className="px-3 mb-4">
        <div className="relative group">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 opacity-30 group-focus-within:opacity-60 transition-colors" />
          <input
            type="text"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-9 pl-9 pr-4 rounded-lg bg-muted/30 border border-transparent focus:border-border outline-none text-xs placeholder:opacity-20 transition-all font-medium"
          />
        </div>
      </div>

      {/* Sessions List */}
      <div className="flex-1 overflow-y-auto px-2 space-y-1 custom-scrollbar">
        {filteredSessions.map((session) => (
          <div
            key={session.id}
            className={cn(
              "group relative flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all",
              currentSession?.id === session.id 
                ? "bg-primary/10 text-primary" 
                : "opacity-40 hover:bg-muted/50 hover:opacity-100"
            )}
            onClick={() => onSelectSession(session)}
          >
            <MessageSquare size={16} className="shrink-0 opacity-40 group-hover:opacity-100" />
            
            {editingId === session.id ? (
              <input
                autoFocus
                value={editTitle}
                onChange={(e) => setEditTitle(e.target.value)}
                onBlur={() => submitRename(session.id)}
                onKeyDown={(e) => e.key === 'Enter' && submitRename(session.id)}
                className="flex-1 bg-transparent border-none outline-none text-xs text-white"
              />
            ) : (
              <span className="flex-1 text-xs truncate font-medium">
                {session.title}
              </span>
            )}

            {/* 3-Dot Menu */}
            <div className="relative flex items-center">
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  setOpenMenuId(openMenuId === session.id ? null : session.id)
                }}
                className="p-1 rounded hover:bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <MoreVertical size={14} />
              </button>

              {openMenuId === session.id && (
                <div 
                  className="absolute right-0 top-6 z-50 w-32 py-1 rounded-xl shadow-xl border animate-in fade-in zoom-in-95 duration-200"
                  style={{ backgroundColor: 'var(--color-popover)', borderColor: 'var(--color-border)' }}
                >
                  <button
                    onClick={(e) => { e.stopPropagation(); handleRename(session.id, session.title); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold hover:bg-muted/50 transition-colors"
                  >
                    <Edit2 size={12} /> Rename
                  </button>
                  <button
                    onClick={(e) => { e.stopPropagation(); onDeleteSession(session.id); setOpenMenuId(null); }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-[10px] font-bold text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Footer */}
      <div className="p-3">
        <ProfileButton onOpenSettings={onOpenSettings} />
      </div>
    </div>
  )
}
