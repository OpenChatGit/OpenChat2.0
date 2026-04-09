import os
import re

for root, _, files in os.walk('src'):
    for file in files:
        if file.endswith(('.ts', '.tsx')):
            path = os.path.join(root, file)
            with open(path, 'r', encoding='utf-8') as f:
                content = f.read()
            
            orig = content
            
            # Find all import paths containing backslashes
            def replacer(match):
                imp = match.group(0)
                return imp.replace('\\', '/')
            
            content = re.sub(r'from\s+[\'\"]\.\..*?[\'\"]', replacer, content)
            
            if content != orig:
                with open(path, 'w', encoding='utf-8') as f:
                    f.write(content)
                print(f'Fixed {path}')
