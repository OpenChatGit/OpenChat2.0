import { useState, useRef, useEffect } from 'react'
import { Play, Copy, Download, RotateCcw, Check, ChevronRight, ChevronLeft, Square, X, Sun, Moon, Terminal as TerminalIcon, MessageSquare, ChevronDown, Trash2, Edit2, Package, ZoomIn, ZoomOut } from 'lucide-react'
import editSquareIcon from '../assets/edit_square.svg'
import { Terminal } from './Terminal'
import { ChatMessage } from './ChatMessage'
import { SafeMarkdownPreview } from './SafeMarkdownPreview'
import { cn } from '../lib/utils'
import { ChatInput } from './ChatInput'
import type { ImageAttachment, ProviderConfig, ModelInfo } from '../types'
import Prism from 'prismjs'
import { marked } from 'marked'
import Editor from 'react-simple-code-editor'
import '../styles/prism-custom.css'
import '../styles/markdown-preview.css'
import '../styles/canvas-preview.css'

// Import core languages first (required by other languages)
import 'prismjs/components/prism-markup'
import 'prismjs/components/prism-css'
import 'prismjs/components/prism-clike'
import 'prismjs/components/prism-javascript'

// Import languages with dependencies
import 'prismjs/components/prism-python'
import 'prismjs/components/prism-typescript'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-c'
import 'prismjs/components/prism-cpp'
import 'prismjs/components/prism-rust'
import 'prismjs/components/prism-go'
import 'prismjs/components/prism-ruby'
import 'prismjs/components/prism-markup-templating' // Required for PHP
import 'prismjs/components/prism-php'
import 'prismjs/components/prism-swift'
import 'prismjs/components/prism-kotlin'
import 'prismjs/components/prism-csharp'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'

interface CanvasProps {
  initialCode?: string
  language?: string
  onSendMessage?: (message: string, images?: ImageAttachment[]) => void
  isGenerating?: boolean
  onExit?: () => void
  providers?: ProviderConfig[]
  selectedProvider?: ProviderConfig | null
  selectedModel?: string
  models?: ModelInfo[]
  onSelectProvider?: (provider: ProviderConfig) => void
  onSelectModel?: (model: string) => void
  onLoadModels?: (provider: ProviderConfig) => void
  isLoadingModels?: boolean
  canvasToolsEnabled?: boolean
  currentSession?: any
  onRegenerateMessage?: (messageId: string) => void
  getSourceRegistry?: () => any
  // Canvas session management
  canvasSessions?: any[]
  onSelectCanvasSession?: (sessionId: string) => void
  onCreateCanvasSession?: () => void
  onDeleteCanvasSession?: (sessionId: string) => void
  onRenameCanvasSession?: (sessionId: string, newTitle: string) => void
  onSaveCanvasState?: (sessionId: string, code: string, language: string, files?: any[], currentFileId?: string, showFileExplorer?: boolean) => void
}

// Helper function to escape HTML
const escapeHtml = (text: string): string => {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;')
}

