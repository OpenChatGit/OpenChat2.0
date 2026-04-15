import React from 'react';
import { ReasoningBlock } from '../ReasoningBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CitationParser } from '../../lib/citations/citationParser';
import type { SourceRegistry } from '../../lib/web-search/sourceRegistry';

interface MarkdownBlockProps {
  content: string;
  sourceRegistry?: SourceRegistry;
}

const MarkdownBlock: React.FC<MarkdownBlockProps> = ({ content, sourceRegistry }) => {
  let processedContent = content;
  if (sourceRegistry) {
    const citations = CitationParser.parse(processedContent);
    if (citations.length > 0) {
      const sortedCitations = [...citations].sort((a, b) => b.startIndex - a.startIndex);
      sortedCitations.forEach((citation) => {
        const replacement = `[${citation.sourceId}]`;
        processedContent = processedContent.substring(0, citation.startIndex) + replacement + processedContent.substring(citation.endIndex);
      });
    }
  }
  return (
    <div className="markdown-content">
      <ReactMarkdown 
        remarkPlugins={[remarkGfm]}
        components={{
          h1: ({node, ...props}) => <h1 className="text-2xl font-bold mt-6 mb-4" {...props} />,
          h2: ({node, ...props}) => <h2 className="text-xl font-bold mt-5 mb-3" {...props} />,
          h3: ({node, ...props}) => <h3 className="text-lg font-bold mt-4 mb-2" {...props} />,
          p: ({node, ...props}) => <p className="mb-4 last:mb-0 leading-relaxed" {...props} />,
          ul: ({node, ...props}) => <ul className="list-disc pl-6 mb-4 space-y-2" {...props} />,
          ol: ({node, ...props}) => <ol className="list-decimal pl-6 mb-4 space-y-2" {...props} />,
          li: ({node, ...props}) => <li className="mb-1" {...props} />,
          code: ({node, inline, className, children, ...props}: any) => {
            return !inline ? (
              <pre className="p-4 rounded-lg bg-secondary/50 overflow-x-auto my-4 border border-border/50">
                <code className={className} {...props}>
                  {children}
                </code>
              </pre>
            ) : (
              <code className="px-1.5 py-0.5 rounded bg-secondary/80 text-sm font-mono" {...props}>
                {children}
              </code>
            )
          },
          blockquote: ({node, ...props}) => (
            <blockquote className="border-l-4 border-primary/20 pl-4 italic my-4 text-muted-foreground" {...props} />
          ),
          table: ({node, ...props}) => (
            <div className="overflow-x-auto my-6">
              <table className="w-full border-collapse border border-border" {...props} />
            </div>
          ),
          th: ({node, ...props}) => <th className="border border-border p-3 bg-secondary/30 font-semibold" {...props} />,
          td: ({node, ...props}) => <td className="border border-border p-3" {...props} />,
        }}
      >
        {processedContent}
      </ReactMarkdown>
    </div>
  );
};

interface ThinkingBlockProps {
  content: string;
  isComplete: boolean;
  status?: string;
  sources?: Array<{url: string, title: string}>;
  sourceRegistry?: SourceRegistry;
}

const ThinkingBlock: React.FC<ThinkingBlockProps> = ({ content, isComplete, status, sources, sourceRegistry }) => {
  return (
    <ReasoningBlock 
      content={content} 
      isComplete={isComplete} 
      status={status}
      sources={sources}
      sourceRegistry={sourceRegistry}
    />
  );
};

interface LLMResponseProps {
  content: string;
  isStreaming: boolean;
  sourceRegistry?: SourceRegistry;
  status?: string;
  sources?: Array<{url: string, title: string}>;
}

