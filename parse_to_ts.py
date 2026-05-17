import json
with open('sheets_data.json') as f: data = json.load(f)
tb = data.get("TEAM BUILDING 2 MEDIOS", [])
courses = {"2MA": (0, 2), "2MB": (4, 6), "2MC": (8, 10), "2MD": (12, 14)}
groups = {}
for course, (name_col, role_col) in courses.items():
    current_group = None
    group_members = []
    for row in tb:
        name_key = f"Unnamed: {name_col}" if name_col > 0 else "Unnamed: 0"
        role_key = f"Unnamed: {role_col}" if role_col > 0 else "Unnamed: 0"
        val, role_val = str(row.get(name_key, "")).strip(), str(row.get(role_key, "")).strip()
        if val == "nan": val = ""
        if role_val == "nan": role_val = ""
        if val.startswith("EQUIPO N°"):
            if current_group is not None:
                while len(group_members) < 4: group_members.append({"name": "", "role": ""})
                forced_roles = ["Coordinador", "Investigador", "Mediador", "Secretario"]
                for i in range(4):
                    group_members[i]["role"] = forced_roles[i]
                    if not group_members[i]["name"] or group_members[i]["name"].lower() == 'nan': group_members[i]["name"] = f"Estudiante {i+1}"
                groups[f"{course}-G{current_group}"] = group_members
            try: current_group = int(val.replace("EQUIPO N°", "").strip())
            except ValueError: current_group = None
            group_members = []
        elif current_group is not None and (val or role_val):
            if "SEGUNDO MEDIO" not in val: group_members.append({"name": val, "role": role_val})
    if current_group is not None:
        while len(group_members) < 4: group_members.append({"name": "", "role": ""})
        forced_roles = ["Coordinador", "Investigador", "Mediador", "Secretario"]
        for i in range(4):
            group_members[i]["role"] = forced_roles[i]
            if not group_members[i]["name"] or group_members[i]["name"].lower() == 'nan': group_members[i]["name"] = f"Estudiante {i+1}"
        groups[f"{course}-G{current_group}"] = group_members

for course in courses.keys():
    for i in range(1, 11):
        key = f"{course}-G{i}"
        if key not in groups: groups[key] = [{"name": f"Estudiante {j+1}", "role": r} for j, r in enumerate(["Coordinador", "Investigador", "Mediador", "Secretario"])]
ts_code = "export const studentGroups2M: Record<string, {name: string, role: string}[]> = " + json.dumps(groups, indent=2) + ";\n"
with open("src/utils/studentGroups.ts", "w") as f: f.write(ts_code)
