/**
 * Backend API Client
 * Replaces Tauri's invoke and fs calls with standard REST calls to FastAPI.
 */

const BACKEND_URL = 'http://127.0.0.1:8000'

export async function invoke<T = any>(cmd: string, args: any = {}): Promise<T> {
  // Map Tauri commands to FastAPI endpoints
  let endpoint = ''
  let payload: any = {}
  
  if (cmd === 'proxy_http_request') {
    endpoint = '/api/proxy'
    payload = {
      url: args.url,
      method: args.method || 'GET',
      body: args.body || undefined,
      headers: args.headers || undefined
    }
    
    const response = await fetch(`${BACKEND_URL}${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    
    if (!response.ok) throw new Error(`HTTP Error: ${response.statusText}`)
    const data = await response.json()
    return data.text as any
  }
  
  if (cmd === 'check_cuda_available') {
    // Basic mock until implemented in FastAPI
    return true as any
  }

  throw new Error(`Command ${cmd} not implemented in FastAPI backend`)
}

// Minimal stub for fs operations
export const fs = {
  readTextFile: async (_path: string): Promise<string> => {
    return ''
  },
  writeTextFile: async (path: string, contents: string): Promise<void> => {
    console.log(`Writing to ${path}:`, contents)
  },
  exists: async (_path: string): Promise<boolean> => {
    return false
  }
}

// Minimal stub for window operations
export const Window = {
  getCurrent: () => ({
    close: () => window.close(),
    minimize: () => {},
    toggleMaximize: () => {},
    onResized: (_cb: any) => Promise.resolve(() => {}),
    show: () => {}
  })
}

// Minimal stub for app operations
export const app = {
  getVersion: async () => '0.6.0'
}

// Minimal stub for opener
export const opener = {
  open: async (url: string) => window.open(url, '_blank')
}

export const openUrl = async (url: string) => {
  window.open(url, '_blank');
}
