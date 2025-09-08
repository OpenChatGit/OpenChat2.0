from __future__ import annotations

import asyncio
import json
import re
import os
from typing import Any, AsyncGenerator, Dict, List, Optional

from fastapi import FastAPI, Body
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel
from fastapi.middleware.cors import CORSMiddleware
from dotenv import load_dotenv

try:
    # Prefer LangChain ChatOllama when available
    from langchain_core.messages import HumanMessage, AIMessage
    OLLAMA_AVAILABLE = True
except Exception:
    OLLAMA_AVAILABLE = False

try:
    from provider.ollama import get_llm, list_models, is_online  # type: ignore
except Exception:
    def get_llm(*args, **kwargs):  # fallback stub
        raise RuntimeError("Ollama provider not available")
    def list_models() -> List[str]:
        return []

# Load environment from backend/.env (non-fatal if missing)
try:
    env_path = os.path.join(os.path.dirname(__file__), ".env")
    load_dotenv(env_path, override=False)
    # Also load from parent dir if present (repo root), but do not override existing
    load_dotenv(os.path.join(os.path.dirname(os.path.dirname(__file__)), ".env"), override=False)
except Exception:
    pass

# Normalize legacy LANGSMITH_* to current LANGCHAIN_* without overriding existing values
def _ensure_env(name: str, value: str):
    if not os.environ.get(name):
        os.environ[name] = value

try:
    # Tracing flag
    if os.environ.get("LANGSMITH_TRACING") and not os.environ.get("LANGCHAIN_TRACING_V2"):
        _ensure_env("LANGCHAIN_TRACING_V2", os.environ.get("LANGSMITH_TRACING", ""))
    # Endpoint
    if os.environ.get("LANGSMITH_ENDPOINT") and not os.environ.get("LANGCHAIN_ENDPOINT"):
        _ensure_env("LANGCHAIN_ENDPOINT", os.environ.get("LANGSMITH_ENDPOINT", ""))
    # Project
    if os.environ.get("LANGSMITH_PROJECT") and not os.environ.get("LANGCHAIN_PROJECT"):
        _ensure_env("LANGCHAIN_PROJECT", os.environ.get("LANGSMITH_PROJECT", ""))
except Exception:
    pass

app = FastAPI(title="OpenChat2.0 Backend", version="0.1.0")

# CORS for dev: allow local app origins (Tauri dev often runs on 127.0.0.1:1430)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # permissive for development; tighten in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Import LCEL chain builder and history store after OLLAMA_AVAILABLE is known
if OLLAMA_AVAILABLE:
    try:
        from .chains.compose import build_history_chain  # type: ignore
        from .memory.store import get_session_history  # type: ignore
    except Exception:
        # Fallback no-ops to avoid crashes if imports fail unexpectedly
        def build_history_chain(model_name: str):
            raise RuntimeError("LCEL components not available")
        def get_session_history(session_id: str):
            raise RuntimeError("History store not available")


class HistoryItem(BaseModel):
    role: str
    content: str


class ChatRequest(BaseModel):
    message: str
    history: Optional[List[HistoryItem]] = None
    model: Optional[str] = None
    system: Optional[str] = None
    tools_enabled: Optional[bool] = False
    reasoning_enabled: Optional[bool] = False
    user_context: Optional[Dict[str, Any]] = None


class TitleRequest(BaseModel):
    messages: List[HistoryItem]
    model: Optional[str] = None
    max_words: int = 6


@app.get("/health")
async def health() -> Dict[str, str]:
    return {"status": "ok"}


@app.get("/ollama/health")
async def ollama_health() -> Dict[str, Any]:
    """Lightweight Ollama reachability check and model count."""
    try:
        online = is_online()
        models = list_models() if online else []
        return {"online": online, "models": len(models)}
    except Exception:
        return {"online": False, "models": 0}


@app.get("/models")
async def models() -> Dict[str, Any]:
    try:
        return {"models": list_models()}
    except Exception:
        return {"models": []}


