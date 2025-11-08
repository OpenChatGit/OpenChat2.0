/**
 * Hugging Face API Service
 * Handles authentication and user info retrieval
 */

export interface HuggingFaceUser {
  id: string
  name: string
  fullname: string
  email?: string
  avatarUrl: string
  isPro: boolean
}

const HF_API_BASE = 'https://huggingface.co/api'

/**
 * Validate a Hugging Face token and get user info
 */
export async function validateToken(token: string): Promise<HuggingFaceUser> {
  try {
    const response = await fetch(`${HF_API_BASE}/whoami-v2`, {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('Invalid token. Please check your token and try again.')
      }
      throw new Error(`Failed to validate token: ${response.statusText}`)
    }

    const data = await response.json()
    
    console.log('[HuggingFace] Raw API response:', JSON.stringify(data, null, 2))

    // Get avatar URL from API response
    let avatarUrl = data.avatarUrl || data.avatar_url || data.picture
    
    // HF API returns relative URLs, we need to make them absolute
    if (avatarUrl && avatarUrl.startsWith('/')) {
      avatarUrl = `https://huggingface.co${avatarUrl}`
    }
    
    console.log('[HuggingFace] Final avatar URL:', avatarUrl)

    return {
      id: data.id || data.name,
      name: data.name,
      fullname: data.fullname || data.name,
      email: data.email,
      avatarUrl,
      isPro: data.isPro || data.type === 'pro' || false
    }
  } catch (error) {
    if (error instanceof Error) {
      throw error
    }
    throw new Error('Failed to validate token')
  }
}

/**
 * Get user info from a token
 */
export async function getUserInfo(token: string): Promise<HuggingFaceUser> {
  return validateToken(token)
}
