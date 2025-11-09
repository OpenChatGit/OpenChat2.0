/**
 * Smart Runtime Discovery
 * 
 * Uses DuckDuckGo search to intelligently find download links
 * based on user context, code, and requirements.
 */

import { FreeSearchProvider } from '../web-search/providers/FreeSearchProvider'
import type { SearchResult } from '../web-search/providers/types'

export interface SmartDownloadLink {
  title: string
  url: string
  description: string
  relevance: 'high' | 'medium' | 'low'
  source: string
}

export class SmartRuntimeDiscovery {
  private searchProvider: FreeSearchProvider

  constructor() {
    this.searchProvider = new FreeSearchProvider()
  }

  /**
   * Find download links based on runtime, user message, and code context
   */
  async findDownloadLinks(
    language: string,
    userMessage?: string,
    code?: string
  ): Promise<SmartDownloadLink[]> {
    console.log(`[SmartRuntimeDiscovery] Finding downloads for ${language}`)
    console.log(`[SmartRuntimeDiscovery] User message:`, userMessage?.substring(0, 100))
    console.log(`[SmartRuntimeDiscovery] Code:`, code?.substring(0, 100))

    // Build intelligent search query
    const searchQuery = this.buildSearchQuery(language, userMessage, code)
    console.log(`[SmartRuntimeDiscovery] Search query: ${searchQuery}`)

    try {
      // Search with DuckDuckGo
      const results = await this.searchProvider.search(searchQuery, {
        maxResults: 8
      })

      // Filter and rank results
      const links = this.processResults(results, language)
      
      console.log(`[SmartRuntimeDiscovery] Found ${links.length} relevant links`)
      
      // If no results from search, use defaults
      if (links.length === 0) {
        console.log(`[SmartRuntimeDiscovery] No results from search, using defaults`)
        return this.getDefaultLinks(language)
      }
      
      return links

    } catch (error) {
      console.error(`[SmartRuntimeDiscovery] Search failed:`, error)
      
      // Fallback to default links
      console.log(`[SmartRuntimeDiscovery] Using fallback default links`)
      return this.getDefaultLinks(language)
    }
  }

  /**
   * Build intelligent search query based on context
   */
  private buildSearchQuery(
    language: string,
    userMessage?: string,
    code?: string
  ): string {
    const languageNames: Record<string, string> = {
      python: 'Python',
      nodejs: 'Node.js',
      php: 'PHP',
      ruby: 'Ruby',
      go: 'Go',
      rust: 'Rust',
      java: 'Java'
    }

    const langName = languageNames[language] || language

    // Detect if user needs specific packages
    const needsPackages = this.detectPackageNeeds(code, userMessage)
    
    if (needsPackages.length > 0) {
      // Search for package installation
      return `${langName} install ${needsPackages[0]} download official`
    }

    // Detect Windows-specific needs
    const isWindows = true // We're on Windows
    
    if (isWindows) {
      return `${langName} download Windows installer official latest`
    }

    // Default: official download
    return `${langName} official download latest version`
  }

  /**
   * Detect package needs from code and message
   */
  private detectPackageNeeds(code?: string, message?: string): string[] {
    const packages: string[] = []
    const text = `${code || ''} ${message || ''}`.toLowerCase()

    // Common package patterns
    const patterns: Record<string, RegExp[]> = {
      numpy: [/import numpy/, /import np/, /\bnumpy\b/],
      pandas: [/import pandas/, /\bpandas\b/],
      requests: [/import requests/, /\brequests\b/],
      flask: [/from flask/, /import flask/, /\bflask\b/],
      django: [/import django/, /\bdjango\b/],
      express: [/require.*express/, /import.*express/, /\bexpress\b/],
      react: [/import.*react/, /\breact\b/],
      composer: [/composer/, /\bcomposer\b/],
      laravel: [/laravel/, /\blaravel\b/],
      symfony: [/symfony/, /\bsymfony\b/]
    }

    for (const [pkg, regexes] of Object.entries(patterns)) {
      if (regexes.some(regex => regex.test(text))) {
        packages.push(pkg)
      }
    }

    return packages
  }

