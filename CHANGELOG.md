# Changelog

All notable changes to this project will be documented in this file.

This project adheres to Keep a Changelog principles and uses semantic-ish versioning while pre-1.0. Breaking changes can still occur.

## [0.1.2] - 2025-09-06

> Experimental Notice: v0.1.2 is experimental. Features, APIs, and UI are subject to change without prior notice.

### Added
- Typewriter animation for conversation titles in the sidebar after AI title generation.
  - Frontend: `frontend/src/main.js` function `requestAIGeneratedTitle()` now animates titles after `updateConversationList()`.
  - New helper `animateConversationTitle(conversationId, newTitle, speed)` for smooth non-blocking title typing.
- Consistent server-based title generation endpoint.
  - Backend: `backend/app.py` `POST /title` returns concise, sanitized chat titles (<= 6 words) using heuristic fallback and fast LLM boost when available.
  - Frontend automatically calls `/title` after each assistant reply.

### Changed
- Default app name and window title updated to `OpenChat`.
  - Tauri config: `frontend/src-tauri/tauri.conf.json` `productName` and window `title` changed to `OpenChat`.
- Version bumped to `0.1.2` in Tauri config.
- Frontend now sends the last 20 messages as conversation history for better continuity during generation.
  - SSE and SSE-disabled paths use `history: (conversation?.messages || []).slice(-20)`.
- Tools menu simplified: removed manual “Backend SSE Streaming” toggle since SSE is standard.
  - UI: `frontend/src/index.html` removed the SSE toggle entry.
- README updated to show `OpenChat (v0.1.2)` and experimental note.

### Fixed
- `sendMessage()` flow was refactored to reliably invoke the backend and show “Thinking…”, fixing cases where no response was produced.
  - Frontend: `frontend/src/main.js` simplified `sendMessage()` and delegates to `generateAssistantFromContent()`.
- Title generation errors and lints in `main.js` (mismatched try/catch) corrected by rewriting `requestAIGeneratedTitle()` with proper timeout and sanitization.
- `ReferenceError: user_context is not defined` in SSE calls fixed.
  - `user_context` is now hoisted and built once per request before both SSE branches use it.
- Robust non-stream fallback to `POST /chat` if SSE streaming fails, with clear user-facing error text when backend is down.

### Migration / Porting from legacy OpenChat
- Consolidated and moved several behaviors from the legacy OpenChat into 2.0:
  - Automatic backend start via Tauri `beforeDevCommand` (`start_backend_launcher.py`).
  - LangChain integration with conversation awareness and FastAPI endpoints (`/lcel/chat/sse`, `/chat`, `/title`).
  - Frontend sends conversation context (last 20 messages) to preserve continuity.
  - Model-agnostic, server-side title generation via `/title` with local fallback.
  - Web search tool integration handled by backend (optional), removing heavy prompt logic in the frontend.

### Developer Notes
- CORS is permissive for development in `backend/app.py` and should be tightened for production.
- Titles are sanitized on both server and client. Adjust limits (word/char caps) in `/title` and `requestAIGeneratedTitle()` if required.
- SSE is the default path; the UI still auto-fallbacks to `/chat` to maximize reliability.

---

## [Unreleased]
- About dialog showing product name, version, and backend status
- Persist selected model per conversation and display next to the title
- Optional character-based cap for very long histories
