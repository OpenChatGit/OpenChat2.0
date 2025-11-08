// Canvas Mode Manager - Handles all Canvas-specific logic
// Keeps App.tsx clean and focused
// Uses useCanvasChat for INDEPENDENT message handling

import { useState, useEffect, useCallback } from 'react'
import type { ProviderConfig, ImageAttachment } from '../types'
import { useCanvasChat } from './useCanvasChat'

interface UseCanvasManagerProps {
  setCanvasToolsEnabled: (enabled: boolean) => void
}

export function useCanvasManager({
  setCanvasToolsEnabled,
}: UseCanvasManagerProps) {
  // Use independent Canvas Chat hook with Canvas Tools
  const {
    sessions: canvasSessions,
    currentSession: currentCanvasSession,
    isGenerating: isCanvasGenerating,
    setCanvasToolsEnabled: setInternalCanvasToolsEnabled,
    createSession: createCanvasSession,
    selectSession: selectCanvasSession,
    deleteSession: deleteCanvasSession,
    renameSession: renameCanvasSession,
    saveCanvasState: saveCanvasState,
    sendMessage: sendCanvasMessage,
  } = useCanvasChat()
  // Canvas mode state
  const [isCanvasMode, setIsCanvasMode] = useState(() => {
    try {
      const saved = localStorage.getItem('isCanvasMode')
      return saved === 'true'
    } catch (error) {
      return false
    }
  })

  // Save canvas mode to localStorage
  useEffect(() => {
    try {
      localStorage.setItem('isCanvasMode', String(isCanvasMode))
    } catch (error) {
      console.error('Failed to save canvas mode:', error)
    }
  }, [isCanvasMode])

  // Enable/disable canvas tools based on canvas mode
  useEffect(() => {
    setCanvasToolsEnabled(isCanvasMode)
    setInternalCanvasToolsEnabled(isCanvasMode)
  }, [isCanvasMode, setCanvasToolsEnabled, setInternalCanvasToolsEnabled])

  // Create new canvas session - uses independent Canvas Chat
  const handleNewCanvasSession = useCallback((
    selectedProvider: ProviderConfig | null,
    selectedModel: string | null,
    setShowSettings: (show: boolean) => void
  ) => {
    if (!selectedProvider || !selectedModel) {
      setShowSettings(true)
      return null
    }
    
    console.log('[Canvas Manager] Creating new canvas session via useCanvasChat')
    const session = createCanvasSession(selectedProvider, selectedModel)
    return session
  }, [createCanvasSession])

  // Send message in canvas mode - uses independent Canvas Chat
  const handleCanvasSendMessage = useCallback(async (
    content: string,
    selectedProvider: ProviderConfig | null,
    selectedModel: string | null,
    setShowSettings: (show: boolean) => void,
    images?: ImageAttachment[]
  ) => {
    if (!selectedProvider || !selectedModel) {
      setShowSettings(true)
      return
    }

    console.log('[Canvas Manager] Sending message via useCanvasChat')
    // useCanvasChat will auto-create session if needed
    await sendCanvasMessage(content, selectedProvider, selectedModel, images)
  }, [sendCanvasMessage])

  // Regenerate message in canvas mode - TODO: implement in useCanvasChat
  const handleCanvasRegenerateMessage = useCallback((
    _messageId: string,
    _selectedProvider: ProviderConfig | null,
    _selectedModel: string | null
  ) => {
    console.log('[Canvas Manager] Regenerate not yet implemented in Canvas Chat')
    // TODO: Add regenerate functionality to useCanvasChat
  }, [])

  // Select canvas session - uses Canvas Chat
  const handleSelectCanvasSession = useCallback((sessionId: string) => {
    console.log('[Canvas Manager] Selecting canvas session via useCanvasChat:', sessionId)
    selectCanvasSession(sessionId)
  }, [selectCanvasSession])

  // Delete canvas session - uses Canvas Chat
  const handleDeleteCanvasSession = useCallback((sessionId: string) => {
    console.log('[Canvas Manager] Deleting canvas session via useCanvasChat:', sessionId)
    deleteCanvasSession(sessionId)
  }, [deleteCanvasSession])

  // Rename canvas session - uses Canvas Chat
  const handleRenameCanvasSession = useCallback((sessionId: string, newTitle: string) => {
    console.log('[Canvas Manager] Renaming canvas session via useCanvasChat:', sessionId)
    renameCanvasSession(sessionId, newTitle)
  }, [renameCanvasSession])

  // Save canvas state - uses Canvas Chat
  const handleSaveCanvasState = useCallback((sessionId: string, code: string, language: string) => {
    console.log('[Canvas Manager] Saving canvas state via useCanvasChat:', sessionId)
    saveCanvasState(sessionId, code, language)
  }, [saveCanvasState])

  return {
    isCanvasMode,
    setIsCanvasMode,
    canvasSessions,
    currentCanvasSession,
    isCanvasGenerating,
    handleNewCanvasSession,
    handleSelectCanvasSession,
    handleCanvasSendMessage,
    handleCanvasRegenerateMessage,
    handleDeleteCanvasSession,
    handleRenameCanvasSession,
    handleSaveCanvasState,
  }
}
