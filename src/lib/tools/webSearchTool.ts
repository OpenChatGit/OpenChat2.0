import { tool } from 'ai';
import { z } from 'zod';
import { searchProviderRegistry } from '../web-search';

/**
 * Standalone `web_search` tool (Vercel AI SDK) for use with `streamText` / agents.
 */
export const webSearchTool = tool({
  description: 'Search the web for real-time information, news, and facts using Tavily.',
  parameters: z.object({
    query: z.string().describe('The search query to look up on the web'),
    maxResults: z.number().optional().describe('The maximum number of results to return (default: 5)'),
    timeRange: z.enum(['day', 'week', 'month', 'year']).optional().describe('Filter results by time range for fresh information'),
  }),
  execute: async (args, { abortSignal }) => {
    return executeWebSearchTool(args, abortSignal);
  },
});

export async function executeWebSearchTool(
  args: { query: string; maxResults?: number; timeRange?: string },
  signal?: AbortSignal
): Promise<string> {
  try {
    const provider = searchProviderRegistry.getProvider('supabase');
    const results = await provider.search(args.query, {
      maxResults: args.maxResults || 5,
      time_range: args.timeRange,
      signal,
    });

    if (results.length === 0) {
      return "No results found for this query.";
    }

    return results.map((res, i) => `
Source [${i + 1}]: ${res.title}
URL: ${res.url}
Content: ${res.snippet}
`).join('\n---\n');

  } catch (error) {
    console.error('[WebSearchTool] Execution failed:', error);
    return `Error performing web search: ${error instanceof Error ? error.message : String(error)}`;
  }
}
