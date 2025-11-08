import { useState, useRef, useEffect } from 'react'
import { Play, Copy, Download, RotateCcw, Check, ChevronRight, ChevronLeft, Square, X, Sun, Moon, Terminal as TerminalIcon, MessageSquare, ChevronDown, Trash2, Edit2 } from 'lucide-react'
import editSquareIcon from '../assets/edit_square.svg'
import { Terminal } from './Terminal'
import { ChatMessage } from './ChatMessage'
import { cn } from '../lib/utils'
import { ChatInput } from './ChatInput'
import type { ImageAttachment, ProviderConfig, ModelInfo } from '../types'
import Prism from 'prismjs'
import { marked } from 'marked'
import Editor from 'react-simple-code-editor'
import '../styles/prism-custom.css'
import '../styles/markdown-preview.css'

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
  onSaveCanvasState?: (sessionId: string, code: string, language: string) => void
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
  const resizeRef = useRef<HTMLDivElement>(null)
  const editorResizeRef = useRef<HTMLDivElement>(null)
  const sessionDropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (initialCode) {
      setCode(initialCode)
    }
  }, [initialCode])

  // Load code and language from session when session changes
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
    } else if (currentSession) {
      // New session without code - reset to defaults
      setCode('')
      setDetectedLanguage('none')
      setManualLanguageSet(false)
      console.log('[Canvas] New session - reset to defaults')
    }
  }, [currentSession?.id])

  // Auto-save code to session
  useEffect(() => {
    if (currentSession && code && onSaveCanvasState) {
      // Debounce save
      const timer = setTimeout(() => {
        onSaveCanvasState(currentSession.id, code, detectedLanguage)
      }, 1000)
      
      return () => clearTimeout(timer)
    }
  }, [code, detectedLanguage, currentSession?.id, onSaveCanvasState])

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
    
    // Handler for LIVE code streaming
    const handleCanvasCodeStream = (event: any) => {
      const { language, code, isComplete } = event.detail
      console.log('[Canvas] 📡 Streaming code:', language, `(${code.length} chars)`, isComplete ? '✓ Complete' : '⏳ Streaming...')
      
      // Update code in real-time
      setCode(code)
      const normalizedLanguage = language.toLowerCase()
      setDetectedLanguage(normalizedLanguage)
      setManualLanguageSet(true)
      
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

      // HTML - Show preview
      if (detectedLanguage === 'html' || detectedLanguage === 'markup') {
        setOutput('PREVIEW_MODE')
        setIsPreviewMode(true)
        setIsRunning(false)
        return
      }

      // CSS - Show preview with sample HTML
      if (detectedLanguage === 'css') {
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
      // Python - execute via backend
      else if (detectedLanguage === 'python') {
        try {
          const { invoke } = await import('@tauri-apps/api/core')
          
          // Create temp file path
          const tempFile = `temp_script_${Date.now()}.py`
          
          // Write Python code to temp file
          await invoke('write_file_content', { 
            path: tempFile, 
            content: code 
          })
          
          // Execute Python script
          const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
            command: `python ${tempFile}`,
            workingDir: undefined
          })
          
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
          
          setOutput(output || '✓ Python script executed successfully (no output)')
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
                <span>Code</span>
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
            <div className="flex-1 flex flex-col" style={{ width: `${100 - editorWidth}%` }}>
              <div className="px-4 py-2.5 border-b text-sm font-medium bg-muted/30 h-10 flex items-center justify-between" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                <span>{showTerminal ? 'Terminal' : 'Output'}</span>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setShowTerminal(!showTerminal)}
                    className={`p-1.5 rounded-lg hover:bg-white/10 transition-colors ${showTerminal ? 'bg-primary/20' : ''}`}
                    title={showTerminal ? "Show output" : "Show terminal"}
                  >
                    <TerminalIcon className="w-3.5 h-3.5" />
                  </button>
                  {!showTerminal && (output.startsWith('MARKDOWN_PREVIEW:') || output === 'PREVIEW_MODE') && (
                    <button
                      onClick={() => setPreviewDarkMode(!previewDarkMode)}
                      className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
                      title={previewDarkMode ? "Switch to light mode" : "Switch to dark mode"}
                    >
                      {previewDarkMode ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    </button>
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
                    <div 
                      className={cn("prose prose-sm max-w-none p-6", previewDarkMode && "prose-invert")}
                      style={{ color: previewDarkMode ? 'var(--color-foreground)' : '#1a1a1a' }}
                      dangerouslySetInnerHTML={{ __html: output.replace('MARKDOWN_PREVIEW:', '') }}
                    />
                    
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
                    className="w-full h-full relative" 
                    style={{ 
                      backgroundColor: previewDarkMode ? 'var(--color-background)' : '#ffffff'
                    }}
                  >
                    {detectedLanguage === 'html' || detectedLanguage === 'markup' ? (
                      <iframe
                        srcDoc={previewDarkMode ? `
                          <!DOCTYPE html>
                          <html>
                            <head>
                              <meta charset="UTF-8">
                              <meta name="viewport" content="width=device-width, initial-scale=1.0">
                              <style>
                                body { background-color: #1a1a1a; color: #e5e5e5; margin: 0; padding: 0; }
                              </style>
                            </head>
                            <body>${code}</body>
                          </html>
                        ` : code}
                        className="w-full h-full border-0"
                        sandbox="allow-scripts allow-same-origin"
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
                        sandbox="allow-scripts allow-same-origin"
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
