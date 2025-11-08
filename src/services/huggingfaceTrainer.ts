/**
 * Hugging Face Trainer API Service
 * Provides access to Hugging Face training capabilities
 */

import { getApiKey } from '../lib/secureStorage'

const HF_API_BASE = 'https://huggingface.co/api'
const AUTH_KEY = 'huggingface'

export interface TrainingJob {
  id: string
  status: 'pending' | 'running' | 'completed' | 'failed'
  model: string
  dataset: string
  progress?: number
  createdAt: string
  updatedAt: string
  error?: string
}

export interface TrainingConfig {
  model: string
  dataset: string
  outputDir?: string
  numEpochs?: number
  batchSize?: number
  learningRate?: number
  [key: string]: any
}

/**
 * Get authentication headers for HF API
 */
function getAuthHeaders(): HeadersInit {
  const token = getApiKey(AUTH_KEY)
  if (!token) {
    throw new Error('Not authenticated. Please login with your Hugging Face token.')
  }
  return {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
}

/**
 * List user's models on Hugging Face
 */
export async function listUserModels(): Promise<any[]> {
  try {
    const response = await fetch(`${HF_API_BASE}/models`, {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[HF Trainer] Failed to list models:', error)
    throw error
  }
}

/**
 * List available datasets on Hugging Face
 */
export async function listDatasets(search?: string): Promise<any[]> {
  try {
    const url = new URL(`${HF_API_BASE}/datasets`)
    if (search) {
      url.searchParams.set('search', search)
    }

    const response = await fetch(url.toString(), {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to fetch datasets: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[HF Trainer] Failed to list datasets:', error)
    throw error
  }
}

/**
 * Create a new training job
 * Note: This is a placeholder - actual HF training API may differ
 */
export async function createTrainingJob(config: TrainingConfig): Promise<TrainingJob> {
  try {
    console.log('[HF Trainer] Creating training job:', config)
    
    // This is a placeholder implementation
    // The actual Hugging Face training API endpoint may be different
    const response = await fetch(`${HF_API_BASE}/training/jobs`, {
      method: 'POST',
      headers: getAuthHeaders(),
      body: JSON.stringify(config)
    })

    if (!response.ok) {
      throw new Error(`Failed to create training job: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[HF Trainer] Failed to create training job:', error)
    throw error
  }
}

/**
 * Get training job status
 */
export async function getTrainingJobStatus(jobId: string): Promise<TrainingJob> {
  try {
    const response = await fetch(`${HF_API_BASE}/training/jobs/${jobId}`, {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to get job status: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[HF Trainer] Failed to get job status:', error)
    throw error
  }
}

/**
 * Cancel a training job
 */
export async function cancelTrainingJob(jobId: string): Promise<void> {
  try {
    const response = await fetch(`${HF_API_BASE}/training/jobs/${jobId}/cancel`, {
      method: 'POST',
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to cancel job: ${response.statusText}`)
    }
  } catch (error) {
    console.error('[HF Trainer] Failed to cancel job:', error)
    throw error
  }
}

/**
 * Upload a dataset to Hugging Face
 */
export async function uploadDataset(name: string, data: File): Promise<any> {
  try {
    const formData = new FormData()
    formData.append('file', data)
    formData.append('name', name)

    const token = getApiKey(AUTH_KEY)
    const response = await fetch(`${HF_API_BASE}/datasets/upload`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      },
      body: formData
    })

    if (!response.ok) {
      throw new Error(`Failed to upload dataset: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[HF Trainer] Failed to upload dataset:', error)
    throw error
  }
}

/**
 * Get user's training jobs
 */
export async function listTrainingJobs(): Promise<TrainingJob[]> {
  try {
    const response = await fetch(`${HF_API_BASE}/training/jobs`, {
      headers: getAuthHeaders()
    })

    if (!response.ok) {
      throw new Error(`Failed to list training jobs: ${response.statusText}`)
    }

    return await response.json()
  } catch (error) {
    console.error('[HF Trainer] Failed to list training jobs:', error)
    throw error
  }
}

/**
 * Check if user is authenticated
 */
export function isAuthenticated(): boolean {
  return !!getApiKey(AUTH_KEY)
}
