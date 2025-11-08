// Provider factory - creates provider instances based on type
import type { ProviderConfig, ProviderType } from '../types'
import { BaseProvider } from './base'
import { OllamaProvider } from './ollama'
import { LMStudioProvider } from './lmstudio'

export class ProviderFactory {
  static createProvider(config: ProviderConfig): BaseProvider {
    switch (config.type) {
      case 'ollama':
        return new OllamaProvider(config)
      case 'lmstudio':
        return new LMStudioProvider(config)
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
      lmstudio: {
        type: 'lmstudio',
        name: 'LM Studio',
        baseUrl: 'http://localhost:1234',
        enabled: true,
      },
    }

    return defaults[type]
  }
}
