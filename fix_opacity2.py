import os
import glob
import re

for filepath in glob.glob('src/components/*.tsx'):
    with open(filepath, 'r') as f:
        content = f.read()
    
    content = re.sub(r'opacity:\s*1\.9\b', 'opacity: 0.9', content)
    
    with open(filepath, 'w') as f:
        f.write(content)
