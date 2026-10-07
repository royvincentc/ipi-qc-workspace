"""Summarize extracted archive patterns and a read-only current logbook snapshot."""
import collections
import hashlib
import json
import re
from pathlib import Path

OUT = Path('output/environmental-template-analysis')
archive = json.loads((OUT/'archive-pattern-analysis.json').read_text(encoding='utf-8'))
live = json.loads((OUT/'live-logbook-2026-10-07.json').read_text(encoding='utf-8'))
profiles = {}
product_summary = {}
for document in archive['documents2026']:
    body = []
    for table in document['tables']:
        anchors = {}
        rows = []
        for row in table['rows'][table['headerRow']+1:]:
            logical = {}
            for cell in row['cells']:
                col = cell['col']
                if cell['merge'] == 'continue':
                    value = anchors.get(col, cell['text'])
                else:
                    value = cell['text']
                    anchors[col] = value
                logical[col] = value
            if table['gridColumns'] == 5:
                label = logical.get(0, '')
                test = 'Accupoint' if 'accupoint' in label.lower() else 'SPC' if 'plate count' in label.lower() else 'MY' if 'yeast' in label.lower() else label
                stage = re.search(r'After.*?incubation.*?:', label, re.I)
                rows.append({'test':test,'location':logical.get(1,''),'criterion':logical.get(2,''),'stage':stage.group(0) if stage else ''})
            else:
                rows.append({'test':logical.get(0,''),'criterion':logical.get(1,'')})
        body.append({'columns':table['gridColumns'],'rows':rows})
    shape = json.dumps(body, sort_keys=True)
    key = document['productFolder']+' / '+document['method']+' / '+document['mode']+' / '+hashlib.sha256(shape.encode()).hexdigest()[:10]
    profile = profiles.setdefault(key, {'product':document['productFolder'],'method':document['method'],'mode':document['mode'],'layout':document['layoutFamily'],'documents':0,'example':document['path'],'blocks':body})
    profile['documents'] += 1
    summary = product_summary.setdefault(document['productFolder'], {'documents':0,'methods':collections.Counter(),'resultRows':[],'uniqueLocationCounts':[],'profiles':set()})
    summary['documents'] += 1
    summary['methods'][document['method']+' / '+document['mode']] += 1
    summary['resultRows'].append(sum(len(b['rows']) for b in body))
    summary['uniqueLocationCounts'].append(len(set(r.get('location','') for b in body for r in b['rows'] if r.get('location',''))))
    summary['profiles'].add(key)
for value in product_summary.values():
    value['resultRowRange'] = [min(value['resultRows']), max(value['resultRows'])]
    value['uniqueLocationRange'] = [min(value['uniqueLocationCounts']),max(value['uniqueLocationCounts'])]
    value['profileCount'] = len(value.pop('profiles'))
    value.pop('resultRows');value.pop('uniqueLocationCounts')
log_rows = []
tabs = []
for tab in live['tabs']:
    found = []
    for index, row in enumerate(tab['values'][4:],5):
        if any(str(v or '').strip().lower() == 'reports generated' for v in row):
            break
        if len(row)>2 and re.fullmatch(r'ML-EM-\d{2}-\d+',str(row[2] or '').strip(),re.I):
            item={'tab':tab['tab'],'row':index,'values':row}
            found.append(item);log_rows.append(item)
    tabs.append({'tab':tab['tab'],'title':tab['values'][0], 'header':tab['values'][3], 'activityRows':len(found)})
def values(index):
    return collections.Counter(str((r['values']+[None]*18)[index] or '').strip() for r in log_rows)
duplicate = {k:v for k,v in values(2).items() if v>1}
summary = {'liveReadAt':live['readAt'],'liveTabs':tabs,'liveActivityRows':len(log_rows),'distinctML':len(values(2)),'duplicateML':duplicate,'liveAreas':values(4),'liveCategories':values(5),'liveSecondaryCategories':values(6),'liveFacilities':values(1),'missingCounts':{name:values(i)[''] for i,name in [(0,'received'),(1,'facility'),(3,'product'),(4,'area'),(7,'batch'),(8,'equipment'),(9,'samplers'),(10,'plates')]},'archiveProductPatterns':product_summary,'archiveCandidateProfileCount':len(profiles)}
(OUT/'pattern-summary.json').write_text(json.dumps(summary,indent=2),encoding='utf-8')
(OUT/'candidate-sampling-patterns.json').write_text(json.dumps(list(profiles.values()),indent=2),encoding='utf-8')
print(json.dumps(summary,indent=2))
print('COMMON CANDIDATES')
for profile in sorted(profiles.values(), key=lambda p:p['documents'],reverse=True)[:12]:
    print(json.dumps(profile))
