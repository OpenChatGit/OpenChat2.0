// Real SSE-style streaming over POST using FastAPI StreamingResponse.
// We POST JSON to /lcel/chat/sse and parse lines like:  data: {"type":"token","text":"..."}\n\n
export async function streamSseResponse(opts) {
  const {
    serverBase = 'http://127.0.0.1:8000',
    model,
    message,
    history = [],
    system = '',
    tools_enabled = false,
    reasoning_enabled = false,
    user_context = undefined,
    ui = {},
    conversation,
  } = opts || {};

  const payload = {
    message,
    history,
    model,
    system,
    tools_enabled,
    reasoning_enabled,
    user_context,
  };

  let finalText = '';
  let gotAnyToken = false;
  try {
    const resp = await fetch(`${serverBase}/lcel/chat/sse`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!resp.ok || !resp.body) throw new Error(`HTTP ${resp.status}`);

    const reader = resp.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    // Optional guard: if nothing arrives for a while, we can show a gentle fallback
    const startTs = Date.now();
    const graceMs = 15000; // 15s grace

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });
      let idx;
      // Process complete SSE events separated by double newlines
      while ((idx = buffer.indexOf('\n\n')) !== -1) {
        const rawEvent = buffer.slice(0, idx).trim();
        buffer = buffer.slice(idx + 2);
        if (!rawEvent) continue;

        // Expect lines starting with "data:"
        const lines = rawEvent.split('\n');
        for (const line of lines) {
          const m = line.match(/^data:\s*(.*)$/);
          if (!m) continue;
          try {
            const evt = JSON.parse(m[1]);
            if (evt.type === 'meta') {
              try { console.debug('[SSE][META]', evt); } catch {}
              try {
                if (ui && typeof ui.setThinkingText === 'function') {
                  ui.setThinkingText(`Connecting to ${evt.model}…`);
                }
              } catch {}
            } else if (evt.type === 'token' && typeof evt.text === 'string') {
              finalText += evt.text;
              gotAnyToken = true;
            } else if (evt.type === 'error') {
              console.error('SSE error:', evt.message);
              if (!finalText) finalText = String(evt.message || 'Model error');
            } else if (evt.type === 'done') {
              // end of stream
            }
          } catch (e) {
            // Non-JSON data; ignore
          }
        }
      }

      // If we've been waiting too long without tokens, set a gentle fallback once
      if (!gotAnyToken && (Date.now() - startTs) > graceMs && !finalText) {
        finalText = 'The model took too long to respond. Please try again or switch models.';
      }
    }
  } catch (e) {
    console.error('SSE request failed:', e);
    if (!finalText) {
      finalText = 'Backend not available. Please start FastAPI (uvicorn) and try again.';
    }
  }

  // Fallback: if no tokens arrived and no final text, try non-streaming /chat once
  try {
    const empty = !finalText || !String(finalText).trim();
    if (empty || !gotAnyToken) {
      console.log('[sse->fallback] No tokens received; trying /chat once...');
      const resp = await fetch(`${serverBase}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message,
          history,
          model,
          system,
          tools_enabled,
          reasoning_enabled,
          user_context,
        }),
      });
      if (resp && resp.ok) {
        const data = await resp.json();
        const out = (data && data.output) ? String(data.output) : '';
        if (out && (!finalText || !finalText.trim())) {
          finalText = out;
        }
      }
    }
  } catch (e) {
    console.warn('[sse->fallback] /chat fallback failed:', e?.message || e);
  }

  try {
    if (typeof ui.hideThinking === 'function') ui.hideThinking();
    const msg = { role: 'assistant', content: finalText, timestamp: new Date() };
    if (typeof ui.displayTypewriter === 'function') {
      await ui.displayTypewriter(msg);
    } else if (typeof ui.displayNow === 'function') {
      ui.displayNow(msg);
    }
    if (conversation) {
      try {
        conversation.messages.push(msg);
        conversation.updated_at = new Date();
      } catch {}
    }
    if (typeof ui.updateConversationList === 'function') ui.updateConversationList();
  } catch (e) {
    console.error('streamSseResponse render error:', e);
  }
}
