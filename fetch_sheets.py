import pandas as pd
import json
url = "https://docs.google.com/spreadsheets/d/1kagImj0aUR4iaGFwUSUji0RhtOzKcr2JlEMWKHAX7Fo/export?format=xlsx"
xls = pd.ExcelFile(url)
data = {}
for sheet in ["2MA", "2MB", "2MC", "2MD", "TEAM BUILDING 2 MEDIOS"]:
    if sheet in xls.sheet_names:
        df = pd.read_excel(xls, sheet)
        data[sheet] = df.to_dict(orient="records")
print(json.dumps(data))