export const LLMResponse: React.FC<LLMResponseProps> = React.memo(({ content, isStreaming, sourceRegistry, status, sources }) => {
  const [isReasoningComplete, setIsReasoningComplete] = React.useState(false);
  
  // Check if content has complete reasoning block
  React.useEffect(() => {
    const hasCompleteReasoning = 
      content.match(/<redacted_thinking>([\s\S]*?)<\/redacted_thinking>/i) ||
      content.match(/<(think|thought|reasoning)>([\s\S]*?)<\/\1>/i);
    
    const hasOpenReasoning = 
      content.match(/<redacted_thinking>(?![\s\S]*<\/redacted_thinking>)/i) ||
      content.match(/<(think|thought|reasoning)>(?![\s\S]*<\/\1>)/i);

    if (hasCompleteReasoning && !hasOpenReasoning) {
      setIsReasoningComplete(true);
    } else if (hasOpenReasoning && isStreaming) {
      setIsReasoningComplete(false);
    } else if (!hasOpenReasoning && !hasCompleteReasoning) {
      setIsReasoningComplete(true);
    }
  }, [content, isStreaming]);

  // Parse blocks manually
  const blocks = React.useMemo(() => {
    const blocks: Array<{ type: 'thinking' | 'markdown', content: string, isComplete?: boolean }> = [];
    
    // 1. Tag-based reasoning (the standard)
    const reasoningRegex = /<(redacted_thinking|think|thought|reasoning)>([\s\S]*?)(?:<\/\1>|$)/gi;
    
    // 2. Pattern-based reasoning detection (streaming-friendly)
    // We look for common markers at the beginning of the content
    const plainTextMarkers = [
      'Thinking Process:',
      'Thought Process:',
      'Analyze the Request:',
      '1. Analyze the Request:',
      '### Thinking Process:'
    ];

    let lastIndex = 0;
    let match: RegExpExecArray | null;
    let workingContent = content;
    let isCurrentlyInPlainTextReasoning = false;

    // Check if the content starts with a plain text reasoning marker
    for (const marker of plainTextMarkers) {
      if (content.trim().startsWith(marker)) {
        isCurrentlyInPlainTextReasoning = true;
        break;
      }
    }

    // If we're in plain text reasoning mode, find where it ends
    if (isCurrentlyInPlainTextReasoning) {
      // Look for common "end of reasoning" markers
      const responseMarkers = [
        'Final Response:',
        'Response:',
        'Answer:',
        '### Response',
        'Final Plan:',
        '---'
      ];
      
      let splitIndex = -1;
      let usedMarker = '';
      
      for (const resMarker of responseMarkers) {
        // Find marker that isn't preceded by other text on the same line (likely a header)
        const regex = new RegExp(`(?:^|\\n)${resMarker}`, 'i');
        const match = content.match(regex);
        
        if (match && match.index !== undefined) {
          splitIndex = match.index;
          usedMarker = resMarker;
          break;
        }
      }

      if (splitIndex !== -1) {
        // We found the end! Split into thinking and markdown
        blocks.push({
          type: 'thinking',
          content: content.substring(0, splitIndex),
          isComplete: true
        });
        
        // Content after the marker (and the marker itself)
        const afterMarker = content.substring(splitIndex);
        const markerMatch = afterMarker.match(new RegExp(`(?:^|\\n)${usedMarker}\\s*`, 'i'));
        
        if (markerMatch) {
            workingContent = afterMarker.substring(markerMatch[0].length).trim();
        } else {
            workingContent = afterMarker.trim();
        }
      } else {
        // Still thinking... treat everything as thinking for now
        blocks.push({
          type: 'thinking',
          content: content.trim(),
          isComplete: false
        });
        return blocks;
      }
    }

    // If we're streaming and haven't finished reasoning, we don't show markdown yet
    const displayContent = (!isReasoningComplete && isStreaming) ? '' : workingContent;
    
    if (displayContent === '' && workingContent !== '') {
        // Still handle the reasoning block even if answer is hidden
        const thinkingMatch = workingContent.match(/<(redacted_thinking|think|thought|reasoning)>([\s\S]*?)(?:<\/\1>|$)/i);
        if (thinkingMatch) {
            blocks.push({
                type: 'thinking',
                content: thinkingMatch[2],
                isComplete: workingContent.includes(`</${thinkingMatch[1]}>`)
            });
        }
        return blocks;
    }

    while ((match = reasoningRegex.exec(workingContent)) !== null) {
      if (match.index > lastIndex) {
        blocks.push({
          type: 'markdown',
          content: workingContent.substring(lastIndex, match.index)
        });
      }
      
      blocks.push({
        type: 'thinking',
        content: match[2],
        isComplete: match[0].includes(`</${match[1]}>`)
      });
      
      lastIndex = reasoningRegex.lastIndex;
    }
    
    if (lastIndex < workingContent.length) {
      blocks.push({
        type: 'markdown',
        content: workingContent.substring(lastIndex)
      });
    }
    
    return blocks;
  }, [content, isReasoningComplete, isStreaming]);

  return (
    <div className="llm-response-container">
      {/* Show "Working..." indicator when streaming starts and no content yet */}
      {content.length === 0 && isStreaming && (
        <div className="flex items-center gap-2 text-sm text-gray-400 mb-2">
          <svg className="w-3.5 h-3.5 animate-spin text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span className="font-medium">Working...</span>
        </div>
      )}
      
      {blocks.map((block, index) => {
        if (block.type === 'thinking') {
          return (
            <ThinkingBlock 
              key={`thinking-${index}`}
              content={block.content}
              isComplete={block.isComplete || false}
              status={status}
              sources={sources}
              sourceRegistry={sourceRegistry}
            />
          );
        }
        return (
          <MarkdownBlock 
            key={`markdown-${index}`}
            content={block.content}
            sourceRegistry={sourceRegistry}
          />
        );
      })}
    </div>
  );
}, (prevProps, nextProps) => {
  return prevProps.content === nextProps.content &&
         prevProps.isStreaming === nextProps.isStreaming &&
         prevProps.status === nextProps.status &&
         prevProps.sources === nextProps.sources;
});

