import os, re, sys

js_dir = r"c:\Users\pc\Documents\Google Antrigravity Projects\motigo\js"
files = [f for f in os.listdir(js_dir) if f.endswith(".js")]

print(f"Analyzing {len(files)} JS files in {js_dir}...")

exports = {}
imports = {}

for f in files:
    path = os.path.join(js_dir, f)
    with open(path, "r", encoding="utf-8") as file:
        content = file.read()
    
    # Find exports
    exp_matches = re.findall(r"export\s+(?:class|function|const|let|var|default)\s+([A-Za-z0-9_$]+)", content)
    named_exp = re.findall(r"export\s+\{([^}]+)\}", content)
    for ne in named_exp:
        exp_matches.extend([x.strip().split(" as ")[0] for x in ne.split(",") if x.strip()])
    exports[f] = set(exp_matches)

    # Find imports
    imp_matches = re.findall(r"import\s+(?:\{([^}]+)\}|([A-Za-z0-9_$]+))\s+from\s+['\"]([^'\"]+)['\"]", content)
    imports[f] = imp_matches

print("\n--- EXPORTS PER FILE ---")
for f, ex in exports.items():
    print(f"{f}: {sorted(list(ex))}")

print("\n--- CHECKING IMPORT SPECIFIERS ---")
for f, imps in imports.items():
    for group, single, src in imps:
        if src.startswith("./") and src.endswith(".js"):
            target_f = src.replace("./", "")
            if target_f in exports:
                imported_names = [x.strip().split(" as ")[0] for x in group.split(",") if x.strip()] if group else [single]
                for name in imported_names:
                    if name and name not in exports[target_f]:
                        print(f"❌ ERROR in {f}: '{name}' imported from './{target_f}' BUT NOT EXPORTED by {target_f}!")

print("\nAnalysis complete.")