export function Canvas({ 
  initialCode = '', 
  language: initialLanguage = 'javascript', 
  onSendMessage, 
  isGenerating = false, 
  onExit,
  providers = [],
  selectedProvider = null,
  selectedModel = '',
  models = [],
  onSelectProvider = () => {},
  onSelectModel = () => {},
  onLoadModels = () => {},
  isLoadingModels = false,
  canvasToolsEnabled = false,
  currentSession,
  onRegenerateMessage,
  getSourceRegistry,
  canvasSessions = [],
  onSelectCanvasSession = () => {},
  onCreateCanvasSession = () => {},
  onDeleteCanvasSession = () => {},
  onRenameCanvasSession = () => {},
  onSaveCanvasState = () => {}
}: CanvasProps) {
  // Load code from session if available
  const [code, setCode] = useState(currentSession?.canvasCode || initialCode)
  const [output, setOutput] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [copied, setCopied] = useState(false)
  const [chatSidebarWidth, setChatSidebarWidth] = useState(320)
  const [isResizing, setIsResizing] = useState(false)
  const [showOutput, setShowOutput] = useState(true)
  const [detectedLanguage, setDetectedLanguage] = useState<string>(() => {
    // Initialize from session if available
    if (currentSession?.canvasLanguage) {
      return currentSession.canvasLanguage.toLowerCase()
    }
    return initialLanguage
  })
  const [manualLanguageSet, setManualLanguageSet] = useState(() => {
    // If session has a language, mark as manually set
    return !!currentSession?.canvasLanguage
  })
  const [isPreviewMode, setIsPreviewMode] = useState(false)
  const [previewDarkMode, setPreviewDarkMode] = useState(false)
  const [previewZoom, setPreviewZoom] = useState(100) // percentage
  const [showTerminal, setShowTerminal] = useState(false)
  const [currentFilename, setCurrentFilename] = useState<string>('')
  const [editorWidth, setEditorWidth] = useState(50) // percentage
  const [isResizingEditor, setIsResizingEditor] = useState(false)
  const [isChatSidebarCollapsed, setIsChatSidebarCollapsed] = useState(false)
  const [agentModeEnabled, setAgentModeEnabled] = useState(false)
  const [isSessionDropdownOpen, setIsSessionDropdownOpen] = useState(false)
  const [editingSessionId, setEditingSessionId] = useState<string | null>(null)
  const [editingSessionTitle, setEditingSessionTitle] = useState('')
  const [deletingSessionId, setDeletingSessionId] = useState<string | null>(null)
  const [installedPackages, setInstalledPackages] = useState<string[]>([])
  const [showPackageManager, setShowPackageManager] = useState(false)
  const [packageToInstall, setPackageToInstall] = useState('')
  const [isInstallingPackage, setIsInstallingPackage] = useState(false)
  const [venvPath, setVenvPath] = useState<string>('')
  const [nodeModulesPath, setNodeModulesPath] = useState<string>('')
  const [showPackageDropdown, setShowPackageDropdown] = useState(false)
  const [packageErrors, setPackageErrors] = useState<string[]>([])
  
  // Multi-file support
  interface FileItem {
    id: string
    name: string
    language: string
    content: string
  }
  const [files, setFiles] = useState<FileItem[]>(() => {
    // Initialize from session if available
    return currentSession?.canvasFiles || []
  })
  const [currentFileId, setCurrentFileId] = useState<string | null>(() => {
    // Initialize from session if available
    return currentSession?.currentFileId || null
  })
  const [showFileExplorer, setShowFileExplorer] = useState(() => {
    // Restore from session if available, otherwise default to closed
    if (currentSession?.showFileExplorer !== undefined) {
      return currentSession.showFileExplorer
    }
    return false  // Default: closed
  })
  
  const resizeRef = useRef<HTMLDivElement>(null)
  const editorResizeRef = useRef<HTMLDivElement>(null)
  const sessionDropdownRef = useRef<HTMLDivElement>(null)
  const packageDropdownRef = useRef<HTMLDivElement>(null)
  const fileExplorerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode)
    }
  }, [initialCode])

  // Setup and cleanup virtual environment when session changes
  useEffect(() => {
    const setupEnvironment = async () => {
      if (!currentSession?.id) return
      
      try {
        const { invoke } = await import('@tauri-apps/api/core')
        
        // Create isolated environment directory for this session
        const sessionEnvDir = `.canvas_env_${currentSession.id}`
        
        console.log('[Canvas] 🔧 Environment directory:', sessionEnvDir)
        
        // Setup Python virtual environment
        if (detectedLanguage === 'python') {
          console.log('[Canvas] Setting up Python venv for session:', currentSession.id)
          try {
            // Create venv
            await invoke('run_terminal_command', {
              command: `python -m venv ${sessionEnvDir}`,
              workingDir: undefined
            })
            setVenvPath(sessionEnvDir)
            console.log('[Canvas] Python venv created:', sessionEnvDir)
          } catch (error) {
            console.error('[Canvas] Failed to create venv:', error)
          }
        }
        
        // Setup Node.js environment
        if (detectedLanguage === 'javascript' || detectedLanguage === 'typescript') {
          console.log('[Canvas] Setting up Node.js environment for session:', currentSession.id)
          setNodeModulesPath(sessionEnvDir)
        }
      } catch (error) {
        console.error('[Canvas] Failed to setup environment:', error)
      }
    }
    
    setupEnvironment()
    
    // Cleanup function
    return () => {
      const cleanup = async () => {
        if (!currentSession?.id) return
        
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          const sessionEnvDir = `.canvas_env_${currentSession.id}`
          
          // Remove virtual environment directory
          console.log('[Canvas] Cleaning up environment:', sessionEnvDir)
          try {
            await invoke('run_terminal_command', {
              command: `rmdir /s /q ${sessionEnvDir}`,
              workingDir: undefined
            })
            console.log('[Canvas] Environment cleaned up')
          } catch (error) {
            // Ignore cleanup errors
            console.warn('[Canvas] Cleanup warning:', error)
          }
        } catch (error) {
          console.error('[Canvas] Cleanup error:', error)
        }
      }
      
      cleanup()
    }
  }, [currentSession?.id, detectedLanguage])

  // Load code, language, and files from session when session changes
  useEffect(() => {
    if (currentSession?.canvasCode) {
      console.log('[Canvas] Loading session code:', currentSession.id, 'Language:', currentSession.canvasLanguage)
      setCode(currentSession.canvasCode)
      
      if (currentSession.canvasLanguage) {
        const normalizedLanguage = currentSession.canvasLanguage.toLowerCase()
        setDetectedLanguage(normalizedLanguage)
        setManualLanguageSet(true) // Prevent auto-detection from overriding
        console.log('[Canvas] Language restored from session:', normalizedLanguage)
      }
      
      // Restore files if available
      if (currentSession.canvasFiles && currentSession.canvasFiles.length > 0) {
        console.log('[Canvas] 📁 Restoring files from session:', {
          sessionId: currentSession.id,
          filesCount: currentSession.canvasFiles.length,
          fileNames: currentSession.canvasFiles.map((f: FileItem) => f.name),
          currentFileId: currentSession.currentFileId,
          showFileExplorer: currentSession.showFileExplorer
        })
        
        setFiles(currentSession.canvasFiles)
        
        // Restore current file ID
        if (currentSession.currentFileId) {
          setCurrentFileId(currentSession.currentFileId)
          const currentFile = currentSession.canvasFiles.find((f: FileItem) => f.id === currentSession.currentFileId)
          if (currentFile) {
            setCode(currentFile.content)
            setDetectedLanguage(currentFile.language)
            setCurrentFilename(currentFile.name)
            console.log('[Canvas] 📄 Restored current file:', currentFile.name)
          } else {
            console.warn('[Canvas] ⚠️ Current file ID not found in files:', currentSession.currentFileId)
          }
        } else {
          console.warn('[Canvas] ⚠️ No current file ID in session')
        }
        
        // Restore file explorer state from session
        if (currentSession.showFileExplorer !== undefined) {
          console.log('[Canvas] 📂 Restoring file explorer state:', currentSession.showFileExplorer)
          setShowFileExplorer(currentSession.showFileExplorer)
        } else {
          // Default: closed (user must click to open)
          console.log('[Canvas] 📂 File explorer closed by default')
          setShowFileExplorer(false)
        }
        
        console.log('[Canvas] ✅ Files restored successfully')
      } else {
        console.log('[Canvas] ℹ️ No files in session to restore')
        // No files in session - clear files state
        setFiles([])
        setCurrentFileId(null)
        setShowFileExplorer(false)
      }
    } else if (currentSession) {
      // New session without code - reset to defaults
      setCode('')
      setDetectedLanguage('none')
      setManualLanguageSet(false)
      setInstalledPackages([]) // Reset installed packages
      setFiles([]) // Reset files
      setCurrentFileId(null)
      console.log('[Canvas] New session - reset to defaults')
    }
  }, [currentSession?.id])

  // Auto-save code, files, current file, and explorer state to session
  useEffect(() => {
    if (!currentSession || !onSaveCanvasState) return
    
    // Debounce save
    const timer = setTimeout(() => {
      // Update current file content in files array if we're in multi-file mode
      let updatedFiles = files
      if (files.length > 0 && currentFileId) {
        updatedFiles = files.map((f: FileItem) => 
          f.id === currentFileId ? { ...f, content: code } : f
        )
      }
      
      onSaveCanvasState(
        currentSession.id, 
        code, 
        detectedLanguage,
        updatedFiles.length > 0 ? updatedFiles : undefined,
        currentFileId || undefined,
        showFileExplorer  // Save explorer state
      )
      console.log('[Canvas] 💾 Auto-saved:', {
        code: code.length,
        language: detectedLanguage,
        files: updatedFiles.length,
        currentFileId,
        showFileExplorer
      })
    }, 1000)
    
    return () => clearTimeout(timer)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [code, detectedLanguage, files, currentFileId, showFileExplorer, currentSession?.id])

  // Debug: Log when files change
  useEffect(() => {
    console.log('[Canvas] Files updated:', files.length, files)
    if (files.length > 0) {
      console.log('[Canvas] Current file ID:', currentFileId)
      console.log('[Canvas] Show file explorer:', showFileExplorer)
    }
  }, [files, currentFileId, showFileExplorer])

  // Close file explorer when clicking outside
  useEffect(() => {
    if (!showFileExplorer) return

    const handleClickOutside = (event: MouseEvent) => {
      if (fileExplorerRef.current && !fileExplorerRef.current.contains(event.target as Node)) {
        setShowFileExplorer(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showFileExplorer])

  // Close package dropdown when clicking outside
  useEffect(() => {
    if (!showPackageDropdown) return

    const handleClickOutside = (event: MouseEvent) => {
      if (packageDropdownRef.current && !packageDropdownRef.current.contains(event.target as Node)) {
        setShowPackageDropdown(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [showPackageDropdown])

  // Close session dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (sessionDropdownRef.current && !sessionDropdownRef.current.contains(event.target as Node)) {
        setIsSessionDropdownOpen(false)
      }
    }

    if (isSessionDropdownOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    } else {
      // Reset states when dropdown closes
      setDeletingSessionId(null)
      setEditingSessionId(null)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSessionDropdownOpen])

  // Handle tool calls from AI models
  useEffect(() => {
    const handleCanvasToolCall = async (event: CustomEvent) => {
      // Log canvas tools status
      console.log('[Canvas] Received tool call, Agent mode:', agentModeEnabled, 'Canvas tools:', canvasToolsEnabled)

      const { toolName, args } = event.detail
      
      if (toolName === 'canvas_code_editor') {
        const { action, language: newLanguage, code: newCode, filename } = args
        
        console.log('[Canvas] Processing tool call:', action, { language: newLanguage, hasCode: !!newCode })
        
        switch (action) {
          case 'create':
            if (newCode && newLanguage) {
              setCode(newCode)
              // Normalize language to lowercase
              const normalizedLanguage = newLanguage.toLowerCase()
              setDetectedLanguage(normalizedLanguage)
              setManualLanguageSet(true) // Mark language as manually set
              if (filename) setCurrentFilename(filename)
              setOutput('')
              console.log('[Canvas] Code created successfully with language:', normalizedLanguage)
            }
            break
          
          case 'update':
            if (newCode && newLanguage) {
              setCode(newCode)
              // Normalize language to lowercase
              const normalizedLanguage = newLanguage.toLowerCase()
              setDetectedLanguage(normalizedLanguage)
              setManualLanguageSet(true) // Mark language as manually set
              if (filename) setCurrentFilename(filename)
              console.log('[Canvas] Code updated successfully with language:', normalizedLanguage)
            }
            break
          
          case 'append':
            if (newCode) {
              setCode((prev: string) => prev + '\n\n' + newCode)
              console.log('[Canvas] Code appended successfully')
            }
            break
          
          case 'execute':
            console.log('[Canvas] Executing code...')
            await handleRun()
            break
        }
      }
    }
    
    // Helper function to get file extension from language
    const getFileExtension = (lang: string): string => {
      const extensions: Record<string, string> = {
        javascript: 'js',
        typescript: 'ts',
        python: 'py',
        html: 'html',
        css: 'css',
        json: 'json',
        markdown: 'md',
        java: 'java',
        cpp: 'cpp',
        rust: 'rs',
        go: 'go'
      }
      return extensions[lang.toLowerCase()] || 'txt'
    }
    
    // Handler for LIVE code streaming with multi-file support
    const handleCanvasCodeStream = (event: any) => {
      const { language, code, isComplete, allCodeBlocks } = event.detail
      console.log('[Canvas] 📡 Streaming code:', language, `(${code.length} chars)`, isComplete ? '✓ Complete' : '⏳ Streaming...')
      console.log('[Canvas] 📁 All code blocks:', allCodeBlocks)
      
      // Check if we have multiple code blocks (or even just one in array format)
      if (allCodeBlocks && Array.isArray(allCodeBlocks) && allCodeBlocks.length > 0) {
        console.log('[Canvas] 📁 Files detected:', allCodeBlocks.length)
        console.log('[Canvas] 📁 Block details:', allCodeBlocks.map((b: any) => `${b.language} (${b.filename || 'no name'})`).join(', '))
        
        // Smart file management: update existing files or add new ones
        const updatedFiles: FileItem[] = []
        const existingFileMap = new Map(files.map(f => [f.name.toLowerCase(), f]))
        const processedFiles = new Set<string>()
        
        allCodeBlocks.forEach((block: any, index: number) => {
          // Generate filename with better fallback logic
          let fileName = block.filename
          
          // If no filename provided, try to extract from code content
          if (!fileName) {
            // Try to find filename in first line comment
            const firstLine = block.code.split('\n')[0]
            const commentMatch = firstLine.match(/^(?:\/\/|#|<!--)\s*(?:filename:|file:)?\s*([^\s\n]+\.[a-z]+)/i)
            if (commentMatch) {
              fileName = commentMatch[1].trim()
              console.log('[Canvas] 📝 Extracted filename from code comment:', fileName)
            }
          }
          
          // If still no filename, generate a smart default based on language
          if (!fileName) {
            const languageDefaults: Record<string, string> = {
              html: 'index.html',
              css: 'styles.css',
              javascript: 'script.js',
              typescript: 'script.ts',
              python: 'main.py',
              java: 'Main.java',
              cpp: 'main.cpp',
              rust: 'main.rs',
              go: 'main.go'
            }
            
            // Use language-specific default or generic file{N}.ext
            const defaultName = languageDefaults[block.language.toLowerCase()]
            if (defaultName && index === 0) {
              fileName = defaultName
            } else {
              fileName = `file${index + 1}.${getFileExtension(block.language)}`
            }
            console.log('[Canvas] 🏷️ Generated default filename:', fileName)
          }
          
          // Check for existing file (case-insensitive)
          const fileNameLower = fileName.toLowerCase()
          const existingFile = existingFileMap.get(fileNameLower)
          
          // Also check if file with same language already exists (prevent duplicates)
          const sameLanguageFile = files.find(f => 
            f.language === block.language.toLowerCase() && 
            !processedFiles.has(f.name.toLowerCase())
          )
          
          if (existingFile) {
            // Update existing file (exact match)
            console.log('[Canvas] 🔄 Updating existing file:', fileName, `(${block.code.length} chars)`)
            updatedFiles.push({
              ...existingFile,
              content: block.code,
              language: block.language.toLowerCase()
            })
            processedFiles.add(fileNameLower)
          } else if (sameLanguageFile && !block.filename) {
            // Update file with same language (if no explicit filename provided)
            console.log('[Canvas] 🔄 Updating file by language:', sameLanguageFile.name, '→', fileName, `(${block.code.length} chars)`)
            updatedFiles.push({
              ...sameLanguageFile,
              content: block.code,
              language: block.language.toLowerCase()
            })
            processedFiles.add(sameLanguageFile.name.toLowerCase())
          } else {
            // Create new file
            console.log('[Canvas] ➕ Adding new file:', fileName, block.language, `(${block.code.length} chars)`)
            updatedFiles.push({
              id: `file-${Date.now()}-${index}`,
              name: fileName,
              language: block.language.toLowerCase(),
              content: block.code
            })
            processedFiles.add(fileNameLower)
          }
        })
        
        // Add any existing files that weren't updated (keep them)
        files.forEach(f => {
          if (!processedFiles.has(f.name.toLowerCase())) {
            console.log('[Canvas] ✅ Keeping existing file:', f.name)
            updatedFiles.push(f)
          }
        })
        
        console.log('[Canvas] ✅ Total files:', updatedFiles.length, updatedFiles.map(f => f.name).join(', '))
        setFiles(updatedFiles)
        
        // Set first file as current if no file is selected yet
        if (updatedFiles.length > 0 && !currentFileId) {
          console.log('[Canvas] Setting initial file:', updatedFiles[0].name)
          setCurrentFileId(updatedFiles[0].id)
          setCode(updatedFiles[0].content)
          setDetectedLanguage(updatedFiles[0].language)
          setCurrentFilename(updatedFiles[0].name)
          setManualLanguageSet(true)
        } else if (currentFileId) {
          // Update current file content if it was modified
          const currentFile = updatedFiles.find(f => f.id === currentFileId)
          if (currentFile && currentFile.content !== code) {
            console.log('[Canvas] 🔄 Updating current file content:', currentFile.name)
            setCode(currentFile.content)
          }
        }
        
        // Don't auto-open file explorer - user must click
        // (removed auto-open logic)
        
        // Save files to session immediately
        if (currentSession && onSaveCanvasState) {
          const explorerState = showFileExplorer  // Keep current state
          console.log('[Canvas] 💾 Saving to session:', {
            sessionId: currentSession.id,
            filesCount: updatedFiles.length,
            fileNames: updatedFiles.map(f => f.name),
            currentFileId: updatedFiles[0]?.id || currentFileId,
            showFileExplorer: explorerState
          })
          
          onSaveCanvasState(
            currentSession.id,
            updatedFiles[0]?.content || code,
            updatedFiles[0]?.language || detectedLanguage,
            updatedFiles,
            updatedFiles[0]?.id || currentFileId || undefined,
            explorerState
          )
          console.log('[Canvas] ✅ Multi-files saved to session')
        } else {
          console.error('[Canvas] ❌ Cannot save - missing session or save function:', {
            hasSession: !!currentSession,
            hasSaveFunction: !!onSaveCanvasState
          })
        }
      } else {
        // Single file - update code in real-time
        console.log('[Canvas] Single file mode')
        setCode(code)
        const normalizedLanguage = language.toLowerCase()
        setDetectedLanguage(normalizedLanguage)
        setManualLanguageSet(true)
        
        // Clear files if switching to single file
        if (files.length > 0) {
          setFiles([])
          setCurrentFileId(null)
        }
      }
      
      // Clear output when streaming starts
      if (!isComplete) {
        setOutput('')
      }
    }
    
    console.log('[Canvas] 🎯 Event listeners registered')
    window.addEventListener('canvasToolCall' as any, handleCanvasToolCall as any)
    window.addEventListener('canvasCodeStream' as any, handleCanvasCodeStream as any)
    
    return () => {
      console.log('[Canvas] 🔴 Event listeners removed')
      window.removeEventListener('canvasToolCall' as any, handleCanvasToolCall as any)
      window.removeEventListener('canvasCodeStream' as any, handleCanvasCodeStream as any)
    }
  }, [])

  // Live preview update for markdown and text-based formats
  useEffect(() => {
    if (!isPreviewMode || !code.trim()) return

    const updatePreview = async () => {
      if (detectedLanguage === 'markdown') {
        try {
          const html = await marked.parse(code)
          setOutput(`MARKDOWN_PREVIEW:${html}`)
        } catch (error) {
          console.error('Markdown parsing error:', error)
        }
      } else if (detectedLanguage === 'html' || detectedLanguage === 'markup') {
        // HTML preview updates automatically via iframe srcDoc
        setOutput('PREVIEW_MODE')
      } else if (detectedLanguage === 'css') {
        // CSS preview updates automatically via iframe srcDoc
        setOutput('PREVIEW_MODE')
      } else if (detectedLanguage === 'json') {
        try {
          const parsed = JSON.parse(code)
          setOutput('✓ Valid JSON\n\n' + JSON.stringify(parsed, null, 2))
        } catch (error) {
          setOutput(`✗ Invalid JSON\n\n${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
    }

    updatePreview()
  }, [code, isPreviewMode, detectedLanguage])

  // Detect language from code - NO debouncing for instant feedback
  useEffect(() => {
    // Don't auto-detect if language was manually set via tool call
    if (manualLanguageSet) {
      console.log('[Canvas] Skipping auto-detection - language was manually set')
      return
    }

    if (!code.trim()) {
      setDetectedLanguage('none')
      return
    }

    const detectLanguage = (code: string): string => {
      // HTML (check VERY early, before TypeScript)
      if (/<!DOCTYPE html>|<html[\s>]|<head[\s>]|<body[\s>]|<meta[\s>]/i.test(code)) {
        return 'html'
      }
      // Markdown (check early, before HTML)
      if (/^#{1,6} |^\*\*|^\*[^*]|^- |^\d+\. |```|^\>|^\||^\[.*\]\(.*\)/m.test(code)) {
        return 'markdown'
      }
      // Python
      if (/^(import |from |def |class |if __name__|print\(|async def |await )/m.test(code)) {
        return 'python'
      }
      // TypeScript (check before JavaScript, but AFTER HTML)
      if (/(interface |type |: (string|number|boolean|any|void)|as |enum )/m.test(code)) {
        return 'typescript'
      }
      // JavaScript
      if (/(const |let |var |function |=>|console\.log|import |export |require\()/m.test(code)) {
        return 'javascript'
      }
      // Java
      if (/(public class |public static void|System\.out\.println|private |protected |@Override)/m.test(code)) {
        return 'java'
      }
      // C#
      if (/(using System|namespace |public class |Console\.WriteLine|var |async Task)/m.test(code)) {
        return 'csharp'
      }
      // C/C++
      if (/(#include|int main\(|printf\(|cout <<|std::)/m.test(code)) {
        return 'cpp'
      }
      // Rust
      if (/(fn main\(|let mut |println!|use std::|impl |trait )/m.test(code)) {
        return 'rust'
      }
      // Go
      if (/(package main|func main\(|fmt\.Println|import \(|:= )/m.test(code)) {
        return 'go'
      }
      // Ruby
      if (/(def |end$|puts |require |class |module )/m.test(code)) {
        return 'ruby'
      }
      // PHP
      if (/^<\?php|<\?=|\$[a-zA-Z_]/m.test(code)) {
        return 'php'
      }
      // Swift
      if (/(func |var |let |import Foundation|print\(|struct |class )/m.test(code)) {
        return 'swift'
      }
      // Kotlin
      if (/(fun |val |var |println\(|import kotlin|data class )/m.test(code)) {
        return 'kotlin'
      }
      // SQL
      if (/(SELECT |INSERT |UPDATE |DELETE |CREATE TABLE|FROM |WHERE )/i.test(code)) {
        return 'sql'
      }
      // Bash/Shell
      if (/^#!\/bin\/(bash|sh)|^\s*(echo|cd|ls|mkdir|rm) /m.test(code)) {
        return 'bash'
      }
      // CSS
      if (/\{[^}]*:[^}]*;[^}]*\}|@media|@keyframes|\.[\w-]+\s*\{/m.test(code)) {
        return 'css'
      }
      // JSON
      if (/^\s*[\[{]/.test(code.trim()) && /[\]}]\s*$/.test(code.trim())) {
        try {
          JSON.parse(code)
          return 'json'
        } catch {
          // Not valid JSON
        }
      }
      // YAML
      if (/^[\w-]+:\s*$|^  - /m.test(code)) {
        return 'yaml'
      }
      
      return 'javascript' // Default to JavaScript for better highlighting
    }

    const detected = detectLanguage(code)
    setDetectedLanguage(detected)
  }, [code, manualLanguageSet])

  // Handle chat sidebar resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizing) return
      
      const newWidth = e.clientX
      if (newWidth >= 280 && newWidth <= 600) {
        setChatSidebarWidth(newWidth)
      }
    }

    const handleMouseUp = () => {
      setIsResizing(false)
    }

    if (isResizing) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizing])

  // Handle editor/output resize
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isResizingEditor) return
      
      const container = document.querySelector('.canvas-editor-container')
      if (!container) return
      
      const rect = container.getBoundingClientRect()
      const newWidthPercent = ((e.clientX - rect.left) / rect.width) * 100
      
      if (newWidthPercent >= 30 && newWidthPercent <= 70) {
        setEditorWidth(newWidthPercent)
      }
    }

    const handleMouseUp = () => {
      setIsResizingEditor(false)
    }

    if (isResizingEditor) {
      document.addEventListener('mousemove', handleMouseMove)
      document.addEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = 'col-resize'
      document.body.style.userSelect = 'none'
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }
  }, [isResizingEditor])

  const handleStop = () => {
    setIsRunning(false)
    setIsPreviewMode(false)
    setOutput('')
    setPreviewDarkMode(false)
  }

  const handleClearOutput = () => {
    setOutput('')
    setIsPreviewMode(false)
    setPreviewDarkMode(false)
  }

  const handleRun = async () => {
    setIsRunning(true)
    setOutput('⏳ Running...')
    
    try {
      // Markdown - Convert to HTML and show preview
      if (detectedLanguage === 'markdown') {
        try {
          const html = await marked.parse(code)
          setOutput(`MARKDOWN_PREVIEW:${html}`)
          setIsPreviewMode(true)
          setIsRunning(false)
          return
        } catch (error) {
          setOutput(`✗ Markdown parsing error: ${error instanceof Error ? error.message : 'Unknown error'}`)
          setIsRunning(false)
          return
        }
      }

      // HTML - Show preview (also works if HTML file exists in multi-file project)
      if (detectedLanguage === 'html' || detectedLanguage === 'markup' || 
          (files.length > 0 && files.some(f => f.language === 'html'))) {
        console.log('[Canvas] 🌐 Starting HTML preview with multi-file support')
        setOutput('PREVIEW_MODE')
        setIsPreviewMode(true)
        setIsRunning(false)
        return
      }

      // CSS - Show preview (if HTML file exists, use it; otherwise show sample)
      if (detectedLanguage === 'css') {
        console.log('[Canvas] 🎨 Starting CSS preview')
        setOutput('PREVIEW_MODE')
        setIsPreviewMode(true)
        setIsRunning(false)
        return
      }
      
      // JavaScript/TypeScript - If HTML file exists, show preview; otherwise execute
      if ((detectedLanguage === 'javascript' || detectedLanguage === 'typescript') && 
          files.length > 0 && files.some(f => f.language === 'html')) {
        console.log('[Canvas] 🌐 Starting JS preview with HTML')
        setOutput('PREVIEW_MODE')
        setIsPreviewMode(true)
        setIsRunning(false)
        return
      }

      // JSON - Validate and format
      if (detectedLanguage === 'json') {
        try {
          const parsed = JSON.parse(code)
          setOutput('✓ Valid JSON\n\n' + JSON.stringify(parsed, null, 2))
        } catch (error) {
          setOutput(`✗ Invalid JSON\n\n${error instanceof Error ? error.message : 'Unknown error'}`)
        }
        setIsRunning(false)
        return
      }

      // JavaScript/TypeScript execution
      if (detectedLanguage === 'javascript' || detectedLanguage === 'typescript') {
        try {
          // Capture console.log output
          const logs: string[] = []
          const originalLog = console.log
          const originalError = console.error
          const originalWarn = console.warn
          
          console.log = (...args: any[]) => {
            logs.push('LOG: ' + args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '))
          }
          
          console.error = (...args: any[]) => {
            logs.push('ERROR: ' + args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '))
          }
          
          console.warn = (...args: any[]) => {
            logs.push('WARN: ' + args.map(arg => 
              typeof arg === 'object' ? JSON.stringify(arg, null, 2) : String(arg)
            ).join(' '))
          }
          
          // Execute code
          const result = eval(code)
          
          // Restore console methods
          console.log = originalLog
          console.error = originalError
          console.warn = originalWarn
          
          // Build output
          let output = logs.join('\n')
          if (result !== undefined) {
            output += (output ? '\n\n' : '') + `Result: ${typeof result === 'object' ? JSON.stringify(result, null, 2) : result}`
          }
          
          setOutput(output || '✓ Code executed successfully (no output)')
        } catch (error) {
          setOutput(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
        }
      }
      // Python - execute via backend with auto package installation
      else if (detectedLanguage === 'python') {
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          
          // Extract required packages from imports
          const extractPythonPackages = (code: string): string[] => {
            const packages: Set<string> = new Set()
            const lines = code.split('\n')
            
            for (const line of lines) {
              const trimmed = line.trim()
              // Match: import package or from package import ...
              const importMatch = trimmed.match(/^(?:import|from)\s+([a-zA-Z0-9_]+)/)
              if (importMatch) {
                const pkg = importMatch[1]
                // Skip built-in modules
                const builtins = ['os', 'sys', 'json', 'time', 'datetime', 'math', 'random', 
                                 're', 'collections', 'itertools', 'functools', 'pathlib',
                                 'typing', 'io', 'csv', 'urllib', 'http', 'socket', 'threading',
                                 'multiprocessing', 'subprocess', 'argparse', 'logging', 'unittest',
                                 'pickle', 'copy', 'enum', 'dataclasses', 'abc', 'contextlib',
                                 'warnings', 'traceback', 'inspect', 'ast', 'dis', 'gc', 'weakref']
                if (!builtins.includes(pkg)) {
                  packages.add(pkg)
                }
              }
            }
            return Array.from(packages)
          }
          
          // Extract packages (for future use - could show in UI)
          extractPythonPackages(code)
          
          // Ensure virtual environment exists
          let currentVenvPath = venvPath
          if (!currentVenvPath) {
            const sessionEnvDir = `.canvas_env_${currentSession?.id || 'default'}`
            try {
              setOutput('🔧 Setting up isolated Python environment...\n')
              await invoke('run_terminal_command', {
                command: `python -m venv ${sessionEnvDir}`,
                workingDir: undefined
              })
              currentVenvPath = sessionEnvDir
              setVenvPath(sessionEnvDir)
              setOutput(prev => prev + '✓ Environment ready\n\n')
            } catch (error) {
              console.error('[Canvas] Failed to create venv:', error)
              setOutput(prev => prev + '⚠️ Using system Python (not isolated)\n\n')
            }
          }
          
          // Use venv's Python if available
          const pythonPath = currentVenvPath ? `${currentVenvPath}\\Scripts\\python` : 'python'
          
          // Create temp file path
          const tempFile = `temp_script_${Date.now()}.py`
          
          // Write Python code to temp file
          await invoke('write_file_content', { 
            path: tempFile, 
            content: code 
          })
          
          // Try to execute Python script with venv Python
          let result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
            command: `${pythonPath} ${tempFile}`,
            workingDir: undefined
          })
          
          // Check if execution failed due to missing packages
          if (result.exit_code !== 0 && result.stderr) {
            const missingPackages: string[] = []
            
            // Check for ModuleNotFoundError or ImportError
            const moduleNotFoundMatch = result.stderr.match(/ModuleNotFoundError: No module named '([^']+)'/)
            const importErrorMatch = result.stderr.match(/ImportError: No module named ([^\s]+)/)
            
            if (moduleNotFoundMatch) {
              missingPackages.push(moduleNotFoundMatch[1])
            } else if (importErrorMatch) {
              missingPackages.push(importErrorMatch[1])
            }
            
            // If we detected missing packages, try to install them in venv
            if (missingPackages.length > 0) {
              setOutput(`📦 Installing missing packages in isolated environment: ${missingPackages.join(', ')}...\n`)
              
              // Use venv's pip if available
              const pipPath = currentVenvPath ? `${currentVenvPath}\\Scripts\\pip` : 'pip'
              
              for (const pkg of missingPackages) {
                try {
                  setOutput(prev => prev + `\n⏳ Installing ${pkg}...`)
                  const installResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
                    command: `${pipPath} install ${pkg}`,
                    workingDir: undefined
                  })
                  
                  if (installResult.exit_code === 0) {
                    setOutput(prev => prev + ` ✓\n`)
                    setInstalledPackages(prev => [...prev, pkg])
                  } else {
                    const errorMsg = `Auto-install failed for ${pkg}: ${installResult.stderr}`
                    setOutput(prev => prev + ` ✗\n${installResult.stderr}\n`)
                    setPackageErrors(prev => [...prev, errorMsg])
                  }
                } catch (installError) {
                  setOutput(prev => prev + ` ✗ Failed to install\n`)
                }
              }
              
              // Retry execution after installing packages (use venv Python)
              setOutput(prev => prev + `\n⏳ Retrying execution...\n\n`)
              result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
                command: `${pythonPath} ${tempFile}`,
                workingDir: undefined
              })
            }
          }
          
          // Clean up temp file
          try {
            await invoke('run_terminal_command', {
              command: `del ${tempFile}`,
              workingDir: undefined
            })
          } catch {
            // Ignore cleanup errors
          }
          
          // Show output
          let output = ''
          if (result.stdout && result.stdout.trim()) {
            output += result.stdout
          }
          if (result.stderr && result.stderr.trim()) {
            output += (output ? '\n' : '') + '⚠️ Errors:\n' + result.stderr
          }
          if (result.exit_code !== 0) {
            output += (output ? '\n' : '') + `\n✗ Exit code: ${result.exit_code}`
          }
          
          setOutput(prev => {
            // If we already have installation output, append execution output
            if (prev.includes('📦 Installing')) {
              return prev + output
            }
            return output || '✓ Python script executed successfully (no output)'
          })
        } catch (error) {
          setOutput(`✗ Error executing Python: ${error instanceof Error ? error.message : 'Unknown error'}\n\nMake sure Python is installed and in your PATH.`)
        }
      }
      // Other languages
      else {
        setOutput(`⚠️ ${detectedLanguage.toUpperCase()} execution is not yet supported.\n\nSupported languages:\n• JavaScript, TypeScript (execution)\n• HTML, CSS, Markdown (preview)\n• JSON (validation)`)
      }
    } catch (error) {
      setOutput(`✗ Error: ${error instanceof Error ? error.message : 'Unknown error'}`)
    } finally {
      setIsRunning(false)
    }
  }

  const handleInstallPackage = async () => {
    if (!packageToInstall.trim()) return
    
    setIsInstallingPackage(true)
    const pkg = packageToInstall.trim()
    
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // Ensure virtual environment exists
      if (!venvPath && detectedLanguage === 'python') {
        const sessionEnvDir = `.canvas_env_${currentSession?.id || 'default'}`
        try {
          await invoke('run_terminal_command', {
            command: `python -m venv ${sessionEnvDir}`,
            workingDir: undefined
          })
          setVenvPath(sessionEnvDir)
        } catch (error) {
          console.error('[Canvas] Failed to create venv:', error)
        }
      }
      
      // Determine package manager and command based on language
      let installCommand = ''
      let packageManager = 'unknown'
      
      if (detectedLanguage === 'python') {
        // Use venv's pip to install in isolated environment
        const pipPath = venvPath ? `${venvPath}\\Scripts\\pip` : 'pip'
        installCommand = `${pipPath} install ${pkg}`
        packageManager = 'pip'
      } else if (detectedLanguage === 'javascript' || detectedLanguage === 'typescript') {
        // Install to local node_modules in session directory
        const sessionEnvDir = nodeModulesPath || `.canvas_env_${currentSession?.id || 'default'}`
        
        // Try to detect which package manager to use (npm, yarn, pnpm)
        // For now, default to npm (can be extended to detect lock files)
        installCommand = `npm install ${pkg} --prefix ${sessionEnvDir}`
        packageManager = 'npm'
        
        if (!nodeModulesPath) setNodeModulesPath(sessionEnvDir)
      } else if (detectedLanguage === 'ruby') {
        // Ruby gems
        installCommand = `gem install ${pkg}`
        packageManager = 'gem'
      } else if (detectedLanguage === 'rust') {
        // Rust cargo (note: cargo add requires cargo-edit)
        installCommand = `cargo add ${pkg}`
        packageManager = 'cargo'
      } else if (detectedLanguage === 'go') {
        // Go modules
        installCommand = `go get ${pkg}`
        packageManager = 'go'
      } else if (detectedLanguage === 'php') {
        // PHP composer
        installCommand = `composer require ${pkg}`
        packageManager = 'composer'
      } else {
        setOutput(`⚠️ Package installation not supported for ${detectedLanguage}\n\nSupported languages:\n• Python (pip)\n• JavaScript/TypeScript (npm)\n• Ruby (gem)\n• Rust (cargo)\n• Go (go get)\n• PHP (composer)`)
        setIsInstallingPackage(false)
        return
      }
      
      setOutput(`📦 Installing ${pkg} via ${packageManager} in isolated environment...\n`)
      
      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command: installCommand,
        workingDir: undefined
      })
      
      if (result.exit_code === 0) {
        setOutput(prev => prev + `✓ Successfully installed ${pkg} via ${packageManager}\n\n${result.stdout}`)
        setInstalledPackages(prev => [...prev, pkg])
        setPackageToInstall('')
      } else {
        const errorMsg = `Failed to install ${pkg} via ${packageManager}: ${result.stderr}`
        setOutput(prev => prev + `✗ ${errorMsg}\n`)
        setPackageErrors(prev => [...prev, errorMsg])
      }
    } catch (error) {
      const errorMsg = `Error installing package: ${error instanceof Error ? error.message : 'Unknown error'}`
      setOutput(`✗ ${errorMsg}`)
      setPackageErrors(prev => [...prev, errorMsg])
    } finally {
      setIsInstallingPackage(false)
    }
  }

  const handleRemovePackage = async (packageName: string, index: number) => {
    if (!packageName.trim()) return
    
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // Determine uninstall command based on language
      let uninstallCommand = ''
      let packageManager = 'unknown'
      
      if (detectedLanguage === 'python') {
        const pipPath = venvPath ? `${venvPath}\\Scripts\\pip` : 'pip'
        uninstallCommand = `${pipPath} uninstall -y ${packageName}`
        packageManager = 'pip'
      } else if (detectedLanguage === 'javascript' || detectedLanguage === 'typescript') {
        const sessionEnvDir = nodeModulesPath || `.canvas_env_${currentSession?.id || 'default'}`
        uninstallCommand = `npm uninstall ${packageName} --prefix ${sessionEnvDir}`
        packageManager = 'npm'
      } else if (detectedLanguage === 'ruby') {
        uninstallCommand = `gem uninstall -x ${packageName}`
        packageManager = 'gem'
      } else if (detectedLanguage === 'rust') {
        uninstallCommand = `cargo remove ${packageName}`
        packageManager = 'cargo'
      } else if (detectedLanguage === 'go') {
        // Go doesn't have a direct uninstall, but we can remove from go.mod
        uninstallCommand = `go mod edit -droprequire ${packageName}`
        packageManager = 'go'
      } else if (detectedLanguage === 'php') {
        uninstallCommand = `composer remove ${packageName}`
        packageManager = 'composer'
      }
      
      setOutput(`🗑️ Uninstalling ${packageName} via ${packageManager}...\n`)
      
      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command: uninstallCommand,
        workingDir: undefined
      })
      
      if (result.exit_code === 0) {
        setOutput(prev => prev + `✓ Successfully uninstalled ${packageName}\n\n${result.stdout}`)
        setInstalledPackages(prev => prev.filter((_, i) => i !== index))
      } else {
        setOutput(prev => prev + `⚠️ Uninstall completed with warnings:\n${result.stderr}\n`)
        // Still remove from list even if uninstall had warnings
        setInstalledPackages(prev => prev.filter((_, i) => i !== index))
      }
    } catch (error) {
      const errorMsg = `Error uninstalling ${packageName}: ${error instanceof Error ? error.message : 'Unknown error'}`
      setOutput(`✗ ${errorMsg}`)
      setPackageErrors(prev => [...prev, errorMsg])
    }
  }

  const handleCleanupEnvironment = async () => {
    if (!currentSession?.id) return
    
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const sessionEnvDir = `.canvas_env_${currentSession.id}`
      
      setOutput('🧹 Cleaning up isolated environment...\n')
      
      try {
        await invoke('run_terminal_command', {
          command: `rmdir /s /q ${sessionEnvDir}`,
          workingDir: undefined
        })
        setOutput(prev => prev + '✓ Environment cleaned up successfully\n')
        setOutput(prev => prev + `✓ Removed ${installedPackages.length} package(s)\n`)
        setOutput(prev => prev + '✓ Freed disk space\n')
        setVenvPath('')
        setNodeModulesPath('')
        setInstalledPackages([])
        setPackageErrors([])
      } catch (error) {
        setOutput(prev => prev + '⚠️ No environment to clean up\n')
        // Still clear the lists
        setInstalledPackages([])
        setPackageErrors([])
      }
    } catch (error) {
      setOutput(`✗ Error cleaning up: ${error instanceof Error ? error.message : 'Unknown error'}`)
    }
  }
  
  const handleClearPackageList = () => {
    setInstalledPackages([])
    setOutput('✓ Package list cleared\n\nNote: Packages are still installed on disk. Use "Clean Environment" to fully remove them.')
  }
  
  const handleClearErrors = () => {
    setPackageErrors([])
    setOutput('✓ Error list cleared')
  }

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch (error) {
      console.error('Failed to copy:', error)
    }
  }

  const handleDownload = () => {
    const blob = new Blob([code], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    const extensions: Record<string, string> = {
      python: 'py',
      javascript: 'js',
      typescript: 'ts',
      java: 'java',
      cpp: 'cpp',
      rust: 'rs',
      go: 'go',
      html: 'html',
      css: 'css',
      json: 'json',
      text: 'txt'
    }
    a.download = `code.${extensions[detectedLanguage] || 'txt'}`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleReset = () => {
    setCode(initialCode)
    setOutput('')
    
    // Clear all files
    setFiles([])
    setCurrentFileId(null)
    setCurrentFilename('')
    setShowFileExplorer(false)
    setDetectedLanguage('none')
    setManualLanguageSet(false)
    
    // Save cleared state to session
    if (currentSession && onSaveCanvasState) {
      onSaveCanvasState(
        currentSession.id,
        initialCode,
        'none',
        undefined,  // No files
        undefined,  // No current file
        false       // Explorer closed
      )
      console.log('[Canvas] 🗑️ Reset: All files cleared and session updated')
    }
  }

  return (
    <div className="flex h-full relative">
      {/* Canvas Chat Sidebar - Resizable & Collapsible */}
      <div 
        className="flex-shrink-0 border-r flex flex-col relative"
        style={{ 
          width: isChatSidebarCollapsed ? '0px' : `${chatSidebarWidth}px`,
          backgroundColor: 'var(--color-sidebar)',
          borderColor: 'var(--color-dropdown-border)',
          opacity: isChatSidebarCollapsed ? 0 : 1,
          transition: isResizing ? 'none' : 'width 0.3s ease-in-out, opacity 0.3s ease-in-out',
          overflow: 'visible'
        }}
      >
        {/* Resize Handle */}
        {!isChatSidebarCollapsed && (
          <div
            ref={resizeRef}
            className="absolute top-0 right-0 w-1 h-full cursor-col-resize hover:bg-primary/50 transition-colors z-10"
            onMouseDown={() => setIsResizing(true)}
            style={{
              backgroundColor: isResizing ? 'var(--color-primary)' : 'transparent'
            }}
          />
        )}
        {/* Canvas Header with Session Controls */}
        <div className="px-4 flex items-center gap-2 h-10">
          {/* New Canvas Session Button (Left) */}
          <button
            onClick={onCreateCanvasSession}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            title="New Canvas Session"
          >
            <img src={editSquareIcon} alt="New Session" className="w-4 h-4" />
          </button>
          
          {/* Canvas Session Dropdown (Center) */}
          <div className="flex-1 relative" ref={sessionDropdownRef}>
            <button
              onClick={() => setIsSessionDropdownOpen(!isSessionDropdownOpen)}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex items-center gap-1"
              title="Canvas Sessions"
            >
              <MessageSquare className="w-4 h-4" />
              <ChevronDown className={`w-3 h-3 transition-transform ${isSessionDropdownOpen ? 'rotate-180' : ''}`} />
            </button>
            
            {/* Dropdown Menu */}
            {isSessionDropdownOpen && (
              <div 
                className="absolute top-full left-0 mt-1 rounded-lg shadow-lg border overflow-hidden z-50"
                style={{
                  backgroundColor: 'var(--color-dropdown-bg)',
                  borderColor: 'var(--color-dropdown-border)',
                  maxHeight: '300px',
                  overflowY: 'auto',
                  minWidth: '200px'
                }}
              >
                {/* Session List */}
                {canvasSessions.length === 0 ? (
                  <div className="px-3 py-2 text-sm text-muted-foreground">
                    No sessions yet
                  </div>
                ) : (
                  canvasSessions.map((session: any) => (
                    <div
                      key={session.id}
                      className={`flex items-center gap-2 px-3 py-2 hover:bg-white/10 transition-colors ${
                        currentSession?.id === session.id ? 'bg-primary/20' : ''
                      }`}
                    >
                      {editingSessionId === session.id ? (
                        // Inline editing mode
                        <input
                          type="text"
                          value={editingSessionTitle}
                          onChange={(e) => setEditingSessionTitle(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              onRenameCanvasSession(session.id, editingSessionTitle)
                              setEditingSessionId(null)
                            } else if (e.key === 'Escape') {
                              setEditingSessionId(null)
                            }
                          }}
                          onBlur={() => {
                            if (editingSessionTitle.trim()) {
                              onRenameCanvasSession(session.id, editingSessionTitle)
                            }
                            setEditingSessionId(null)
                          }}
                          autoFocus
                          className="flex-1 px-2 py-1 text-sm rounded bg-muted/30 border border-primary focus:outline-none"
                          style={{
                            backgroundColor: 'var(--color-dropdown-bg)',
                            color: 'var(--color-foreground)',
                            borderColor: 'var(--color-primary)'
                          }}
                        />
                      ) : (
                        <>
                          {/* Session title - clickable */}
                          <button
                            onClick={() => {
                              onSelectCanvasSession(session.id)
                              setIsSessionDropdownOpen(false)
                            }}
                            className="flex-1 text-left text-sm truncate"
                            style={{ color: 'var(--color-foreground)' }}
                          >
                            {session.title || 'Canvas Session'}
                          </button>
                          
                          {/* Action buttons */}
                          <div className="flex items-center gap-1 flex-shrink-0">
                            {/* Rename button */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                setEditingSessionId(session.id)
                                setEditingSessionTitle(session.title || 'Canvas Session')
                              }}
                              className="p-1 rounded hover:bg-white/20 transition-colors"
                              title="Rename session"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            
                            {/* Delete button with two-step confirmation */}
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                if (deletingSessionId === session.id) {
                                  // Second click - actually delete
                                  onDeleteCanvasSession(session.id)
                                  setDeletingSessionId(null)
                                  if (currentSession?.id === session.id) {
                                    setIsSessionDropdownOpen(false)
                                  }
                                } else {
                                  // First click - show confirmation
                                  setDeletingSessionId(session.id)
                                  // Auto-reset after 3 seconds
                                  setTimeout(() => {
                                    setDeletingSessionId(null)
                                  }, 3000)
                                }
                              }}
                              className={`flex items-center gap-1 px-1 py-1 rounded transition-all duration-200 text-red-400 ${
                                deletingSessionId === session.id 
                                  ? 'bg-red-500/30 hover:bg-red-500/40' 
                                  : 'hover:bg-red-500/20'
                              }`}
                              title={deletingSessionId === session.id ? "Click again to confirm" : "Delete session"}
                              style={{
                                width: deletingSessionId === session.id ? 'auto' : '24px',
                                overflow: 'hidden'
                              }}
                            >
                              <Trash2 className="w-3 h-3 flex-shrink-0" />
                              {deletingSessionId === session.id && (
                                <span className="text-xs whitespace-nowrap pr-1 animate-in fade-in slide-in-from-left-2 duration-200">
                                  Sure?
                                </span>
                              )}
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </div>
          
          {/* Exit Canvas Icon Button (Right) */}
          <button
            onClick={onExit}
            className="p-1.5 rounded-lg hover:bg-white/10 transition-colors flex-shrink-0"
            title="Exit Canvas Mode"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        {/* Chat Messages Area */}
        <div 
          className="flex-1 overflow-y-auto p-3 pt-2" 
          style={{ 
            position: 'relative', 
            zIndex: 1,
            pointerEvents: isResizing ? 'none' : 'auto',
            userSelect: isResizing ? 'none' : 'auto'
          }}
        >
          
          {/* Chat Messages */}
          {currentSession && currentSession.messages.length > 0 ? (
            <div className="space-y-4">
              {currentSession.messages.map((message: any, index: number) => {
                const previousMessage = index > 0 ? currentSession.messages[index - 1] : undefined
                return (
                  <ChatMessage
                    key={message.id}
                    message={message}
                    previousMessage={previousMessage}
                    sourceRegistry={getSourceRegistry ? getSourceRegistry() : undefined}
                    onRegenerateMessage={onRegenerateMessage}
                    isGenerating={isGenerating && index === currentSession.messages.length - 1}
                  />
                )
              })}
            </div>
          ) : (
            <div className="text-xs text-muted-foreground text-center py-8">
              Start chatting to get help with your code
            </div>
          )}
        </div>

        {/* Chat Input - Compact Version with Agent Mode */}
        <div className="p-3" style={{ position: 'relative', zIndex: 100, overflow: 'visible' }}>
          <ChatInput
            onSendMessage={(content, images) => {
              if (onSendMessage) {
                onSendMessage(content, images)
              }
            }}
            isGenerating={isGenerating}
            compact={true}
            canvasMode={true}
            agentModeEnabled={agentModeEnabled}
            onToggleAgentMode={() => setAgentModeEnabled(!agentModeEnabled)}
            showToolModelSelector={true}
            providers={providers}
            selectedProvider={selectedProvider}
            selectedModel={selectedModel}
            models={models}
            onSelectProvider={onSelectProvider}
            onSelectModel={onSelectModel}
            onLoadModels={onLoadModels}
            isLoadingModels={isLoadingModels}
          />
        </div>
      </div>

      {/* Canvas Editor Area */}
      <div className="flex-1 flex flex-col">
        {/* Split View: Code Editor & Output */}
        <div className="flex-1 flex overflow-hidden canvas-editor-container relative">
          {/* Code Editor */}
          <div 
            className="flex flex-col border-r"
            style={{ 
              width: showOutput ? `${editorWidth}%` : '100%',
              borderColor: 'var(--color-dropdown-border)',
              transition: showOutput ? 'none' : 'width 0.3s'
            }}
          >
            <div className="px-4 py-2.5 border-b text-sm font-medium bg-muted/30 flex items-center justify-between h-10" style={{ borderColor: 'var(--color-dropdown-border)' }}>
              <div className="flex items-center gap-2">
                {/* Toggle Chat Sidebar Button */}
                <button
                  onClick={() => setIsChatSidebarCollapsed(!isChatSidebarCollapsed)}
                  className="p-1 rounded hover:bg-white/10 transition-colors"
                  title={isChatSidebarCollapsed ? "Show chat" : "Hide chat"}
                >
                  {isChatSidebarCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
                </button>
                
                {/* File Explorer Dropdown - ALWAYS VISIBLE */}
                <div className="relative" ref={fileExplorerRef}>
                  <button
                    onClick={() => {
                      if (files.length > 0) {
                        console.log('[Canvas] Toggling file explorer, current:', showFileExplorer, 'files:', files.length)
                        setShowFileExplorer(!showFileExplorer)
                      }
                    }}
                    className={cn(
                      "flex items-center gap-1.5 px-2 py-1 rounded-lg transition-colors",
                      files.length > 0 ? "hover:bg-white/10 cursor-pointer" : "cursor-default opacity-60",
                      showFileExplorer && files.length > 0 && "bg-primary/20"
                    )}
                    title={files.length > 0 ? `File Explorer (${files.length} file${files.length > 1 ? 's' : ''})` : 'No files yet'}
                  >
                    <span className="text-xs font-medium truncate max-w-[150px]">
                      {files.length > 0 
                        ? (files.find(f => f.id === currentFileId)?.name || 'Select File')
                        : 'Files'
                      }
                    </span>
                    <ChevronDown className={cn(
                      "w-3 h-3 transition-transform flex-shrink-0",
                      showFileExplorer && files.length > 0 && "rotate-180"
                    )} />
                    {files.length > 0 && (
                      <span className="text-xs px-1.5 py-0.5 rounded-full bg-primary/30 flex-shrink-0">
                        {files.length}
                      </span>
                    )}
                  </button>
                  
                  {/* File List Dropdown - Only show if files exist */}
                  {showFileExplorer && files.length > 0 && (
                    <div 
                      className="absolute top-full left-0 mt-1 w-64 rounded-lg shadow-lg border overflow-hidden z-50"
                      style={{
                        backgroundColor: 'var(--color-sidebar)',
                        borderColor: 'var(--color-dropdown-border)',
                        maxHeight: '300px',
                        overflowY: 'auto'
                      }}
                    >
                      <div className="px-3 py-2 border-b text-xs font-semibold text-muted-foreground" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                        Files ({files.length})
                      </div>
                      {files.map((file) => (
                        <button
                          key={file.id}
                          onClick={() => {
                            setCurrentFileId(file.id)
                            setCode(file.content)
                            setDetectedLanguage(file.language)
                            setCurrentFilename(file.name)
                            setShowFileExplorer(false)
                          }}
                          className={cn(
                            'w-full flex items-center gap-2 px-3 py-2 text-sm hover:bg-white/10 transition-colors',
                            currentFileId === file.id && 'bg-primary/20'
                          )}
                        >
                          <div className={cn(
                            "w-2 h-2 rounded-full flex-shrink-0",
                            file.language === 'html' && "bg-orange-500",
                            file.language === 'css' && "bg-blue-500",
                            file.language === 'javascript' && "bg-yellow-500",
                            file.language === 'typescript' && "bg-blue-400",
                            file.language === 'python' && "bg-green-500",
                            !['html', 'css', 'javascript', 'typescript', 'python'].includes(file.language) && "bg-gray-500"
                          )} />
                          <span className="flex-1 truncate text-left">{file.name}</span>
                          <span className="text-xs text-muted-foreground">{file.language}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
                
                <span className={cn(
                  "text-xs px-2 py-0.5 rounded-full",
                  detectedLanguage === 'none' 
                    ? "bg-muted text-muted-foreground" 
                    : "bg-primary/20 text-primary"
                )}>
                  {detectedLanguage}
                </span>
              </div>
              <div className="flex items-center gap-1">
                {/* Package Manager Button - Supports multiple languages */}
                {(['python', 'javascript', 'typescript', 'ruby', 'rust', 'go', 'php'].includes(detectedLanguage)) && (
                  <button
                    onClick={() => setShowPackageManager(!showPackageManager)}
                    className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${showPackageManager ? 'bg-primary/20' : ''}`}
                    title="Package Manager"
                  >
                    <Package className="w-3.5 h-3.5" />
                  </button>
                )}
                <button
                  onClick={handleReset}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Reset"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={handleCopy}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Copy code"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
                <button
                  onClick={handleDownload}
                  className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                  title="Download"
                >
                  <Download className="w-3.5 h-3.5" />
                </button>
                {isRunning || isPreviewMode ? (
                  <button
                    onClick={handleStop}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-red-500 text-white hover:bg-red-600 transition-colors ml-1"
                  >
                    <Square className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Stop</span>
                  </button>
                ) : (
                  <button
                    onClick={handleRun}
                    disabled={isRunning}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 ml-1"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span className="text-xs font-medium">Run</span>
                  </button>
                )}
                <button
                  onClick={() => setShowOutput(!showOutput)}
                  className="p-1.5 rounded hover:bg-white/10 transition-colors ml-1"
                  title={showOutput ? "Hide output" : "Show output"}
                >
                  {showOutput ? <ChevronRight className="w-3.5 h-3.5" /> : <ChevronLeft className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>
            
            {/* Package Manager Panel */}
            {showPackageManager && (
              <div className="px-4 py-3 border-b bg-muted/20" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                <div className="flex items-center gap-2 mb-2">
                  <input
                    type="text"
                    value={packageToInstall}
                    onChange={(e) => setPackageToInstall(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !isInstallingPackage) {
                        handleInstallPackage()
                      }
                    }}
                    placeholder={detectedLanguage === 'python' ? 'Package name (e.g., requests, numpy)' : 'Package name (e.g., axios, lodash)'}
                    className="flex-1 px-3 py-1.5 text-sm rounded-lg border bg-background"
                    style={{
                      backgroundColor: 'var(--color-background)',
                      borderColor: 'var(--color-dropdown-border)',
                      color: 'var(--color-foreground)'
                    }}
                    disabled={isInstallingPackage}
                  />
                  <button
                    onClick={handleInstallPackage}
                    disabled={isInstallingPackage || !packageToInstall.trim()}
                    className="px-3 py-1.5 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
                  >
                    {isInstallingPackage ? 'Installing...' : 'Install'}
                  </button>
                  <button
                    onClick={handleCleanupEnvironment}
                    disabled={isInstallingPackage}
                    className="px-3 py-1.5 text-sm rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors disabled:opacity-50"
                    title="Clean up isolated environment and remove all packages"
                  >
                    Clean
                  </button>
                </div>
                <div className="flex items-center justify-between text-xs">
                  {installedPackages.length > 0 ? (
                    <div className="text-muted-foreground">
                      📦 Installed: {installedPackages.join(', ')}
                    </div>
                  ) : (
                    <div className="text-muted-foreground">
                      No packages installed yet
                    </div>
                  )}
                  {(venvPath || nodeModulesPath) && (
                    <div className="text-green-400 text-xs">
                      🔒 Sandboxed
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <div className="flex-1 overflow-auto canvas-editor" style={{ backgroundColor: 'var(--color-background)' }}>
              <Editor
                value={code}
                onValueChange={setCode}
                highlight={(code) => {
                  try {
                    // Map language names to Prism language keys
                    let prismLang = detectedLanguage
                    if (detectedLanguage === 'markdown' || detectedLanguage === 'html') {
                      prismLang = 'markup'
                    } else if (detectedLanguage === 'none') {
                      return escapeHtml(code)
                    }
                    
                    const grammar = Prism.languages[prismLang]
                    if (grammar) {
                      return Prism.highlight(code, grammar, prismLang)
                    }
                    return escapeHtml(code)
                  } catch {
                    return escapeHtml(code)
                  }
                }}
                padding={16}
                style={{
                  fontFamily: 'Consolas, Monaco, "Andale Mono", "Ubuntu Mono", monospace',
                  fontSize: '0.875rem',
                  lineHeight: '1.5rem',
                  minHeight: '100%',
                  backgroundColor: 'transparent',
                  color: 'var(--color-foreground)',
                  caretColor: 'var(--color-foreground)'
                }}
                textareaClassName="focus:outline-none"
                preClassName="language-code"
              />
            </div>
          </div>

          {/* Resize Handle between Editor and Output */}
          {showOutput && (
            <div
              ref={editorResizeRef}
              className="w-1 cursor-col-resize hover:bg-primary/50 transition-colors flex-shrink-0"
              onMouseDown={() => setIsResizingEditor(true)}
              style={{
                backgroundColor: isResizingEditor ? 'var(--color-primary)' : 'transparent'
              }}
            />
          )}

          {/* Output Panel - Collapsible */}
          {showOutput && (
            <div className="flex-1 flex flex-col overflow-hidden" style={{ width: `${100 - editorWidth}%`, minWidth: 0 }}>
              <div className="px-4 py-2.5 border-b text-sm font-medium bg-muted/30 h-10 flex items-center justify-between flex-shrink-0" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                <span>{showTerminal ? 'Terminal' : 'Output'}</span>
                <div className="flex items-center gap-1">
                  {/* Package Manager Dropdown */}
                  {(['python', 'javascript', 'typescript', 'ruby', 'rust', 'go', 'php'].includes(detectedLanguage)) && (
                    <div className="relative" ref={packageDropdownRef}>
                      <button
                        onClick={() => setShowPackageDropdown(!showPackageDropdown)}
                        className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors relative ${showPackageDropdown ? 'bg-primary/20' : ''}`}
                        title="Package Manager"
                      >
                        <Package className="w-3.5 h-3.5" />
                        {installedPackages.length > 0 && (
                          <span className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 text-white text-[10px] rounded-full flex items-center justify-center">
                            {installedPackages.length}
                          </span>
                        )}
                        {packageErrors.length > 0 && (
                          <span className="absolute -bottom-1 -right-1 w-3 h-3 bg-red-500 rounded-full" />
                        )}
                      </button>
                      
                      {/* Package Dropdown */}
                      {showPackageDropdown && (
                        <div 
                          className="absolute top-full right-0 mt-2 w-80 rounded-lg shadow-lg border overflow-hidden z-50"
                          style={{
                            backgroundColor: 'var(--color-sidebar)',
                            borderColor: 'var(--color-dropdown-border)',
                            maxHeight: '400px'
                          }}
                        >
                          {/* Header */}
                          <div className="px-4 py-3 border-b font-semibold" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                            Package Manager
                          </div>
                          
                          {/* Installed Packages */}
                          <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                            <div className="flex items-center justify-between mb-2">
                              <div className="text-xs font-semibold text-muted-foreground">
                                Installed Packages ({installedPackages.length})
                              </div>
                              {installedPackages.length > 0 && (
                                <button
                                  onClick={() => {
                                    if (confirm(`Clear package list?\n\nThis will:\n• Remove ${installedPackages.length} package(s) from the list\n• NOT uninstall packages from disk\n\nTo fully remove packages, use "Clean Environment".`)) {
                                      handleClearPackageList()
                                    }
                                  }}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
                                >
                                  Clear List
                                </button>
                              )}
                            </div>
                            {installedPackages.length > 0 ? (
                              <div className="space-y-1 max-h-40 overflow-y-auto">
                                {installedPackages.map((pkg, index) => (
                                  <div 
                                    key={index}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded bg-green-500/10 text-sm group hover:bg-green-500/20 transition-colors"
                                  >
                                    <Check className="w-3.5 h-3.5 text-green-500 flex-shrink-0" />
                                    <span className="flex-1 truncate">{pkg}</span>
                                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                      <button
                                        onClick={() => {
                                          if (confirm(`Uninstall ${pkg}?\n\nThis will:\n• Remove ${pkg} from disk\n• Free up disk space\n• Remove from package list\n\nYou can reinstall it later if needed.`)) {
                                            handleRemovePackage(pkg, index)
                                          }
                                        }}
                                        className="p-1 rounded hover:bg-red-500/30 transition-all"
                                        title={`Uninstall ${pkg}`}
                                      >
                                        <Trash2 className="w-3 h-3 text-red-400" />
                                      </button>
                                      <button
                                        onClick={() => {
                                          setInstalledPackages(prev => prev.filter((_, i) => i !== index))
                                        }}
                                        className="p-1 rounded hover:bg-yellow-500/30 transition-all"
                                        title={`Remove ${pkg} from list only`}
                                      >
                                        <X className="w-3 h-3 text-yellow-400" />
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            ) : (
                              <div className="text-xs text-muted-foreground italic">
                                No packages installed yet
                              </div>
                            )}
                          </div>
                          
                          {/* Errors */}
                          {packageErrors.length > 0 && (
                            <div className="px-4 py-3 border-b" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                              <div className="flex items-center justify-between mb-2">
                                <div className="text-xs font-semibold text-red-400">
                                  Errors ({packageErrors.length})
                                </div>
                                <button
                                  onClick={handleClearErrors}
                                  className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                                >
                                  Clear All
                                </button>
                              </div>
                              <div className="space-y-1 max-h-32 overflow-y-auto">
                                {packageErrors.map((error, index) => (
                                  <div 
                                    key={index}
                                    className="flex items-start gap-2 px-2 py-1.5 rounded bg-red-500/10 text-xs text-red-400 group hover:bg-red-500/20 transition-colors"
                                  >
                                    <span className="flex-1 break-words">{error}</span>
                                    <button
                                      onClick={() => setPackageErrors(prev => prev.filter((_, i) => i !== index))}
                                      className="opacity-0 group-hover:opacity-100 p-0.5 rounded hover:bg-red-500/30 transition-all flex-shrink-0"
                                      title="Remove error"
                                    >
                                      <X className="w-3 h-3" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Actions */}
                          <div className="px-4 py-3 space-y-2">
                            {/* Install Package Input */}
                            <div className="space-y-2 pb-2 border-b" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                              <div className="text-xs font-semibold text-muted-foreground">
                                Install New Package
                              </div>
                              <div className="flex items-center gap-2">
                                <input
                                  type="text"
                                  value={packageToInstall}
                                  onChange={(e) => setPackageToInstall(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' && !isInstallingPackage) {
                                      handleInstallPackage()
                                    }
                                  }}
                                  placeholder={detectedLanguage === 'python' ? 'e.g., requests' : 'e.g., axios'}
                                  className="flex-1 px-2 py-1.5 text-xs rounded-lg border bg-background"
                                  style={{
                                    backgroundColor: 'var(--color-background)',
                                    borderColor: 'var(--color-dropdown-border)',
                                    color: 'var(--color-foreground)'
                                  }}
                                  disabled={isInstallingPackage}
                                />
                                <button
                                  onClick={handleInstallPackage}
                                  disabled={isInstallingPackage || !packageToInstall.trim()}
                                  className="px-3 py-1.5 text-xs rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50 font-medium"
                                >
                                  {isInstallingPackage ? '...' : 'Install'}
                                </button>
                              </div>
                            </div>
                            
                            {/* Danger Zone */}
                            <div className="space-y-2 pt-2">
                              <div className="text-xs font-semibold text-red-400">
                                ⚠️ Danger Zone
                              </div>
                              
                              {/* Clean Environment */}
                              <button
                                onClick={() => {
                                  if (confirm(`🗑️ Clean entire environment?\n\nThis will:\n• Delete venv/node_modules folders\n• Uninstall all ${installedPackages.length} package(s)\n• Clear package list and errors\n• Free up disk space\n\nYou'll need to reinstall packages after this.\n\nContinue?`)) {
                                    handleCleanupEnvironment()
                                    setShowPackageDropdown(false)
                                  }
                                }}
                                className="w-full px-3 py-2 text-xs rounded-lg bg-red-500/80 text-white hover:bg-red-500 transition-colors font-medium flex items-center justify-center gap-2"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Clean Environment
                              </button>
                              
                              {/* Info Text */}
                              <div className="text-[10px] text-muted-foreground leading-relaxed">
                                💡 Tip: Use individual package uninstall (trash icon) to remove specific packages, or "Clean Environment" to remove everything.
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                  
                  <button
                    onClick={() => setShowTerminal(!showTerminal)}
                    className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${showTerminal ? 'bg-primary/20' : ''}`}
                    title={showTerminal ? "Show output" : "Show terminal"}
                  >
                    <TerminalIcon className="w-3.5 h-3.5" />
                  </button>
                  {!showTerminal && (output.startsWith('MARKDOWN_PREVIEW:') || output === 'PREVIEW_MODE' || output.startsWith('HTML_PREVIEW:')) && (
                    <>
                      {/* Zoom Controls */}
                      <div className="flex items-center gap-1 border-r border-white/10 pr-2">
                        <button
                          onClick={() => setPreviewZoom(Math.max(25, previewZoom - 10))}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Zoom out"
                          disabled={previewZoom <= 25}
                        >
                          <ZoomOut className="w-3.5 h-3.5" />
                        </button>
                        <span className="text-xs font-mono min-w-[3rem] text-center">
                          {previewZoom}%
                        </span>
                        <button
                          onClick={() => setPreviewZoom(Math.min(200, previewZoom + 10))}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          title="Zoom in"
                          disabled={previewZoom >= 200}
                        >
                          <ZoomIn className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => setPreviewZoom(100)}
                          className="p-1.5 rounded-lg hover:bg-white/10 transition-colors text-xs"
                          title="Reset zoom"
                        >
                          Reset
                        </button>
                      </div>
                      
                      {/* Dark Mode Toggle */}
                      <button
                        onClick={() => setPreviewDarkMode(!previewDarkMode)}
                        className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                        title={previewDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                      >
                        {previewDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                      </button>
                    </>
                  )}
                  {!showTerminal && output && (
                    <button
                      onClick={handleClearOutput}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title="Clear output"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
              <div className="flex-1 overflow-auto">
                {showTerminal ? (
                  <Terminal 
                    onLoadFile={(content, filename) => {
                      setCode(content)
                      setCurrentFilename(filename)
                      setShowTerminal(false)
                      setOutput(`Loaded: ${filename}`)
                    }}
                    currentCode={code}
                    currentFilename={currentFilename}
                  />
                ) : output.startsWith('MARKDOWN_PREVIEW:') ? (
                  // Markdown preview with styling - full width
                  <div 
                    className="w-full h-full overflow-auto relative" 
                    style={{ 
                      backgroundColor: previewDarkMode ? 'var(--color-background)' : '#ffffff',
                      pointerEvents: isResizingEditor ? 'none' : 'auto',
                      willChange: isResizingEditor ? 'transform' : 'auto'
                    }}
                  >
                    <div style={{ 
                      transform: `scale(${previewZoom / 100})`,
                      transformOrigin: 'top left',
                      width: `calc(100% / ${previewZoom / 100})`,
                      minHeight: `calc(100% / ${previewZoom / 100})`
                    }}>
                      <SafeMarkdownPreview
                        html={output.replace('MARKDOWN_PREVIEW:', '')}
                        darkMode={previewDarkMode}
                      />
                    </div>
                    
                    {/* Overlay during resize */}
                    {isResizingEditor && (
                      <div 
                        className="absolute inset-0 z-10"
                        style={{ 
                          backgroundColor: 'transparent',
                          cursor: 'col-resize'
                        }}
                      />
                    )}
                  </div>
                ) : output === 'PREVIEW_MODE' ? (
                  // Preview mode for HTML/CSS - full width with resize optimization
                  <div 
                    className="w-full h-full overflow-auto relative" 
                    style={{ 
                      backgroundColor: previewDarkMode ? 'var(--color-background)' : '#ffffff'
                    }}
                  >
                    <div style={{ 
                      transform: `scale(${previewZoom / 100})`,
                      transformOrigin: 'top left',
                      width: `calc(100% / ${previewZoom / 100})`,
                      height: `calc(100% / ${previewZoom / 100})`,
                      minHeight: '100%'
                    }}>
                    {(detectedLanguage === 'html' || detectedLanguage === 'markup' || 
                      (files.length > 0 && files.some(f => f.language === 'html'))) ? (
                      <iframe
                        srcDoc={(() => {
                          // Build complete HTML with all related files
                          // Find HTML file (current or from files array)
                          let htmlContent = code
                          
                          // If current file is not HTML, find HTML file in files array
                          if (detectedLanguage !== 'html' && detectedLanguage !== 'markup') {
                            const htmlFile = files.find(f => f.language === 'html')
                            if (htmlFile) {
                              htmlContent = htmlFile.content
                              console.log('[Canvas] 📄 Using HTML file for preview:', htmlFile.name)
                            }
                          }
                          
                          // If we have multiple files, inject CSS and JS
                          if (files.length > 1) {
                            const cssFiles = files.filter(f => f.language === 'css')
                            const jsFiles = files.filter(f => f.language === 'javascript' || f.language === 'typescript')
                            
                            console.log('[Canvas] 🎨 Injecting files:', {
                              html: htmlContent.length,
                              css: cssFiles.length,
                              js: jsFiles.length
                            })
                            
                            // Inject CSS into <head>
                            if (cssFiles.length > 0) {
                              const allCSS = cssFiles.map(f => f.content).join('\n\n')
                              const styleTag = `<style>\n${allCSS}\n</style>`
                              
                              // Try to inject before </head>
                              if (htmlContent.includes('</head>')) {
                                htmlContent = htmlContent.replace('</head>', `${styleTag}\n</head>`)
                              } else if (htmlContent.includes('<head>')) {
                                htmlContent = htmlContent.replace('<head>', `<head>\n${styleTag}`)
                              } else {
                                // No <head>, add at the beginning
                                htmlContent = styleTag + '\n' + htmlContent
                              }
                              console.log('[Canvas] ✅ CSS injected')
                            }
                            
                            // Inject JS before </body>
                            if (jsFiles.length > 0) {
                              const allJS = jsFiles.map(f => f.content).join('\n\n')
                              const scriptTag = `<script>\n${allJS}\n</script>`
                              
                              // Try to inject before </body>
                              if (htmlContent.includes('</body>')) {
                                htmlContent = htmlContent.replace('</body>', `${scriptTag}\n</body>`)
                              } else if (htmlContent.includes('<body>')) {
                                // No </body>, add after <body>
                                htmlContent = htmlContent.replace('</body>', `${scriptTag}\n</body>`)
                              } else {
                                // No </body>, add at the end
                                htmlContent = htmlContent + '\n' + scriptTag
                              }
                              console.log('[Canvas] ✅ JS injected')
                            }
                          }
                          
                          // Wrap in full HTML if needed
                          const fullHTML = previewDarkMode ? `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <style>
                                  body { background-color: #1a1a1a; color: #e5e5e5; margin: 0; padding: 0; }
                                </style>
                                <script>
                                  document.addEventListener('DOMContentLoaded', function() {
                                    document.addEventListener('click', function(e) {
                                      if (e.target.tagName === 'A' || e.target.closest('a')) {
                                        e.preventDefault();
                                      }
                                    }, true);
                                    document.addEventListener('submit', function(e) {
                                      e.preventDefault();
                                    }, true);
                                  });
                                </script>
                              </head>
                              <body>${htmlContent}</body>
                            </html>
                          ` : `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <meta charset="UTF-8">
                                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                                <script>
                                  document.addEventListener('DOMContentLoaded', function() {
                                    document.addEventListener('click', function(e) {
                                      if (e.target.tagName === 'A' || e.target.closest('a')) {
                                        e.preventDefault();
                                      }
                                    }, true);
                                    document.addEventListener('submit', function(e) {
                                      e.preventDefault();
                                    }, true);
                                  });
                                </script>
                              </head>
                              <body>${htmlContent}</body>
                            </html>
                          `
                          
                          return fullHTML
                        })()}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                        title="HTML Preview"
                        style={{
                          pointerEvents: isResizingEditor ? 'none' : 'auto',
                          willChange: isResizingEditor ? 'transform' : 'auto'
                        }}
                      />
                    ) : detectedLanguage === 'css' ? (
                      <iframe
                        srcDoc={`
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="UTF-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1.0">
                              <style>
                                * { margin: 0; padding: 0; box-sizing: border-box; }
                                body { 
                                  font-family: system-ui, -apple-system, sans-serif; 
                                  padding: 20px;
                                  ${previewDarkMode ? 'background-color: #1a1a1a; color: #e5e5e5;' : 'background-color: #ffffff; color: #000000;'}
                                }
                                ${code}
                              </style>
                              <script>
                                // Prevent navigation and form submissions from breaking the preview
                                document.addEventListener('DOMContentLoaded', function() {
                                  // Prevent all links from navigating
                                  document.addEventListener('click', function(e) {
                                    if (e.target.tagName === 'A' || e.target.closest('a')) {
                                      e.preventDefault();
                                      console.log('Link click prevented in preview mode');
                                    }
                                  }, true);
                                  
                                  // Prevent form submissions
                                  document.addEventListener('submit', function(e) {
                                    e.preventDefault();
                                    console.log('Form submission prevented in preview mode');
                                  }, true);
                                });
                              </script>
                            </head>
                            <body>
                              <h1>CSS Preview</h1>
                              <p>This is a paragraph with your custom styles.</p>
                              <button>Button</button>
                              <a href="#">Link</a>
                              <div class="box" style="margin-top: 20px;">
                                <p>Sample Box with class "box"</p>
                              </div>
                              <ul>
                                <li>List item 1</li>
                                <li>List item 2</li>
                                <li>List item 3</li>
                              </ul>
                              <input type="text" placeholder="Input field" style="margin-top: 10px;">
                            </body>
                          </html>
                        `}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts"
                        title="CSS Preview"
                        style={{
                          pointerEvents: isResizingEditor ? 'none' : 'auto',
                          willChange: isResizingEditor ? 'transform' : 'auto'
                        }}
                      />
                    ) : null}
                    
                    {/* Overlay during resize for better performance */}
                    {isResizingEditor && (
                      <div 
                        className="absolute inset-0 z-10"
                        style={{ 
                          backgroundColor: 'transparent',
                          cursor: 'col-resize'
                        }}
                      />
                    )}
                    </div>
                  </div>
                ) : output ? (
                  <div 
                    className="relative h-full"
                    style={{
                      pointerEvents: isResizingEditor ? 'none' : 'auto',
                      userSelect: isResizingEditor ? 'none' : 'auto'
                    }}
                  >
                    {isRunning && output === '⏳ Running...' ? (
                      // Animated running indicator
                      <div className="flex flex-col items-center justify-center h-full gap-3">
                        <div className="flex items-center gap-2">
                          <svg className="w-5 h-5 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span className="text-sm text-muted-foreground">Executing code...</span>
                        </div>
                        <div className="w-48 h-1 bg-muted/30 rounded-full overflow-hidden">
                          <div className="h-full bg-primary animate-pulse" style={{ width: '100%' }}></div>
                        </div>
                      </div>
                    ) : (
                      <pre className="font-mono text-sm whitespace-pre-wrap p-4">{output}</pre>
                    )}
                    {isResizingEditor && (
                      <div 
                        className="absolute inset-0 z-10"
                        style={{ 
                          backgroundColor: 'transparent',
                          cursor: 'col-resize'
                        }}
                      />
                    )}
                  </div>
                ) : (
                  <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
                    Run your code to see output here
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
