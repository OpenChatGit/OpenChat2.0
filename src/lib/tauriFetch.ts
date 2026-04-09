/**
 * Native fetch wrapper (formerly tauriFetch)
 * 
 * We have migrated from Tauri to a FastAPI backend.
 * This wrapper simply delegates to the standard browser fetch API.
 * For complex operations, they are delegated to our Python proxy endpoint.
 */

export async function tauriFetch(
  url: string,
  options: RequestInit = {}
): Promise<Response> {
  // Use standard browser fetch for all requests
  return fetch(url, options)
}

/**
 * Check if Tauri environment is available
 * Since we moved to FastAPI, this is always false.
 */
export function isTauriEnvironment(): boolean {
  return false
}
