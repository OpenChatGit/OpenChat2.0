import { useEffect, useState, useRef } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Prism from 'prismjs'
import { openUrl } from '@tauri-apps/plugin-opener'

// Import Prism languages
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-markup-templating'
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'

interface MarkdownRendererProps {
  content: string
}

// Configure marked with custom renderer for code blocks and links
const renderer = new marked.Renderer()

// Custom link renderer to open in external browser
renderer.link = ({ href, title, tokens }: any) => {
  const text = tokens && tokens.length > 0 ? tokens[0].text : href
  const titleAttr = title ? ` title="${title}"` : ''
  return `<a href="${href}"${titleAttr} target="_blank" rel="noopener noreferrer" data-external-link="true">${text}</a>`
}

// Custom code block renderer with Prism highlighting
renderer.code = ({ text, lang }: any) => {
  const codeString = String(text || '')
  const language = String(lang || '')
  const validLanguage = language && Prism.languages[language] ? language : 'plaintext'
  
  try {
    const highlighted = validLanguage !== 'plaintext' && Prism.languages[validLanguage]
      ? Prism.highlight(codeString, Prism.languages[validLanguage], validLanguage)
      : codeString.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    return `<pre class="language-${validLanguage}"><code class="language-${validLanguage}">${highlighted}</code></pre>`
  } catch (error) {
    console.error('Prism highlighting error:', error)
    // Fallback to escaped code
    const escaped = codeString.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    return `<pre class="language-${validLanguage}"><code class="language-${validLanguage}">${escaped}</code></pre>`
  }
}

marked.setOptions({
  breaks: true,
  gfm: true,
  renderer: renderer,
})

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const [html, setHtml] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        // Parse markdown (code highlighting is done in the renderer)
        const rawHtml = await marked.parse(content)
        
        // Sanitize HTML
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['iframe'],
          ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'class', 'target', 'rel', 'data-external-link'],
        })
        
        setHtml(cleanHtml)
      } catch (error) {
        console.error('Markdown parsing error:', error)
        setHtml(content)
      }
    }

    renderMarkdown()
  }, [content])

  // Re-highlight code blocks after render (fixes highlighting after navigation)
  useEffect(() => {
    if (html) {
      // Small delay to ensure DOM is updated
      setTimeout(() => {
        Prism.highlightAll()
      }, 0)
    }
  }, [html])

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
        console.log('[MarkdownRenderer] Opening external link:', href)
        // Open in external browser using Tauri
        await openUrl(href)
      } catch (error) {
        console.error('[MarkdownRenderer] Failed to open external link:', error)
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
      className="prose prose-invert max-w-none markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        color: 'var(--color-foreground)',
        lineHeight: '1.75',
      }}
    />
  )
}
