from __future__ import annotations

from typing import Dict
from langchain_core.chat_history import InMemoryChatMessageHistory

# Simple in-memory store; replace with Redis/DB for production
_session_store: Dict[str, InMemoryChatMessageHistory] = {}


def get_session_history(session_id: str) -> InMemoryChatMessageHistory:
    if session_id not in _session_store:
        _session_store[session_id] = InMemoryChatMessageHistory()
    return _session_store[session_id]
