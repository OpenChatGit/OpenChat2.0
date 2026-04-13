import { BaseProvider } from './base'
import type { ProviderConfig, ModelInfo, ChatCompletionRequest } from '../types'
import { getSafeSession } from '../lib/supabase'
import { OpenRouter } from '@openrouter/sdk'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL || ''
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export class SupabasePremiumProvider extends BaseProvider {
  constructor(config: ProviderConfig) {
    super(config)
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/premium-chat`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
          'Content-Type': 'application/json'
        }
      })

      if (!response.ok) throw new Error('Failed to fetch cloud models')
      return await response.json()
    } catch (error) {
      console.warn('Could not load dynamic cloud models, using fallback list', error)
      return [
        { name: 'Claude 3.5 Sonnet', id: 'anthropic/claude-3-5-sonnet', provider: 'supabase-premium', size: 'Vast', capabilities: { vision: true, reasoning: true } },
        { name: 'GPT-4o', id: 'openai/gpt-4o', provider: 'supabase-premium', size: 'Vast', capabilities: { vision: true, reasoning: true } },
        { name: 'Gemini Pro 1.5', id: 'google/gemini-pro-1.5', provider: 'supabase-premium', size: 'Universal', capabilities: { vision: true, reasoning: true } }
      ]
    }
  }

  async sendMessage(
    request: ChatCompletionRequest,
    onChunk?: (content: string, toolCalls?: any[]) => void,
    signal?: AbortSignal
  ): Promise<string | any[]> {
    const session = await getSafeSession()
    const userToken = session?.access_token

    if (!userToken) {
      throw new Error('Please sign in to use OpenChat Cloud models.')
    }

    // Official SDK Setup according to documentation
    const or = new OpenRouter({
      apiKey: 'sk-or-v1-placeholder',
      baseURL: `${SUPABASE_URL}/functions/v1/premium-chat`,
      dangerouslyAllowBrowser: true,
      fetch: (url, init) => {
        const headers = new Headers(init?.headers)
        headers.set('X-User-Token', userToken)
        headers.set('Authorization', `Bearer ${SUPABASE_ANON_KEY}`)
        return fetch(url, { ...init, headers, signal })
      }
    } as any)

    if (!onChunk) {
      const response = await (or as any).chat.send({
        chatRequest: {
          ...request,
          stream: false
        }
      })
      const message = response.choices[0]?.message
      if (message?.tool_calls) return message.tool_calls
      return message?.content || ''
    }

    // Official SDK Streaming with chat.send
    const stream = await (or as any).chat.send({
      chatRequest: {
        ...request,
        stream: true
      }
    })

    let fullContent = ''
    const toolCalls: any[] = []

    try {
      for await (const chunk of stream as any) {
        const delta = chunk.choices[0]?.delta
        const content = delta?.content || ''
        const reasoning = delta?.reasoning_content || delta?.thought

        if (delta?.tool_calls) {
          delta.tool_calls.forEach((tc: any) => {
            const index = tc.index
            if (!toolCalls[index]) {
              toolCalls[index] = { id: tc.id, type: 'function', function: { name: '', arguments: '' } }
            }
            if (tc.id) toolCalls[index].id = tc.id
            if (tc.function?.name) toolCalls[index].function.name += tc.function.name
            if (tc.function?.arguments) toolCalls[index].function.arguments += tc.function.arguments
          })
          onChunk('', toolCalls.filter(Boolean))
        }

        if (reasoning) {
          const reasoningChunk = `<think>${reasoning}</think>`
          fullContent += reasoningChunk
          onChunk(reasoningChunk)
        }

        if (content) {
          fullContent += content
          onChunk(content)
        }
      }
    } catch (e) {
      console.error('SDK Streaming failed:', e)
      throw e
    }

    return toolCalls.length > 0 ? toolCalls.filter(Boolean) : fullContent
  }

  async testConnection(): Promise<boolean> {
    const session = await getSafeSession()
    return !!session
  }
}
