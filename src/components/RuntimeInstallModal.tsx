/**
 * Runtime Install Modal
 * 
 * Modal for installing portable programming language runtimes
 */

import { useState, useEffect } from 'react'
import { X, AlertCircle, Loader2, ExternalLink } from 'lucide-react'
import { runtimeManager } from '../lib/runtimes/RuntimeManager'
import { smartRuntimeDiscovery, type SmartDownloadLink } from '../lib/runtimes/SmartRuntimeDiscovery'

interface RuntimeInstallModalProps {
  language: string
  onClose: () => void
  onInstalled: () => void
  userMessage?: string
  code?: string
}

export function RuntimeInstallModal({ language, onClose, userMessage, code }: RuntimeInstallModalProps) {
  const [smartLinks, setSmartLinks] = useState<SmartDownloadLink[]>([])
  const [isLoadingSmartLinks, setIsLoadingSmartLinks] = useState(true)

  const runtime = runtimeManager.getRuntimeInfo(language)

  useEffect(() => {
    loadSmartLinks()
  }, [language, userMessage, code])

  const getOfficialWebsite = (lang: string): string => {
    const websites: Record<string, string> = {
      python: 'https://www.python.org/downloads/',
      nodejs: 'https://nodejs.org/en/download/',
      php: 'https://www.php.net/downloads',
      ruby: 'https://rubyinstaller.org/',
      go: 'https://go.dev/dl/',
      rust: 'https://www.rust-lang.org/tools/install',
      java: 'https://www.oracle.com/java/technologies/downloads/',
    }
    return websites[lang] || `https://www.google.com/search?q=${lang}+download`
  }

  const loadSmartLinks = async () => {
    setIsLoadingSmartLinks(true)
    try {
      const links = await smartRuntimeDiscovery.findDownloadLinks(
        language,
        userMessage,
        code
      )
      setSmartLinks(links)
    } catch (err) {
      console.error('Failed to load smart links:', err)
    } finally {
      setIsLoadingSmartLinks(false)
    }
  }

  const handleOpenLink = async (url: string, e: React.MouseEvent) => {
    e.preventDefault()
    
    // Try window.open first (works in both dev and production)
    try {
      const opened = window.open(url, '_blank', 'noopener,noreferrer')
      if (opened) {
        console.log(`[RuntimeInstallModal] Opened URL with window.open: ${url}`)
        return
      }
    } catch (error) {
      console.warn(`[RuntimeInstallModal] window.open failed:`, error)
    }
    
    // Fallback: Try Tauri shell plugin
    try {
      const { invoke } = await import('@tauri-apps/api/core')
      await invoke('plugin:shell|open', { path: url })
      console.log(`[RuntimeInstallModal] Opened URL with Tauri shell: ${url}`)
    } catch (error) {
      console.error(`[RuntimeInstallModal] All methods failed to open URL:`, error)
      // Last resort: create a temporary link and click it
      const link = document.createElement('a')
      link.href = url
      link.target = '_blank'
      link.rel = 'noopener noreferrer'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    }
  }

  if (!runtime) {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div 
        className="relative w-full max-w-md rounded-lg shadow-xl border"
        style={{
          backgroundColor: 'var(--color-sidebar)',
          borderColor: 'var(--color-dropdown-border)'
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b" style={{ borderColor: 'var(--color-dropdown-border)' }}>
          <h2 className="text-lg font-semibold">Install {runtime.displayName}</h2>
          <button
            onClick={onClose}
            className="p-1 rounded-lg hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="px-6 py-4 space-y-4">
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {runtime.displayName} is required to run this code. Please install it manually to continue.
            </p>

                {/* Installation Instructions */}
                <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 space-y-3 text-sm">
                  <div className="flex items-start gap-2">
                    <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                    <div className="space-y-2 flex-1">
                      <p className="font-medium text-blue-400">Installation Instructions</p>
                      <ol className="text-xs text-muted-foreground space-y-2 list-decimal list-inside">
                        <li>Click on one of the download links below</li>
                        <li>Download and install {runtime.displayName} on your system</li>
                        <li>Restart OpenChat after installation</li>
                        <li>Try running your code again</li>
                      </ol>
                    </div>
                  </div>
                </div>

                {/* Smart Download Links from Web Search */}
                {isLoadingSmartLinks ? (
                  <div className="p-4 rounded-lg bg-muted/20 border" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">Searching for best download links...</span>
                    </div>
                  </div>
                ) : smartLinks.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      <AlertCircle className="w-4 h-4 text-blue-400" />
                      <label className="text-sm font-medium text-blue-400">Recommended by Web Search:</label>
                    </div>
                    <div className="space-y-1">
                      {smartLinks.slice(0, 3).map((link, index) => (
                        <button
                          key={index}
                          onClick={(e) => handleOpenLink(link.url, e)}
                          className={`w-full flex items-start gap-2 p-3 rounded-lg transition-colors border text-left ${
                            link.relevance === 'high'
                              ? 'bg-green-500/10 border-green-500/30 hover:bg-green-500/20'
                              : 'bg-muted/20 border-transparent hover:bg-muted/30'
                          }`}
                        >
                          <ExternalLink className={`w-4 h-4 flex-shrink-0 mt-0.5 ${
                            link.relevance === 'high' ? 'text-green-400' : 'text-muted-foreground'
                          }`} />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-sm truncate">{link.title}</span>
                              {link.relevance === 'high' && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-green-500/20 text-green-400 border border-green-500/30 flex-shrink-0">
                                  Official
                                </span>
                              )}
                            </div>
                            <p className="text-xs text-muted-foreground line-clamp-2 mt-1">{link.description}</p>
                            <span className="text-xs text-muted-foreground/70 mt-1 block">{link.source}</span>
                          </div>
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* Official Website Link */}
                <div className="pt-2 border-t" style={{ borderColor: 'var(--color-dropdown-border)' }}>
                  <button
                    onClick={(e) => handleOpenLink(getOfficialWebsite(language), e)}
                    className="text-xs text-muted-foreground hover:text-foreground transition-colors flex items-center gap-1"
                  >
                    <span>Visit official {runtime.displayName} website</span>
                    <span>→</span>
                  </button>
                </div>
              </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2 px-6 py-4 border-t" style={{ borderColor: 'var(--color-dropdown-border)' }}>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-lg bg-primary text-primary-foreground hover:opacity-90 transition-opacity"
          >
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}
