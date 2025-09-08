import subprocess
import sys
import time
import requests
import os

HOST = os.environ.get("OPENCHAT_BACKEND_HOST", "127.0.0.1")
PORT = int(os.environ.get("OPENCHAT_BACKEND_PORT", "8000"))
URL = f"http://{HOST}:{PORT}/health"

if __name__ == "__main__":
    # Start uvicorn in background
    proc = subprocess.Popen([
        sys.executable,
        "-m", "uvicorn",
        "app:app",
        "--host", HOST,
        "--port", str(PORT),
        "--reload"
    ], cwd=os.path.dirname(__file__), stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)

    # Health check loop (non-blocking overall; exits after success or timeout)
    start = time.time()
    timeout = 15
    while time.time() - start < timeout:
        try:
            r = requests.get(URL, timeout=1.5)
            if r.ok:
                break
        except Exception:
            pass
        time.sleep(0.6)

    # Detach: leave the server running
    # Note: Tauri dev process will continue independently
    sys.exit(0)
