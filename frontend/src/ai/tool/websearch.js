// Fallback web search stubs

export async function performWebSearchFastAPI(baseUrl, query, limit = 5, freshness = 'noLimit', includeSnippets = true) {
  console.debug('[websearch] FastAPI not connected; returning empty results');
  return [];
}

export function formatWebResultsForPrompt(results) {
  if (!Array.isArray(results) || results.length === 0) return '';
  const lines = results.slice(0, 5).map((r, i) => {
    const title = (r.title || '').toString().trim();
    const url = (r.url || '').toString().trim();
    const snippet = (r.snippet || '').toString().trim();
    return `- [${i + 1}] ${title}\n  URL: ${url}\n  ${snippet}`;
  });
  return `\n\n[Search Results]\n${lines.join('\n')}`;
}
