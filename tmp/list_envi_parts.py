import zipfile,re
from lxml import etree as E
p=r'C:\Users\Roy\Documents\ipi format\ENVI.docx'
with zipfile.ZipFile(p) as z:
 for n in z.namelist():
  if n.startswith('word/') and n.endswith('.xml'):
   try:r=E.fromstring(z.read(n))
   except:continue
   vals=r.xpath('.//*[local-name()="t"]/text()')
   if vals:
    s=''.join(vals)
    if '{{' in s: print(n,'TAGS',re.findall(r'\{\{[^}]+\}\}',s))
    else: print(n,'TEXT',' | '.join(s.splitlines())[:500])
