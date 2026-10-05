with open('src/reports.tsx', 'r', encoding='utf-8') as f:
    code = f.read()

code = code.replace(r'className=\"icon-button\"', 'className="icon-button"')

with open('src/reports.tsx', 'w', encoding='utf-8') as f:
    f.write(code)
print("Fixed!")
