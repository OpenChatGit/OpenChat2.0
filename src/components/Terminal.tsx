import { useEffect, useRef, useState } from 'react'
import { Terminal as XTerm } from 'xterm'
import { FitAddon } from 'xterm-addon-fit'
import { invoke } from '@tauri-apps/api/core'
import 'xterm/css/xterm.css'

interface TerminalProps {
  onLoadFile?: (content: string, filename: string) => void
  currentCode?: string
  currentFilename?: string
}

export function Terminal({ onLoadFile, currentCode, currentFilename }: TerminalProps = {}) {
  const terminalRef = useRef<HTMLDivElement>(null)
  const xtermRef = useRef<XTerm | null>(null)
  const fitAddonRef = useRef<FitAddon | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)
  const [workingDir, setWorkingDir] = useState<string>('')

  useEffect(() => {
    if (!terminalRef.current) return
    
    // Prevent re-initialization if already initialized
    if (xtermRef.current) return

    // Initialize xterm
    const term = new XTerm({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Consolas, Monaco, "Courier New", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#d4d4d4',
        cursor: '#d4d4d4',
        black: '#000000',
        red: '#cd3131',
        green: '#0dbc79',
        yellow: '#e5e510',
        blue: '#2472c8',
        magenta: '#bc3fbc',
        cyan: '#11a8cd',
        white: '#e5e5e5',
        brightBlack: '#666666',
        brightRed: '#f14c4c',
        brightGreen: '#23d18b',
        brightYellow: '#f5f543',
        brightBlue: '#3b8eea',
        brightMagenta: '#d670d6',
        brightCyan: '#29b8db',
        brightWhite: '#ffffff'
      }
    })

    const fitAddon = new FitAddon()
    term.loadAddon(fitAddon)
    
    try {
      term.open(terminalRef.current)
      fitAddon.fit()
    } catch (error) {
      console.error('Error initializing terminal:', error)
      return
    }

    xtermRef.current = term
    fitAddonRef.current = fitAddon

    // Welcome message
    term.writeln('OpenChat Terminal v0.6.0')
    term.writeln('Type commands and press Enter to execute.')
    term.writeln('')
    
    const writePrompt = () => {
      term.write(workingDir ? `${workingDir} $ ` : '$ ')
    }
    
    writePrompt()

    // Handle input
    let currentLine = ''
    let cursorPosition = 0
    
    const getPrompt = () => {
      return workingDir ? `${workingDir} $ ` : '$ '
    }
    
    const redrawLine = () => {
      const prompt = getPrompt()
      // Move to beginning of line
      term.write('\r')
      // Clear entire line
      term.write('\x1b[2K')
      // Write prompt and current line
      term.write(prompt + currentLine)
      
      // Move cursor to correct position (prompt length + cursorPosition)
      const targetCol = prompt.length + cursorPosition
      term.write('\r')
      if (targetCol > 0) {
        term.write('\x1b[' + targetCol + 'C')
      }
    }
    
    term.onData((data) => {
      if (isExecuting) return

      // Debug: log what we receive
      // console.log('Received data:', data, 'codes:', Array.from(data).map(c => c.charCodeAt(0)))

      // Handle arrow keys and special keys (escape sequences)
      if (data.startsWith('\x1b[')) {
        // Left arrow: \x1b[D
        if (data === '\x1b[D') {
          if (cursorPosition > 0) {
            cursorPosition--
            redrawLine()
          }
          return
        }
        // Right arrow: \x1b[C
        if (data === '\x1b[C') {
          if (cursorPosition < currentLine.length) {
            cursorPosition++
            redrawLine()
          }
          return
        }
        // Up arrow: \x1b[A - ignore for now (could be used for history)
        if (data === '\x1b[A') {
          return
        }
        // Down arrow: \x1b[B - ignore for now
        if (data === '\x1b[B') {
          return
        }
        // Delete key: \x1b[3~
        if (data === '\x1b[3~') {
          if (cursorPosition < currentLine.length) {
            currentLine = currentLine.slice(0, cursorPosition) + currentLine.slice(cursorPosition + 1)
            redrawLine()
          }
          return
        }
        // Home key: \x1b[H or \x1b[1~
        if (data === '\x1b[H' || data === '\x1b[1~') {
          cursorPosition = 0
          redrawLine()
          return
        }
        // End key: \x1b[F or \x1b[4~
        if (data === '\x1b[F' || data === '\x1b[4~') {
          cursorPosition = currentLine.length
          redrawLine()
          return
        }
        // Ignore other escape sequences
        return
      }

      // Handle paste (multiple characters at once, but not escape sequences)
      if (data.length > 1) {
        // Filter out newlines and control characters from pasted content
        const cleanData = data.replace(/[\r\n]/g, '')
        // Insert at cursor position
        currentLine = currentLine.slice(0, cursorPosition) + cleanData + currentLine.slice(cursorPosition)
        cursorPosition += cleanData.length
        redrawLine()
        return
      }

      const code = data.charCodeAt(0)

      // Enter key
      if (code === 13) {
        const command = currentLine.trim()
        
        // Handle built-in commands
        if (command.toLowerCase() === 'clear' || command.toLowerCase() === 'cls') {
          currentLine = ''
          cursorPosition = 0
          // Reset the terminal completely - this clears everything including scrollback
          term.reset()
          writePrompt()
          return
        }
        
        currentLine = ''
        cursorPosition = 0
        term.writeln('')
        if (command) {
          executeCommand(command, term, writePrompt)
        } else {
          writePrompt()
        }
      }
      // Backspace
      else if (code === 127) {
        if (cursorPosition > 0) {
          currentLine = currentLine.slice(0, cursorPosition - 1) + currentLine.slice(cursorPosition)
          cursorPosition--
          redrawLine()
        }
      }
      // Ctrl+C
      else if (code === 3) {
        term.writeln('^C')
        currentLine = ''
        cursorPosition = 0
        writePrompt()
      }
      // Ctrl+L (clear screen)
      else if (code === 12) {
        term.clear()
        currentLine = ''
        cursorPosition = 0
        writePrompt()
      }
      // Ctrl+V (paste) - browser will handle this automatically
      else if (code === 22) {
        // Paste is handled by the browser's clipboard API
        // XTerm will receive the pasted text via onData
        return
      }
      // Regular character
      else if (code >= 32 && code < 127) {
        // Insert at cursor position
        currentLine = currentLine.slice(0, cursorPosition) + data + currentLine.slice(cursorPosition)
        cursorPosition++
        redrawLine()
      }
    })
    
    // Enable right-click paste (optional)
    term.attachCustomKeyEventHandler((event) => {
      // Allow Ctrl+V for paste
      if (event.ctrlKey && event.key === 'v') {
        return true // Let browser handle paste
      }
      // Allow Ctrl+C for copy (when text is selected)
      if (event.ctrlKey && event.key === 'c' && term.hasSelection()) {
        return true // Let browser handle copy
      }
      return true
    })

    // Handle resize
    const handleResize = () => {
      if (fitAddon && term && terminalRef.current) {
        try {
          fitAddon.fit()
        } catch (error) {
          // Ignore resize errors when terminal is not visible
        }
      }
    }
    window.addEventListener('resize', handleResize)

    return () => {
      window.removeEventListener('resize', handleResize)
      if (term) {
        term.dispose()
      }
      xtermRef.current = null
      fitAddonRef.current = null
    }
  }, [])

  const executeCommand = async (command: string, term: XTerm, writePrompt: () => void) => {
    setIsExecuting(true)

    try {
      // Handle built-in commands
      const parts = command.split(' ')
      const cmd = parts[0].toLowerCase()
      
      // CD command - change directory
      if (cmd === 'cd') {
        const newDir = parts.slice(1).join(' ').trim() || ''
        if (newDir) {
          // Test if directory exists by running a command in it
          try {
            const testResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
              command: 'cd',
              workingDir: newDir
            })
            if (testResult.exit_code === 0) {
              setWorkingDir(newDir)
              term.writeln(`Changed directory to: ${newDir}`)
            } else {
              term.writeln(`\x1b[31mDirectory not found: ${newDir}\x1b[0m`)
            }
          } catch (error) {
            term.writeln(`\x1b[31mDirectory not found: ${newDir}\x1b[0m`)
          }
        } else {
          term.writeln(`Current directory: ${workingDir || '(root)'}`)
        }
        setIsExecuting(false)
        writePrompt()
        return
      }
      
      // OPEN command - open file in editor
      if (cmd === 'open') {
        const filepath = parts.slice(1).join(' ').trim()
        if (!filepath) {
          term.writeln('\x1b[31mUsage: open <filepath>\x1b[0m')
          setIsExecuting(false)
          writePrompt()
          return
        }
        
        try {
          const content = await invoke<string>('read_file_content', { path: filepath })
          if (onLoadFile) {
            const filename = filepath.split(/[/\\]/).pop() || filepath
            onLoadFile(content, filename)
            term.writeln(`\x1b[32mOpened: ${filepath}\x1b[0m`)
          } else {
            term.writeln('\x1b[33mFile loaded but no editor callback available\x1b[0m')
          }
        } catch (error) {
          term.writeln(`\x1b[31mError reading file: ${error}\x1b[0m`)
        }
        setIsExecuting(false)
        writePrompt()
        return
      }
      
      // PWD command - print working directory
      if (cmd === 'pwd') {
        term.writeln(workingDir || '(root)')
        setIsExecuting(false)
        writePrompt()
        return
      }
      
      // SAVE command - save current code to file
      if (cmd === 'save') {
        const filepath = parts.slice(1).join(' ').trim() || currentFilename
        if (!filepath) {
          term.writeln('\x1b[31mUsage: save <filepath> or save (if file already opened)\x1b[0m')
          setIsExecuting(false)
          writePrompt()
          return
        }
        
        if (!currentCode) {
          term.writeln('\x1b[31mNo code to save\x1b[0m')
          setIsExecuting(false)
          writePrompt()
          return
        }
        
        try {
          await invoke('write_file_content', { path: filepath, content: currentCode })
          term.writeln(`\x1b[32mSaved: ${filepath}\x1b[0m`)
        } catch (error) {
          term.writeln(`\x1b[31mError saving file: ${error}\x1b[0m`)
        }
        setIsExecuting(false)
        writePrompt()
        return
      }
      
      // Regular command execution - pass everything to CMD/Shell
      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command,
        workingDir: workingDir || undefined
      })

      // Show stdout if available
      if (result.stdout && result.stdout.trim()) {
        const lines = result.stdout.trim().split('\n')
        lines.forEach(line => term.writeln(line))
      }
      
      // Show stderr if available
      if (result.stderr && result.stderr.trim()) {
        const lines = result.stderr.trim().split('\n')
        lines.forEach(line => term.writeln(`\x1b[31m${line}\x1b[0m`))
      }
      
      // Show exit code only if non-zero (error)
      if (result.exit_code !== 0) {
        term.writeln(`\x1b[31mCommand failed with exit code: ${result.exit_code}\x1b[0m`)
      }
      // If command succeeded but had no output, don't show anything (like real terminal)
      
    } catch (error) {
      term.writeln(`\x1b[31mError: ${error}\x1b[0m`)
    }

    setIsExecuting(false)
    writePrompt()
  }

  return (
    <div className="w-full h-full flex flex-col bg-[#1e1e1e] p-4">
      <div ref={terminalRef} className="flex-1" />
    </div>
  )
}
