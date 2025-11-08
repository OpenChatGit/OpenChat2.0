import { useState, useEffect } from 'react'
import { invoke } from '@tauri-apps/api/core'
import type { CudaInfo } from '../types/cuda'

export function useCuda() {
  const [cudaInfo, setCudaInfo] = useState<CudaInfo | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const detectCuda = async () => {
      try {
        const info = await invoke<CudaInfo>('detect_cuda')
        console.log('[useCuda] Received CUDA info from backend:', info)
        console.log('[useCuda] GPU Count:', info.gpuCount)
        console.log('[useCuda] Available:', info.available)
        console.log('[useCuda] GPUs:', info.gpus)
        setCudaInfo(info)
      } catch (error) {
        console.error('[useCuda] Failed to detect CUDA:', error)
        setCudaInfo({
          available: false,
          gpuCount: 0,
          gpus: [],
          error: error instanceof Error ? error.message : 'Unknown error'
        })
      } finally {
        setIsLoading(false)
      }
    }

    detectCuda()
  }, [])

  return { cudaInfo, isLoading }
}
