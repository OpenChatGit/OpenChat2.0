import { useCuda } from '../hooks/useCuda'
import { cn } from '../lib/utils'

export function CudaButton() {
  const { cudaInfo, isLoading } = useCuda()

  if (isLoading) {
    return (
      <button
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors text-muted-foreground"
        disabled
      >
        <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
        </svg>
        <span>Detecting CUDA...</span>
      </button>
    )
  }

  if (!cudaInfo) {
    return null
  }

  // Debug logging
  console.log('[CudaButton] CUDA Info:', {
    available: cudaInfo.available,
    gpuCount: cudaInfo.gpuCount,
    gpus: cudaInfo.gpus,
    error: cudaInfo.error
  })

  // Check if CUDA is truly available (has GPUs)
  const isCudaAvailable = cudaInfo.available && cudaInfo.gpuCount > 0

  const getStatusColor = () => {
    return isCudaAvailable ? 'text-green-400' : 'text-red-400'
  }

  const getStatusIcon = () => {
    if (isCudaAvailable) {
      return (
        <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/>
        </svg>
      )
    }
    return (
      <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
        <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12 19 6.41z"/>
      </svg>
    )
  }

  const getTooltipText = () => {
    if (isCudaAvailable) {
      const gpuList = cudaInfo.gpus.map(gpu => 
        `${gpu.name} (${Math.round(gpu.memory / 1024)}GB, Compute ${gpu.computeCapability || 'N/A'})`
      ).join('\n')
      return `CUDA Available\n${cudaInfo.gpuCount} GPU${cudaInfo.gpuCount > 1 ? 's' : ''} detected:\n${gpuList}${cudaInfo.cudaVersion ? `\nDriver: ${cudaInfo.cudaVersion}` : ''}`
    }
    return cudaInfo.error || 'CUDA not available - No NVIDIA GPUs detected'
  }

  return (
    <button
      className={cn(
        "w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors",
        "hover:bg-white/10",
        getStatusColor()
      )}
      title={getTooltipText()}
    >
      {getStatusIcon()}
      <span className="flex-1 text-left">
        CUDA {isCudaAvailable ? 'Available' : 'Unavailable'}
        {isCudaAvailable && (
          <span className="ml-1 opacity-70">
            ({cudaInfo.gpuCount} GPU{cudaInfo.gpuCount > 1 ? 's' : ''})
          </span>
        )}
      </span>
    </button>
  )
}
