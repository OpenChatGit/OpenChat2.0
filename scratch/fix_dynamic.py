import os
import re

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orig = content
            
            def get_rel():
                rel = os.path.relpath('src/lib/api.ts', os.path.dirname(path))
                rel = rel.replace('\\\\', '/').replace('\\', '/').replace('.ts', '')
                if not rel.startswith('.'):
                    rel = './' + rel
                return rel

            rel = get_rel()
            
            content = re.sub(r'await\s+import\([\'\"]@tauri-apps/api/core[\'\"]\)', f'await import("{rel}")', content)
            content = re.sub(r'await\s+import\([\'\"]@tauri-apps/plugin-fs[\'\"]\)', f'await import("{rel}")', content)
            content = re.sub(r'from\s+[\'\"]@tauri-apps/api/window[\'\"]', f'from "{rel}"', content)
            content = re.sub(r'from\s+[\'\"]@tauri-apps/api/app[\'\"]', f'from "{rel}"', content)
            content = re.sub(r'from\s+[\'\"]@tauri-apps/plugin-opener[\'\"]', f'from "{rel}"', content)
            
            if content != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Fixed {path}')
