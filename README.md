![OpenChat screenshot](https://i.imgur.com/YVcZIrN.png)

# OpenChat

![Version](https://img.shields.io/badge/version-0.6.0--refactored-blue)
![License](https://img.shields.io/badge/license-MIT-green)
![Platform](https://img.shields.io/badge/platform-Windows%20%7C%20macOS%20%7C%20Linux-lightgrey)
![Free Forever](https://img.shields.io/badge/free-forever-brightgreen)

OpenChat is a modern, modular LLM chat application featuring a Next-Gen FastAPI Python backend and a React/TypeScript frontend. It connects seamlessly to local AI providers like Ollama and Cloud solutions like Hugging Face Serverless endpoints, with integrated CUDA support and Hugging Face training capabilities.

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


**🏗️ Modern Architecture:**
- **Modular Hook System** – Clean separation of concerns with dedicated hooks:
  - `useChatWithTools` – Main chat with web search and tool support
- **Optimized Performance** – Lazy loading, debounced updates, and efficient re-rendering

**🔧 Enhanced Features:**
- **CUDA Detection & Monitoring** – Automatic NVIDIA GPU detection with detailed information
- **Hugging Face Integration** – Seamless authentication and Trainer API access
- **Free Web Search** – 100% free web search with intelligent auto-detection and citations
- **Vision Support** – Send images to vision-capable models with automatic processing
- **Streamlined Providers** – Focus on local providers (Ollama) for privacy

**🎯 Developer Experience:**
- **Clean Codebase** – App.tsx reduced by ~150 lines through modular architecture
- **No TypeScript Errors** – Fully typed with proper interfaces and type guards
- **Easier Maintenance** – Each feature has its own dedicated module

See the full [CHANGELOG.md](CHANGELOG.md) for detailed release notes.

## Migration Guide

### 🔄 What Changed

This version represents a **complete architectural overhaul** of OpenChat. Here's what you need to know:

**✅ Enhanced & Improved:**
- **Web Search** – Streamlined with better performance and 100% free operation
- **Architecture** – Modular hook system with clean separation of concerns
- **Performance** – Optimized with lazy loading, debounced updates, and efficient re-rendering
- **Type Safety** – Full TypeScript coverage with proper interfaces
- **Session Management** – Improved session and chat history handling.

**🗑️ Removed Features:**
- **Cloud Providers** – Removed Anthropic, OpenAI, Google, Groq, and other cloud providers to focus on local, privacy-first solutions
- **Plugin System** – Removed in favor of built-in, well-integrated features
- **Persona Settings** – Simplified to streamline user experience
- **Legacy Tool System** – Replaced with modern internal tool integration

**🎯 Why These Changes?**

The removed features were either:
1. **Redundant** – Better alternatives now exist in the new architecture
2. **Maintenance Burden** – Required significant upkeep without proportional value
3. **Privacy Concerns** – Cloud providers conflicted with our local-first philosophy
4. **Complexity** – Added unnecessary complexity to the codebase

**📦 What You Keep:**
- All your local chat sessions
- Provider configurations (Ollama)
- Settings and preferences
- CUDA and Hugging Face configurations

- Enhanced backend speeds via FastAPI python core
- Improved memory management and API request efficiency
- Better performance and stability
- Cleaner, more maintainable codebase
- Enhanced developer experience

### 💡 Recommendations

**For Users:**
- If you relied on cloud providers, consider using Ollama with cloud-hosted models
- Check out the improved web search with automatic detection

**For Developers:**
- Review the new architecture documentation
- Explore the modular hook system

## Features

### 💬 Chat Experience
- **Modern Interface** – ChatGPT-inspired layout with full dark-mode support
- **Streaming Responses** – Display tokens as they arrive from the model
- **Session Management** – Create, persist, and revisit conversations
- **Rich Markdown** – Code blocks, tables, inline formatting, and LaTeX math rendering
- **Token Usage Tracking** – Detailed consumption metrics (input/output/total) per response
- **Syntax Highlighting** – Persistent Prism.js highlighting across navigation and reloads

### 💎 Support & Subscription Plans (Upcoming)
OpenChat is fundamentally **100% Free** and fully featured for local AI usage. The subscription tiers seen in the interface are **not yet active**. Once available, they will primarily serve as a way to **donate** and support development.

- **Free Forever** – Unlimited local AI models and standard features (100% free).
- **Development Support** – Future plans will act as an optional way to support the author.
- **Premium Web Search (Planned)** – Because high-level web search relies on expensive external APIs, there will eventually be costs associated with Premium Web Search tiers to cover API fees.
- **Gradual Updates** – Other experimental or premium-tier features will be added gradually over time.

### 🔍 Web Search (100% Free)
- **No API Keys Required** – Completely free web search using DuckDuckGo
- **Intelligent Auto-Detection** – Automatically determines when search would be helpful
- **Backend Scraping** – Python FastAPI backend handles all web scraping
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
- **Native Performance** – FastAPI python backend powers the native file and execution APIs
- **Local-First** – Focus on privacy with local providers (Ollama)

## Supported Providers

| Provider | Default endpoint | Vision Support | Notes |
| --- | --- | --- | --- |
| **Ollama** | `http://localhost:11434` | ✅ Yes | Local LLM runtime and default backend. Supports vision models like Llama 3.2 Vision, LLaVA, and Bakllava. |
| **Hugging Face** | `https://api-inference.huggingface.co` | ✅ Yes | Full integration with Hugging Face Serverless Inference APIs, allowing access to tens of thousands of cloud models with secure API Key storage. |

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Python 3.10+ (for FastAPI backend)
- One of the supported LLM providers running locally

### Installation

1. Clone the repository and install dependencies:

   ```bash
   git clone https://github.com/OpenChatGit/OpenChat.git
   npm install
   ```

2. Set up the Python Backend:

   ```bash
   cd backend
   python -m venv .venv
   .venv\Scripts\activate # On Windows
   pip install -r requirements.txt
   uvicorn main:app --reload --port 8000
   ```

3. Start the React frontend (in a new terminal):

   ```bash
   npm run dev
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
- **Backend Scraping** – Python FastAPI backend handles all web scraping, eliminating the need for Puppeteer or browser dependencies.
- **Streamlined UI** – Minimal, elegant search indicators:
  - "Searching web" with animated spinner during search
  - "Searched Web" with source favicons (up to 5) after completion
- **RAG Processing** – Chunks content, ranks relevance, and injects structured context into model prompts.
- **Event-Driven Architecture** – Real-time progress updates through a clean event system.
- **Lazy Loading** – Search components are loaded on-demand to keep the initial bundle size small.

### Architecture

- **AutoSearchManager** (`src/lib/web-search/autoSearchManager.ts`) – Orchestrates search decisions, execution, and context injection.
- **SearchOrchestrator** (`src/lib/web-search/searchOrchestrator.ts`) – Coordinates search queries, scraping, and RAG processing.
- **BackendScraper** (`src/lib/web-search/backendScraper.ts`) – Interfaces with FastAPI backend for efficient web scraping.
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
```

### 📦 Key Modules

**Chat System:**
- `useChatWithTools.ts` – Main chat with web search and tool support
- `useProviders.ts` – Provider management and model selection
- `ChatArea.tsx` – Main chat interface component
- `ChatMessage.tsx` – Message rendering with markdown and syntax highlighting

**Canvas System:**

**Web Search:**
- `autoSearchManager.ts` – Search orchestration and decision making
- `searchOrchestrator.ts` – Query coordination and RAG processing
- `backendScraper.ts` – FastAPI backend interface for web scraping
- `searchEvents.ts` – Real-time search progress updates

**Providers:**
- `BaseProvider.ts` – Abstract base class for all providers
- `OllamaProvider.ts` – Ollama integration
- `` –  integration
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


### 💾 State Management

**Main Chat:**
- Sessions: `sessions` (localStorage)
- Current: `current-session` (localStorage)
- Provider: `providers` (localStorage)


**Settings:**
- Web Search: `webSearchSettings` (localStorage)
- CUDA: Detected via FastAPI backend
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

- `npm run dev` – Runs the Vite development server for the frontend.
- `uvicorn main:app --reload` – Runs the FastAPI backend server on port 8000.

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

- **FastAPI (Python)** – Robust backend handling streaming, system capabilities, and file management
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

- [VS Code](https://code.visualstudio.com/) + [FastAPI](https://marketplace.visualstudio.com/items?itemName=tauri-apps.tauri-vscode) + [rust-analyzer](https://marketplace.visualstudio.com/items?itemName=rust-lang.rust-analyzer)