@app.post("/warm")
async def warm(payload: Dict[str, Any] = Body(...)) -> Dict[str, Any]:
    """Warm a model to reduce first-token latency. No-op if Ollama is not available."""
    model = payload.get("model") or "llama3.1"
    if not OLLAMA_AVAILABLE:
        return {"status": "noop", "detail": "langchain-ollama not installed"}
    try:
        _ = get_llm(model=model, streaming=False)
        # simple, non-stream call to trigger load
        loop = asyncio.get_event_loop()
        await loop.run_in_executor(None, lambda: _.invoke("ping"))
        return {"status": "ok", "model": model}
    except Exception as e:
        return {"status": "error", "model": model, "detail": str(e)}


def _heuristic_title(messages: List[HistoryItem], max_words: int = 6) -> str:
    # Prefer last user message; otherwise last assistant
    text = ""
    for m in reversed(messages):
        if m.role.lower() == "user" and (m.content or "").strip():
            text = m.content
            break
    if not text:
        for m in reversed(messages):
            if (m.content or "").strip():
                text = m.content
                break
    text = (text or "New Chat").strip()
    # remove markdown code fences and headers
    text = re.sub(r"```[\s\S]*?```", " ", text)
    text = re.sub(r"^#+\s*", "", text, flags=re.M)
    # collapse whitespace
    text = re.sub(r"\s+", " ", text).strip()
    # limit words
    words = text.split(" ")
    if len(words) > max_words:
        text = " ".join(words[:max_words])
    # strip quotes/punct end
    text = text.strip("\"'` ")
    text = re.sub(r"[\.,;:!?\-\s]+$", "", text)
    return text or "New Chat"


@app.post("/title")
async def generate_title(req: TitleRequest) -> Dict[str, Any]:
    """Model-agnostische, robuste Titelgenerierung mit Heuristik + optionalem LLM-Boost."""
    base = _heuristic_title(req.messages, max_words=req.max_words)
    # Try quick LLM boost (2s) if available
    if OLLAMA_AVAILABLE:
        try:
            llm = get_llm(model=req.model, streaming=False)
            prompt = (
                "Generate a concise chat title (<=6 words) for the following conversation.\n"
                "No quotes, no trailing punctuation. Return ONLY the title.\n\n" +
                "\n".join(f"{m.role.capitalize()}: {m.content[:240]}" for m in req.messages[-8:])
            )
            loop = asyncio.get_event_loop()
            async def invoke():
                return await loop.run_in_executor(None, lambda: llm.invoke(prompt))
            try:
                res = await asyncio.wait_for(invoke(), timeout=2.0)
                txt = getattr(res, "content", str(res)).strip()
                txt = txt.splitlines()[0].strip()
                txt = re.sub(r"[\"'`]+", "", txt)
                txt = re.sub(r"[\.,;:!?\-\s]+$", "", txt)
                if txt:
                    return {"title": txt}
            except asyncio.TimeoutError:
                pass
        except Exception:
            pass
    return {"title": base}


@app.post("/chat")
async def chat(req: ChatRequest) -> Dict[str, Any]:
    """Non-streaming chat (no LCEL dependency): build messages and call llm.invoke directly."""
    if not OLLAMA_AVAILABLE:
        return {
            "output": "Backend is running, but langchain-ollama is not installed.",
            "model": req.model or None,
        }

    session_id = (req.user_context or {}).get("conversation_id") or "default"
    try:
        print(f"[/chat] session={session_id} model={req.model} msg_len={len(req.message or '')} hist={len(req.history or [])}")
    except Exception:
        pass

    # Build message list
    try:
        llm = get_llm(model=req.model or "llama3.1", streaming=False)
        msgs: List[Any] = []
        if (req.system or "").strip():
            msgs.append(HumanMessage(content=f"[SYSTEM]\n{req.system}"))
        if req.history:
            for h in req.history[-10:]:
                if (h.role or "").lower() == "assistant":
                    msgs.append(AIMessage(content=h.content))
                else:
                    msgs.append(HumanMessage(content=h.content))
        msgs.append(HumanMessage(content=req.message))

        loop = asyncio.get_event_loop()
        result = await loop.run_in_executor(None, lambda: llm.invoke(msgs))
        text = getattr(result, "content", str(result))
        return {"output": text}
    except Exception as e:
        try:
            print(f"[/chat][ERROR] {e}")
        except Exception:
            pass
        return {"output": f"Error from model: {e}"}


