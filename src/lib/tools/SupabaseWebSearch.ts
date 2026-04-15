import { searchProviderRegistry } from "../web-search";
import type { SourceRegistry } from "../web-search/sourceRegistry";
import type { ChatEngineTool } from "../ai/ChatEngine";

export class SupabaseWebSearchTool implements ChatEngineTool {
  name = "web_search";
  description = "Search the web for real-time information, news, and facts. Always use this for any questions about current events, people, or data that might have changed since your knowledge cutoff.";
  private sourceRegistry?: SourceRegistry;

  constructor(sourceRegistry?: SourceRegistry) {
    this.sourceRegistry = sourceRegistry;
  }

  async _call(input: string): Promise<string> {
    let query = input;
    let timeRange = 'day';

    try {
      if (input.startsWith('{')) {
        const parsed = JSON.parse(input);
        query = parsed.query || input;
        timeRange = parsed.timeRange || parsed.time_range || 'day';
      }
    } catch {
      // Not JSON, continue with raw input
    }

    try {
      const provider = searchProviderRegistry.getProvider('supabase');
      const results = await provider.search(query, {
        maxResults: 5,
        timeRange: timeRange
      });

      if (results.length === 0) {
        return "No results found for this query.";
      }

      if (this.sourceRegistry) {
        results.forEach(res => {
          this.sourceRegistry!.registerSource(
            res.url,
            res.title,
            res.domain
          );
        });
      }

      const systemNow = new Date();
      const systemDateStr = systemNow.toLocaleDateString();

      const formattedResults = results.map((res, i) => {
        const cleanedSnippet = res.snippet
          .replace(/^No results found\.\s+/i, '')
          .replace(/^Showing results for.*?\s+/i, '');

        const dateStr = res.publishedDate ? `DATE: ${res.publishedDate}` : 'DATE: Unknown';
        return `[SOURCE ${i + 1}]
TITLE: ${res.title}
${dateStr}
URL: ${res.url}
SUMMARY: ${cleanedSnippet}
---
`;
      }).join('\n---\n');

      return `Verification Context: Today is ${systemDateStr}.
Below are the search results for the query: "${query}"

${formattedResults}`;

    } catch (error) {
      console.error('[SupabaseWebSearchTool] Execution failed:', error);
      return `Error performing web search: ${error instanceof Error ? error.message : String(error)}`;
    }
  }
}
