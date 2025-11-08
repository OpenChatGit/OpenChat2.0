// CUDA detection types

export interface CudaInfo {
  available: boolean
  gpuCount: number
  gpus: GpuInfo[]
  driverVersion?: string
  cudaVersion?: string
  error?: string
}

export interface GpuInfo {
  id: number
  name: string
  memory: number // in MB
  computeCapability?: string
}
