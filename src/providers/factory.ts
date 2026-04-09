// Provider factory - creates provider instances based on type
import type { ProviderConfig, ProviderType } from '../types'
import { BaseProvider } from './base'
import { OllamaProvider } from './ollama'
import { HuggingFaceProvider } from './huggingface'

export class ProviderFactory {
  static createProvider(config: ProviderConfig): BaseProvider {
    switch (config.type) {
      case 'ollama':
        return new OllamaProvider(config)
      case 'huggingface':
        return new HuggingFaceProvider(config)
      default:
        throw new Error(`Unsupported provider type: ${config.type}`)
    }
  }

  static getDefaultConfig(type: ProviderType): ProviderConfig {
    const defaults: Record<ProviderType, ProviderConfig> = {
      ollama: {
        type: 'ollama',
        name: 'Ollama',
        baseUrl: 'http://localhost:11434',
        enabled: true,
      },
      huggingface: {
        type: 'huggingface',
        name: 'Hugging Face',
        baseUrl: 'https://api-inference.huggingface.co',
        enabled: true,
      },
    }

    return defaults[type]
  }
}
