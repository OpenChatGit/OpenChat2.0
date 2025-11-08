import { useAuth } from '../hooks/useAuth'
import { Play, Upload, Database, Cpu, AlertCircle } from 'lucide-react'

export function TrainerSettings() {
  const { isAuthenticated } = useAuth()

  if (!isAuthenticated) {
    return (
      <div className="p-6">
        <div className="flex flex-col items-center justify-center h-64 space-y-4">
          <AlertCircle className="w-12 h-12 text-yellow-400" />
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">Authentication Required</h3>
            <p className="text-sm text-muted-foreground max-w-md">
              Please login with your Hugging Face account to access training features.
            </p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="space-y-2">
        <h3 className="text-2xl font-bold">Hugging Face Trainer</h3>
        <p className="text-sm text-muted-foreground">
          Train and fine-tune models using Hugging Face infrastructure
        </p>
      </div>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <button
          className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
          onClick={() => {
            // TODO: Open new training dialog
            console.log('Start new training')
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0 group-hover:bg-primary/30 transition-colors">
              <Play className="w-5 h-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium mb-1">New Training</h4>
              <p className="text-xs text-muted-foreground">Start a new training job</p>
            </div>
          </div>
        </button>

        <button
          className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
          onClick={() => {
            // TODO: Open dataset upload
            console.log('Upload dataset')
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-blue-500/30 transition-colors">
              <Upload className="w-5 h-5 text-blue-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium mb-1">Upload Dataset</h4>
              <p className="text-xs text-muted-foreground">Upload training data</p>
            </div>
          </div>
        </button>

        <button
          className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors text-left group"
          onClick={() => {
            // TODO: Browse models
            console.log('Browse models')
          }}
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center flex-shrink-0 group-hover:bg-green-500/30 transition-colors">
              <Database className="w-5 h-5 text-green-400" />
            </div>
            <div className="flex-1 min-w-0">
              <h4 className="font-medium mb-1">Browse Models</h4>
              <p className="text-xs text-muted-foreground">View available models</p>
            </div>
          </div>
        </button>
      </div>

      {/* API Access Info */}
      <div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/50">
        <div className="flex gap-3">
          <Cpu className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm space-y-2 flex-1">
            <p className="font-medium text-blue-400">Trainer API Access</p>
            <p className="text-muted-foreground">
              The Hugging Face Trainer API is now available. You can use it to:
            </p>
            <ul className="list-disc list-inside space-y-1 text-muted-foreground ml-2">
              <li>Train and fine-tune models on HF infrastructure</li>
              <li>Upload and manage datasets</li>
              <li>Monitor training progress in real-time</li>
              <li>Deploy trained models automatically</li>
            </ul>
          </div>
        </div>
      </div>

      {/* API Documentation */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">API Documentation</h4>
        <div className="grid gap-3">
          <a
            href="https://huggingface.co/docs/hub/spaces-sdks-docker"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h5 className="font-medium mb-1">Training Documentation</h5>
                <p className="text-sm text-muted-foreground">
                  Learn how to train models on Hugging Face infrastructure
                </p>
              </div>
              <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>

          <a
            href="https://huggingface.co/docs/transformers/main_classes/trainer"
            target="_blank"
            rel="noopener noreferrer"
            className="p-4 rounded-lg border border-border bg-muted/30 hover:bg-muted/50 transition-colors group"
          >
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <h5 className="font-medium mb-1">Trainer API Reference</h5>
                <p className="text-sm text-muted-foreground">
                  Complete API reference for the Trainer class
                </p>
              </div>
              <svg className="w-5 h-5 text-muted-foreground group-hover:text-foreground transition-colors flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </div>
          </a>
        </div>
      </div>

      {/* Code Example */}
      <div className="space-y-3">
        <h4 className="text-sm font-medium">Example Usage</h4>
        <div className="p-4 rounded-lg bg-muted/50 border border-border">
          <pre className="text-xs font-mono overflow-x-auto">
            <code>{`import * as TrainerAPI from './services/huggingfaceTrainer'

// List available models
const models = await TrainerAPI.listUserModels()

// Create a training job
const job = await TrainerAPI.createTrainingJob({
  model: 'bert-base-uncased',
  dataset: 'my-dataset',
  numEpochs: 3,
  batchSize: 16,
  learningRate: 2e-5
})

// Monitor training progress
const status = await TrainerAPI.getTrainingJobStatus(job.id)`}</code>
          </pre>
        </div>
      </div>
    </div>
  )
}
