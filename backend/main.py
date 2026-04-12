from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
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

class ProxyRequest(BaseModel):
    url: str
    method: str = "GET"
    body: Optional[str] = None
    headers: Optional[Dict[str, str]] = None

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