  /**
   * Process and rank search results
   */
  private processResults(
    results: SearchResult[],
    language: string
  ): SmartDownloadLink[] {
    const links: SmartDownloadLink[] = []

    // Official domains for each language
    const officialDomains: Record<string, string[]> = {
      python: ['python.org', 'pypi.org'],
      nodejs: ['nodejs.org', 'npmjs.com'],
      php: ['php.net', 'windows.php.net'],
      ruby: ['ruby-lang.org', 'rubyinstaller.org'],
      go: ['go.dev', 'golang.org'],
      rust: ['rust-lang.org'],
      java: ['oracle.com', 'openjdk.org', 'adoptium.net']
    }

    const official = officialDomains[language] || []

    for (const result of results) {
      try {
        const url = new URL(result.url)
        const domain = url.hostname.replace('www.', '')

        // Determine relevance
        let relevance: 'high' | 'medium' | 'low' = 'low'

        // High relevance: official domains
        if (official.some(d => domain.includes(d))) {
          relevance = 'high'
        }
        // Medium relevance: known download sites
        else if (
          domain.includes('github.com') ||
          domain.includes('sourceforge.net') ||
          domain.includes('download')
        ) {
          relevance = 'medium'
        }

        // Filter out irrelevant results
        const title = result.title.toLowerCase()
        const snippet = result.snippet.toLowerCase()
        
        if (
          title.includes('download') ||
          title.includes('install') ||
          title.includes('get started') ||
          snippet.includes('download') ||
          snippet.includes('install')
        ) {
          links.push({
            title: result.title,
            url: result.url,
            description: result.snippet || 'Official download page',
            relevance,
            source: domain
          })
        }

      } catch (error) {
        console.warn(`[SmartRuntimeDiscovery] Invalid URL:`, result.url)
      }
    }

    // Sort by relevance
    return links.sort((a, b) => {
      const relevanceOrder = { high: 0, medium: 1, low: 2 }
      return relevanceOrder[a.relevance] - relevanceOrder[b.relevance]
    })
  }

  /**
   * Get default fallback links
   */
  private getDefaultLinks(language: string): SmartDownloadLink[] {
    const defaults: Record<string, SmartDownloadLink[]> = {
      python: [
        {
          title: 'Download Python | Python.org',
          url: 'https://www.python.org/downloads/',
          description: 'Official Python downloads for Windows, macOS, and Linux',
          relevance: 'high',
          source: 'python.org'
        },
        {
          title: 'Python Releases for Windows',
          url: 'https://www.python.org/downloads/windows/',
          description: 'Python releases specifically for Windows',
          relevance: 'high',
          source: 'python.org'
        }
      ],
      nodejs: [
        {
          title: 'Download Node.js',
          url: 'https://nodejs.org/en/download/',
          description: 'Official Node.js downloads with LTS and Current versions',
          relevance: 'high',
          source: 'nodejs.org'
        },
        {
          title: 'Node.js Installer',
          url: 'https://nodejs.org/en/download/prebuilt-installer',
          description: 'Prebuilt Node.js installer for Windows',
          relevance: 'high',
          source: 'nodejs.org'
        }
      ],
      php: [
        {
          title: 'PHP For Windows',
          url: 'https://windows.php.net/download/',
          description: 'Official PHP downloads for Windows',
          relevance: 'high',
          source: 'windows.php.net'
        },
        {
          title: 'PHP Downloads',
          url: 'https://www.php.net/downloads',
          description: 'Official PHP downloads page',
          relevance: 'high',
          source: 'php.net'
        }
      ],
      ruby: [
        {
          title: 'RubyInstaller for Windows',
          url: 'https://rubyinstaller.org/',
          description: 'The easy way to install Ruby on Windows',
          relevance: 'high',
          source: 'rubyinstaller.org'
        },
        {
          title: 'RubyInstaller Downloads',
          url: 'https://rubyinstaller.org/downloads/',
          description: 'Download Ruby installers for Windows',
          relevance: 'high',
          source: 'rubyinstaller.org'
        }
      ],
      go: [
        {
          title: 'Download and install - The Go Programming Language',
          url: 'https://go.dev/doc/install',
          description: 'Official Go installation guide',
          relevance: 'high',
          source: 'go.dev'
        },
        {
          title: 'All releases - The Go Programming Language',
          url: 'https://go.dev/dl/',
          description: 'Download Go for Windows, macOS, and Linux',
          relevance: 'high',
          source: 'go.dev'
        }
      ],
      rust: [
        {
          title: 'Install Rust',
          url: 'https://www.rust-lang.org/tools/install',
          description: 'Official Rust installation guide',
          relevance: 'high',
          source: 'rust-lang.org'
        }
      ],
      java: [
        {
          title: 'Java Downloads | Oracle',
          url: 'https://www.oracle.com/java/technologies/downloads/',
          description: 'Download Java JDK from Oracle',
          relevance: 'high',
          source: 'oracle.com'
        },
        {
          title: 'Adoptium - Eclipse Temurin',
          url: 'https://adoptium.net/',
          description: 'Free, open-source Java runtime',
          relevance: 'high',
          source: 'adoptium.net'
        }
      ]
    }

    return defaults[language] || [
      {
        title: `Search for ${language} download`,
        url: `https://www.google.com/search?q=${language}+download+install+windows`,
        description: `Search Google for ${language} installation instructions`,
        relevance: 'medium',
        source: 'google.com'
      }
    ]
  }
}

export const smartRuntimeDiscovery = new SmartRuntimeDiscovery()
