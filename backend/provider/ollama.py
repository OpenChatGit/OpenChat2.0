from __future__ import annotations

import requests
import os
from typing import List, Optional

try:
    from langchain_ollama import ChatOllama
    OLLAMA_AVAILABLE = True
except Exception:
    OLLAMA_AVAILABLE = False

OLLAMA_URL = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434")


def is_online() -> bool:
    """Check if Ollama daemon is reachable by pinging the version endpoint."""
    try:
        r = requests.get(f"{OLLAMA_URL}/api/version", timeout=1.0)
        return bool(r.ok)
    except Exception:
        return False


def list_models() -> List[str]:
    """Return available Ollama model names using the local REST API.
    Falls back to an empty list if the daemon is not available.
    """
    try:
        r = requests.get(f"{OLLAMA_URL}/api/tags", timeout=1.2)
        if r.ok:
            data = r.json() or {}
            models = [m.get("name") for m in data.get("models", []) if m.get("name")]
            return models
    except Exception:
        pass
    return []


def get_llm(model: Optional[str] = None, streaming: bool = True) -> ChatOllama:
    """Create a ChatOllama instance for the given model name.
    If model is None, choose a reasonable default based on availability.
    If a specific model is requested but not installed, raise a clear error to avoid long downloads/hangs.
    """
    if not OLLAMA_AVAILABLE:
        raise RuntimeError("langchain-ollama not installed")

    selected = model
    names = list_models()
    if selected:
        if selected not in names:
            raise RuntimeError(f"Requested model '{selected}' is not installed in Ollama. Install it (e.g., 'ollama pull {selected}') or select an installed model: {names}")
    else:
        # No explicit model provided: pick a common default if available, else first known, else generic name
        for cand in ("llama3.1:8b", "llama3.1", "llama3:8b", "qwen2.5:7b", "mistral:7b"):
            if cand in names:
                selected = cand
                break
        if not selected:
            selected = names[0] if names else "llama3.1"

    return ChatOllama(model=selected, streaming=streaming)
