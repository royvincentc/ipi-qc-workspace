with open('server/index.ts', 'r', encoding='utf-8') as f:
    code = f.read()

search = """import { CUSTOM_TEMPLATE_B64 } from './custom-template.b64.ts';
setTimeout(async () => {
  try {
    const customP = 'templates/custom-template.docx';
    await writeFile(privatePath(customP), Buffer.from(CUSTOM_TEMPLATE_B64, 'base64'));"""

replace = search + """\n    await db.query("DELETE FROM templates WHERE data->>'name' = 'IPI Standardized Micro Layout'");"""

code = code.replace(search, replace)
with open('server/index.ts', 'w', encoding='utf-8') as f:
    f.write(code)
print('Done!')