@app.post("/lcel/chat/sse")
async def chat_sse(req: ChatRequest) -> StreamingResponse:
    """Streaming endpoint (SSE) that emits real-time tokens using llm.stream."""

    async def event_stream() -> AsyncGenerator[bytes, None]:
        # Fallback stream when no Ollama available
        if not OLLAMA_AVAILABLE:
            yield b'data: {"type":"token","text":"Backend running. Install langchain-ollama for live streaming. "}\n\n'
            yield b'data: {"type":"done"}\n\n'
            return

        session_id = (req.user_context or {}).get("conversation_id") or "default"
        try:
            print(f"[SSE] session={session_id} model={req.model} msg_len={len(req.message or '')} hist={len(req.history or [])}")
        except Exception:
            pass
        # Seed server-side history for future turns (non-blocking if store missing)
        try:
            hist = get_session_history(session_id)
            if req.history:
                for h in req.history[-10:]:
                    if (h.role or "").lower() == "assistant":
                        hist.add_ai_message(h.content)
                    else:
                        hist.add_user_message(h.content)
        except Exception:
            pass

        # Build message list for the model
        try:
            llm = get_llm(model=req.model or "llama3.1", streaming=True)
            msgs: List[Any] = []
            if (req.system or "").strip():
                # Prepend a lightweight system note
                msgs.append(HumanMessage(content=f"[SYSTEM]\n{req.system}"))
            if req.history:
                for h in req.history[-10:]:
                    if (h.role or "").lower() == "assistant":
                        msgs.append(AIMessage(content=h.content))
                    else:
                        msgs.append(HumanMessage(content=h.content))
            msgs.append(HumanMessage(content=req.message))

            # Emit an initial META event for client-side debugging
            try:
                meta = {"type": "meta", "model": getattr(llm, 'model', None) or (req.model or "llama3.1"), "history": len(req.history or [])}
                yield f"data: {json.dumps(meta)}\n\n".encode("utf-8")
            except Exception:
                pass

            # Stream tokens directly and yield as they arrive
            for chunk in llm.stream(msgs):
                txt = getattr(chunk, "content", "")
                if not txt:
                    continue
                payload = json.dumps({"type": "token", "text": txt})
                yield f"data: {payload}\n\n".encode("utf-8")
        except Exception as e:
            try:
                print(f"[SSE][ERROR] {e}")
            except Exception:
                pass
            payload = json.dumps({"type": "error", "message": str(e)})
            yield f"data: {payload}\n\n".encode("utf-8")
        finally:
            yield b'data: {"type":"done"}\n\n'

    return StreamingResponse(event_stream(), media_type="text/event-stream")


def _mask(v: Optional[str]) -> str:
    if not v:
        return ""
    if len(v) <= 6:
        return "***"
    return v[:3] + "***" + v[-3:]


@app.get("/env/debug")
async def env_debug() -> Dict[str, Any]:
    """Return masked environment config for debugging (dev-only intended)."""
    keys = [
        "LANGCHAIN_TRACING_V2",
        "LANGCHAIN_ENDPOINT",
        "LANGCHAIN_PROJECT",
        "LANGCHAIN_API_KEY",
        "LANGSMITH_TRACING",
        "LANGSMITH_ENDPOINT",
        "LANGSMITH_PROJECT",
        "OPENAI_API_KEY",
        "OLLAMA_URL",
    ]
    out: Dict[str, Any] = {}
    for k in keys:
        val = os.environ.get(k)
        out[k] = _mask(val) if ("KEY" in k or "TOKEN" in k) else (val or "")
    return out

if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="127.0.0.1", port=8000, reload=True)

