/**
 * Canvas Runtime Manager
 * 
 * Manages portable runtime installations for programming languages.
 * Automatically downloads and installs runtimes when needed.
 */

import { runtimeDiscovery, type RuntimeDownloadInfo } from './RuntimeDiscovery'

export interface RuntimeInfo {
  name: string
  version: string
  displayName: string
  downloadUrl: string
  size: string
  executable: string
  installPath: string
  isInstalled: boolean
  isDownloading: boolean
  downloadProgress: number
}

export interface RuntimeConfig {
  python: RuntimeInfo
  nodejs: RuntimeInfo
  php: RuntimeInfo
  ruby: RuntimeInfo
  go: RuntimeInfo
}

export class RuntimeManager {
  private static instance: RuntimeManager
  private runtimes: Map<string, RuntimeInfo> = new Map()
  private basePath = '.canvas_runtimes'

  private constructor() {
    this.initializeRuntimes()
  }

  static getInstance(): RuntimeManager {
    if (!RuntimeManager.instance) {
      RuntimeManager.instance = new RuntimeManager()
    }
    return RuntimeManager.instance
  }

  private initializeRuntimes() {
    // Python Portable
    this.runtimes.set('python', {
      name: 'python',
      version: '3.11.7',
      displayName: 'Python 3.11',
      downloadUrl: 'https://www.python.org/ftp/python/3.11.7/python-3.11.7-embed-amd64.zip',
      size: '10 MB',
      executable: 'python.exe',
      installPath: `${this.basePath}/python`,
      isInstalled: false,
      isDownloading: false,
      downloadProgress: 0
    })

    // Node.js Portable
    this.runtimes.set('nodejs', {
      name: 'nodejs',
      version: '20.11.0',
      displayName: 'Node.js 20',
      downloadUrl: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip',
      size: '30 MB',
      executable: 'node.exe',
      installPath: `${this.basePath}/nodejs`,
      isInstalled: false,
      isDownloading: false,
      downloadProgress: 0
    })

    // PHP Portable
    this.runtimes.set('php', {
      name: 'php',
      version: '8.3.1',
      displayName: 'PHP 8.3',
      downloadUrl: 'https://windows.php.net/downloads/releases/php-8.3.1-Win32-vs16-x64.zip',
      size: '30 MB',
      executable: 'php.exe',
      installPath: `${this.basePath}/php`,
      isInstalled: false,
      isDownloading: false,
      downloadProgress: 0
    })

    // Ruby Portable
    this.runtimes.set('ruby', {
      name: 'ruby',
      version: '3.2.2',
      displayName: 'Ruby 3.2',
      downloadUrl: 'https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-3.2.2-1/rubyinstaller-3.2.2-1-x64.7z',
      size: '20 MB',
      executable: 'ruby.exe',
      installPath: `${this.basePath}/ruby`,
      isInstalled: false,
      isDownloading: false,
      downloadProgress: 0
    })

    // Go Portable
    this.runtimes.set('go', {
      name: 'go',
      version: '1.21.6',
      displayName: 'Go 1.21',
      downloadUrl: 'https://go.dev/dl/go1.21.6.windows-amd64.zip',
      size: '140 MB',
      executable: 'go.exe',
      installPath: `${this.basePath}/go`,
      isInstalled: false,
      isDownloading: false,
      downloadProgress: 0
    })
  }

