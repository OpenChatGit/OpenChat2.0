import { MessageSquare, Globe } from 'lucide-react'
import { cn } from '../lib/utils'

export type ActivityTab = 'chat' | 'hub'

interface ActivityBarProps {
  activeTab: ActivityTab
  onTabChange: (tab: ActivityTab) => void
}

export function ActivityBar({ activeTab, onTabChange }: ActivityBarProps) {
  return (
    <div 
      className="w-[60px] flex flex-col items-center py-4 border-r flex-shrink-0 z-[100]"
      style={{ 
        backgroundColor: 'var(--color-sidebar)',
        borderColor: 'var(--color-border)'
      }}
    >
      {/* Navigation Icons */}
      <div className="flex flex-col gap-4 w-full items-center">
        <ActivityIcon 
          icon={MessageSquare} 
          active={activeTab === 'chat'} 
          onClick={() => onTabChange('chat')}
          label="Chats"
        />
        <ActivityIcon 
          icon={Globe} 
          active={activeTab === 'hub'} 
          onClick={() => onTabChange('hub')}
          label="Chat Hub"
        />
      </div>
    </div>
  )
}

function ActivityIcon({ 
  icon: Icon, 
  active, 
  onClick,
  label 
}: { 
  icon: any; 
  active: boolean; 
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={cn(
        "p-3 rounded-xl transition-all duration-300 group relative",
        active 
          ? "bg-primary text-primary-foreground shadow-lg shadow-primary/20" 
          : "text-muted-foreground hover:bg-white/5 hover:text-foreground"
      )}
      title={label}
    >
      <Icon className={cn("w-5 h-5 transition-transform duration-300", active ? "scale-110" : "group-hover:scale-110")} />
      
      {/* Active Indicator Line */}
      {active && (
        <div className="absolute left-[-12px] top-1/2 -translate-y-1/2 w-1 h-8 bg-primary rounded-r-full" />
      )}
    </button>
  )
}
