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
      text: 'text-blue-500',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" className="w-3 h-3">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      )
    },
    admin: {
      label: 'Admin',
      text: 'text-emerald-500',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
          <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
        </svg>
      )
    },
    owner: {
      label: 'Owner',
      text: 'text-amber-400',
      svg: (
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-4 h-4 drop-shadow-[0_0_8px_rgba(251,191,36,0.4)]">
          <path d="m2 4 3 12h14l3-12-6 7-4-7-4 7-6-7Z" />
          <path d="M12 17H12" />
        </svg>
      )
    },
    moderator: {
        label: 'Moderator',
        text: 'text-purple-500',
        svg: (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" className="w-3.5 h-3.5">
            <path d="M14.5 12.5L21 6L18 3L11.5 9.5L14.5 12.5Z" />
            <path d="M14.5 12.5L9.5 7.5L3 14L6 17L12.5 10.5L14.5 12.5Z" />
            <path d="M13 13L9 17H5V13L9 9" />
          </svg>
        )
      }
  }

  const badge = config[role as keyof typeof config] || config.verified

  return (
    <div className={cn("group/badge relative flex items-center justify-center shrink-0", className)}>
      <div className={cn(
        "flex items-center justify-center transition-all duration-500 group-hover/badge:scale-125 mb-[0.5px]",
        badge.text
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
