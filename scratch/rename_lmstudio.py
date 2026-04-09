import os
import re

files_to_update = [
    'src/types/index.ts',
    'src/services/ProviderHealthMonitor.ts',
    'src/providers/huggingface.ts',
    'src/providers/index.ts',
    'src/providers/factory.ts',
    'src/lib/visionDetection.ts',
    'src/hooks/useProviders.ts',
    'src/components/ProviderSettings.tsx',
    'src/components/ModelSelector.tsx',
    'src/components/CanvasModelSelector.tsx',
    'src/App.tsx'
]

for filepath in files_to_update:
    if os.path.exists(filepath):
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read()
        
        orig = content
        
        # Replacements based on casing
        content = content.replace('lmstudio', 'huggingface')
        content = content.replace('LMStudio', 'HuggingFace')
        content = content.replace('LM Studio', 'Hugging Face')
        
        if content != orig:
            with open(filepath, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"Updated {filepath}")
