# Changelog

All notable changes to OpenChat will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- **Multi-Language Code Execution** - Comprehensive execution support for 12+ languages
  - **Interpreted Languages**: Python (with auto package install), JavaScript, TypeScript, Ruby, PHP
  - **Compiled Languages**: Rust (rustc), Go (go run), Java (javac), C/C++ (gcc/g++)
  - **Preview Languages**: HTML/CSS (live preview), Markdown (rendered), JSON (validation)
  - Automatic compilation for compiled languages with error handling
  - Real-time output display with stdout/stderr separation
  - Temporary file management with automatic cleanup
  - Language-specific error messages and installation guides
  
- **Enhanced Package Management** - Comprehensive package control in Canvas mode
  - Individual package uninstallation with language-specific package managers
  - Two-action system: full uninstall (trash icon) or list removal (X icon)
  - Improved package dropdown UI with install input and danger zone
  - Support for 7 languages: Python (pip), JavaScript/TypeScript (npm), Ruby (gem), Rust (cargo), Go (go), PHP (composer)
  - Clear package list function (removes from list without uninstalling)
  - Enhanced clean environment function with detailed feedback
  - Better error handling and user feedback
  - Hover-based action buttons for cleaner interface
  - Confirmation dialogs with clear explanations

## [0.6.0] - 2025-01-24

### Added
- **CUDA Support** - Comprehensive NVIDIA GPU detection and monitoring
  - Automatic detection of all NVIDIA GPUs with CUDA support via nvidia-smi
  - Real-time CUDA status display with dedicated button in main interface
  - Detailed GPU information: name, memory, compute capability, driver version, CUDA version
  - Dedicated CUDA settings tab with comprehensive GPU details
  - Installation guides and troubleshooting information for missing CUDA/drivers
  - Rust backend command for efficient GPU detection
- **Hugging Face Integration** - Seamless authentication and Trainer API access
  - Token-based authentication with secure storage
  - User profile display with username and avatar
  - Direct integration with Hugging Face Trainer API
  - Dedicated Trainer settings tab with API documentation and examples
  - Login modal with token validation
- **Canvas Mode** - Interactive code editor similar to ChatGPT Canvas
  - Resizable chat sidebar with smooth drag-and-drop functionality
  - Multi-language support with automatic detection (Python, JavaScript, TypeScript, Java, C++, Rust, Go, etc.)
  - Code execution with real-time output display
  - Collapsible output panel for maximized editing space
  - Code management tools: copy, download, reset
  - Seamless chat integration for collaborative coding
  - Syntax highlighting and language-specific formatting

### Changed
- **Streamlined Provider System** - Focused on local AI providers
  - Removed OpenAI, OpenRouter, Anthropic, and llama.cpp providers
  - Kept only Ollama and LM Studio for privacy-focused local AI
  - Simplified provider configuration and settings
  - Updated provider factory and type definitions
- **Simplified Interface** - Removed unnecessary features for cleaner UX
  - Removed plugin system and all plugin-related code
  - Removed persona functionality and system prompt settings modal
  - Streamlined settings interface
  - Cleaner codebase with reduced complexity

### Removed
- Plugin system (plugins/, src/plugins/, usePlugins.ts, externalPluginLoader.ts, toolExecutor.ts)
- Persona settings (PromptSettingsModal.tsx, personaDebug.ts)
- Cloud-based providers (OpenAI, OpenRouter, Anthropic, llama.cpp)
- Provider-specific icons and configurations for removed providers

### Technical
- Added CUDA detection types and interfaces (src/types/cuda.ts)
- Implemented useCuda hook for GPU status management (src/hooks/useCuda.ts)
- Created CudaButton component for status display (src/components/CudaButton.tsx)
- Added CudaSettings panel for detailed GPU information (src/components/CudaSettings.tsx)
- Implemented Hugging Face service layer (src/services/huggingface.ts)
- Created useAuth hook for authentication management (src/hooks/useAuth.ts)
- Added LoginModal component for token-based login (src/components/LoginModal.tsx)
- Implemented Hugging Face Trainer service (src/services/huggingfaceTrainer.ts)
- Created TrainerSettings panel for API access (src/components/TrainerSettings.tsx)
- Developed Canvas component with full editor functionality (src/components/Canvas.tsx)
- Extended Rust backend with detect_cuda command in lib.rs
- Updated provider types to only include 'ollama' and 'lmstudio'
- Cleaned up provider factory and removed unused provider implementations

