"""Environmental layout adapters. Extract plans, never historical result values."""
import re

FAMILIES = ('environmental-grouped-5c', 'environmental-gip-4c',
            'environmental-water-4c', 'environmental-warehouse-phase-air-7c')

def tables(root, family=None):
    import docx_worker as w
    found=[]
    environmental='environmentalmonitoring' in re.sub(r'\W', '', w.text(root).lower())
    for index, table in enumerate(root.xpath('.//w:body/w:tbl',namespaces=w.NS)):
        rows=table.findall(w.W+'tr')
        for hi,row in enumerate(rows[:3]):
            labels={c:re.sub(r'[^a-z]','',w.text(cell).lower()) for c,cell in w.logical_cells(row).items()}
            columns={}
            aliases={'test':['analysisdesired'], 'location':['area','location','arealocation'],
                     'criterion':['standardspecifications','standardspecification'],
                     'value':['results','actualresults'], 'remarks':['remarks'], 'phase':['phase']}
            for role,names in aliases.items():
                hits=[c for c,label in labels.items() if label in names]
                if len(hits)==1:columns[role]=hits[0]
            if {'test','phase','location','criterion','remarks'}<=columns.keys() and hi+1<len(rows):
                sub={c:re.sub(r'[^a-z]','',w.text(cell).lower()) for c,cell in w.logical_cells(rows[hi+1]).items()}
                for role,label in [('activeValue','activeair'),('passiveValue','passiveair')]:
                    hits=[c for c,value in sub.items() if value==label]
                    if len(hits)==1:columns[role]=hits[0]
                if {'activeValue','passiveValue'}<=columns.keys():
                    columns.pop('value',None);found.append((index,table,hi+1,columns));break
            if {'test','location','criterion','value','remarks'}<=columns.keys():
                columns.pop('phase',None);found.append((index,table,hi,columns));break
            if {'test','criterion','value','remarks'}<=columns.keys() and len(labels)==4 and (environmental or family in FAMILIES[1:3]):
                found.append((index,table,hi,columns));break
    return found

def test_id(label):
    value=re.sub(r'\s+',' ',label).lower()
    if 'accupoint' in value:return 'ACCUPOINT'
    if 'plate count' in value:return 'SPC'
    if 'yeast' in value:return 'MY'
    for test,pattern in [('EC',r'\be\.?\s*coli\b|escherichia'),('SA',r'\bs\.?\s*aureus\b|staphylococcus'),('SAL',r'salmonella'),('ENT',r'enterobacter')]:
        if re.search(pattern,value):return test
    return ''

def pattern(docs,family=None):
    import docx_worker as w
    root=docs.get('word/document.xml')
    if root is None:return None
    blocks=[]
    full=' '.join(w.text(r) for r in docs.values())
    # Header text can live in textboxes. No result cell is used for identity or units.
    paragraphs=[w.text(p).strip() for r in docs.values() for p in r.xpath('.//w:p',namespaces=w.NS)]
    specimen=''
    for i,value in enumerate(paragraphs):
        if value=='Name of Sample':
            tail=[v for v in paragraphs[i+1:i+5] if v and v!=':']
            specimen=tail[0] if tail else ''
            break
    detected=family
    scoped_family=family or (FAMILIES[2] if 'environmentalmonitoring' in re.sub(r'\W','',full.lower()) else None)
    for ti,table,header,columns in tables(root,scoped_family):
        anchors={};instances=[];parent_label='';parent_criterion=''
        warehouse='activeValue' in columns
        four='location' not in columns
        if not detected:detected=FAMILIES[3] if warehouse else FAMILIES[2] if four else FAMILIES[0]
        for ri,row in enumerate(table.findall(w.W+'tr')[header+1:],header+1):
            cells=w.logical_cells(row);values={}
            for role in ['test','criterion','location','phase']:
                if role not in columns:continue
                cell=cells.get(columns[role])
                if cell is None:raise ValueError('Incomplete environmental table grid')
                merge=cell.find('./'+w.W+'tcPr/'+w.W+'vMerge');value=w.text(cell).strip()
                if merge is not None and merge.get(w.W+'val','continue')=='continue':value=anchors.get(role,'')
                else:anchors[role]=value
                values[role]=value
            if any('{{' in v for v in values.values()):continue
            label=values.get('test','');criterion=values.get('criterion','')
            if four and family==FAMILIES[1]:
                if not re.match(r'^(Top(?:-Middle)?|Middle(?:-Bottom)?|Bottom|Tank|Bottle\s*\d+|Nozzle\s*\d+)$',label,re.I):
                    parent_label=label;parent_criterion=criterion;continue
                location=label;label=parent_label;criterion=criterion or parent_criterion
            else:location=values.get('location') or specimen
            if not location:location='[Confirm sampling location]'
            stage=values.get('phase','') if warehouse else next(iter(re.findall(r'After.*?incubation.*?:',label,re.I)),'')
            unit=next(iter(re.findall(r'RLU|cfu\s*/\s*(?:mL|g|m3|m³)|\bcfu\b',criterion,re.I)),'')
            common={'test':test_id(label),'label':label,'location':location,'criterion':criterion,'unit':unit,'stage':stage,
                    'sourceLocation':f'word/document.xml:table[{ti}]:row[{ri}]',
                    'needsCriterionReview':not criterion or bool(re.fullmatch(r'[-\s]+',criterion))}
            if warehouse:
                for channel in ['active-air','passive-air']:
                    instances.append({**common,'channel':channel,'unit':'','needsUnitReview':True})
            else:instances.append(common)
        blocks.append({'table':ti,'headerRow':header,'columns':columns,'instances':instances})
    if not blocks:return None
    for index,block in enumerate(blocks):
        tests={r['test'] for r in block['instances']}
        block['id']='tests' if len(blocks)==1 else ('spc' if tests=={'SPC'} else 'my' if tests=={'MY'} else f'block{index+1}')
    mode='phase-air' if detected==FAMILIES[3] else 'water-validation' if detected==FAMILIES[2] else 'gip' if detected==FAMILIES[1] else 'open-plate' if re.search(r'open\s*plate',full,re.I) else 'surface'
    return {'family':detected,'mode':mode,'blocks':blocks,'requiresReview':True}
