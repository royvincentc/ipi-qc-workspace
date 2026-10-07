"""Inspect 2026 headers, footers, page settings and package risks without modifying DOCX."""
import collections
import io
import json
import re
import zipfile
from pathlib import Path
from xml.etree import ElementTree as E

NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+NS['w']+'}'
out=Path('output/environmental-template-analysis')
settings=collections.Counter()
stats=collections.Counter()
examples=[]
header_records=[]
with zipfile.ZipFile('C:/Users/Roy/Documents/PF-Environmental Monitoring.zip') as archive:
    for info in archive.infolist():
        if '/2026/' not in info.filename or not info.filename.endswith('.docx') or Path(info.filename).name.startswith('~$'):
            continue
        with zipfile.ZipFile(io.BytesIO(archive.read(info))) as doc:
            parts={n:doc.read(n) for n in doc.namelist()}
        docs={n:E.fromstring(b) for n,b in parts.items() if re.match(r'word/(document|header\d+|footer\d+)\.xml$',n)}
        stats['documents']+=1
        fields=' '.join(' '.join(x.text or '' for x in root.findall('.//w:instrText',NS)) for root in docs.values())
        for name,flag in [('pageField',bool(re.search(r'\bPAGE\b',fields))),('numPagesField',bool(re.search(r'\bNUMPAGES\b',fields))),('externalRelationships',any(b'TargetMode="External"' in b for n,b in parts.items() if n.endswith('.rels'))),('drawings',any(root.findall('.//w:drawing',NS) or root.findall('.//w:pict',NS) for root in docs.values())),('comments','word/comments.xml' in parts),('trackedChanges',any(root.findall('.//w:ins',NS) or root.findall('.//w:del',NS) for root in docs.values()))]:
            if flag:stats[name]+=1
        document=docs['word/document.xml']
        header_paragraphs=[''.join(t.text or '' for t in p.findall('.//w:t',NS)).strip() for n,root in docs.items() if 'header' in n for p in root.findall('.//w:p',NS)]
        candidate_fields={}
        for index,label in enumerate(header_paragraphs):
            if label in ['Category','Date&Time Received','Name of Sample','Date&Time Released','Date Mfd.','Batch/Lot No.','Fill Vol./Wt.','Expiry Date','Batch/Lot Size','Requested by','Area','Logbook','Temperature','Relative Humidity']:
                following=header_paragraphs[index+1:index+5]
                if ':' in following and following.index(':')+1<len(following):
                    candidate_fields[label]=following[following.index(':')+1]
        ml=sorted(set(re.findall(r'ML-EM-\d{2}-\d+', ' '.join(header_paragraphs))))
        if ml:stats['headerMLPresent']+=1
        header_records.append({'path':info.filename,'mlCandidates':ml,'fields':candidate_fields})
        for section in document.findall('.//w:sectPr',NS):
            page=section.find('w:pgSz',NS)
            margin=section.find('w:pgMar',NS)
            settings[json.dumps({'page':page.attrib if page is not None else {},'margins':margin.attrib if margin is not None else {}},sort_keys=True)]+=1
        if len(examples)<2 or ('Omega Pain Killer' in info.filename and len(examples)<3):
            examples.append({'path':info.filename,'parts':{n:[''.join(t.text or '' for t in p.findall('.//w:t',NS)) for p in root.findall('.//w:p',NS)] for n,root in docs.items() if n!='word/document.xml'}})
result={'stats':stats,'pageSettings':settings,'headerFooterExamples':examples,'headerRecords':header_records}
(out/'package-analysis.json').write_text(json.dumps(result,indent=2),encoding='utf-8')
print(json.dumps({'stats':stats,'pageSettingVariants':len(settings),'examples':examples},indent=2))
