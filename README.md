![OpenChat screenshot](https://i.imgur.com/YVcZIrN.png)

# OpenChat

![Version](https://img.shields.io/badge/version-0.6.0--refactored-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![Free Forever](https://img.shields.io/badge/free-forever-brightgreen)

OpenChat is a modular, cross-platform LLM chat application built with Tauri, React, and TypeScript. It delivers a ChatGPT-style interface that connects seamlessly to local AI providers such as Ollama and LM Studio, with integrated CUDA support and Hugging Face training capabilities.

> � ***MAJOR UPDATE - Complete Architecture Overhaul:** This version of OpenChat has been completely rebuilt from the ground up with a modern, modular architecture. The codebase has been significantly refactored for better performance, maintainability, and user experience. Some legacy features have been removed or streamlined as they were no longer necessary with the new architecture. If you're upgrading from an older version, please note that this is essentially a new application with improved design patterns and enhanced capabilities.

> 💚 **Free Forever Promise:** OpenChat will always remain 100% free and open source. No paid features, no subscriptions, no paywalls - ever. All features are custom-built and freely available to everyone. We accept donations to support development, but every feature will always be accessible to all users at no cost.

> ⚖️ **Copyright Notice:** This project is protected under German copyright law (Urheberrecht). While OpenChat is free and open source under the MIT License, all rights to the original work remain with the author. The MIT License grants you permission to use, modify, and distribute this software, but does not transfer copyright ownership.

> ⚠️ **Development Notice:** This refactored version represents a significant evolution of OpenChat. While thoroughly tested, some edge cases may still need refinement. Please report any issues you encounter to help us improve the application.

## Table of Contents

- [Features](#features)
- [What's New](#whats-new)
- [Migration Guide](#migration-guide)
- [Supported Providers](#supported-providers)
- [Getting Started](#getting-started)
- [Vision Support](#vision-support)
- [Web Search System](#web-search-system)
- [CUDA Support](#cuda-support)
- [Hugging Face Integration](#hugging-face-integration)
- [Canvas Mode](#canvas-mode)
- [Architecture](#architecture)
- [Adding a New Provider](#adding-a-new-provider)
- [Configuration](#configuration)
- [Performance & Optimization](#performance--optimization)
- [Development](#development)
- [Tech Stack](#tech-stack)
- [License](#license)
- [Recommended IDE Setup](#recommended-ide-setup)

## What's New

### Version 0.6.0 - Complete Architecture Overhaul 🚀

OpenChat has been completely rebuilt from the ground up with a modern, modular architecture and powerful new features!

**🎨 Canvas Mode Revolution:**
- **Independent Canvas System** – Completely separate chat system for Canvas with its own session management
- **LIVE Code Streaming** – Code appears in real-time as the AI writes it, character by character
- **Smart Code Detection** – Automatically extracts and displays the main code block from AI responses
- **Persistent Language Recognition** – Canvas remembers the programming language across sessions and reloads
- **Multi-Language Support** – 20+ programming languages with full syntax highlighting
- **Real-Time Execution** – Run code directly in the canvas with instant output

**🏗️ Modern Architecture:**
- **Modular Hook System** – Clean separation of concerns with dedicated hooks:
  - `useCanvasChat` – Independent Canvas chat with tool integration
  - `useCanvasManager` – Canvas mode orchestration and state management
  - `useChatWithTools` – Main chat with web search and tool support
- **Event-Driven Canvas Updates** – Real-time code streaming via custom events
- **Type-Safe Tool System** – Fully typed Canvas tool definitions and validation
- **Optimized Performance** – Lazy loading, debounced updates, and efficient re-rendering

**🔧 Enhanced Features:**
- **CUDA Detection & Monitoring** – Automatic NVIDIA GPU detection with detailed information
- **Hugging Face Integration** – Seamless authentication and Trainer API access
- **Free Web Search** – 100% free web search with intelligent auto-detection and citations
- **Vision Support** – Send images to vision-capable models with automatic processing
- **Streamlined Providers** – Focus on local providers (Ollama, LM Studio) for privacy

**🎯 Developer Experience:**
- **Clean Codebase** – App.tsx reduced by ~150 lines through modular architecture
- **No TypeScript Errors** – Fully typed with proper interfaces and type guards
- **Better Separation** – Canvas and Chat systems are completely independent
- **Easier Maintenance** – Each feature has its own dedicated module

See the full [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Migration Guide

### 🔄 What Changed

This version represents a **complete architectural overhaul** of OpenChat. Here's what you need to know:

**✅ Enhanced & Improved:**
- **Canvas Mode** – Completely rebuilt with LIVE code streaming and independent chat system
- **Web Search** – Streamlined with better performance and 100% free operation
- **Architecture** – Modular hook system with clean separation of concerns
- **Performance** – Optimized with lazy loading, debounced updates, and efficient re-rendering
- **Type Safety** – Full TypeScript coverage with proper interfaces
- **Session Management** – Improved with separate Canvas and Chat sessions

**🗑️ Removed Features:**
- **Cloud Providers** – Removed Anthropic, OpenAI, Google, Groq, and other cloud providers to focus on local, privacy-first solutions
- **Plugin System** – Removed in favor of built-in, well-integrated features
- **Persona Settings** – Simplified to streamline user experience
- **Legacy Tool System** – Replaced with modern Canvas tool integration

**🎯 Why These Changes?**

The removed features were either:
1. **Redundant** – Better alternatives now exist in the new architecture
2. **Maintenance Burden** – Required significant upkeep without proportional value
3. **Privacy Concerns** – Cloud providers conflicted with our local-first philosophy
4. **Complexity** – Added unnecessary complexity to the codebase

**📦 What You Keep:**
- All your local chat sessions (automatically migrated)
- Provider configurations (Ollama, LM Studio)
- Settings and preferences
- CUDA and Hugging Face configurations

**🚀 What You Gain:**
- LIVE code streaming in Canvas mode
- Independent Canvas chat system
- Better performance and stability
- Cleaner, more maintainable codebase
- Enhanced developer experience

### 💡 Recommendations

**For Users:**
- If you relied on cloud providers, consider using Ollama with cloud-hosted models
- Explore the new Canvas mode for an enhanced coding experience
- Check out the improved web search with automatic detection

**For Developers:**
- Review the new architecture documentation
- Explore the modular hook system
- Check out the Canvas tool integration examples

## Features

### 🎨 Canvas Mode (Revolutionary)
- **LIVE Code Streaming** – Code appears in real-time as AI writes it, character by character
- **Multi-File Support** – AI can create multiple files at once (HTML, CSS, JS separately)
- **File Explorer Dropdown** – Switch between multiple files with live updates
- **Independent Chat System** – Separate session management for Canvas with its own message history
- **Smart Code Detection** – Automatically extracts all code blocks from AI responses
- **Persistent Language Recognition** – Remembers programming language across sessions and reloads
- **20+ Languages** – Full syntax highlighting for Python, JavaScript, TypeScript, Java, C++, Rust, Go, and more
- **Real-Time Execution** – Run code directly with instant output display
- **Sandboxed Package Manager** – Install packages in isolated venv/node_modules (never touches system)
- **Package Manager Dropdown** – View installed packages and errors in dedicated dropdown
- **Resizable Interface** – Drag-and-drop resizing for chat sidebar and editor
- **Session Management** – Create, switch, rename, and delete Canvas sessions

### 💬 Chat Experience
- **Modern Interface** – ChatGPT-inspired layout with full dark-mode support
- **Streaming Responses** – Display tokens as they arrive from the model
- **Session Management** – Create, persist, and revisit conversations
- **Rich Markdown** – Code blocks, tables, inline formatting, and LaTeX math rendering
- **Token Usage Tracking** – Detailed consumption metrics (input/output/total) per response
- **Syntax Highlighting** – Persistent Prism.js highlighting across navigation and reloads

### 💎 Subscription Plans
- **Free Forever** – Unlimited local AI models, Canvas, and code execution (100% free)
- **Pro ($9.99/mo)** – 1,000 SERP web searches per month for enhanced research
- **Pro+ ($19.99/mo)** – 3,000 SERP searches + API access and team features
- **Upgrade Modal** – Beautiful, modern pricing cards with clear feature breakdown
- **Flexible Billing** – Monthly subscriptions with 14-day money-back guarantee

### 🔍 Web Search (100% Free)
- **No API Keys Required** – Completely free web search using DuckDuckGo
- **Intelligent Auto-Detection** – Automatically determines when search would be helpful
- **Backend Scraping** – Rust-based Tauri backend handles all web scraping
- **Inline Citations** – Source favicons and links displayed with search results
- **RAG Processing** – Content chunking, relevance ranking, and context injection
- **Real-Time Progress** – Animated search indicators and status updates

### 👁️ Vision Support
- **Automatic Model Detection** – Vision capability detected for each model
- **Drag & Drop** – Simple image attachment with thumbnail previews
- **Multiple Formats** – JPEG, PNG, GIF, WebP with automatic conversion
- **Smart Processing** – Automatic resizing and compression for provider limits
- **Lightbox Support** – Full-screen image viewing
- **Supported Models** – Llama 3.2 Vision, LLaVA, Bakllava, and more

### 🖥️ CUDA Support
- **Automatic GPU Detection** – Detects all NVIDIA GPUs with CUDA support
- **Real-Time Status** – CUDA availability indicator in main interface
- **Detailed Information** – GPU name, memory, compute capability, driver version
- **Installation Guides** – Direct links to NVIDIA driver and CUDA toolkit downloads
- **Settings Integration** – Dedicated CUDA tab with comprehensive details

### 🤗 Hugging Face Integration
- **Token Authentication** – Secure login with Hugging Face access tokens
- **Profile Display** – Shows username and avatar after authentication
- **Trainer API Access** – Direct integration with training capabilities
- **API Documentation** – Built-in examples and usage guides
- **Secure Storage** – Tokens stored securely in local storage

### 🏗️ Architecture
- **Modular Hook System** – Clean separation with dedicated hooks for each feature
- **Type-Safe** – Fully typed with TypeScript interfaces and type guards
- **Event-Driven** – Real-time updates via custom events
- **Optimized Performance** – Lazy loading, debounced updates, efficient re-rendering
- **Native Performance** – Tauri application shell keeps UI fast and lightweight
- **Local-First** – Focus on privacy with local providers (Ollama, LM Studio)

## Supported Providers

| Provider | Default endpoint | Vision Support | Notes |
| --- | --- | --- | --- |
| **Ollama** | `http://localhost:11434` | ✅ Yes | Local LLM runtime and default backend. Supports vision models like Llama 3.2 Vision, LLaVA, and Bakllava. |
| **LM Studio** | `http://localhost:1234` | ✅ Yes | Desktop application for running quantized models. |

> 📢 **Deprecation Notice:** LM Studio integration will be removed in upcoming updates. Despite this project being largely built around LM Studio, there were disagreements in the LM Studio Discord regarding alleged self-promotion (which never occurred), and the project was deemed "out of scope" for their community. We respect their decision and will focus on other providers moving forward.

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Rust (for Tauri)
- One of the supported LLM providers running locally

### Installation

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/OpenChatGit/OpenChat.git
   npm install
   ```

2. Start the React development server:

   ```bash
   npm run dev
   ```

3. Launch the desktop shell with Tauri:

   ```bash
   npm run tauri dev
   ```

4. Build production artifacts when you are ready to ship:

   ```bash
   npm run build
   npm run tauri build
   ```

## Vision Support

OpenChat includes comprehensive support for vision-capable AI models, allowing you to send images alongside your text prompts for visual analysis, OCR, diagram interpretation, and more.

### Key Features

- **Automatic Model Detection** – Vision capability is automatically detected for each model based on provider and model name patterns.
- **Drag & Drop Support** – Simply drag images into the chat input or click to browse.
- **Multiple Image Formats** – Supports JPEG, PNG, GIF, and WebP with automatic format conversion.
- **Smart Image Processing** – Automatic resizing and compression to meet provider limits while maintaining quality.
- **Provider-Specific Optimization** – Respects size limits for each provider (Anthropic: 5MB, Ollama: 100MB).
- **Image Preview** – View attached images before sending with thumbnail previews and lightbox support.
- **Intelligent Conflict Resolution** – Automatically disables web search when images are attached to prevent conflicts.

### Supported Vision Models

**Anthropic:**
- Claude 3.5 Sonnet, Claude 3.5 Haiku
- Claude 3 Opus, Claude 3 Sonnet, Claude 3 Haiku

**Ollama (Local):**
- Llama 3.2 Vision (11B, 90B)
- LLaVA (7B, 13B, 34B)
- Bakllava
- Any other vision-capable model

### Usage

1. Select a vision-capable model from the model dropdown (indicated by a 👁️ icon)
2. Drag and drop an image into the chat input, or click the image button to browse
3. Add your text prompt describing what you want to know about the image
4. Send the message - the image will be processed and sent to the model

The system automatically handles image encoding, resizing, and format conversion based on the selected provider's requirements.

## Web Search System

OpenChat features a completely rebuilt web search system that's **100% free** and requires **no API keys**. The new architecture provides intelligent, automatic web search capabilities with a clean, minimal UI.

### Key Features

- **Completely Free** – No API keys, no costs, no limits. Uses DuckDuckGo search with backend scraping.
- **Intelligent Auto-Detection** – Automatically determines when web search would be beneficial based on query analysis.
- **Backend Scraping** – Rust-based Tauri backend handles all web scraping, eliminating the need for Puppeteer or browser dependencies.
- **Streamlined UI** – Minimal, elegant search indicators:
  - "Searching web" with animated spinner during search
  - "Searched Web" with source favicons (up to 5) after completion
- **RAG Processing** – Chunks content, ranks relevance, and injects structured context into model prompts.
- **Event-Driven Architecture** – Real-time progress updates through a clean event system.
- **Lazy Loading** – Search components are loaded on-demand to keep the initial bundle size small.

### Architecture

- **AutoSearchManager** (`src/lib/web-search/autoSearchManager.ts`) – Orchestrates search decisions, execution, and context injection.
- **SearchOrchestrator** (`src/lib/web-search/searchOrchestrator.ts`) – Coordinates search queries, scraping, and RAG processing.
- **BackendScraper** (`src/lib/web-search/backendScraper.ts`) – Interfaces with Tauri backend for efficient web scraping.
- **LazyLoader** (`src/lib/web-search/lazyLoader.ts`) – Dynamically loads search components to optimize performance.
- **SearchEvents** (`src/lib/web-search/searchEvents.ts`) – Event system for real-time search progress updates.

The system automatically triggers on relevant queries, scrapes content from multiple sources, processes it through RAG, and seamlessly injects the context into your conversation—all without any configuration or API keys.

## CUDA Support

OpenChat includes comprehensive CUDA detection and monitoring capabilities for NVIDIA GPUs, providing real-time information about your GPU hardware and CUDA installation.

### Key Features

- **Automatic GPU Detection** – Detects all NVIDIA GPUs with CUDA support using nvidia-smi
- **Real-Time Status Display** – Shows CUDA availability status in the main interface with a dedicated button
- **Detailed GPU Information** – View GPU name, memory, compute capability, driver version, and CUDA toolkit version
- **Installation Guides** – Provides direct links to NVIDIA driver and CUDA toolkit downloads when not detected
- **Settings Integration** – Dedicated CUDA tab in settings with comprehensive GPU details and troubleshooting information

### Requirements

- NVIDIA GPU with CUDA support
- NVIDIA drivers installed
- nvidia-smi command-line tool (included with NVIDIA drivers)

### Usage

1. The CUDA status button appears automatically in the top-right corner of the interface
2. Click the button to view detailed GPU information
3. Access the CUDA settings tab for comprehensive details and installation guides
4. The system automatically detects and displays all available NVIDIA GPUs

## Hugging Face Integration

OpenChat integrates seamlessly with Hugging Face, providing authentication and access to the Hugging Face Trainer API for model training and fine-tuning.

### Key Features

- **Token-Based Authentication** – Secure login using Hugging Face access tokens
- **User Profile Display** – Shows your Hugging Face username and avatar after authentication
- **Trainer API Access** – Direct integration with Hugging Face training capabilities
- **Settings Integration** – Dedicated Trainer tab in settings with API documentation and examples
- **Secure Token Storage** – Tokens are stored securely in local storage

### Usage

1. Click the "Login with Hugging Face" button in the top-right corner
2. Enter your Hugging Face access token (get one from https://huggingface.co/settings/tokens)
3. Your profile information will be displayed after successful authentication
4. Access the Trainer settings tab for API documentation and training examples
5. Use the integrated API to train and fine-tune models directly from OpenChat

### Getting a Hugging Face Token

1. Visit https://huggingface.co/settings/tokens
2. Create a new access token with appropriate permissions
3. Copy the token and paste it into the login modal
4. Keep your token secure and never share it publicly

## Canvas Mode

OpenChat features a revolutionary Canvas mode with **LIVE code streaming** and an independent chat system, providing a collaborative coding experience that rivals ChatGPT Canvas.

### 🎨 Core Features

- **LIVE Code Streaming** – Watch code appear in real-time as the AI writes it, character by character
- **Independent Chat System** – Canvas has its own dedicated chat with separate session management
- **Smart Code Detection** – Automatically extracts the main code block from AI responses
- **Persistent Language Recognition** – Canvas remembers programming languages across sessions and reloads
- **Multi-Language Support** – 20+ languages including Python, JavaScript, TypeScript, Java, C++, Rust, Go, Ruby, PHP, Swift, Kotlin, C#, SQL, Bash, and more
- **Real-Time Execution** – Run code directly with instant output display
- **Auto Package Installation** – Automatically detects and installs missing Python packages in isolated environment
- **Sandboxed Package Manager** – Install packages in isolated venv/node_modules (never touches system)
- **Resizable Interface** – Adjust chat sidebar and editor widths with smooth drag-and-drop
- **Code Management** – Copy, download, and reset code with convenient toolbar buttons
- **Syntax Highlighting** – Powered by Prism.js with automatic language detection
- **Safe Preview Mode** – HTML/CSS previews are sandboxed to prevent navigation and protect the Canvas

### 🚀 How It Works

**LIVE Streaming Architecture:**
```
User: "Write a Python script to calculate fibonacci"
↓
AI starts responding with code block:
```python
def fibonacci(n):
    if n <= 1:
↓ INSTANTLY appears in Canvas!
        return n
    return fibonacci(n-1) + fibonacci(n-2)
↓ Updates in real-time as AI writes!
```
↓ Final code is saved to Canvas session
```

**Independent Session Management:**
- Canvas sessions are stored separately from main chat sessions
- Each Canvas session has its own message history and code state
- Switch between Canvas sessions without affecting main chat
- Code and language persist across app reloads

### 📝 Usage

1. **Enter Canvas Mode** – Click the "Canvas" button in the chat interface
2. **Ask for Code** – Request the AI to write code in any supported language
3. **Watch It Stream** – Code appears in real-time as the AI writes it
4. **Run & Test** – Execute code directly in the canvas with instant output
5. **Auto Package Install** – Missing Python packages are automatically detected and installed
6. **Manual Package Install** – Click the package icon (📦) to manually install dependencies
7. **Chat & Iterate** – Continue chatting to refine and improve the code
8. **Exit Canvas** – Return to normal chat mode anytime

### 📦 Package Management (Sandboxed)

**🔒 Isolated Environment:**
Each Canvas session has its own isolated environment:
- **Python**: Virtual environment (venv) created per session
- **Node.js**: Local node_modules directory per session
- **Automatic Cleanup**: Environment is deleted when session ends or code is cleared
- **No System Pollution**: Packages are never installed globally on your system

**Automatic Installation (Python):**
When you run Python code that imports a missing package, Canvas will:
1. Create an isolated virtual environment (if not exists)
2. Detect the `ModuleNotFoundError`
3. Automatically install the missing package via `pip` in the venv
4. Retry execution with the newly installed package

**Manual Installation:**
1. Click the package icon (📦) in the editor toolbar
2. Enter the package name (e.g., `requests`, `numpy`, `axios`)
3. Click "Install" or press Enter
4. The package will be installed in the isolated environment:
   - Python: `venv/Scripts/pip install <package>`
   - JavaScript/TypeScript: `npm install <package> --prefix .canvas_env`

**Environment Cleanup:**
- Click "Clean" button to manually remove all packages and the environment
- Environment is automatically deleted when:
  - You switch to a different Canvas session
  - You exit Canvas mode
  - You close the application

**Supported Package Managers:**
- Python: pip (in virtual environment)
- Node.js: npm (local installation)

### 🏗️ Technical Architecture

**Modular Hook System:**
- `useCanvasChat` – Independent chat system with tool integration
- `useCanvasManager` – Canvas mode orchestration and state management
- `streamCodeToCanvas` – Real-time code streaming with hash-based deduplication
- Event-driven updates via `canvasCodeStream` custom events

**Smart Code Processing:**
- Extracts the **first** code block (main code) from AI responses
- Ignores examples and additional code blocks
- Supports both markdown code blocks and explicit tool calls
- Hash-based change detection prevents duplicate updates

**Persistent State:**
- Canvas sessions: `canvas-chat-sessions` (localStorage)
- Current session: `current-canvas-session` (localStorage)
- Canvas mode: `isCanvasMode` (localStorage)
- Language and code persist across reloads

### 🎯 Supported Languages

**Full Syntax Highlighting:**
- **Web**: JavaScript, TypeScript, HTML, CSS, JSON, YAML, Markdown
- **Systems**: C, C++, Rust, Go
- **OOP**: Java, C#, Kotlin, Swift
- **Scripting**: Python, Ruby, PHP, Bash/Shell
- **Database**: SQL
- **Config**: XML, YAML, JSON

**Automatic Detection:**
The editor automatically detects the language based on:
- Markdown code block language tags (```python)
- Code patterns and syntax
- File extensions (if provided)

### 💡 Advanced Features

**Code Streaming:**
- Real-time character-by-character updates
- Smooth, responsive UI during streaming
- No lag or performance issues
- Automatic completion detection

**Session Management:**
- Create multiple Canvas sessions
- Switch between sessions instantly
- Rename and delete sessions
- Each session maintains its own code and chat history

**Language Persistence:**
- Language is saved with each session
- Prevents auto-detection from overriding saved language
- Python stays Python, JavaScript stays JavaScript
- Works across app reloads and session switches

### 🔧 For Developers

**Adding Canvas Support to Your AI:**
Simply respond with markdown code blocks:
```markdown
Here's your Python script:
```python
print("Hello, World!")
```
```

The Canvas system will automatically:
1. Detect the code block during streaming
2. Extract the language and code
3. Stream it to the Canvas in real-time
4. Save it to the session when complete

No special tool calls or formatting required!

## Architecture

OpenChat features a modern, modular architecture with clean separation of concerns:

### 🏗️ Core Structure

```
App.tsx (Simplified - ~150 lines smaller!)
├─ useChatWithTools (Main Chat System)
│  ├─ Session Management
│  ├─ Message Streaming
│  ├─ Web Search Integration
│  └─ Tool Support
│
└─ useCanvasManager (Canvas Orchestration)
   └─ useCanvasChat (Independent Canvas System)
      ├─ Canvas Session Management
      ├─ Message Streaming
      ├─ Code Detection & Streaming
      └─ Canvas Tool Integration
```

### 📦 Key Modules

**Chat System:**
- `useChatWithTools.ts` – Main chat with web search and tool support
- `useProviders.ts` – Provider management and model selection
- `ChatArea.tsx` – Main chat interface component
- `ChatMessage.tsx` – Message rendering with markdown and syntax highlighting

**Canvas System:**
- `useCanvasChat.ts` – Independent Canvas chat with tool integration
- `useCanvasManager.ts` – Canvas mode orchestration and state management
- `Canvas.tsx` – Canvas interface with code editor and chat
- `canvasTool.ts` – Canvas tool definitions and validation

**Web Search:**
- `autoSearchManager.ts` – Search orchestration and decision making
- `searchOrchestrator.ts` – Query coordination and RAG processing
- `backendScraper.ts` – Tauri backend interface for web scraping
- `searchEvents.ts` – Real-time search progress updates

**Providers:**
- `BaseProvider.ts` – Abstract base class for all providers
- `OllamaProvider.ts` – Ollama integration
- `LMStudioProvider.ts` – LM Studio integration
- `ProviderFactory.ts` – Provider instantiation and management

### 🔄 Data Flow

**Main Chat:**
```
User Input → useChatWithTools → Provider → Streaming Response → ChatMessage
                    ↓
              Web Search (if needed)
                    ↓
              RAG Context Injection
```

**Canvas Mode:**
```
User Input → useCanvasManager → useCanvasChat → Provider → Streaming Response
                                                                    ↓
                                                          Code Detection
                                                                    ↓
                                                    canvasCodeStream Event
                                                                    ↓
                                                          Canvas Component
                                                                    ↓
                                                    LIVE Code Display
```

### 💾 State Management

**Main Chat:**
- Sessions: `sessions` (localStorage)
- Current: `current-session` (localStorage)
- Provider: `providers` (localStorage)

**Canvas:**
- Sessions: `canvas-chat-sessions` (localStorage)
- Current: `current-canvas-session` (localStorage)
- Mode: `isCanvasMode` (localStorage)

**Settings:**
- Web Search: `webSearchSettings` (localStorage)
- CUDA: Detected via Tauri backend
- Hugging Face: `hf_token` (localStorage)

## Adding a New Provider

1. Create a new provider class extending `BaseProvider` in `src/providers/`
2. Implement the required methods: `listModels()`, `sendMessage()`, `testConnection()`
3. Add the provider to `ProviderFactory` in `src/providers/factory.ts`
4. Add the provider type to the `ProviderType` union in `src/types/index.ts`
5. Update the provider health monitor in `ProviderHealthMonitor.ts`

## Configuration

Providers can be configured through the Settings panel:
- Base URL or host for each provider endpoint.
- API keys or access tokens when a provider requires authentication.
- Default model selection per provider profile.
- Connection diagnostics for ensuring the backend is reachable.

## Development

Use the scripts in `package.json` to streamline your workflow:

- `npm run dev` – Runs the Vite development server with fast HMR.
- `npm run tauri dev` – Boots the Tauri desktop shell for local testing.
- `npm run build` – Produces optimized assets for deployment.
- `npm run tauri build` – Generates platform-specific binaries.

## Performance & Optimization

OpenChat is built with performance in mind:

### ⚡ Optimizations

- **Lazy Loading** – Web search components loaded on-demand
- **Debounced Updates** – Message rendering debounced during streaming (150ms)
- **Hash-Based Deduplication** – Code updates only when content changes
- **Event-Driven Architecture** – Efficient real-time updates via custom events
- **Efficient Re-rendering** – React hooks optimized with proper dependencies
- **Backend Scraping** – Web scraping handled by Rust backend (no Puppeteer overhead)
- **Modular Code Splitting** – Features loaded independently

### 📊 Metrics

- **App.tsx Size** – Reduced by ~150 lines through modular architecture
- **Bundle Size** – Optimized with lazy loading and code splitting
- **Memory Usage** – Efficient state management with proper cleanup
- **Startup Time** – Fast initialization with deferred component loading
- **Streaming Performance** – Real-time code updates with no lag

### 🎯 Best Practices

- **Type Safety** – Full TypeScript coverage with strict mode
- **Error Handling** – Comprehensive error boundaries and fallbacks
- **Memory Management** – Proper cleanup in useEffect hooks
- **State Optimization** – Minimal re-renders with React.memo and useCallback
- **Code Quality** – Clean, maintainable code with clear separation of concerns

## Tech Stack

- **Tauri** – Lightweight desktop shell that wraps the web UI
- **React** – Component-driven UI development with hooks
- **TypeScript** – Static typing across the entire application
- **TailwindCSS** – Utility-first styling system
- **Vite** – Modern build tooling for fast iteration
- **Lucide React** – Icon library used throughout the interface
- **Prism.js** – Syntax highlighting for code blocks
- **Marked** – Markdown parsing and rendering
- **KaTeX** – Mathematical expression rendering
- **DOMPurify** – HTML sanitization for security

## License

MIT

## Recommended IDE Setup

- [VS Code](https://code.visualstudio.com/) + [Tauri](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
