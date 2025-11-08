import { useCuda } from '../hooks/useCuda'
import { cn } from '../lib/utils'
import { Cpu } from 'lucide-react'

export function CudaSettings() {
  const { cudaInfo, isLoading } = useCuda()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center gap-3">
          <svg className="w-8 h-8 animate-spin text-primary" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-sm text-muted-foreground">Detecting CUDA...</p>
        </div>
      </div>
    )
  }

  if (!cudaInfo) {
    return (
      <div className="p-6">
        <div className="text-center text-muted-foreground">
          Failed to detect CUDA
        </div>
      </div>
    )
  }

  const isCudaAvailable = cudaInfo.available && cudaInfo.gpuCount > 0

  return (
    <div className="p-6 space-y-6">
      {/* Status Card */}
      <div
        className={cn(
          "p-6 rounded-lg border-2",
          isCudaAvailable ? "border-green-500/50 bg-green-500/10" : "border-red-500/50 bg-red-500/10"
        )}
      >
        <div className="flex items-center gap-4">
          <div
            className={cn(
              "w-16 h-16 rounded-full flex items-center justify-center flex-shrink-0",
              isCudaAvailable ? "bg-green-500/20" : "bg-red-500/20"
            )}
          >
            <Cpu
              className={cn(
                "w-8 h-8",
                isCudaAvailable ? "text-green-400" : "text-red-400"
              )}
            />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className={cn(
              "text-2xl font-bold leading-tight",
              isCudaAvailable ? "text-green-400" : "text-red-400"
            )}>
              CUDA {isCudaAvailable ? 'Available' : 'Not Available'}
            </h3>
            <p className="text-sm text-muted-foreground mt-1.5">
              {isCudaAvailable
                ? `${cudaInfo.gpuCount} GPU${cudaInfo.gpuCount > 1 ? 's' : ''} detected`
                : cudaInfo.error || 'No NVIDIA GPUs with CUDA support found'}
            </p>
          </div>
        </div>
      </div>

      {/* Version Information */}
      {(cudaInfo.cudaVersion || cudaInfo.driverVersion) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {cudaInfo.cudaVersion && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">CUDA Version</h4>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="font-mono text-lg">{cudaInfo.cudaVersion}</p>
              </div>
            </div>
          )}
          {cudaInfo.driverVersion && (
            <div className="space-y-2">
              <h4 className="text-sm font-medium text-muted-foreground">Driver Version</h4>
              <div className="p-4 rounded-lg bg-muted/50 border border-border">
                <p className="font-mono text-lg">{cudaInfo.driverVersion}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* GPU List */}
      {isCudaAvailable && cudaInfo.gpus.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-sm font-medium text-muted-foreground">Detected GPUs</h4>
          <div className="space-y-3">
            {cudaInfo.gpus.map((gpu) => (
              <div
                key={gpu.id}
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-muted-foreground">GPU {gpu.id}</span>
                      <span className="text-lg font-semibold">{gpu.name}</span>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-muted-foreground">Memory:</span>
                        <span className="ml-2 font-medium">
                          {(gpu.memory / 1024).toFixed(2)} GB
                        </span>
                      </div>
                      {gpu.computeCapability && (
                        <div>
                          <span className="text-muted-foreground">Compute Capability:</span>
                          <span className="ml-2 font-medium">{gpu.computeCapability}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Info/Help Box */}
      {isCudaAvailable ? (
        <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/50">
          <div className="flex gap-3">
            <svg className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
            <div className="text-sm space-y-1">
              <p className="font-medium text-blue-400">About CUDA</p>
              <p className="text-muted-foreground">
                CUDA (Compute Unified Device Architecture) is NVIDIA's parallel computing platform. 
                Having CUDA-capable GPUs allows for accelerated AI model inference and training.
              </p>
            </div>
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Installation Guide */}
          <div className="p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/50">
            <div className="flex gap-3">
              <svg className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
              </svg>
              <div className="text-sm space-y-2 flex-1">
                <p className="font-medium text-yellow-400">CUDA Not Detected</p>
                <p className="text-muted-foreground">
                  To use GPU acceleration, you need to install NVIDIA drivers and CUDA Toolkit.
                </p>
              </div>
            </div>
          </div>

          {/* Download Options */}
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Installation Options</h4>
            
            <div className="grid gap-3">
              {/* NVIDIA Drivers */}
              <a
                href="https://www.nvidia.com/Download/index.aspx"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">NVIDIA Drivers</h5>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-primary/20 text-primary">Required</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Download and install the latest NVIDIA GPU drivers for your graphics card.
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>

              {/* CUDA Toolkit */}
              <a
                href="https://developer.nvidia.com/cuda-downloads"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">CUDA Toolkit</h5>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400">Recommended</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      Download CUDA Toolkit for GPU-accelerated computing. Latest version: 12.6
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>

              {/* cuDNN (Optional) */}
              <a
                href="https://developer.nvidia.com/cudnn"
                target="_blank"
                rel="noopener noreferrer"
                className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h5 className="font-medium">cuDNN</h5>
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">Optional</span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      NVIDIA Deep Learning library for optimized neural network performance.
                    </p>
                  </div>
                  <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </div>
              </a>
            </div>
          </div>

          {/* Installation Steps */}
          <div className="p-4 rounded-lg bg-muted/30 border border-border">
            <h4 className="text-sm font-medium mb-3">Installation Steps</h4>
            <ol className="space-y-2 text-sm text-muted-foreground">
              <li className="flex gap-2">
                <span className="font-medium text-foreground">1.</span>
                <span>Download and install NVIDIA drivers for your GPU</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">2.</span>
                <span>Download and install CUDA Toolkit (choose your OS and version)</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">3.</span>
                <span>Restart your computer</span>
              </li>
              <li className="flex gap-2">
                <span className="font-medium text-foreground">4.</span>
                <span>Restart this application to detect CUDA</span>
              </li>
            </ol>
          </div>
        </div>
      )}
    </div>
  )
}
