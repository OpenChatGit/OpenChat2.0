import React, { ReactNode } from 'react'
import { cn } from '../lib/utils'

interface HubTooltipProps {
  children: ReactNode
  text: string
  className?: string
  position?: 'top' | 'bottom' | 'left' | 'right'
}

export function HubTooltip({ children, text, className, position = 'top' }: HubTooltipProps) {
  const positionClasses = {
    top: "bottom-full left-1/2 -translate-x-1/2 mb-2 group-hover/tooltip:translate-y-0 translate-y-1",
    bottom: "top-full left-1/2 -translate-x-1/2 mt-2 group-hover/tooltip:translate-y-0 -translate-y-1",
    left: "right-full top-1/2 -translate-y-1/2 mr-2 group-hover/tooltip:translate-x-0 translate-x-1",
    right: "left-full top-1/2 -translate-y-1/2 ml-2 group-hover/tooltip:translate-x-0 -translate-x-1"
  }

  return (
    <div className={cn("group/tooltip relative inline-flex items-center justify-center", className)}>
      {children}
      
      <div className={cn(
        "absolute opacity-0 group-hover/tooltip:opacity-100 invisible group-hover/tooltip:visible transition-all duration-200 pointer-events-none whitespace-nowrap z-[100]",
        "px-2.5 py-1.5 rounded-lg bg-foreground text-background text-[9px] font-black uppercase tracking-[0.2em] shadow-2xl",
        positionClasses[position]
      )}>
        {text}
        <div className={cn(
            "absolute w-2 h-2 bg-foreground rotate-45 -z-10",
            position === 'top' && "bottom-[-4px] left-1/2 -translate-x-1/2",
            position === 'bottom' && "top-[-4px] left-1/2 -translate-x-1/2",
            position === 'left' && "right-[-4px] top-1/2 -translate-y-1/2",
            position === 'right' && "left-[-4px] top-1/2 -translate-y-1/2"
        )} />
      </div>
    </div>
  )
}
