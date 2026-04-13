import { Cpu } from 'lucide-react'
import { HubTooltip } from './HubTooltip'
import { cn } from '../lib/utils'

interface StackBadgesProps {
  stack?: string[]
  className?: string
  size?: number
}

const CDN_BASE = 'https://unpkg.com/@lobehub/icons-static-svg@latest/icons/'

const PLATFORM_CONFIG: Record<string, { slug?: string, fallbackIcon?: any, label: string, color: string }> = {
  'ollama': { 
    slug: 'ollama', 
    label: 'Ollama User', 
    color: '#ffffff' 
  },
  'lm-studio': { 
    slug: 'lmstudio', 
    label: 'LM Studio User', 
    color: '#6C78EF' 
  },
  'open-webui': { 
    slug: 'openwebui', 
    label: 'OpenWebUI User', 
    color: '#ffffff' 
  },
  'other': { 
    fallbackIcon: Cpu, 
    label: 'Custom AI Stack', 
    color: '#9455d3' 
  }
}

export function StackBadges({ stack, className, size = 16 }: StackBadgesProps) {
  if (!stack || stack.length === 0) return null;

  return (
    <div className={cn("flex items-center gap-2", className)}>
      {stack.map((item) => {
        const config = PLATFORM_CONFIG[item] || PLATFORM_CONFIG['other'];
        const iconUrl = config.slug ? `${CDN_BASE}${config.slug}.svg` : null;
        
        return (
          <HubTooltip key={item} text={config.label} position="top">
            <div 
              className="transition-all hover:scale-125 hover:brightness-110 flex items-center justify-center active:scale-95"
              style={{ width: size, height: size }}
            >
              {iconUrl ? (
                <div 
                  style={{
                    width: '100%',
                    height: '100%',
                    backgroundColor: config.color,
                    maskImage: `url(${iconUrl})`,
                    WebkitMaskImage: `url(${iconUrl})`,
                    maskSize: 'contain',
                    WebkitMaskSize: 'contain',
                    maskRepeat: 'no-repeat',
                    WebkitMaskRepeat: 'no-repeat',
                    maskPosition: 'center',
                    WebkitMaskPosition: 'center'
                  }}
                />
              ) : (
                <config.fallbackIcon size={size} style={{ color: config.color }} strokeWidth={2.5} />
              )}
            </div>
          </HubTooltip>
        );
      })}
    </div>
  );
}
