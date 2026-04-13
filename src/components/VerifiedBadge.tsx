import { cn } from '../lib/utils'

export type UserRole = 'user' | 'verified' | 'admin' | 'owner' | 'moderator'

interface VerifiedBadgeProps {
  role: UserRole
  className?: string
}

export function VerifiedBadge({ role, className }: VerifiedBadgeProps) {
  if (role === 'user') return null

  const config = {
    verified: {
      label: 'Verified',
      color: 'from-blue-500 to-sky-400',
      glow: 'shadow-blue-500/20',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px] text-white">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    },
    admin: {
      label: 'Admin',
      color: 'from-emerald-500 to-teal-400',
      glow: 'shadow-emerald-500/20',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px] text-white">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      )
    },
    owner: {
      label: 'Owner',
      color: 'from-amber-400 to-orange-500',
      glow: 'shadow-orange-500/40',
      svg: (
        <svg viewBox="0 0 24 24" fill="currentColor" className="w-[10px] h-[10px] text-white">
           <path d="M5 16L3 5L8.5 10L12 4L15.5 10L21 5L19 16H5Z" />
           <rect x="5" y="18" width="14" height="2" />
        </svg>
      )
    },
    moderator: {
        label: 'Moderator',
        color: 'from-purple-500 to-pink-500',
        glow: 'shadow-purple-500/20',
        svg: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-[10px] h-[10px] text-white">
            <path d="M14.5 12.5L21 6L18 3L11.5 9.5L14.5 12.5Z" />
            <path d="M14.5 12.5L9.5 7.5L3 14L6 17L12.5 10.5L14.5 12.5Z" />
            <path d="M13 13L9 17H5V13L9 9" />
          </svg>
        )
      }
  }

  const badge = config[role as keyof typeof config] || config.verified

  return (
    <div className={cn("group/badge relative flex items-center justify-center", className)}>
      <div className={cn(
        "p-1 rounded-full bg-gradient-to-br shadow-lg group-hover/badge:scale-110 group-hover/badge:rotate-[360deg] transition-all duration-500 flex items-center justify-center",
        badge.color,
        badge.glow
      )}>
        {badge.svg}
      </div>
      
      {/* Tooltip on hover */}
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1.5 rounded-xl bg-foreground text-background text-[10px] font-black uppercase tracking-[0.1em] italic opacity-0 invisible group-hover/badge:opacity-100 group-hover/badge:visible group-hover/badge:translate-y-0 translate-y-1 transition-all pointer-events-none whitespace-nowrap shadow-2xl z-50">
        {badge.label}
      </div>
    </div>
  )
}
