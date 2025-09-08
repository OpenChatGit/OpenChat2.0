// Minimal context helpers

export function buildPromptWithContext(conversation, userMessage, { maxChars = 8000, systemPreamble, toolAware = '', reasoningAware = '' } = {}) {
  // Very small placeholder that just concatenates recent turns.
  const msgs = Array.isArray(conversation?.messages) ? conversation.messages.slice(-6) : [];
  const history = msgs
    .map(m => `${m.role === 'assistant' ? 'Assistant' : 'User'}: ${(m.content || '').toString()}`)
    .join('\n');
  const parts = [systemPreamble || '', history, `User: ${userMessage}`, toolAware, reasoningAware]
    .filter(Boolean)
    .join('\n\n');
  return parts.slice(0, maxChars);
}

export function answerFromHistoryIfApplicable(conversation, userMessage) {
  // Simple heuristic: if the user literally repeats a previous question,
  // return the last assistant answer.
  try {
    if (!Array.isArray(conversation?.messages)) return null;
    const lastSameUserIdx = [...conversation.messages].reverse().findIndex(m => m.role === 'user' && (m.content || '').trim() === (userMessage || '').trim());
    if (lastSameUserIdx < 0) return null;
    // Find assistant message after that position
    for (let i = conversation.messages.length - lastSameUserIdx; i < conversation.messages.length; i++) {
      const m = conversation.messages[i];
      if (m && m.role === 'assistant' && m.content) return m.content;
    }
    return null;
  } catch {
    return null;
  }
}
