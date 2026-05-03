
import os

input_file = "dist/assets/index-DcIv0_mZ.css"
output_file = "src/index.css"

with open(input_file, 'r') as f:
    minified = f.read()

# Simple beautifier
beautified = minified.replace("{", " {\n  ").replace("}", "}\n").replace(";", ";\n  ").replace(" ,", ",")
beautified = beautified.replace("  }", "}")

with open(output_file, 'w') as f:
    f.write(beautified)

print("Restored and semi-beautified src/index.css")
