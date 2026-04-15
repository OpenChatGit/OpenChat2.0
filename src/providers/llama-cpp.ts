import { BaseProvider } from './base'
import type { ChatCompletionRequest, ModelInfo } from '../types'
import { createModelCapabilities } from '../lib/visionDetection'

export class LlamaCppProvider extends BaseProvider {
  private buildHeaders(includeJson = false): HeadersInit {
    const headers: HeadersInit = {}

    if (includeJson) {
      headers['Content-Type'] = 'application/json'
    }

    if (this.config.apiKey) {
      headers['Authorization'] = `Bearer ${this.config.apiKey}`
    }

    return headers
  }

  async listModels(): Promise<ModelInfo[]> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/v1/models`,
        { 
          method: 'GET',
          headers: this.buildHeaders()
        }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data = await response.json()
      
      // llama.cpp /v1/models response format
      return (data.data || []).map((model: any) => ({
        id: model.id,
        name: model.id.split('/').pop() || model.id,
        provider: 'llama-cpp',
        capabilities: createModelCapabilities(model.id, 'llama-cpp'),
      }))
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        console.warn('llama.cpp listModels error:', error)
      }
      return []
    }
  }

  async sendMessage(
    request: ChatCompletionRequest,
    onChunk?: (content: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const url = `${this.config.baseUrl}/v1/chat/completions`

    const body: any = {
      model: request.model,
      messages: request.messages.map(msg => ({
        role: msg.role,
        content: msg.content
      })),
      stream: !!onChunk,
      temperature: request.temperature,
      top_p: request.top_p,
      max_tokens: request.max_tokens,
    }

    const response = await this.fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: this.buildHeaders(true),
        body: JSON.stringify(body),
      },
      60000,
      signal
    )

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error?.message || `llama.cpp request failed: ${response.statusText}`)
    }

    if (!onChunk) {
      const data = await response.json()
      return data.choices?.[0]?.message?.content || ''
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let fullContent = ''

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n')

        for (const line of lines) {
          if (!line.startsWith('data: ')) continue
          const dataStr = line.slice(6).trim()
          if (dataStr === '[DONE]') break

          try {
            const json = JSON.parse(dataStr)
            const content = json.choices?.[0]?.delta?.content || ''
            if (content) {
              fullContent += content
              onChunk(content)
            }
          } catch (e) {
            // Some chunks might be incomplete or metadata
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    return fullContent
  }

  async testConnection(timeout = 2000): Promise<boolean> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/v1/models`,
        {
          method: 'GET',
          headers: this.buildHeaders(),
        },
        timeout
      )
      return response.ok
    } catch (error) {
      return false
    }
  }
}
