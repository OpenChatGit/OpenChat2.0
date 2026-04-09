from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import subprocess
import httpx
import os
from typing import Optional, Dict

app = FastAPI(title="OpenChat2.0 Backend")

# CORS Setup - Erlaubt alle Origins, damit das React Frontend problemlos anfragen kann
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Für Entwicklung; In Produktion evtl. einschränken
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class TerminalCommand(BaseModel):
    command: str
    workingDir: Optional[str] = None

class ProxyRequest(BaseModel):
    url: str
    method: str = "GET"
    body: Optional[str] = None
    headers: Optional[Dict[str, str]] = None

@app.post("/api/terminal")
async def run_terminal_command(req: TerminalCommand):
    """
    Ersetzt den alten Tauri 'run_terminal_command' Aufruf.
    Führt Befehle in der Konsole / Shell aus.
    """
    try:
        kwargs = {
            "shell": True,
            "capture_output": True,
            "text": True,
            "cwd": req.workingDir if req.workingDir else os.getcwd()
        }
        res = subprocess.run(req.command, **kwargs)
        return {
            "stdout": res.stdout,
            "stderr": res.stderr,
            "exit_code": res.returncode
        }
    except Exception as e:
        return {
            "stdout": "",
            "stderr": str(e),
            "exit_code": 1
        }

@app.post("/api/proxy")
async def proxy_http_request(req: ProxyRequest):
    """
    Ersetzt Tauris 'proxy_http_request' für API Requests ohne Browser-CORS Blockade.
    """
    async with httpx.AsyncClient(timeout=30.0) as client:
        try:
            method = req.method.upper()
            if method == "GET":
                response = await client.get(req.url, headers=req.headers)
            elif method == "POST":
                response = await client.post(req.url, content=req.body, headers=req.headers)
            else:
                raise HTTPException(status_code=400, detail=f"Unsupported method: {method}")
            
            return {
                "status": response.status_code,
                "text": response.text
            }
        except Exception as e:
            raise HTTPException(status_code=500, detail=str(e))
