import os
import re

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orig = content
            content = re.sub(r'from\s+[\'\"].*?@tauri-apps/api/core[\'\"]', 'from "@/lib/api"', content)
            content = re.sub(r'from\s+[\'\"].*?@tauri-apps/plugin-fs[\'\"]', 'from "@/lib/api"', content)
            content = re.sub(r'from\s+[\'\"].*?@tauri-apps/api/window[\'\"]', 'from "@/lib/api"', content)
            content = re.sub(r'from\s+[\'\"].*?@tauri-apps/api/app[\'\"]', 'from "@/lib/api"', content)
            content = re.sub(r'from\s+[\'\"].*?@tauri-apps/plugin-opener[\'\"]', 'from "@/lib/api"', content)
            
            if content != orig:
                rel_path = os.path.relpath('src/lib/api.ts', os.path.dirname(path))
                rel_path = rel_path.replace('\\\\', '/').replace('.ts', '')
                if not rel_path.startswith('.'):
                    rel_path = './' + rel_path
                content = content.replace('"@/lib/api"', f'"{rel_path}"')
                
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Updated {path}')
