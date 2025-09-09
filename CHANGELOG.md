# Changelog

All notable changes to this project will be documented in this file.

This project adheres to Keep a Changelog principles and uses semantic-ish versioning while pre-1.0. Breaking changes can still occur.

---

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

## [0.1.3] - 2025-09-09

> **Important Notice**: This version includes significant file structure changes due to Tauri static file serving limitations. Future versions will implement proper code separation once Tauri configuration issues are resolved.

### Added
- Complete authentication system with persistent account storage
  - **File System Access API integration**: Users can create password-protected account folders on their local system
  - **SHA-256 password hashing**: Secure password storage with Web Crypto API
  - **Profile image support**: Upload and store custom avatars with accounts
  - **Login state persistence**: Automatic restoration of login status between app sessions
  - **Account creation workflow**: Full signup process with form validation and error handling

### Changed
- **Authentication system file organization**: Moved auth files to `frontend/src/` due to Tauri limitations
  - `frontend/static/js/auth.js` → `frontend/src/auth.js`
  - `frontend/static/css/auth.css` → `frontend/src/auth.css`
  - Updated `frontend/src/index.html` to reference local auth files
- **Profile UI improvements**: 
  - Updated guest profile icon from `fa-user` to `fa-user-circle` for better visual distinction
  - Fixed profile avatar sizing issues in sidebar (32px constraint with proper image scaling)
  - Improved avatar display with `object-fit: cover` and circular boundaries

### Fixed
- **Tauri static file serving issue**: Resolved "Unexpected token '<'" JavaScript errors
  - **Root Cause**: Tauri's `frontendDist: "../src"` configuration prevented access to `frontend/static/` files
  - **Solution**: Temporarily moved authentication files to `frontend/src/` for reliable loading
  - Browser was receiving HTML error pages instead of JavaScript files when accessing static folder
- **Authentication file loading**: Eliminated complex relative path issues in Tauri environment
- **Profile image constraints**: Fixed oversized images breaking out of circular avatar boundaries

### Technical Details
- **AccountManager Class**: Handles persistent storage, password hashing, and file operations
- **AuthUI Class**: Manages authentication interface, form validation, and user interactions
- **File Structure**: Combined auth logic into single files for better maintainability
- **Global Functions**: Maintained backward compatibility with existing onclick handlers

### Known Issues & Future Plans
- **Tauri Static File Limitation**: Current Tauri configuration (`frontendDist: "../src"`) prevents proper static folder access
  - This forces authentication files to be placed in `frontend/src/` instead of organized `frontend/static/` structure
  - **Future Solution**: Will implement proper Tauri configuration or build process to enable clean code separation
- **Planned Improvements**: 
  - Better static asset organization once Tauri serving issues are resolved
  - Enhanced code separation between authentication, UI, and core application logic
  - Improved build process for static file management

### Developer Notes
- **File System Access API**: Requires user gesture (button click) to select directory
- **Security**: Passwords are never stored in plain text, only SHA-256 hashes
- **Browser Compatibility**: File System Access API requires modern browsers (Chrome 86+, Edge 86+)
- **Account Storage**: Users control where accounts are stored on their local system

---

## [Unreleased]
- About dialog showing product name, version, and backend status
- Persist selected model per conversation and display next to the title
- Optional character-based cap for very long histories
- Proper static file organization once Tauri configuration is resolved
