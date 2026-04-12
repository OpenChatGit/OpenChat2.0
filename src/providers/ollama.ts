// Ollama provider implementation (Now using OpenAI-compatible API)
import { BaseProvider } from './base'
import type { ChatCompletionRequest, ModelInfo } from '../types'
import { createModelCapabilities } from '../lib/visionDetection'

export class OllamaProvider extends BaseProvider {
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
        `${this.config.baseUrl}/api/tags`,
        { method: 'GET' }
      )

      if (!response.ok) {
        throw new Error(`Failed to fetch models: ${response.statusText}`)
      }

      const data = await response.json()
      
      // Add vision capabilities to models that support it
      const models = (data.models || []).map((model: any) => ({
        name: model.name, // Use model.name from /api/tags instead of model.id from /v1
        size: model.size,
        details: model.details || model,
        capabilities: createModelCapabilities(model.name, 'ollama'),
      }))
      
      return models
    } catch (error) {
      // Silently handle connection errors - provider is likely not running
      const errorMessage = error instanceof Error ? error.message : String(error)
      if (!errorMessage.includes('Failed to fetch') && !errorMessage.includes('ERR_CONNECTION_REFUSED')) {
        console.warn('Ollama listModels error:', error)
      }
      return []
    }
  }

  async sendMessage(
    request: ChatCompletionRequest,
    onChunk?: (content: string) => void,
    signal?: AbortSignal
  ): Promise<string> {
    const url = `${this.config.baseUrl}/api/chat`

    const formattedMessages = request.messages
      .filter(msg => msg.content && msg.content.trim().length > 0)
      .map(msg => {
        const messageWithImages = msg as any
        if (messageWithImages.images && messageWithImages.images.length > 0) {
          const images = messageWithImages.images.map((img: any) => img.data)
          return { role: msg.role, content: msg.content, images }
        }
        return { role: msg.role, content: msg.content }
      })

    const body: any = {
      model: request.model,
      messages: formattedMessages,
      stream: !!onChunk,
      think: true, // Officially enable thinking response in new Ollama versions
      options: {
        temperature: request.temperature,
        top_p: request.top_p,
        num_predict: request.max_tokens,
      },
    }

    if (request.tools && request.tools.length > 0) {
      body.tools = request.tools
      console.log('[Ollama] Sending tools:', request.tools.length, 'tools')
    }

    if (!onChunk) {
      const response = await this.fetchWithTimeout(
        url,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        },
        30000,
        signal
      )

      if (!response.ok) {
        throw new Error(`Ollama request failed: ${response.statusText}`)
      }

      const data = await response.json()
      const msg = data.message || {}
      
      if (msg.tool_calls && msg.tool_calls.length > 0) {
        console.log('[Ollama] Received tool calls:', msg.tool_calls)
        return msg.tool_calls
      }

      // Read thinking, reasoning_content or reasoning
      const reasoning = (msg.thinking || msg.reasoning_content || msg.reasoning || '').trim()
      const text = msg.content || ''
      return reasoning ? `<think>\n${reasoning}\n</think>\n${text}` : text
    }

    // Streaming request
    const response = await this.fetchWithTimeout(
      url,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      30000,
      signal
    )

    if (!response.ok) {
      throw new Error(`Ollama request failed: ${response.statusText}`)
    }

    const reader = response.body?.getReader()
    if (!reader) {
      throw new Error('No response body')
    }

    const decoder = new TextDecoder()
    let fullContent = ''
    let reasoningOpen = false
    const toolCalls: any[] = []

    try {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break

        const chunk = decoder.decode(value, { stream: true })
        const lines = chunk.split('\n').filter(line => line.trim())

        for (const line of lines) {
          try {
            const json = JSON.parse(line)
            const msg = json.message || {}
            
            if (msg.tool_calls && msg.tool_calls.length > 0) {
              msg.tool_calls.forEach((tc: any) => {
                const index = tc.index || toolCalls.length
                if (!toolCalls[index]) {
                  toolCalls[index] = tc
                }
              })
              // Callback with current tool calls (passed as empty content for compatibility)
              onChunk('')
            }

            // Read the official 'thinking' field introduced in latest Ollama
            const r = (msg.thinking || msg.reasoning_content || msg.reasoning) as string | undefined
            const c = msg.content as string | undefined

            if (r) {
              if (!reasoningOpen) {
                reasoningOpen = true
                fullContent += '<think>\n'
                onChunk('<think>\n')
              }
              fullContent += r
              onChunk(r)
            }

            if (c) {
              if (reasoningOpen) {
                reasoningOpen = false
                fullContent += '\n</think>\n'
                onChunk('\n</think>\n')
              }
              fullContent += c
              onChunk(c)
            }

            if (json.done && reasoningOpen) {
              reasoningOpen = false
              fullContent += '\n</think>\n'
              onChunk('\n</think>\n')
            }
          } catch (e) {
            console.warn('Failed to parse chunk:', line)
          }
        }
      }
    } finally {
      reader.releaseLock()
    }

    if (reasoningOpen) {
      fullContent += '\n</think>\n'
      onChunk('\n</think>\n')
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

  async deleteModel(modelName: string): Promise<void> {
    try {
      const response = await this.fetchWithTimeout(
        `${this.config.baseUrl}/api/delete`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ name: modelName }),
        },
        10000
      )

      if (!response.ok) {
        throw new Error(`Failed to delete model: ${response.statusText}`)
      }
    } catch (error) {
      console.error('Failed to delete model:', error)
      throw error
    }
  }
}
