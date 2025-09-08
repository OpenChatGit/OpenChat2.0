from __future__ import annotations

from typing import Optional

try:
    from langchain_ollama import ChatOllama
    OLLAMA_AVAILABLE = True
except Exception:
    OLLAMA_AVAILABLE = False

from ..provider.ollama import get_llm as _get_llm  # re-use provider logic


def get_llm(model: Optional[str] = None, streaming: bool = True):
    """Factory wrapper to obtain an LLM per LangChain guide.
    Currently uses Ollama via provider; later can branch to OpenAI/others.
    """
    if not OLLAMA_AVAILABLE:
        raise RuntimeError("langchain-ollama not installed")
    return _get_llm(model=model, streaming=streaming)
