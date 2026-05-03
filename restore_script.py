
import json
import os

log_file = "/Users/orquestasinfonicaw.t./.gemini/antigravity/brain/acdb8ef5-7b4a-46ba-aa17-e7f1b893b10b/.system_generated/logs/overview.txt"
output_dir = "/Users/orquestasinfonicaw.t./PLANIFICADOR DE PROYECTOS /seguimiento-lbc/restore_temp"

if not os.path.exists(output_dir):
    os.makedirs(output_dir)

files_to_restore = [
    "src/App.tsx",
    "src/index.css",
    "src/components/Sidebar.tsx",
    "src/components/DashboardView.tsx",
    "src/components/CalendarView.tsx",
    "src/components/ReportsView.tsx",
    "src/components/ClassModal.tsx",
    "src/components/AnalyticsView.tsx",
    "src/components/FormativeTrackingView.tsx",
    "package.json"
]

current_contents = {}

with open(log_file, 'r') as f:
    for line in f:
        try:
            # The line might have a prefix like "712:"
            if ":" in line[:10]:
                line = line[line.find("{"):]
            
            data = json.loads(line)
            if data.get("type") == "PLANNER_RESPONSE" and "tool_calls" in data:
                for tool in data["tool_calls"]:
                    name = tool["name"]
                    args = tool["args"]
                    
                    target = args.get("TargetFile", "").replace("\"", "")
                    if not target:
                        # Some args might be differently named or in different structures
                        continue
                        
                    # Normalize target path
                    rel_path = ""
                    for f_path in files_to_restore:
                        if f_path in target:
                            rel_path = f_path
                            break
                    
                    if not rel_path:
                        continue
                        
                    if name == "write_to_file":
                        current_contents[rel_path] = args.get("CodeContent", "").replace("\"", "")
                    elif name == "replace_file_content" or name == "multi_replace_file_content":
                        # We can't easily apply patches without the base, but we can track the evolution
                        # However, for 1.1.29, maybe there's a full write_to_file earlier?
                        pass
        except:
            continue

for rel_path, content in current_contents.items():
    # content is JSON stringified, we need to unescape it
    # But wait, content is already a string from json.loads, 
    # but the log contains double-escaped characters sometimes.
    # We'll just write it and see.
    dest = os.path.join(output_dir, os.path.basename(rel_path))
    with open(dest, 'w') as f:
        f.write(content.replace("\\n", "\n").replace("\\\"", "\"").replace("\\\\", "\\"))

print(f"Restored {len(current_contents)} files to {output_dir}")
