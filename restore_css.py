
import json
import os
import re

log_file = "/Users/orquestasinfonicaw.t./.gemini/antigravity/brain/acdb8ef5-7b4a-46ba-aa17-e7f1b893b10b/.system_generated/logs/overview.txt"
output_file = "/Users/orquestasinfonicaw.t./PLANIFICADOR DE PROYECTOS /seguimiento-lbc/src/index.css"

def extract_index_css():
    last_content = None
    with open(log_file, 'r') as f:
        full_text = f.read()
        # Find all write_to_file/replace_file_content for index.css
        # Looking for "TargetFile":"...src/index.css"
        pattern = re.compile(r'\{"step_index":.*?"tool_calls":\[\{"name":"(?:write_to_file|replace_file_content|multi_replace_file_content)".*?\}\]\}', re.DOTALL)
        
        for match in pattern.finditer(full_text):
            try:
                data = json.loads(match.group())
                for tool in data["tool_calls"]:
                    args = tool["args"]
                    target = args.get("TargetFile", "").replace("\"", "")
                    if "src/index.css" in target:
                        if tool["name"] == "write_to_file":
                            last_content = args.get("CodeContent", "")
                        # We don't handle replace_file_content here, but maybe we should
            except:
                continue
    return last_content

content = extract_index_css()
if content:
    if content.startswith('"') and content.endswith('"'):
        content = content[1:-1]
    decoded = content.replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\")
    with open(output_file, 'w') as out:
        out.write(decoded)
    print("Restored src/index.css from logs")
else:
    print("Could not find index.css in logs")