## [0.5.8] - 2025-01-23

### Added
- **Dynamic Version Management** - Improved version detection and synchronization
  - Version now dynamically loaded from Tauri API in production
  - Automatic version sync script (`npm run sync-version`)
  - Consistent versioning across package.json, Cargo.toml, and tauri.conf.json
  - Dev builds now correctly show current version (0.5.8)
- **OpenRouter Provider Integration** - Full support for OpenRouter API with 100+ models
  - Access to models from Anthropic, OpenAI, Google, Meta, Mistral, and more
  - Model filtering and search capabilities for managing large model lists
  - API key support with secure storage
- **Enhanced Model Management**
  - Model filtering system with "Show All" / "Hide All" options
  - Search functionality for finding specific models
  - Real-time model visibility updates in ModelSelector
  - Statistics display (Visible/Hidden/Total models)
- **Light/Dark Theme System**
  - Complete theme implementation with CSS variables
  - Theme toggle in Settings with persistent preference
  - Proper styling for both modes including user bubbles and input containers
- **Model Name Pruning** - Clean display of model names by removing provider prefixes
  - Supports: anthropic/, openai/, google/, nvidia/, amazon/, perplexity/, deepseek/, minimax/, and 15+ more
  - Consistent naming across ModelSelector and Settings
- **Provider Settings Reorganization**
  - Moved provider configuration to dedicated "Providers" sidebar section
  - Individual tabs for each provider (Ollama, LM Studio, OpenAI, Anthropic, OpenRouter)
  - Improved provider information display with setup instructions

### Changed
- System prompt is now stored globally and loaded dynamically
- Update checker now uses Tauri's getVersion() API for accurate version detection
- Version synchronization improved across all configuration files
- **Enhanced Ollama Documentation**
  - Added Windows app setup instructions
  - Network exposure configuration guide
  - Command-line and GUI setup options

### Changed
- Provider settings now isolated in dedicated sidebar tabs instead of main Settings
- Model selector automatically loads models when opened
- Provider-specific model caching prevents model mixing between providers
- Improved model filtering logic to respect hiddenModels configuration
- Updated selectedProvider when provider configuration changes

### Fixed
- Models not appearing in ModelSelector after being enabled in Settings
- Provider model mixing when switching between providers
- Hidden models not being properly filtered from ModelSelector dropdown
- Cache not respecting hiddenModels changes
- Model visibility not updating in real-time

### Technical
- Implemented provider-specific model caching system
- Enhanced useProviders hook with dynamic model filtering
- Added cleanModelName function for consistent name display
- Improved provider update logic to sync selectedProvider state
- Extended theme system with comprehensive CSS variable support

## [0.5.1] - 2025-01-22

### Added
- **Source Citation Support** - AI responses now include inline citations `[1]`, `[2]` that reference web search sources
  - Citations appear inline in the text without disrupting reading flow
  - Clickable favicons in "Searched Web" indicator highlight related citations
  - Citations automatically link to their source URLs
  - Full markdown formatting support maintained (tables, lists, code blocks, etc.)
- **Source Registry System** - Centralized management of web search sources with unique IDs
- **Citation Parser** - Robust parsing of citation markers in AI responses
- **Enhanced Web Search Display** - Compact "Searched Web" indicator with interactive source favicons

### Changed
- Improved citation rendering to be non-intrusive and inline
- Updated web search result display to be more compact and user-friendly
- Refined citation styling to match modern citation systems (superscript format)

### Technical
- Implemented `SourceRegistry` for tracking web search sources across chat sessions
- Added `CitationParser` for extracting and parsing citation references
- Enhanced `ContextFormatter` to include citation instructions for LLM
- Integrated citation support into `ChatMessage` component with markdown compatibility

## [0.4.8] - Previous Release

### Features
- Web search integration with automatic context formatting
- Multi-provider support (Ollama, LM Studio, Anthropic, OpenAI, etc.)
- Reasoning model support with collapsible reasoning blocks
- Image attachment support for vision-capable models
- Session management with persistent chat history
- Token usage tracking and display
- Dark mode UI with responsive design
