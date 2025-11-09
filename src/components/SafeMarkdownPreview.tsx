/**
 * SafeMarkdownPreview - Markdown preview with external link handling
 * 
 * Ensures all links open in external browser instead of internal navigation
 */

import { useEffect, useRef } from 'react'
import { openUrl } from '@tauri-apps/plugin-opener'
import { cn } from '../lib/utils'

interface SafeMarkdownPreviewProps {
  html: string
  darkMode?: boolean
  className?: string
}

export function SafeMarkdownPreview({ html, darkMode = true, className }: SafeMarkdownPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null)

  // Handle link clicks to open in external browser
  useEffect(() => {
    const container = containerRef.current
    if (!container) return

    const handleClick = async (e: MouseEvent) => {
      const target = e.target as HTMLElement
      
      // Check if clicked element is a link or inside a link
      const link = target.closest('a[href]') as HTMLAnchorElement
      if (!link) return

      // Prevent default navigation
      e.preventDefault()
      e.stopPropagation()

      const href = link.getAttribute('href')
      if (!href) return

      try {
        console.log('[SafeMarkdownPreview] Opening external link:', href)
        // Open in external browser using Tauri
        await openUrl(href)
      } catch (error) {
        console.error('[SafeMarkdownPreview] Failed to open external link:', error)
        // Fallback: try window.open
        window.open(href, '_blank', 'noopener,noreferrer')
      }
    }

    container.addEventListener('click', handleClick)
    return () => container.removeEventListener('click', handleClick)
  }, [html])

  return (
    <div
      ref={containerRef}
      className={cn(
        "prose prose-sm max-w-none p-6",
        darkMode && "prose-invert",
        className
      )}
      style={{ 
        color: darkMode ? 'var(--color-foreground)' : '#1a1a1a',
        wordBreak: 'break-word',
        overflowWrap: 'break-word'
      }}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
