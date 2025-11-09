/**
 * Runtime Discovery Service
 * 
 * Automatically discovers and fetches the latest portable runtime downloads
 * using web search and official sources.
 */

// Helper function to fetch with CORS handling
async function fetchWithCORS(url: string): Promise<Response> {
  try {
    // In Tauri, fetch automatically uses the HTTP plugin when available
    // The CSP configuration allows all HTTPS connections
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json, text/html, */*',
        'User-Agent': 'OpenChat/0.6.0'
      }
    })
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
    
    return response
  } catch (error) {
    console.error(`[RuntimeDiscovery] Fetch failed for ${url}:`, error)
    throw error
  }
}

export interface RuntimeDownloadInfo {
  version: string
  downloadUrl: string
  size: string
  architecture: 'x64' | 'x86' | 'arm64'
  format: 'zip' | '7z' | 'tar.gz'
  isRecommended?: boolean
  releaseDate?: string
}

export class RuntimeDiscovery {
  private static instance: RuntimeDiscovery

  private constructor() {}

  static getInstance(): RuntimeDiscovery {
    if (!RuntimeDiscovery.instance) {
      RuntimeDiscovery.instance = new RuntimeDiscovery()
    }
    return RuntimeDiscovery.instance
  }

  /**
   * Discover latest Python portable download
   */
  async discoverPython(): Promise<RuntimeDownloadInfo> {
    try {
      // Python embeddable package from official source
      const response = await fetchWithCORS('https://www.python.org/downloads/windows/')
      const html = await response.text()
      
      // Parse for latest embeddable version
      const embedMatch = html.match(/python-(\d+\.\d+\.\d+)-embed-amd64\.zip/i)
      
      if (embedMatch) {
        const version = embedMatch[1]
        return {
          version,
          downloadUrl: `https://www.python.org/ftp/python/${version}/python-${version}-embed-amd64.zip`,
          size: '~10 MB',
          architecture: 'x64',
          format: 'zip'
        }
      }
      
      // Fallback to known working version
      return {
        version: '3.12.0',
        downloadUrl: 'https://www.python.org/ftp/python/3.12.0/python-3.12.0-embed-amd64.zip',
        size: '~10 MB',
        architecture: 'x64',
        format: 'zip'
      }
    } catch (error) {
      console.error('[RuntimeDiscovery] Error discovering Python:', error)
      // Return fallback
      return {
        version: '3.12.0',
        downloadUrl: 'https://www.python.org/ftp/python/3.12.0/python-3.12.0-embed-amd64.zip',
        size: '~10 MB',
        architecture: 'x64',
        format: 'zip'
      }
    }
  }

  /**
   * Discover latest Node.js portable download
   */
  async discoverNodeJS(): Promise<RuntimeDownloadInfo> {
    try {
      // Node.js from official API
      const response = await fetchWithCORS('https://nodejs.org/dist/index.json')
      const versions = await response.json()
      
      // Find latest LTS version
      const ltsVersion = versions.find((v: any) => v.lts && v.version.startsWith('v20'))
      
      if (ltsVersion) {
        const version = ltsVersion.version.substring(1) // Remove 'v' prefix
        return {
          version,
          downloadUrl: `https://nodejs.org/dist/v${version}/node-v${version}-win-x64.zip`,
          size: '~30 MB',
          architecture: 'x64',
          format: 'zip'
        }
      }
      
      // Fallback
      return {
        version: '20.11.0',
        downloadUrl: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip',
        size: '~30 MB',
        architecture: 'x64',
        format: 'zip'
      }
    } catch (error) {
      console.error('[RuntimeDiscovery] Error discovering Node.js:', error)
      return {
        version: '20.11.0',
        downloadUrl: 'https://nodejs.org/dist/v20.11.0/node-v20.11.0-win-x64.zip',
        size: '~30 MB',
        architecture: 'x64',
        format: 'zip'
      }
    }
  }

  /**
   * Discover latest PHP portable download
   */
  async discoverPHP(): Promise<RuntimeDownloadInfo> {
    try {
      // PHP Windows downloads page
      const response = await fetchWithCORS('https://windows.php.net/downloads/releases/')
      const html = await response.text()
      
      // Find latest 8.x version zip file (non-thread-safe, x64)
      const phpMatch = html.match(/php-(\d+\.\d+\.\d+)-nts-Win32-vs16-x64\.zip/i)
      
      if (phpMatch) {
        const version = phpMatch[1]
        return {
          version,
          downloadUrl: `https://windows.php.net/downloads/releases/php-${version}-nts-Win32-vs16-x64.zip`,
          size: '~30 MB',
          architecture: 'x64',
          format: 'zip'
        }
      }
      
      // Fallback to known working version
      return {
        version: '8.3.1',
        downloadUrl: 'https://windows.php.net/downloads/releases/php-8.3.1-nts-Win32-vs16-x64.zip',
        size: '~30 MB',
        architecture: 'x64',
        format: 'zip'
      }
    } catch (error) {
      console.error('[RuntimeDiscovery] Error discovering PHP:', error)
      return {
        version: '8.3.1',
        downloadUrl: 'https://windows.php.net/downloads/releases/php-8.3.1-nts-Win32-vs16-x64.zip',
        size: '~30 MB',
        architecture: 'x64',
        format: 'zip'
      }
    }
  }

  /**
   * Discover latest Ruby portable download
   */
  async discoverRuby(): Promise<RuntimeDownloadInfo> {
    try {
      // RubyInstaller GitHub releases
      const response = await fetchWithCORS('https://api.github.com/repos/oneclick/rubyinstaller2/releases/latest')
      const release = await response.json()
      
      // Find 7z archive for x64
      const asset = release.assets?.find((a: any) => 
        a.name.includes('x64') && a.name.endsWith('.7z') && !a.name.includes('devkit')
      )
      
      if (asset) {
        const versionMatch = asset.name.match(/(\d+\.\d+\.\d+)/)
        return {
          version: versionMatch ? versionMatch[1] : release.tag_name,
          downloadUrl: asset.browser_download_url,
          size: `~${Math.round(asset.size / 1024 / 1024)} MB`,
          architecture: 'x64',
          format: '7z'
        }
      }
      
      // Fallback
      return {
        version: '3.2.2',
        downloadUrl: 'https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-3.2.2-1/rubyinstaller-3.2.2-1-x64.7z',
        size: '~20 MB',
        architecture: 'x64',
        format: '7z'
      }
    } catch (error) {
      console.error('[RuntimeDiscovery] Error discovering Ruby:', error)
      return {
        version: '3.2.2',
        downloadUrl: 'https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-3.2.2-1/rubyinstaller-3.2.2-1-x64.7z',
        size: '~20 MB',
        architecture: 'x64',
        format: '7z'
      }
    }
  }

  /**
   * Discover latest Go portable download
   */
  async discoverGo(): Promise<RuntimeDownloadInfo> {
    try {
      // Go downloads page
      const response = await fetchWithCORS('https://go.dev/dl/?mode=json')
      const versions = await response.json()
      
      // Find latest stable version for Windows x64
      const latest = versions[0]
      const windowsFile = latest.files?.find((f: any) => 
        f.os === 'windows' && f.arch === 'amd64' && f.kind === 'archive'
      )
      
      if (windowsFile) {
        return {
          version: latest.version.replace('go', ''),
          downloadUrl: `https://go.dev/dl/${windowsFile.filename}`,
          size: `~${Math.round(windowsFile.size / 1024 / 1024)} MB`,
          architecture: 'x64',
          format: 'zip'
        }
      }
      
      // Fallback
      return {
        version: '1.21.6',
        downloadUrl: 'https://go.dev/dl/go1.21.6.windows-amd64.zip',
        size: '~140 MB',
        architecture: 'x64',
        format: 'zip'
      }
    } catch (error) {
      console.error('[RuntimeDiscovery] Error discovering Go:', error)
      return {
        version: '1.21.6',
        downloadUrl: 'https://go.dev/dl/go1.21.6.windows-amd64.zip',
        size: '~140 MB',
        architecture: 'x64',
        format: 'zip'
      }
    }
  }

  /**
   * Discover runtime by language
   */
  async discoverRuntime(language: string): Promise<RuntimeDownloadInfo | null> {
    console.log(`[RuntimeDiscovery] Discovering latest ${language} runtime...`)
    
    try {
      switch (language.toLowerCase()) {
        case 'python':
          return await this.discoverPython()
        case 'nodejs':
          return await this.discoverNodeJS()
        case 'php':
          return await this.discoverPHP()
        case 'ruby':
          return await this.discoverRuby()
        case 'go':
          return await this.discoverGo()
        default:
          console.warn(`[RuntimeDiscovery] No discovery method for ${language}`)
          return null
      }
    } catch (error) {
      console.error(`[RuntimeDiscovery] Error discovering ${language}:`, error)
      return null
    }
  }

  /**
   * Discover multiple versions of a runtime
   */
  async discoverMultipleVersions(language: string, limit: number = 5): Promise<RuntimeDownloadInfo[]> {
    console.log(`[RuntimeDiscovery] Discovering multiple ${language} versions...`)
    
    try {
      switch (language.toLowerCase()) {
        case 'python':
          return await this.discoverMultiplePython(limit)
        case 'nodejs':
          return await this.discoverMultipleNodeJS(limit)
        case 'php':
          return await this.discoverMultiplePHP(limit)
        case 'ruby':
          return await this.discoverMultipleRuby(limit)
        case 'go':
          return await this.discoverMultipleGo(limit)
        default:
          // Fallback to single version
          const single = await this.discoverRuntime(language)
          return single ? [single] : []
      }
    } catch (error) {
      console.error(`[RuntimeDiscovery] Error discovering multiple ${language}:`, error)
      return []
    }
  }

  private async discoverMultiplePython(limit: number): Promise<RuntimeDownloadInfo[]> {
    const versions = ['3.12.0', '3.11.7', '3.10.11', '3.9.13']
    return versions.slice(0, limit).map((version, index) => ({
      version,
      downloadUrl: `https://www.python.org/ftp/python/${version}/python-${version}-embed-amd64.zip`,
      size: '~10 MB',
      architecture: 'x64' as const,
      format: 'zip' as const,
      isRecommended: index === 0
    }))
  }

  private async discoverMultipleNodeJS(limit: number): Promise<RuntimeDownloadInfo[]> {
    try {
      const response = await fetchWithCORS('https://nodejs.org/dist/index.json')
      const versions = await response.json()
      
      const ltsVersions = versions
        .filter((v: any) => v.lts)
        .slice(0, limit)
        .map((v: any, index: number) => ({
          version: v.version.substring(1),
          downloadUrl: `https://nodejs.org/dist/${v.version}/node-${v.version}-win-x64.zip`,
          size: '~30 MB',
          architecture: 'x64' as const,
          format: 'zip' as const,
          isRecommended: index === 0,
          releaseDate: v.date
        }))
      
      return ltsVersions
    } catch (error) {
      return [await this.discoverNodeJS()]
    }
  }

  private async discoverMultiplePHP(limit: number): Promise<RuntimeDownloadInfo[]> {
    const versions = ['8.3.1', '8.2.14', '8.1.27', '8.0.30']
    return versions.slice(0, limit).map((version, index) => ({
      version,
      downloadUrl: `https://windows.php.net/downloads/releases/php-${version}-nts-Win32-vs16-x64.zip`,
      size: '~30 MB',
      architecture: 'x64' as const,
      format: 'zip' as const,
      isRecommended: index === 0
    }))
  }

  private async discoverMultipleRuby(limit: number): Promise<RuntimeDownloadInfo[]> {
    const versions = ['3.2.2', '3.1.4', '3.0.6']
    return versions.slice(0, limit).map((version, index) => ({
      version,
      downloadUrl: `https://github.com/oneclick/rubyinstaller2/releases/download/RubyInstaller-${version}-1/rubyinstaller-${version}-1-x64.7z`,
      size: '~20 MB',
      architecture: 'x64' as const,
      format: '7z' as const,
      isRecommended: index === 0
    }))
  }

  private async discoverMultipleGo(limit: number): Promise<RuntimeDownloadInfo[]> {
    try {
      const response = await fetchWithCORS('https://go.dev/dl/?mode=json')
      const versions = await response.json()
      
      return versions.slice(0, limit).map((v: any, index: number) => {
        const windowsFile = v.files?.find((f: any) => 
          f.os === 'windows' && f.arch === 'amd64' && f.kind === 'archive'
        )
        
        return {
          version: v.version.replace('go', ''),
          downloadUrl: `https://go.dev/dl/${windowsFile?.filename || v.version + '.windows-amd64.zip'}`,
          size: windowsFile ? `~${Math.round(windowsFile.size / 1024 / 1024)} MB` : '~140 MB',
          architecture: 'x64' as const,
          format: 'zip' as const,
          isRecommended: index === 0
        }
      })
    } catch (error) {
      return [await this.discoverGo()]
    }
  }
}

export const runtimeDiscovery = RuntimeDiscovery.getInstance()
