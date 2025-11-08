/**
 * Canvas Code Editor Tool
 * 
 * Allows AI models to write, edit, and execute code in the Canvas mode.
 * This tool provides a structured way for models to interact with the code editor.
 */

export interface CanvasToolCall {
  action: 'create' | 'update' | 'append' | 'execute'
  language?: string
  code?: string
  filename?: string
  description?: string
}

export interface CanvasToolResult {
  success: boolean
  message: string
  output?: string
}

/**
 * Tool definition for AI models
 */
export const CANVAS_TOOL_DEFINITION = {
  type: 'function',
  function: {
    name: 'canvas_code_editor',
    description: `Write, edit, and execute code in an interactive canvas editor. Use this tool when you need to:
- Create new code files or scripts
- Modify existing code
- Execute code and see results
- Build interactive examples or demonstrations

The canvas supports multiple programming languages including JavaScript, TypeScript, Python, HTML, CSS, and more.`,
    parameters: {
      type: 'object',
      properties: {
        action: {
          type: 'string',
          enum: ['create', 'update', 'append', 'execute'],
          description: `The action to perform:
- create: Create new code from scratch
- update: Replace existing code completely
- append: Add code to the end of existing code
- execute: Run the current code and show output`
        },
        language: {
          type: 'string',
          enum: ['javascript', 'typescript', 'python', 'html', 'css', 'markdown', 'json', 'java', 'cpp', 'rust', 'go'],
          description: 'The programming language of the code (required for create/update actions)'
        },
        code: {
          type: 'string',
          description: 'The code content (required for create/update/append actions)'
        },
        filename: {
          type: 'string',
          description: 'Optional filename for the code (e.g., "example.js", "script.py")'
        },
        description: {
          type: 'string',
          description: 'Optional description of what the code does'
        }
      },
      required: ['action']
    }
  }
}

/**
 * System prompt addition for canvas tool usage
 */
export const CANVAS_TOOL_SYSTEM_PROMPT = `
You have access to a canvas code editor tool. Use it to write and demonstrate code when:
- The user asks you to create, write, or show code
- You want to provide an interactive example
- The user needs to see code execution results
- You're building a demonstration or tutorial

When using the canvas tool:
1. Use 'create' action to start with new code
2. Use 'update' action to replace all code
3. Use 'append' action to add to existing code
4. Use 'execute' action to run the code and show output

Always provide clear, well-commented code. For complex examples, break them into steps.

Example usage:
{
  "action": "create",
  "language": "javascript",
  "code": "console.log('Hello, World!')",
  "description": "A simple Hello World example"
}
`

/**
 * Validate a canvas tool call
 */
export function validateCanvasToolCall(call: any): call is CanvasToolCall {
  if (!call || typeof call !== 'object') return false
  
  const validActions = ['create', 'update', 'append', 'execute']
  if (!validActions.includes(call.action)) return false
  
  // For create/update/append, code is required
  if (['create', 'update', 'append'].includes(call.action)) {
    if (!call.code || typeof call.code !== 'string') return false
  }
  
  // For create/update, language is required
  if (['create', 'update'].includes(call.action)) {
    if (!call.language || typeof call.language !== 'string') return false
  }
  
  return true
}

/**
 * Execute a canvas tool call
 */
export async function executeCanvasToolCall(
  call: CanvasToolCall,
  currentCode: string,
  onCodeChange: (code: string, language?: string) => void,
  onExecute: () => Promise<string>
): Promise<CanvasToolResult> {
  try {
    switch (call.action) {
      case 'create':
        if (!call.code || !call.language) {
          return {
            success: false,
            message: 'Code and language are required for create action'
          }
        }
        onCodeChange(call.code, call.language)
        return {
          success: true,
          message: `Created ${call.language} code${call.filename ? ` (${call.filename})` : ''}${call.description ? `: ${call.description}` : ''}`
        }
      
      case 'update':
        if (!call.code || !call.language) {
          return {
            success: false,
            message: 'Code and language are required for update action'
          }
        }
        onCodeChange(call.code, call.language)
        return {
          success: true,
          message: `Updated code${call.filename ? ` (${call.filename})` : ''}`
        }
      
      case 'append':
        if (!call.code) {
          return {
            success: false,
            message: 'Code is required for append action'
          }
        }
        const newCode = currentCode + '\n\n' + call.code
        onCodeChange(newCode)
        return {
          success: true,
          message: 'Appended code to existing content'
        }
      
      case 'execute':
        const output = await onExecute()
        return {
          success: true,
          message: 'Code executed successfully',
          output
        }
      
      default:
        return {
          success: false,
          message: `Unknown action: ${call.action}`
        }
    }
  } catch (error) {
    return {
      success: false,
      message: `Error executing canvas tool: ${error instanceof Error ? error.message : 'Unknown error'}`
    }
  }
}
