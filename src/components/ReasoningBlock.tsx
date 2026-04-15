import { useState, useRef, useEffect } from 'react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faChevronDown, faChevronUp, faCheck } from '@fortawesome/free-solid-svg-icons'
import contentCopyIcon from '../assets/content_copy.svg'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { SourceRegistry } from '../lib/web-search/sourceRegistry'

interface ReasoningBlockProps {
  content: string
  isComplete?: boolean
  status?: string
  sources?: Array<{url: string, title: string}>
  sourceRegistry?: SourceRegistry
}

export function ReasoningBlock({ 
  content, 
  isComplete = false, 
  status, 
  sources = [], 
  sourceRegistry 
}: ReasoningBlockProps) {
  const [isExpanded, setIsExpanded] = useState(!isComplete)
  const [copied, setCopied] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)
  const [elapsedSeconds, setElapsedSeconds] = useState(0)
  const startTimeRef = useRef<number>(Date.now())

  // Timer logic for live feedback
  useEffect(() => {
    if (isComplete) {
      // Final calculation when done
      setElapsedSeconds(Math.round((Date.now() - startTimeRef.current) / 1000))
      return
    }

    const interval = setInterval(() => {
      setElapsedSeconds(Math.round((Date.now() - startTimeRef.current) / 1000))
    }, 1000)

    return () => clearInterval(interval)
  }, [isComplete])

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
          <div className="flex items-center gap-2">
            {!isComplete && (
               <svg className="w-3.5 h-3.5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
               </svg>
            )}
            {isComplete && <FontAwesomeIcon icon={faCheck} className="w-3 h-3 text-emerald-500" />}
            
            <span className="font-medium">
              {(() => {
                if (!isComplete) {
                  return status === 'searching' 
                    ? `Searching web... (${elapsedSeconds}s)` 
                    : `Thinking... (${elapsedSeconds}s)`;
                }
                return sources.length > 0 
                  ? `Finished Reasoning with Tools (${elapsedSeconds}s)` 
                  : `Thought for ${elapsedSeconds}s`;
              })()}
            </span>
            
            {/* Favicons integrated in the reasoning header */}
            {isComplete && sources.length > 0 && (
              <div className="flex items-center gap-1 ml-1">
                {sources.slice(0, 5).map((source: any, idx: number) => {
                  const sourceId = sourceRegistry?.getSourceIdByUrl(source.url)
                  return (
                    <div
                      key={idx}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (sourceId !== undefined) {
                          window.dispatchEvent(new CustomEvent('highlightCitation', {
                            detail: { sourceId }
                          }))
                          setTimeout(() => {
                            window.dispatchEvent(new CustomEvent('highlightCitation', {
                              detail: { sourceId: null }
                            }))
                          }, 3000)
                        }
                      }}
                      className="hover:opacity-100 transition-opacity cursor-pointer"
                      title={`${source.title} - Click to highlight citations`}
                    >
                      <img
                        src={`https://www.google.com/s2/favicons?domain=${source.url}&sz=16`}
                        alt={source.title}
                        className="w-4 h-4 rounded-sm opacity-70"
                      />
                    </div>
                  )
                })}
              </div>
            )}
          </div>
          
          <FontAwesomeIcon 
            icon={isExpanded ? faChevronUp : faChevronDown} 
            className="w-3 h-3 ml-1"
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
          className="mt-2 text-sm rounded-lg p-4 overflow-y-auto scroll-smooth border-l-2 border-border/40"
          style={{ 
            backgroundColor: 'rgba(255, 255, 255, 0.02)',
            color: '#9CA3AF',
            maxHeight: '400px',
            maxWidth: 'none'
          }}
        >
          <ReactMarkdown 
            remarkPlugins={[remarkGfm]}
            components={{
              p: ({node, ...props}) => <p className="mb-3 last:mb-0 leading-relaxed italic" {...props} />,
              ul: ({node, ...props}) => <ul className="list-disc pl-5 mb-3 space-y-1 italic" {...props} />,
              ol: ({node, ...props}) => <ol className="list-decimal pl-5 mb-3 space-y-1 italic" {...props} />,
              li: ({node, ...props}) => <li className="mb-0.5" {...props} />,
              strong: ({node, ...props}) => <strong className="font-medium text-gray-300" {...props} />,
              code: ({node, ...props}) => <code className="bg-white/5 px-1 rounded text-xs" {...props} />,
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  )
}
