#!/usr/bin/env python3
"""
Verification script for OpenChat 2.0 Tauri setup
Checks if all files are in correct locations and paths are properly configured
"""

import os
import json
from pathlib import Path

def check_file_exists(path, description):
    """Check if a file exists and report status"""
    if os.path.exists(path):
        print(f"✅ {description}: {path}")
        return True
    else:
        print(f"❌ {description}: {path} (NOT FOUND)")
        return False

def check_css_paths():
    """Verify CSS file paths are correct for Tauri"""
    print("\n=== CSS Path Verification ===")
    
    # Check if auth.css exists in static directory
    auth_css = "frontend/static/auth.css"
    styles_css = "frontend/src/styles.css"
    index_html = "frontend/src/index.html"
    
    all_good = True
    all_good &= check_file_exists(auth_css, "Auth CSS")
    all_good &= check_file_exists(styles_css, "Main CSS")
    all_good &= check_file_exists(index_html, "Index HTML")
    
    # Check HTML references
    if os.path.exists(index_html):
        with open(index_html, 'r', encoding='utf-8') as f:
            content = f.read()
            if 'href="static/auth.css"' in content:
                print("✅ HTML references auth.css correctly")
            else:
                print("❌ HTML does not reference auth.css correctly")
                all_good = False
    
    return all_good

def check_tauri_config():
    """Verify Tauri configuration"""
    print("\n=== Tauri Configuration ===")
    
    config_path = "frontend/src-tauri/tauri.conf.json"
    if not check_file_exists(config_path, "Tauri Config"):
        return False
    
    with open(config_path, 'r') as f:
        config = json.load(f)
    
    frontend_dist = config.get('build', {}).get('frontendDist')
    before_dev = config.get('build', {}).get('beforeDevCommand')
    
    print(f"Frontend dist: {frontend_dist}")
    print(f"Before dev command: {before_dev}")
    
    if frontend_dist == "../src":
        print("✅ Frontend dist path is correct")
    else:
        print("❌ Frontend dist path may be incorrect")
        return False
    
    if "start_backend_launcher.py" in str(before_dev):
        print("✅ Backend launcher is configured")
    else:
        print("❌ Backend launcher not found in config")
        return False
    
    return True

def check_backend_integration():
    """Check backend startup integration"""
    print("\n=== Backend Integration ===")
    
    launcher = "frontend/src-tauri/start_backend_launcher.py"
    backend_starter = "backend/start_backend.py"
    
    all_good = True
    all_good &= check_file_exists(launcher, "Backend Launcher")
    all_good &= check_file_exists(backend_starter, "Backend Starter")
    
    return all_good

def check_auth_files():
    """Check authentication system files"""
    print("\n=== Authentication System ===")
    
    auth_files = [
        ("frontend/src/auth.js", "Account Manager"),
        ("frontend/src/auth-ui.js", "Auth UI"),
        ("frontend/src/main.js", "Main App"),
        ("frontend/static/auth.css", "Auth Styles")
    ]
    
    all_good = True
    for file_path, description in auth_files:
        all_good &= check_file_exists(file_path, description)
    
    return all_good

def main():
    """Run all verification checks"""
    print("OpenChat 2.0 Tauri Setup Verification")
    print("=" * 40)
    
    # Change to project root if script is run from elsewhere
    script_dir = Path(__file__).parent
    os.chdir(script_dir)
    
    checks = [
        check_css_paths(),
        check_tauri_config(), 
        check_backend_integration(),
        check_auth_files()
    ]
    
    print("\n=== Summary ===")
    if all(checks):
        print("✅ All checks passed! Tauri setup should work correctly.")
        print("\nTo start the app:")
        print("cd frontend && cargo tauri dev")
    else:
        print("❌ Some checks failed. Please fix the issues above.")
        return 1
    
    return 0

if __name__ == "__main__":
    exit(main())
