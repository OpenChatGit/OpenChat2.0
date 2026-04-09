import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faCheck } from '@fortawesome/free-solid-svg-icons'
import contentCopyIcon from '../assets/content_copy.svg'
import { MarkdownRenderer } from './MarkdownRenderer'

interface ReasoningBlockProps {
  content: string
  isComplete?: boolean
}

export function ReasoningBlock({ content, isComplete = false }: ReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(!isComplete)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  // Auto-close when reasoning completes, auto-open when it starts
  useEffect(() => {
    if (isComplete) {
      setIsExpanded(false)
    } else {
      setIsExpanded(true)
    }
  }, [isComplete])

  // Auto-scroll to bottom of reasoning block
  useEffect(() => {
    if (scrollRef.current && isExpanded && !isComplete) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight
    }
  }, [content, isExpanded, isComplete])

  return (
    <div className="mb-2">
      {/* Header row: toggle on the left, copy button on the right when expanded */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-gray-300 transition-colors"
        >
          <span>{isComplete ? 'Finished Reasoning' : 'Reasoning...'}</span>
          <FontAwesomeIcon 
            icon={isExpanded ? faChevronUp : faChevronDown} 
            className="w-3 h-3"
          />
        </button>

        {isExpanded && (
          <button
            onClick={() => {
              navigator.clipboard.writeText(content)
              setCopied(true)
              setTimeout(() => setCopied(false), 1500)
            }}
            className="rounded hover:bg-white/10 transition-colors flex items-center justify-center leading-none"
            title={copied ? 'Copied!' : 'Copy reasoning'}
            aria-label={copied ? 'Copied' : 'Copy reasoning'}
            style={{ width: '28px', height: '28px' }}
          >
            {copied ? (
              <FontAwesomeIcon icon={faCheck} className="w-4 h-4" />
            ) : (
              <img src={contentCopyIcon} alt="Copy" className="w-4 h-4" />
            )}
          </button>
        )}
      </div>

      {/* Reasoning Content */}
      {isExpanded && (
        <div 
          ref={scrollRef}
          className="mt-2 text-sm rounded-lg p-3 overflow-y-auto prose prose-invert prose-sm scroll-smooth"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.03)',
            color: '#9CA3AF',
            maxHeight: '300px',
            maxWidth: 'none'
          }}
        >
          <MarkdownRenderer content={content} />
        </div>
      )}
    </div>
  )
}
