import { useEffect, useState } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import Prism from 'prismjs'

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

// Configure marked with custom renderer for code blocks
const renderer = new marked.Renderer()

// Custom code block renderer with Prism highlighting
renderer.code = (codeInput: any, languageInput: any) => {
  // Handle both string and object inputs from marked
  let codeString = ''
  let language = ''
  
  // Check if codeInput is an object (marked v12+ format)
  if (typeof codeInput === 'object' && codeInput !== null) {
    codeString = String(codeInput.text || codeInput.raw || '')
    language = String(codeInput.lang || languageInput || '')
  } else {
    // Legacy format (string)
    codeString = String(codeInput || '')
    language = String(languageInput || '')
  }
  
  const validLanguage = language && Prism.languages[language] ? language : 'plaintext'
  
  try {
    const highlighted = validLanguage !== 'plaintext' && Prism.languages[validLanguage]
      ? Prism.highlight(codeString, Prism.languages[validLanguage], validLanguage)
      : codeString.replace(/</g, '&lt;').replace(/>/g, '&gt;')
    
    return `<pre class="language-${validLanguage}"><code class="language-${validLanguage}">${highlighted}</code></pre>`
  } catch (error) {
    console.error('Prism highlighting error:', error, { codeInput, languageInput })
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

  useEffect(() => {
    const renderMarkdown = async () => {
      try {
        // Parse markdown (code highlighting is done in the renderer)
        const rawHtml = await marked.parse(content)
        
        // Sanitize HTML
        const cleanHtml = DOMPurify.sanitize(rawHtml, {
          ADD_TAGS: ['iframe'],
          ADD_ATTR: ['allow', 'allowfullscreen', 'frameborder', 'scrolling', 'class'],
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

  return (
    <div
      className="prose prose-invert max-w-none markdown-content"
      dangerouslySetInnerHTML={{ __html: html }}
      style={{
        color: 'var(--color-foreground)',
        lineHeight: '1.75',
      }}
    />
  )
}
