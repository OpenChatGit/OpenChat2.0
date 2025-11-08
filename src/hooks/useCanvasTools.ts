/**
 * Hook for handling Canvas tool calls in chat
 */

import { useCallback } from 'react'
import { CANVAS_TOOL_DEFINITION, validateCanvasToolCall, type CanvasToolCall, type CanvasToolResult } from '../lib/tools/canvasTool'

export function useCanvasTools() {
  /**
   * Get tool definitions for the AI model
   */
  const getToolDefinitions = useCallback(() => {
    return [CANVAS_TOOL_DEFINITION]
  }, [])

  /**
   * Execute a canvas tool call
   */
  const executeToolCall = useCallback(async (
    toolName: string,
    args: any
  ): Promise<CanvasToolResult> => {
    if (toolName !== 'canvas_code_editor') {
      return {
        success: false,
        message: `Unknown tool: ${toolName}`
      }
    }

    // Validate the tool call
    if (!validateCanvasToolCall(args)) {
      return {
        success: false,
        message: 'Invalid tool call arguments'
      }
    }

    // Dispatch event to Canvas component
    const event = new CustomEvent('canvasToolCall', {
      detail: { toolName, args }
    })
    window.dispatchEvent(event)

    // Return success (actual execution happens in Canvas component)
    const call = args as CanvasToolCall
    let message = ''
    
    switch (call.action) {
      case 'create':
        message = `Created ${call.language} code in canvas${call.filename ? ` (${call.filename})` : ''}`
        break
      case 'update':
        message = `Updated code in canvas${call.filename ? ` (${call.filename})` : ''}`
        break
      case 'append':
        message = 'Appended code to canvas'
        break
      case 'execute':
        message = 'Executing code in canvas...'
        break
    }

    return {
      success: true,
      message
    }
  }, [])

  /**
   * Parse tool calls from AI response
   * Supports both JSON format and markdown code blocks
   */
  const parseToolCalls = useCallback((content: string): Array<{ toolName: string; args: any }> => {
    const toolCalls: Array<{ toolName: string; args: any }> = []

    // Try to find JSON tool calls in the format: {"tool": "canvas_code_editor", "args": {...}}
    const jsonMatches = content.matchAll(/\{[\s\S]*?"tool"[\s\S]*?:[\s\S]*?"canvas_code_editor"[\s\S]*?\}/g)
    for (const match of jsonMatches) {
      try {
        const parsed = JSON.parse(match[0])
        if (parsed.tool === 'canvas_code_editor' && parsed.args) {
          toolCalls.push({
            toolName: parsed.tool,
            args: parsed.args
          })
        }
      } catch (e) {
        // Ignore parse errors
      }
    }

    // Also check for code blocks with language hints
    // Example: ```javascript\ncode here\n```
    const codeBlockRegex = /```(\w+)\n([\s\S]*?)```/g
    const codeMatches = content.matchAll(codeBlockRegex)
    
    for (const match of codeMatches) {
      const language = match[1]
      const code = match[2].trim()
      
      // Only auto-create canvas for certain languages
      const supportedLanguages = ['javascript', 'typescript', 'python', 'html', 'css', 'java', 'cpp', 'rust', 'go']
      if (supportedLanguages.includes(language.toLowerCase()) && code.length > 20) {
        toolCalls.push({
          toolName: 'canvas_code_editor',
          args: {
            action: 'create',
            language: language.toLowerCase(),
            code
          }
        })
      }
    }

    return toolCalls
  }, [])

  return {
    getToolDefinitions,
    executeToolCall,
    parseToolCalls
  }
}
