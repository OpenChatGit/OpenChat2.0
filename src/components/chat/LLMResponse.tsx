import React from 'react';
import { useLLMOutput, throttleBasic } from '@llm-ui/react';
import { ReasoningBlock } from '../ReasoningBlock';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { CitationParser } from '../../lib/citations/citationParser';
import type { SourceRegistry } from '../../lib/web-search/sourceRegistry';
import { markdownLookBack } from '@llm-ui/markdown';

// Define component outside to ensure stable reference
const MarkdownBlock: React.FC<{ blockMatch: any; sourceRegistry?: SourceRegistry }> = ({ blockMatch, sourceRegistry }) => {
  let content = blockMatch.output;
  if (sourceRegistry) {
    const citations = CitationParser.parse(content);
    if (citations.length > 0) {
      const sortedCitations = [...citations].sort((a, b) => b.startIndex - a.startIndex);
      sortedCitations.forEach((citation) => {
        const replacement = `[${citation.sourceId}]`;
        content = content.substring(0, citation.startIndex) + replacement + content.substring(citation.endIndex);
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
            const match = /language-(\w+)/.exec(className || '');
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
        {content}
      </ReactMarkdown>
    </div>
  );
};

// Define reasoning component outside
const ThinkingBlock: React.FC<{ 
  blockMatch: any; 
  status?: string; 
  sources?: Array<{url: string, title: string}>;
  sourceRegistry?: SourceRegistry;
}> = ({ blockMatch, status, sources, sourceRegistry }) => {
  const output = blockMatch.output;
  const match = output.match(/<(think|thought|reasoning)>([\s\S]*?)(?:<\/\1>|$)/i);
  const reasoningContent = match ? match[2] : output;
  return (
    <ReasoningBlock 
      content={reasoningContent} 
      isComplete={blockMatch.isComplete} 
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

export const LLMResponse: React.FC<LLMResponseProps> = ({ content, isStreaming, sourceRegistry, status, sources }) => {
  // Pacing control for smooth typewriter effect
  const throttle = React.useMemo(() => throttleBasic({
    targetBufferChars: 2,      // Lower buffer for more immediate typing
    readAheadChars: 4,        // Minimal lookahead
    adjustPercentage: 0.5,    // Aggressive catch-up
  }), []);

  const blocks = React.useMemo(() => [
    {
      findCompleteMatch: (llmOutput: string) => {
        const match = llmOutput.match(/<(think|thought|reasoning)>([\s\S]*?)<\/\1>/i);
        if (match) {
          return {
            startIndex: match.index!,
            endIndex: match.index! + match[0].length,
            outputRaw: match[0],
            blockMatch: match,
          };
        }
      },
      findPartialMatch: (llmOutput: string) => {
        const match = llmOutput.match(/<(think|thought|reasoning)>([\s\S]*?)$/i);
        if (match) {
          return {
            startIndex: match.index!,
            endIndex: match.index! + match[0].length,
            outputRaw: match[0],
            blockMatch: match,
          };
        }
      },
      lookBack: ({ output }: { output: string }) => ({
        output,
        visibleText: output.replace(/<\/?(think|thought|reasoning)>/gi, ''),
      }),
      component: ThinkingBlock,
      isVisible: true,
    },
  ], []);

  const fallbackBlock = React.useMemo(() => ({
    component: (props: any) => <MarkdownBlock {...props} sourceRegistry={sourceRegistry} />,
    lookBack: markdownLookBack(),
  }), [sourceRegistry]);

  const { blockMatches } = useLLMOutput({
    llmOutput: content,
    blocks,
    fallbackBlock,
    isStreamFinished: !isStreaming,
    throttle: isStreaming ? throttle : undefined,
  });

  return (
    <div className="llm-response-container">
      {/* If no content yet but searching or thinking, show a ReasoningBlock skeleton */}
      {content.length === 0 && (status === 'searching' || isStreaming) && (
        <ReasoningBlock 
          content="" 
          isComplete={false} 
          status={status}
          sources={sources}
          sourceRegistry={sourceRegistry}
        />
      )}
      
      {blockMatches.map((blockMatch) => {
        const Component = blockMatch.block.component;
        // The component might be MarkdownBlock or ThinkingBlock
        // MarkdownBlock needs sourceRegistry which is not in blockMatch
        if (Component === ThinkingBlock) {
           return (
             <ThinkingBlock 
               key={blockMatch.startIndex || 0} 
               blockMatch={blockMatch} 
               status={status}
               sources={sources}
               sourceRegistry={sourceRegistry}
             />
           );
        }
        return <MarkdownBlock key={blockMatch.startIndex || 0} blockMatch={blockMatch} sourceRegistry={sourceRegistry} />;
      })}
    </div>
  );
};
