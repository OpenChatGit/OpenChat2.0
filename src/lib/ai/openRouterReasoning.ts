/**
 * OpenRouter can return chain-of-thought as `reasoning_details` on the assistant message
 * (often on the final response, not only as stream deltas). Multi-turn: pass `reasoning_details` back unchanged.
 * @see https://openrouter.ai/docs
 */

export function formatReasoningDetailsForDisplay(details: unknown): string {
  if (details == null) return '';
  if (typeof details === 'string') return details;
  if (Array.isArray(details)) {
    const parts: string[] = [];
    for (const d of details as Array<Record<string, unknown>>) {
      if (!d || typeof d !== 'object') continue;
      const t = d.type;
      if (t === 'reasoning.text' && typeof d.text === 'string') parts.push(d.text);
      else if (t === 'reasoning.summary' && typeof (d as { summary?: string }).summary === 'string') {
        parts.push((d as { summary: string }).summary);
      } else if (typeof d.text === 'string') parts.push(d.text);
      else parts.push(JSON.stringify(d));
    }
    return parts.filter(Boolean).join('\n\n');
  }
  if (typeof details === 'object' && details !== null && 'text' in (details as object)) {
    return String((details as { text?: unknown }).text ?? '');
  }
  try {
    return JSON.stringify(details);
  } catch {
    return '';
  }
}

/** Pull OpenRouter-style `reasoning_details` from AI SDK `streamText` response messages. */
export function extractReasoningDetailsFromResponse(response: {
  messages?: Array<Record<string, unknown>>;
}): unknown | undefined {
  const messages = response.messages;
  if (!Array.isArray(messages)) return undefined;

  for (let i = messages.length - 1; i >= 0; i--) {
    const m = messages[i];
    if (!m || m.role !== 'assistant') continue;

    const rd = m.reasoning_details;
    if (rd != null) return rd;

    const content = m.content;
    if (Array.isArray(content)) {
      const merged: unknown[] = [];
      for (const part of content as Array<Record<string, unknown>>) {
        if (!part) continue;
        if (part.type === 'reasoning' && typeof part.text === 'string') {
          merged.push({ type: 'reasoning.text', text: part.text });
        }
      }
      if (merged.length > 0) return merged;
    }
  }
  return undefined;
}

/**
 * Some OpenRouter models stream the same text as "reasoning" and as the final answer.
 * If the body after `</redacted_thinking>` equals the thinking text, keep a single copy (no duplicate).
 */
export function collapseDuplicateThinkingAndAnswer(raw: string): string {
  const re = /<redacted_thinking>([\s\S]*?)<\/redacted_thinking>\s*([\s\S]*)$/;
  const m = raw.match(re);
  if (!m) return raw;
  const inner = m[1].trim();
  const rest = m[2].trim();
  if (!inner) return rest || raw;
  if (!rest) return raw;
  const norm = (s: string) => s.replace(/\s+/g, ' ').trim();
  if (norm(inner) === norm(rest)) return rest;
  return raw;
}
