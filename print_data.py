import json
with open('sheets_data.json') as f:
    data = json.load(f)

# The TEAM BUILDING 2 MEDIOS sheet seems to contain the roles.
# Let's inspect its structure.
tb = data.get("TEAM BUILDING 2 MEDIOS", [])
print(json.dumps(tb[:15], indent=2))
