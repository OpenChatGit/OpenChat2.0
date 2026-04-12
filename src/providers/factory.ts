import type { ProviderConfig, ProviderType } from '../types'
import { BaseProvider } from './base'
import { OllamaProvider } from './ollama'
import { SupabasePremiumProvider } from './supabase-premium'

export class ProviderFactory {
  static createProvider(config: ProviderConfig): BaseProvider {
    switch (config.type) {
      case 'ollama':
        return new OllamaProvider(config)
      case 'supabase-premium':
        return new SupabasePremiumProvider(config)
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
      'supabase-premium': {
        type: 'supabase-premium',
        name: 'OpenChat Cloud',
        baseUrl: '', // Managed by Supabase URL
        enabled: true,
      },
    }

    return defaults[type]
  }
}
