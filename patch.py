with open('server/reports.ts', 'r', encoding='utf-8') as f:
    code = f.read()

search = "month:'long'"
replace = "month:'2-digit'"

if search in code:
    code = code.replace(search, replace)
    with open('server/reports.ts', 'w', encoding='utf-8') as f:
        f.write(code)
    print("Patched")
else:
    print("Not found")