  /**
   * Check if a runtime is installed
   */
  async isRuntimeInstalled(language: string): Promise<boolean> {
    const runtime = this.runtimes.get(language)
    if (!runtime) return false

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // Try multiple possible paths (ZIP files often extract to subdirectories)
      const possiblePaths = [
        `${runtime.installPath}/${runtime.executable}`,
        `${runtime.installPath}/bin/${runtime.executable}`,
        `${runtime.installPath}/*/${runtime.executable}`, // Wildcard for subdirs
      ]
      
      for (const execPath of possiblePaths) {
        try {
          const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
            command: `if exist "${execPath}" (echo exists) else (echo not_found)`,
            workingDir: undefined
          })
          
          if (result.stdout.trim() === 'exists') {
            runtime.isInstalled = true
            console.log(`[RuntimeManager] Found ${language} at: ${execPath}`)
            return true
          }
        } catch (err) {
          // Try next path
          continue
        }
      }
      
      // Also try to run the executable directly to verify
      try {
        const testResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: `"${runtime.installPath}/${runtime.executable}" --version`,
          workingDir: undefined
        })
        
        if (testResult.exit_code === 0) {
          runtime.isInstalled = true
          console.log(`[RuntimeManager] ${language} is functional`)
          return true
        }
      } catch (err) {
        // Not functional
      }
      
      runtime.isInstalled = false
      return false
    } catch (error) {
      console.error(`[RuntimeManager] Error checking ${language}:`, error)
      return false
    }
  }

  /**
   * Get runtime info
   */
  getRuntimeInfo(language: string): RuntimeInfo | undefined {
    return this.runtimes.get(language)
  }

  /**
   * Get all runtimes
   */
  getAllRuntimes(): RuntimeInfo[] {
    return Array.from(this.runtimes.values())
  }

  /**
   * Get available versions for a runtime
   */
  async getAvailableVersions(language: string): Promise<RuntimeDownloadInfo[]> {
    try {
      const versions = await runtimeDiscovery.discoverMultipleVersions(language, 5)
      console.log(`[RuntimeManager] Found ${versions.length} versions for ${language}`)
      return versions
    } catch (error) {
      console.error(`[RuntimeManager] Error getting versions for ${language}:`, error)
      return []
    }
  }

  /**
   * Download and install a runtime
   */
  async installRuntime(
    language: string,
    onProgress?: (progress: number, status: string) => void
  ): Promise<boolean> {
    const runtime = this.runtimes.get(language)
    if (!runtime) {
      throw new Error(`Runtime ${language} not found`)
    }

    try {
      // First, try to discover the latest version
      onProgress?.(5, `Discovering latest ${runtime.displayName}...`)
      const discoveredRuntime = await runtimeDiscovery.discoverRuntime(language)
      
      if (discoveredRuntime) {
        console.log(`[RuntimeManager] Discovered ${language} ${discoveredRuntime.version}`)
        console.log(`[RuntimeManager] Download URL: ${discoveredRuntime.downloadUrl}`)
        
        // Update runtime info with discovered version
        runtime.version = discoveredRuntime.version
        runtime.downloadUrl = discoveredRuntime.downloadUrl
        runtime.size = discoveredRuntime.size
      } else {
        console.log(`[RuntimeManager] Using default ${language} configuration`)
      }

      const { invoke } = await import('@tauri-apps/api/core')
      
      runtime.isDownloading = true
      runtime.downloadProgress = 0

      // Get absolute paths first
      const { invoke: invokeCore } = await import('@tauri-apps/api/core')
      const currentDirResult = await invokeCore<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command: 'cd',
        workingDir: undefined
      })
      const currentDir = currentDirResult.stdout.trim()
      
      // Create runtime directory (ignore errors if it exists)
      onProgress?.(10, `Creating directory for ${runtime.displayName}...`)
      try {
        await invoke('run_terminal_command', {
          command: `if not exist "${runtime.installPath}" mkdir "${runtime.installPath}"`,
          workingDir: undefined
        })
        console.log(`[RuntimeManager] Directory created: ${runtime.installPath}`)
      } catch (err) {
        console.log(`[RuntimeManager] Directory creation note:`, err)
      }

      // Download runtime
      onProgress?.(20, `Downloading ${runtime.displayName} (${runtime.size})...`)
      
      // TEMPORARY: Download to Desktop for testing
      const desktopPath = `${currentDir.split('\\').slice(0, 3).join('\\')}\\Desktop`
      const testZipFile = `${desktopPath}\\${language}_runtime_test.zip`
      const testExtractPath = `${desktopPath}\\${language}_runtime_test_extract`
      
      console.log(`[RuntimeManager] TEST MODE: Downloading to Desktop`)
      console.log(`[RuntimeManager] Desktop path: ${desktopPath}`)
      console.log(`[RuntimeManager] Test zip file: ${testZipFile}`)
      console.log(`[RuntimeManager] Test extract path: ${testExtractPath}`)
      console.log(`[RuntimeManager] Download URL: ${runtime.downloadUrl}`)
      
      // Use the currentDir from above to get absolute paths
      const absoluteInstallPath = `${currentDir}\\${runtime.installPath}`.replace(/\//g, '\\')
      const zipFile = testZipFile // Use desktop for testing
      const tempExtractPath = testExtractPath // Use desktop for testing
      
      console.log(`[RuntimeManager] Absolute install path: ${absoluteInstallPath}`)
      console.log(`[RuntimeManager] Zip file: ${zipFile}`)
      console.log(`[RuntimeManager] Temp extract: ${tempExtractPath}`)
      
      // Use PowerShell to download with progress
      const downloadCommand = `powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri '${runtime.downloadUrl}' -OutFile '${zipFile}' -UseBasicParsing"`
      
      console.log(`[RuntimeManager] Executing download command...`)
      const downloadResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command: downloadCommand,
        workingDir: undefined
      })
      
      console.log(`[RuntimeManager] Download exit code: ${downloadResult.exit_code}`)
      console.log(`[RuntimeManager] Download stdout:`, downloadResult.stdout.substring(0, 200))
      console.log(`[RuntimeManager] Download stderr:`, downloadResult.stderr.substring(0, 200))
      
      if (downloadResult.exit_code !== 0) {
        throw new Error(`Download failed (exit code ${downloadResult.exit_code}): ${downloadResult.stderr}`)
      }
      
      console.log(`[RuntimeManager] Download complete - check Desktop for ${language}_runtime_test.zip`)

      onProgress?.(60, `Extracting ${runtime.displayName}...`)
      
      // First verify the zip file exists and has content
      try {
        const zipCheckCommand = `dir "${zipFile}"`
        const zipCheckResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: zipCheckCommand,
          workingDir: undefined
        })
        console.log(`[RuntimeManager] Zip file info:`, zipCheckResult.stdout.substring(0, 200))
        
        // Check file size
        if (zipCheckResult.stdout.includes(' 0 ') || zipCheckResult.stdout.includes('0 bytes')) {
          throw new Error('Downloaded zip file is empty (0 bytes)')
        }
      } catch (err) {
        throw new Error(`Zip file not found or inaccessible: ${zipFile}`)
      }
      
      // Create temp extraction directory
      try {
        await invoke('run_terminal_command', {
          command: `if not exist "${tempExtractPath}" mkdir "${tempExtractPath}"`,
          workingDir: undefined
        })
      } catch (err) {
        console.log(`[RuntimeManager] Temp dir creation note:`, err)
      }
      
      // Try multiple extraction methods
      let extractionSuccess = false
      let extractionError = ''
      
      // Method 1: Windows built-in tar (available in Windows 10+)
      console.log(`[RuntimeManager] Trying extraction with tar...`)
      try {
        const tarCommand = `tar -xf "${zipFile}" -C "${tempExtractPath}"`
        const tarResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: tarCommand,
          workingDir: undefined
        })
        
        if (tarResult.exit_code === 0) {
          console.log(`[RuntimeManager] Extraction with tar successful`)
          extractionSuccess = true
        } else {
          extractionError = `tar failed: ${tarResult.stderr}`
          console.log(`[RuntimeManager] tar extraction failed:`, tarResult.stderr)
        }
      } catch (err) {
        extractionError = `tar not available: ${err}`
        console.log(`[RuntimeManager] tar not available, trying PowerShell...`)
      }
      
      // Method 2: PowerShell Expand-Archive (fallback)
      if (!extractionSuccess) {
        console.log(`[RuntimeManager] Trying extraction with PowerShell...`)
        try {
          const psCommand = `powershell -Command "try { Expand-Archive -LiteralPath '${zipFile}' -DestinationPath '${tempExtractPath}' -Force; Write-Host 'SUCCESS' } catch { Write-Error $_.Exception.Message; exit 1 }"`
          const psResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
            command: psCommand,
            workingDir: undefined
          })
          
          console.log(`[RuntimeManager] PowerShell extraction output:`, psResult.stdout, psResult.stderr)
          
          if (psResult.exit_code === 0 && psResult.stdout.includes('SUCCESS')) {
            console.log(`[RuntimeManager] Extraction with PowerShell successful`)
            extractionSuccess = true
          } else {
            extractionError += `\nPowerShell failed: ${psResult.stderr}`
          }
        } catch (err) {
          extractionError += `\nPowerShell error: ${err}`
        }
      }
      
      if (!extractionSuccess) {
        throw new Error(`All extraction methods failed: ${extractionError}`)
      }
      
      console.log(`[RuntimeManager] Extraction complete`)

      onProgress?.(70, `Organizing files...`)
      
      // Verify extraction by listing files
      const listAllCommand = `dir "${tempExtractPath}" /s /b`
      const listAllResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command: listAllCommand,
        workingDir: undefined
      })
      
      const extractedFiles = listAllResult.stdout.trim()
      console.log(`[RuntimeManager] Extracted files (${extractedFiles.split('\n').length} items):`, extractedFiles.substring(0, 500))
      
      if (!extractedFiles || extractedFiles.length === 0) {
        throw new Error(`Extraction produced no files. The zip file may be corrupted or empty.`)
      }
      
      // Move files from subdirectory if needed
      // Check if extraction created a subdirectory using dir command
      const listCommand = `dir "${tempExtractPath}" /ad /b`
      let subdir = ''
      
      try {
        const listResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: listCommand,
          workingDir: undefined
        })
        
        // Get first directory name
        const dirs = listResult.stdout.trim().split('\n').filter(d => d.trim())
        console.log(`[RuntimeManager] Found ${dirs.length} subdirectories:`, dirs)
        
        if (dirs.length === 1) {
          subdir = dirs[0].trim()
          console.log(`[RuntimeManager] Using subdirectory: ${subdir}`)
        }
      } catch (err) {
        console.log(`[RuntimeManager] No subdirectories found or error listing:`, err)
      }
      
      if (subdir) {
        // Move contents from subdirectory to main install path
        const sourceDir = `${tempExtractPath}\\${subdir}`
        console.log(`[RuntimeManager] Moving from subdirectory: ${sourceDir}`)
        console.log(`[RuntimeManager] To: ${absoluteInstallPath}`)
        
        const moveCommand = `xcopy "${sourceDir}" "${absoluteInstallPath}" /E /I /Y /H /R`
        const moveResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: moveCommand,
          workingDir: undefined
        })
        
        console.log(`[RuntimeManager] Move exit code: ${moveResult.exit_code}`)
        console.log(`[RuntimeManager] Move output:`, moveResult.stdout)
        
        if (moveResult.exit_code !== 0 && moveResult.exit_code !== 1) {
          throw new Error(`Failed to move files from subdirectory: ${moveResult.stderr}`)
        }
      } else {
        // Move all contents directly
        console.log(`[RuntimeManager] Moving all contents from: ${tempExtractPath}`)
        console.log(`[RuntimeManager] To: ${absoluteInstallPath}`)
        
        const moveCommand = `xcopy "${tempExtractPath}" "${absoluteInstallPath}" /E /I /Y /H /R`
        const moveResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: moveCommand,
          workingDir: undefined
        })
        
        console.log(`[RuntimeManager] Move exit code: ${moveResult.exit_code}`)
        console.log(`[RuntimeManager] Move output:`, moveResult.stdout)
        
        if (moveResult.exit_code !== 0 && moveResult.exit_code !== 1) {
          throw new Error(`Failed to move files: ${moveResult.stderr}`)
        }
      }

      onProgress?.(80, `Cleaning up...`)
      
      // TEMPORARY: Skip cleanup in test mode - leave files on Desktop for inspection
      console.log(`[RuntimeManager] TEST MODE: Skipping cleanup`)
      console.log(`[RuntimeManager] Files left on Desktop for inspection:`)
      console.log(`[RuntimeManager] - ${zipFile}`)
      console.log(`[RuntimeManager] - ${tempExtractPath}`)
      console.log(`[RuntimeManager] Please check these files manually!`)
      
      // Delete temp directory and zip file (ignore errors) - DISABLED FOR TESTING
      // try {
      //   await invoke('run_terminal_command', {
      //     command: `if exist "${tempExtractPath}" rmdir /s /q "${tempExtractPath}"`,
      //     workingDir: undefined
      //   })
      //   console.log(`[RuntimeManager] Temp directory cleaned up`)
      // } catch (err) {
      //   console.log(`[RuntimeManager] Temp directory cleanup note:`, err)
      // }
      
      // try {
      //   await invoke('run_terminal_command', {
      //     command: `if exist "${zipFile}" del /q "${zipFile}"`,
      //     workingDir: undefined
      //   })
      //   console.log(`[RuntimeManager] Zip file cleaned up`)
      // } catch (err) {
      //   console.log(`[RuntimeManager] Zip file cleanup note:`, err)
      // }

      // Verify installation
      onProgress?.(90, `Verifying installation...`)
      
      // Wait a moment for file system to settle
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Log directory contents for debugging BEFORE verification
      console.log(`[RuntimeManager] Checking installation in: ${absoluteInstallPath}`)
      
      // First check if the directory exists
      try {
        const dirCheckCommand = `dir "${absoluteInstallPath}" /b`
        const dirCheckResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: dirCheckCommand,
          workingDir: undefined
        })
        console.log(`[RuntimeManager] Directory contents:`, dirCheckResult.stdout.substring(0, 500))
      } catch (err) {
        console.log(`[RuntimeManager] Directory does not exist or is empty`)
      }
      
      // List all exe files using dir command (cmd compatible)
      const debugCommand = `dir "${absoluteInstallPath}\\*.exe" /s /b`
      try {
        const debugResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: debugCommand,
          workingDir: undefined
        })
        console.log(`[RuntimeManager] Found executables:`, debugResult.stdout)
      } catch (err) {
        console.log(`[RuntimeManager] No executables found or error listing:`, err)
      }
      
      // Try to find the executable recursively using dir
      const findCommand = `dir "${absoluteInstallPath}\\${runtime.executable}" /s /b`
      let foundPath = ''
      
      try {
        const findResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
          command: findCommand,
          workingDir: undefined
        })
        
        // Get first line (first match)
        foundPath = findResult.stdout.split('\n')[0]?.trim() || ''
      } catch (err) {
        console.log(`[RuntimeManager] Could not find ${runtime.executable} using dir command`)
      }
      
      if (foundPath && foundPath.length > 0) {
        console.log(`[RuntimeManager] Found ${runtime.executable} at: ${foundPath}`)
        
        // Test if it works
        try {
          const testResult = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
            command: `"${foundPath}" --version`,
            workingDir: undefined
          })
          
          if (testResult.exit_code === 0) {
            runtime.isInstalled = true
            runtime.isDownloading = false
            runtime.downloadProgress = 100
            // Keep the relative path for runtime.installPath
            onProgress?.(100, `✓ ${runtime.displayName} installed successfully!`)
            console.log(`[RuntimeManager] ${runtime.displayName} is functional:`, testResult.stdout.substring(0, 100))
            return true
          } else {
            console.error(`[RuntimeManager] Executable found but not functional:`, testResult.stderr)
          }
        } catch (err) {
          console.error(`[RuntimeManager] Error testing executable:`, err)
        }
      } else {
        console.error(`[RuntimeManager] Could not find ${runtime.executable} in directory tree`)
      }
      
      // Fallback: Try standard verification
      const installed = await this.isRuntimeInstalled(language)
      
      if (installed) {
        runtime.isInstalled = true
        runtime.isDownloading = false
        runtime.downloadProgress = 100
        onProgress?.(100, `✓ ${runtime.displayName} installed successfully!`)
        return true
      } else {
        console.error(`[RuntimeManager] Installation verification failed.`)
        console.error(`[RuntimeManager] Expected: ${runtime.executable}`)
        console.error(`[RuntimeManager] In: ${runtime.installPath}`)
        throw new Error(`Installation verification failed. Could not find ${runtime.executable} in ${runtime.installPath}. Check console for details.`)
      }
    } catch (error) {
      runtime.isDownloading = false
      runtime.downloadProgress = 0
      console.error(`[RuntimeManager] Error installing ${language}:`, error)
      throw error
    }
  }

  /**
   * Uninstall a runtime
   */
  async uninstallRuntime(language: string): Promise<boolean> {
    const runtime = this.runtimes.get(language)
    if (!runtime) return false

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // Remove runtime directory
      await invoke('run_terminal_command', {
        command: `rmdir /s /q "${runtime.installPath}"`,
        workingDir: undefined
      })

      runtime.isInstalled = false
      return true
    } catch (error) {
      console.error(`[RuntimeManager] Error uninstalling ${language}:`, error)
      return false
    }
  }

  /**
   * Get executable path for a runtime
   */
  async getExecutablePath(language: string): Promise<string | null> {
    const runtime = this.runtimes.get(language)
    if (!runtime || !runtime.isInstalled) return null

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      // Try multiple possible paths
      const possiblePaths = [
        `${runtime.installPath}/${runtime.executable}`,
        `${runtime.installPath}/bin/${runtime.executable}`,
      ]
      
      for (const execPath of possiblePaths) {
        try {
          const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
            command: `if exist "${execPath}" (echo exists) else (echo not_found)`,
            workingDir: undefined
          })
          
          if (result.stdout.trim() === 'exists') {
            return execPath
          }
        } catch (err) {
          continue
        }
      }
      
      // Fallback: return default path
      return `${runtime.installPath}/${runtime.executable}`
    } catch (error) {
      return `${runtime.installPath}/${runtime.executable}`
    }
  }

  /**
   * Check system runtime (fallback)
   */
  async checkSystemRuntime(language: string): Promise<boolean> {
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      
      const commands: Record<string, string> = {
        python: 'python --version',
        nodejs: 'node --version',
        php: 'php --version',
        ruby: 'ruby --version',
        go: 'go version',
        rust: 'rustc --version',
        java: 'javac --version',
        gcc: 'gcc --version'
      }

      const command = commands[language]
      if (!command) return false

      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command,
        workingDir: undefined
      })

      return result.exit_code === 0
    } catch (error) {
      return false
    }
  }

  /**
   * Install a package for a specific runtime
   */
  async installPackage(
    language: string,
    packageName: string,
    onProgress?: (status: string) => void
  ): Promise<boolean> {
    const runtime = this.runtimes.get(language)
    if (!runtime || !runtime.isInstalled) {
      throw new Error(`Runtime ${language} is not installed`)
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const execPath = await this.getExecutablePath(language)
      
      if (!execPath) {
        throw new Error(`Could not find executable for ${language}`)
      }

      onProgress?.(`Installing ${packageName}...`)

      let installCommand = ''
      
      switch (language) {
        case 'python':
          // First ensure pip is available
          onProgress?.(`Setting up pip...`)
          try {
            await invoke('run_terminal_command', {
              command: `"${execPath}" -m ensurepip --default-pip`,
              workingDir: undefined
            })
          } catch (err) {
            console.log(`[RuntimeManager] Pip setup note:`, err)
          }
          
          installCommand = `"${execPath}" -m pip install ${packageName}`
          break
          
        case 'nodejs':
          // Use npm from the nodejs installation
          const npmPath = execPath.replace('node.exe', 'npm.cmd')
          installCommand = `"${npmPath}" install -g ${packageName}`
          break
          
        case 'php':
          // PHP uses composer for package management
          onProgress?.(`Note: PHP packages typically require Composer. Install Composer separately.`)
          throw new Error('PHP package management requires Composer to be installed separately')
          
        case 'ruby':
          // Use gem from the ruby installation
          const gemPath = execPath.replace('ruby.exe', 'gem.cmd')
          installCommand = `"${gemPath}" install ${packageName}`
          break
          
        case 'go':
          installCommand = `"${execPath}" install ${packageName}`
          break
          
        default:
          throw new Error(`Package management not supported for ${language}`)
      }

      console.log(`[RuntimeManager] Installing package: ${installCommand}`)
      
      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command: installCommand,
        workingDir: undefined
      })

      if (result.exit_code === 0) {
        onProgress?.(`✓ ${packageName} installed successfully!`)
        console.log(`[RuntimeManager] Package installed:`, result.stdout.substring(0, 200))
        return true
      } else {
        console.error(`[RuntimeManager] Package installation failed:`, result.stderr)
        throw new Error(`Failed to install ${packageName}: ${result.stderr}`)
      }
    } catch (error) {
      console.error(`[RuntimeManager] Error installing package:`, error)
      throw error
    }
  }

  /**
   * List installed packages for a runtime
   */
  async listPackages(language: string): Promise<string[]> {
    const runtime = this.runtimes.get(language)
    if (!runtime || !runtime.isInstalled) {
      return []
    }

    try {
      const { invoke } = await import('@tauri-apps/api/core')
      const execPath = await this.getExecutablePath(language)
      
      if (!execPath) {
        return []
      }

      let listCommand = ''
      
      switch (language) {
        case 'python':
          listCommand = `"${execPath}" -m pip list --format=freeze`
          break
          
        case 'nodejs':
          const npmPath = execPath.replace('node.exe', 'npm.cmd')
          listCommand = `"${npmPath}" list -g --depth=0`
          break
          
        case 'ruby':
          const gemPath = execPath.replace('ruby.exe', 'gem.cmd')
          listCommand = `"${gemPath}" list`
          break
          
        default:
          return []
      }

      const result = await invoke<{ stdout: string; stderr: string; exit_code: number }>('run_terminal_command', {
        command: listCommand,
        workingDir: undefined
      })

      if (result.exit_code === 0) {
        return result.stdout.split('\n').filter(line => line.trim())
      }
      
      return []
    } catch (error) {
      console.error(`[RuntimeManager] Error listing packages:`, error)
      return []
    }
  }
}

export const runtimeManager = RuntimeManager.getInstance()
