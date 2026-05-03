
import json
import os

log_file = "/Users/orquestasinfonicaw.t./.gemini/antigravity/brain/acdb8ef5-7b4a-46ba-aa17-e7f1b893b10b/.system_generated/logs/overview.txt"
output_dir = "/Users/orquestasinfonicaw.t./PLANIFICADOR DE PROYECTOS /seguimiento-lbc/restore_temp_v2"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

def extract_file(filename_hint):
    last_content = None
    with open(log_file, 'r') as f:
        full_text = f.read()
        # Find all JSON blocks
        import re
        # This regex looks for {"step_index":...} patterns
        json_pattern = re.compile(r'\{"step_index":.*?"tool_calls":\[\{"name":"(?:write_to_file|replace_file_content|multi_replace_file_content)".*?\}\]\}', re.DOTALL)
        
        for match in json_pattern.finditer(full_text):
            try:
                data = json.loads(match.group())
                for tool in data["tool_calls"]:
                    args = tool["args"]
                    target = args.get("TargetFile", "").replace("\"", "")
                    if filename_hint in target:
                        if tool["name"] == "write_to_file":
                            last_content = args.get("CodeContent", "")
                        # For replace_file_content, we can't easily merge, but let's see
            except:
                continue
    return last_content

files_to_get = [
    "Sidebar.tsx",
    "DashboardView.tsx",
    "CalendarView.tsx",
    "ReportsView.tsx",
    "ClassModal.tsx",
    "AnalyticsView.tsx",
    "FormativeTrackingView.tsx",
    "materials.ts"
]

for f_name in files_to_get:
    content = extract_file(f_name)
    if content:
        # The content in the log is a JSON-encoded string (with double quotes and escaped newlines)
        # We need to unquote it
        if content.startswith('"') and content.endswith('"'):
            content = content[1:-1]
        
        # Unescape newlines and quotes
        decoded = content.replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\")
        
        with open(os.path.join(output_dir, f_name), 'w') as out:
            out.write(decoded)
        print(f"Extracted {f_name}")

