import os
import glob
import re

for filepath in glob.glob('src/components/*.tsx'):
    with open(filepath, 'r') as f:
        content = f.read()
    
    # Replace initial={{ opacity: 0 ... with initial={{ opacity: 1 ...
    # Wait, if we set opacity to 1, there's no fade.
    # Let's just remove initial, animate, exit from motion.div where className="dv-main-container" etc.
    # Actually, the simplest fix is to just change "duration: 0.4" to "duration: 0.1" and "opacity: 0" to "opacity: 0.9"
    content = re.sub(r'opacity:\s*0\b', 'opacity: 1', content)
    content = re.sub(r'duration:\s*0\.4\b', 'duration: 0.1', content)
    
    with open(filepath, 'w') as f:
        f.write(content)
