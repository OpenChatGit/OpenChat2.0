import os
import subprocess
import sys

# This script runs as beforeDevCommand from the src-tauri directory.
# It locates the repository root and executes the backend starter via uv.

def main():
    here = os.path.dirname(os.path.abspath(__file__))
    repo_root = os.path.abspath(os.path.join(here, os.pardir, os.pardir))
    backend_dir = os.path.join(repo_root, 'backend')
    starter = os.path.join(backend_dir, 'start_backend.py')

    if not os.path.isfile(starter):
        # Print a clear message but do not fail hard; Tauri will show non-zero exit otherwise
        print(f"[start_backend_launcher] Starter not found: {starter}")
        sys.exit(1)

    # Use uv to run the backend starter
    # We set cwd to backend so relative imports work and uv picks up pyproject there
    try:
        debug = os.environ.get('DEBUG_OPENCHAT') == '1'
        stdout = None if debug else subprocess.DEVNULL
        stderr = None if debug else subprocess.DEVNULL
        subprocess.Popen(
            [
                'uv', 'run', sys.executable, starter
            ],
            cwd=backend_dir,
            stdout=stdout,
            stderr=stderr,
        )
    except FileNotFoundError:
        # Fallback: try to run with Python directly if uv is not available
        subprocess.Popen(
            [
                sys.executable, starter
            ],
            cwd=backend_dir,
            stdout=(None if os.environ.get('DEBUG_OPENCHAT') == '1' else subprocess.DEVNULL),
            stderr=(None if os.environ.get('DEBUG_OPENCHAT') == '1' else subprocess.DEVNULL),
        )

if __name__ == '__main__':
    main()
