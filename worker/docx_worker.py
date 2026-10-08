"""Private OOXML inspection and generation. No macros, external links or remote renderer."""
import argparse, copy, hashlib, io, json, re, subprocess, tempfile, zipfile
from pathlib import Path
from lxml import etree as E

NS={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
W='{'+NS['w']+'}'
XML=E.XMLParser(resolve_entities=False, no_network=True)

def package(data):
    z=zipfile.ZipFile(io.BytesIO(data))
    if sum(x.file_size for x in z.infolist())>40_000_000 or len(z.infolist())>1000:
        raise ValueError('Document package exceeds safety limit')
    parts={n:z.read(n) for n in z.namelist()}
    for n,b in parts.items():
        if 'vbaProject' in n or n.endswith('.bin') or n.startswith('word/embeddings/'):
            raise ValueError('Embedded objects or macros are not accepted')
        if n.endswith('.rels') and b'TargetMode="External"' in b:
            raise ValueError('External document relationships must be removed before import')
    return parts

def roots(parts):
    return {n:E.fromstring(b,XML) for n,b in parts.items() if re.match(r'word/(document|header\d+|footer\d+)\.xml$',n)}

def text(node):
    return ''.join(node.xpath('.//w:t/text()',namespaces=NS))

def set_text(node,value):
    texts=node.xpath('.//w:t',namespaces=NS)
    if texts:
        texts[0].text=value
        for t in texts[1:]:t.text=''
    else:
        p=node if node.tag==W+'p' else E.SubElement(node,W+'p')
        r=E.SubElement(p,W+'r');E.SubElement(r,W+'t').text=value

def set_noted_by(docs,name='{{report.notedBy}}',role='Assistant Head, Microbiology Laboratory'):
    """User-confirmed standing name; signature and signing date remain separate."""
    for root in docs.values():
        for table in root.xpath('.//w:tbl',namespaces=NS):
            if 'Noted by:' not in text(table):continue
            for cell in table.xpath('./w:tr/w:tc',namespaces=NS):
                paragraphs=cell.findall(W+'p')
                for i,p in enumerate(paragraphs):
                    if text(p).strip()=='Assistant Head, Microbiology Laboratory' and i>0:
                        set_text(paragraphs[i-1],name)
                        set_text(p,role)

def logical_cells(row):
    """Map cells to Word's logical grid, including row offsets and horizontal spans."""
    before=row.find('./'+W+'trPr/'+W+'gridBefore')
    column=int(before.get(W+'val','0')) if before is not None else 0
    cells={}
    for cell in row.findall(W+'tc'):
        span=cell.find('./'+W+'tcPr/'+W+'gridSpan')
        width=int(span.get(W+'val','1')) if span is not None else 1
        for index in range(column,column+width):cells[index]=cell
        column+=width
    return cells

def environmental_tables(root,family=None):
    from environmental_formats import tables
    return tables(root,family)

def environmental_pattern(docs,family=None):
    from environmental_formats import pattern
    return pattern(docs,family)

def ensure_page_fields(parts,docs):
    instructions=' '.join(' '.join(root.xpath('.//w:instrText/text()',namespaces=NS)) for root in docs.values())
    footer=next((root for name,root in docs.items() if 'footer' in name),None)
    if footer is None:
        relns='http://schemas.openxmlformats.org/package/2006/relationships'
        officens='http://schemas.openxmlformats.org/officeDocument/2006/relationships'
        relname='word/_rels/document.xml.rels'
        rels=E.fromstring(parts[relname],XML) if relname in parts else E.Element('{'+relns+'}Relationships',nsmap={None:relns})
        ids={el.get('Id') for el in rels};number=1
        while 'rIdEnvironmentalFooter'+str(number) in ids:number+=1
        rid='rIdEnvironmentalFooter'+str(number);footer_number=1
        while f'word/footer{footer_number}.xml' in parts:footer_number+=1
        name=f'word/footer{footer_number}.xml'
        footer=E.Element(W+'ftr',nsmap={'w':NS['w']});docs[name]=footer
        E.SubElement(rels,'{'+relns+'}Relationship',Id=rid,Type=officens+'/footer',Target=f'footer{footer_number}.xml')
        parts[relname]=E.tostring(rels,xml_declaration=True,encoding='UTF-8')
        types=E.fromstring(parts['[Content_Types].xml'],XML);ctns='http://schemas.openxmlformats.org/package/2006/content-types'
        E.SubElement(types,'{'+ctns+'}Override',PartName='/'+name,ContentType='application/vnd.openxmlformats-officedocument.wordprocessingml.footer+xml')
        parts['[Content_Types].xml']=E.tostring(types,xml_declaration=True,encoding='UTF-8')
        for section in docs['word/document.xml'].xpath('.//w:sectPr',namespaces=NS):
            reference=E.Element(W+'footerReference');reference.set(W+'type','default');reference.set('{'+officens+'}id',rid);section.insert(0,reference)
    # Replace stale static/nested page counters with one canonical live counter.
    for name,root in docs.items():
        if 'footer' not in name:continue
        for paragraph in list(root.xpath('.//w:p',namespaces=NS)):
            if paragraph.xpath('.//w:p',namespaces=NS):continue
            instructions=' '.join(paragraph.xpath('.//w:instrText/text()|.//w:fldSimple/@w:instr',namespaces=NS))
            if re.match(r'^\s*Page\b',text(paragraph),re.I) or re.search(r'\b(?:PAGE|NUMPAGES)\b',instructions):
                parent=paragraph.getparent();parent.remove(paragraph)
                if len(parent)==0:E.SubElement(parent,W+'p')
    p=E.SubElement(footer,W+'p');props=E.SubElement(p,W+'pPr');alignment=E.SubElement(props,W+'jc');alignment.set(W+'val','right')
    for instruction in ['PAGE','NUMPAGES']:
        r=E.SubElement(p,W+'r');label=E.SubElement(r,W+'t');label.text='Page ' if instruction=='PAGE' else ' of ';label.set('{http://www.w3.org/XML/1998/namespace}space','preserve')
        for tag,value in [('fldChar','begin'),('instrText',instruction),('fldChar','end')]:
            r=E.SubElement(p,W+'r');el=E.SubElement(r,W+tag)
            if tag=='fldChar':el.set(W+'fldCharType',value)
            else:el.text=value

def prepare_template(data,output,family=None):
    """Prepare recognized IPI layouts, never declare them verified automatically."""
    parts=package(data);docs=roots(parts);issues=[];required=[];mapped=[];instances=[]
    pattern=environmental_pattern(docs,family);block_options={}
    if pattern:family=pattern['family']
    labels={'Category':'sample.category','Date&Time Received':'sample.received','Name of Sample':'sample.name','Date&Time Released':'releaseDate','Date Mfd.':'manufactureDate','Batch/Lot No.':'sample.batch','Fill Vol./Wt.':'fillVolume','Expiry Date':'expiryDate','Batch/Lot Size':'batchSize','Requested by':'requestedBy','Purpose':'purpose','Logbook':'logbookReference'}
    if pattern:labels.update({'Logbook':'sample.ml','Area':'area','Temperature':'temperature','Relative Humidity':'relativeHumidity','Open Plate Exposure':'openPlateExposure'})
    found=set()
    for part,root in docs.items():
        result_tables={table for _,table,_,_ in environmental_tables(root,family)} if pattern and part=='word/document.xml' else set()
        paras=root.xpath('.//w:p',namespaces=NS)
        for i,p in enumerate(paras):
            if any(parent in result_tables for parent in p.iterancestors()):continue
            label=text(p).strip()
            if pattern and re.match(r'^(Cleaning Validation of|Air Sampling Evaluation of)',label,re.I):
                set_text(p,'Environmental Monitoring of {{area}} - {{sample.name}}');continue
            if label in labels:
                following=paras[i+1:i+4]
                colon=next((j for j,x in enumerate(following) if text(x).strip()==':'),None)
                if colon is None or colon+1>=len(following):
                    issues.append('Unrecognized field structure: '+label);continue
                value=following[colon+1];key=labels[label]
                if pattern and label=='Logbook':set_text(p,'ML number')
                set_text(value,'{{facility}} {{area}} Area ({{type}})' if pattern and label=='Area' else '{{'+key+'}}'+(' {{sample.ml}}' if key=='logbookReference' else ''))
                # A legacy value cell may contain several paragraphs (including
                # a second ML number). Blank the whole value region, not just
                # its first paragraph, while preserving subsequent field labels.
                cell=next((parent for parent in value.iterancestors() if parent.tag==W+'tc'),None)
                if cell is not None:
                    value_paragraphs=cell.xpath('.//w:p',namespaces=NS)
                    for extra in value_paragraphs[value_paragraphs.index(value)+1:]:
                        if text(extra).strip() in labels or text(extra).strip()==':':break
                        set_text(extra,'')
                # Legacy reports can store a person's initial as an automatic list marker.
                # It is not part of w:t and would otherwise survive sanitization.
                props=value.find(W+'pPr')
                numbering=props.find(W+'numPr') if props is not None else None
                if numbering is not None:props.remove(numbering)
                found.add(key);mapped.append({'part':part,'field':key})
                if not key.startswith('sample.') and key!='releaseDate':required.append(key)
        if part=='word/document.xml':
            if pattern:
                for block,(_,table,header,columns) in zip(pattern['blocks'],environmental_tables(root,family)):
                    # Growing result tables must flow after their heading, not float over it.
                    properties=table.find(W+'tblPr')
                    floating=properties.find(W+'tblpPr') if properties is not None else None
                    if floating is not None:properties.remove(floating)
                    rows=table.findall(W+'tr');body=rows[header+1:]
                    if not body:issues.append('Environmental result block has no row prototype');continue
                    prototype=copy.deepcopy(next((r for r in body if len({logical_cells(r).get(c) for c in columns.values()})==len(columns)),body[0]))
                    # A historical row may keep every following row on the same page.
                    # Repeated observations must be able to paginate independently.
                    for paragraph in prototype.xpath('.//w:p',namespaces=NS):
                        props=paragraph.find(W+'pPr')
                        if props is None:props=E.Element(W+'pPr');paragraph.insert(0,props)
                        keep=props.find(W+'keepNext')
                        if keep is None:keep=E.SubElement(props,W+'keepNext')
                        keep.set(W+'val','0')
                    for cell in prototype.findall(W+'tc'):
                        props=cell.find(W+'tcPr')
                        if props is not None:
                            for merge in list(props.findall(W+'vMerge')):props.remove(merge)
                        set_text(cell,'')
                    cells=logical_cells(prototype)
                    for role,column in columns.items():set_text(cells[column],'{{'+role+'}}')
                    marker='tests' if block['id']=='tests' else 'rows.'+block['id']
                    set_text(cells[columns['test']],'{{'+marker+'}}{{test}}'+('\n{{location}}' if 'location' not in columns else ''))
                    for row in body:table.remove(row)
                    table.append(prototype)
                    for heading in rows[:header+1]:
                        header_props=heading.find(W+'trPr')
                        if header_props is None:header_props=E.Element(W+'trPr');heading.insert(0,header_props)
                        if header_props.find(W+'tblHeader') is None:E.SubElement(header_props,W+'tblHeader')
                    block_options[block['id']]={'mergeColumns':[columns[role] for role in ['test','criterion'] if (role!='test' or 'location' in columns) and any(logical_cells(row)[columns[role]].find('./'+W+'tcPr/'+W+'vMerge') is not None for row in body)]}
            for table in root.xpath('.//w:body/w:tbl',namespaces=NS):
                if pattern and any('{{rows.' in text(r) or '{{tests}}' in text(r) for r in table.findall(W+'tr')):continue
                rows=table.findall(W+'tr')
                if not rows or not any('Results' in text(r) or 'ACTUAL RESULTS' in text(r) for r in rows[:2]):continue
                for ri,row in enumerate(rows):
                    cells=row.findall(W+'tc')
                    if len(cells)<4:continue
                    name,criterion=text(cells[0]),text(cells[1])
                    if not re.search(r'\bNmt\b|\bcfu\b|^Negative$|^Absent|\{\{criterion\}\}',criterion,re.I):continue
                    # Incubation timing belongs to the method, not the report parameter
                    # label. Remove only that paragraph so the test label keeps its style.
                    for paragraph in list(cells[0].findall(W+'p')):
                        if re.match(r'^\s*after\b.*\bincubation\s*:?\s*$',text(paragraph),re.I):cells[0].remove(paragraph)
                    name=text(cells[0])
                    # Parent labels with subsequent per-container rows do not receive results.
                    next_cells=rows[ri+1].findall(W+'tc') if ri+1<len(rows) else []
                    next_label=text(next_cells[0]).strip() if next_cells else ''
                    is_container=lambda x:bool(re.match(r'^(Bottle\s*\d+|Nozzle\s*\d+|Top(?:-Middle)?|Middle(?:-Bottom)?|Bottom|Tank)$',x,re.I))
                    if not is_container(name.strip()) and is_container(next_label):
                        set_text(cells[2],'');set_text(cells[3],'');continue
                    index=len(instances);instances.append({'index':index,'label':name,'originalCriterion':criterion})
                    set_text(cells[1],'{{result.'+str(index)+'.criterion}}')
                    set_text(cells[2],'{{result.'+str(index)+'.value}}')
                    set_text(cells[3],'{{result.'+str(index)+'.remarks}}')
    # Clear historical sign-off regions, preserving role labels and pagination shapes.
    for part,root in docs.items():
        regions=[root] if 'footer' in part else root.xpath('.//w:tbl[contains(string(.),"Analyzed by:")]',namespaces=NS)
        for region in regions:
            for p in region.xpath('.//w:p',namespaces=NS):
                if p.xpath('.//w:p',namespaces=NS):continue  # preserve nested page-number textboxes
                value=text(p).strip()
                if not value:continue
                if value.startswith('REMARKS:'):set_text(p,'REMARKS: {{overallRemarks}}');continue
                if value.startswith('Date:'):set_text(p,'Date: ');continue
                if re.search(r'^(Page |cc\.|Analyzed by:|Noted by:|By:|APPROVED|REJECTED)',value,re.I):continue
                if re.fullmatch(r'(?:Analyst|Microbiologist|(?:Assistant )?Head, Microbiology Laboratory|Microbiology Laboratory)',value,re.I):continue
                set_text(p,'')
            for image in region.xpath('.//*[local-name()="imagedata" or local-name()="blip"]'):
                image.getparent().remove(image)
    set_noted_by(docs)
    found.update(token for root in docs.values() for token in re.findall(r'\{\{\s*([\w.:-]+)\s*\}\}',text(root)))
    missing=({'sample.name','sample.batch','sample.category','sample.received','sample.ml'} if pattern else {'sample.name','sample.batch','sample.category','sample.received','logbookReference'})-found
    if missing:issues.append('Unmapped identifiers: '+', '.join(sorted(missing)))
    if not instances and not pattern:issues.append('No recognized result rows')
    if pattern:ensure_page_fields(parts,docs)
    for n,root in docs.items():parts[n]=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
    # Core metadata, comments and revisions may also carry historical authorship.
    for n in list(parts):
        if n=='docProps/core.xml':
            r=E.fromstring(parts[n],XML)
            for el in list(r):r.remove(el)
            parts[n]=E.tostring(r,xml_declaration=True,encoding='UTF-8')
    for root in docs.values():
        if root.xpath('.//w:ins|.//w:del|.//w:commentRangeStart',namespaces=NS):issues.append('Tracked changes or comments need manual removal')
        if pattern and re.search(r'\bML\s*-\s*[A-Z]{2,4}\s*-\s*\d{2,4}\s*-\s*\d+\b',text(root),re.I):issues.append('Unmapped historical ML identifier needs manual removal')
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in parts.items():z.writestr(n,b)
    if pattern:upgrade_environmental_layout(Path(output).read_bytes(),output)
    return {'requiredFields':sorted(set(required+(['analysisDate'] if pattern else ['analysisDate','logbookReference']))),'mappedFields':mapped,'instances':instances,'blocks':block_options or None,'environmentalPattern':pattern,'family':pattern['family'] if pattern else None,'issues':issues,'verified':False,'sourceSha256':hashlib.sha256(data).hexdigest(),'instruction':'Review all variable fields, blank signature areas and rendered layout before registration.'}

def inventory(data,name='',family_hint=None):
    parts=package(data); docs=roots(parts); paragraphs=[]; tables=[]; criteria=[]
    for part,root in docs.items():
        for i,p in enumerate(root.xpath('.//w:p',namespaces=NS)):
            if text(p).strip():paragraphs.append({'part':part,'paragraph':i,'text':text(p)})
        for ti,t in enumerate(root.xpath('.//w:tbl',namespaces=NS)):
            rows=[[text(c) for c in r.findall(W+'tc')] for r in t.findall(W+'tr')]
            tables.append({'part':part,'table':ti,'rows':rows})
            for ri,row in enumerate(rows):
                if len(row)>1 and (re.search(r'\bNmt\b|\bcfu\b|^Negative$|^Absent',row[1],re.I)):
                    criteria.append({'testLabel':row[0],'criterion':row[1],'unit':next(iter(re.findall(r'cfu\s*/\s*\w+',row[1],re.I)),''),'sourceLocation':f'{part}:table[{ti}]:row[{ri}]:cell[1]'})
    all_text='\n'.join(p['text'] for p in paragraphs)
    fields={}
    for key,label in [('product','Name of Sample'),('category','Category'),('release','Date&Time Released'),('analysis','Date:'),('batch','Batch/Lot No.')]:
        hits=[p for p in paragraphs if label.lower() in p['text'].lower()]
        fields[key]=hits
    labels=' '.join(c['testLabel'] for c in criteria)
    family='container-location' if re.search(r'Bottle \d|Nozzle|Top|Bottom|Tank',labels) else 'routine'
    if re.search(r'Withdrawal|Stability|Stab\.',all_text,re.I):family='stability'
    if re.search(r'Raw Material|Empty Bottle',all_text,re.I):family='raw-material-packaging'
    pattern=environmental_pattern(docs,family_hint or ('environmental-gip-4c' if re.search(r'\bGIP\b',name,re.I) else None))
    if pattern:family=pattern['family']
    return {'name':name,'sha256':hashlib.sha256(data).hexdigest(),'family':family,'environmentalPattern':pattern,'paragraphs':paragraphs,'tables':tables,'candidateCriteria':criteria,'fieldEvidence':fields,'issues':['Product, context and explicit report date require confirmation from the evidence.'],'layout':{'sections':[E.tostring(s).decode() for root in docs.values() for s in root.xpath('.//w:sectPr',namespaces=NS)]}}

def replace_tokens(paragraph,values):
    # Preserve each run's original style and replace across split Word runs.
    nodes=paragraph.xpath('.//w:t',namespaces=NS)
    source=''.join(n.text or '' for n in nodes)
    for match in reversed(list(re.finditer(r'\{\{\s*([\w.:-]+)\s*\}\}',source))):
        key=match.group(1)
        if key not in values: raise ValueError('Unresolved template token: '+key)
        start,end=match.span(); replacement=str(values[key] or '')
        if key=='sample.name.suffix' and not replacement.strip():
            opening=re.search(r'\s*\(\s*$',source[:start]);closing=re.match(r'\s*\)',source[end:])
            if opening and closing:start-=len(opening.group(0));end+=len(closing.group(0))
        offset=0; assigned=False
        for node in nodes:
            value=node.text or ''; a,b=offset,offset+len(value);offset=b
            if b<=start or a>=end:continue
            left=value[:max(0,start-a)];right=value[max(0,end-a):]
            if key in ('overallRemarks','overall.remarks') and replacement=='PASSED' and not assigned:
                run=node.getparent()
                # Split the token run so the label keeps its original formatting.
                parent=run.getparent(); index=parent.index(run)
                props=run.find(W+'rPr')
                if left:
                    prefix=E.Element(W+'r')
                    if props is not None:prefix.append(copy.deepcopy(props))
                    E.SubElement(prefix,W+'t').text=left;parent.insert(index,prefix)
                if right:
                    suffix=E.Element(W+'r')
                    if props is not None:suffix.append(copy.deepcopy(props))
                    E.SubElement(suffix,W+'t').text=right;parent.insert(parent.index(run)+1,suffix)
                if props is None:props=E.Element(W+'rPr');run.insert(0,props)
                for tag in ('b','u'):
                    element=props.find(W+tag)
                    if element is None:element=E.SubElement(props,W+tag)
                    element.set(W+'val','single' if tag=='u' else '1')
                node.text=replacement
            else:
                node.text=left+(replacement if not assigned else '')+right
            node.set('{http://www.w3.org/XML/1998/namespace}space','preserve');assigned=True

def set_vertical_merge(cell, mode):
    props=cell.find(W+'tcPr')
    if props is None:
        props=E.Element(W+'tcPr');cell.insert(0,props)
    merge=props.find(W+'vMerge')
    if merge is None:
        merge=E.SubElement(props,W+'vMerge')
    merge.set(W+'val',mode)
    if mode=='continue':
        for paragraph in cell.findall(W+'p'):
            for child in list(paragraph):
                if child.tag!=W+'pPr':paragraph.remove(child)

def merge_result_groups(rows, rendered_rows, merge_columns):
    """Merge configured cells for contiguous result rows with the same groupKey."""
    if not rendered_rows:return
    keys=[str(row.get('groupKey') or '') for row in rendered_rows]
    if any(not key for key in keys):raise ValueError('Grouped report rows need a groupKey')
    seen=set();start=0
    for i in range(1,len(keys)+1):
        if i<len(keys) and keys[i]==keys[start]:continue
        key=keys[start]
        if key in seen:raise ValueError('Rows for each report group must be contiguous')
        seen.add(key)
        if i-start>1:
            for column in merge_columns:
                for row_index in range(start,i):
                    cells=logical_cells(rows[row_index])
                    if column not in cells:raise ValueError('A configured merge column is outside the repeated table row')
                    set_vertical_merge(cells[column],'restart' if row_index==start else 'continue')
        start=i

def upgrade_environmental_layout(data,output):
    """Update only Area metadata in a retained, already sanitized layout."""
    parts=package(data);docs=roots(parts);updated=any('{{facility}} {{area}} Area ({{type}})' in text(root) for root in docs.values())
    for name,root in docs.items():
        paragraphs=[p for p in root.xpath('.//w:p',namespaces=NS) if not p.xpath('.//w:p',namespaces=NS)]
        for paragraph in paragraphs:
            if re.match(r'^\s*Date\s*:',text(paragraph),re.I):
                values={token:'{{'+token+'}}' for token in re.findall(r'\{\{\s*([\w.:-]+)\s*\}\}',text(paragraph))}
                values.update({'releaseDate':'{{d.release}}','sample.released':'{{d.release}}'})
                replace_tokens(paragraph,values)
        for i,p in enumerate(paragraphs):
            if text(p).strip().rstrip(':')!='Area':continue
            following=paragraphs[i+1:i+5]
            colon=next((j for j,x in enumerate(following) if text(x).strip()==':'),None)
            if colon is None or colon+1>=len(following):continue
            value=following[colon+1]
            if '{{area}}' not in text(value):continue  # never replace historical source data
            set_text(value,'{{facility}} {{area}} Area ({{type}})');updated=True
    if not updated:
        header=next((r for n,r in docs.items() if n.startswith('word/header')),None)
        region=header if header is not None else docs['word/document.xml'].find(W+'body')
        paragraph=E.Element(W+'p');set_text(paragraph,'Area: {{facility}} {{area}} Area ({{type}})')
        section=region.find(W+'sectPr')
        if section is not None:region.insert(region.index(section),paragraph)
        else:region.append(paragraph)
    # Extracted metadata and individual observations are regular-weight data.
    # Keep form headings, method names, locations and specification labels intact.
    for name,root in docs.items():
        for paragraph in root.xpath('.//w:p',namespaces=NS):
            if paragraph.xpath('.//w:p',namespaces=NS):continue
            tokens=re.findall(r'\{\{\s*([\w.:-]+)\s*\}\}',text(paragraph))
            is_metadata='header' in name and bool(tokens)
            is_result=any(t in ('value','activeValue','passiveValue','remarks') or re.fullmatch(r'result\.\d+\.(?:value|remarks)',t) for t in tokens)
            if not (is_metadata or is_result):continue
            for run in paragraph.findall(W+'r'):
                props=run.find(W+'rPr')
                if props is None:props=E.Element(W+'rPr');run.insert(0,props)
                for tag in ['b','bCs']:
                    weight=props.find(W+tag)
                    if weight is None:weight=E.SubElement(props,W+tag)
                    weight.set(W+'val','0')
    for n,root in docs.items():parts[n]=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in parts.items():z.writestr(n,b)
    return {'path':str(output),'tokens':validate_template(Path(output).read_bytes())['tokens']}

def render(template,payload,output,soffice=None):
    parts=package(Path(template).read_bytes()); docs=roots(parts)
    fields=payload['fields']; observations=payload.get('rows',[])
    row_grouping=payload.get('renderOptions',{}).get('rowGrouping')
    if payload.get('renderOptions',{}).get('adaptiveBlocks') and payload.get('blocks') and set(payload['blocks'])!={'tests'}:
        prototypes=[table for root in docs.values() for table in root.xpath('.//w:body/w:tbl',namespaces=NS) if re.search(r'\{\{\s*tests\s*\}\}',text(table))]
        if len(prototypes)!=1:raise ValueError('Adaptive environmental layouts require one master results table')
        prototype=prototypes[0];parent=prototype.getparent();position=parent.index(prototype);parent.remove(prototype)
        options={}
        for offset,block in enumerate(payload['blocks']):
            if not re.fullmatch(r'[a-z][a-z0-9_-]{0,39}',block):raise ValueError('Invalid environmental block identity')
            clone=copy.deepcopy(prototype)
            for paragraph in clone.xpath('.//w:p',namespaces=NS):
                if re.search(r'\{\{\s*tests\s*\}\}',text(paragraph)):set_text(paragraph,re.sub(r'\{\{\s*tests\s*\}\}','{{rows.'+block+'}}',text(paragraph)))
            # Word combines adjacent tables on save unless a paragraph separates them.
            if offset:
                parent.insert(position,E.Element(W+'p'));position+=1
            parent.insert(position,clone);position+=1;options[block]=row_grouping or {}
        payload={**payload,'renderOptions':{**payload.get('renderOptions',{}),'blocks':options}}
    report=payload.get('reportSettings')
    if report:set_noted_by(docs,report['notedBy'],report['notedByRole'])
    repeats=0;seen_blocks=set();named=False
    for root in docs.values():
        for row in list(root.xpath('.//w:tr',namespaces=NS)):
            markers=re.findall(r'\{\{\s*(tests|rows\.[a-z][a-z0-9_-]*)\s*\}\}',text(row))
            if not markers:continue
            if len(markers)!=1:raise ValueError('Each repeating row needs exactly one block marker')
            marker=markers[0];block='tests' if marker=='tests' else marker[5:]
            if block in seen_blocks:raise ValueError('Duplicate repeating row block: '+block)
            seen_blocks.add(block);named=named or marker!='tests'
            if marker!='tests' and block not in payload.get('blocks',{}):raise ValueError('Missing rows for block: '+block)
            selected=payload.get('blocks',{}).get(block,observations if block=='tests' else [])
            if not selected:raise ValueError('A repeating block cannot be empty: '+block)
            options=payload.get('renderOptions',{}).get('blocks',{}).get(block,row_grouping) if payload.get('renderOptions',{}).get('blocks') else row_grouping
            merge_columns=options.get('mergeColumns',[]) if options else []
            allowed=[column for column,cell in logical_cells(row).items() if re.search(r'\{\{\s*(test|criterion)\s*\}\}',text(cell)) and not re.search(r'\{\{\s*(location|phase)\s*\}\}',text(cell))]
            if payload.get('renderOptions',{}).get('environmental'):
                merge_columns=sorted(set(merge_columns+allowed))
            if any(column not in allowed for column in merge_columns):raise ValueError('Only test and specification cells may be merged')
            for column in merge_columns:
                role='test' if re.search(r'\{\{\s*test\s*\}\}',text(logical_cells(row)[column])) else 'criterion'
                groups={}
                for result in selected:
                    group=str(result.get('groupKey') or '')
                    if group in groups and groups[group]!=result.get(role):raise ValueError('Conflicting content in a merged '+role+' group')
                    groups[group]=result.get(role)
            parent=row.getparent();index=parent.index(row);parent.remove(row);repeats+=1
            clones=[]
            for i,result in enumerate(selected):
                clone=copy.deepcopy(row)
                for cell in clone.findall(W+'tc'):
                    props=cell.find(W+'tcPr')
                    if props is not None:
                        for merge in list(props.findall(W+'vMerge')):props.remove(merge)
                for p in clone.xpath('.//w:p',namespaces=NS):replace_tokens(p,{**fields,**result,marker:''})
                parent.insert(index+i,clone)
                clones.append(clone)
            if options or payload.get('renderOptions',{}).get('environmental'):merge_result_groups(clones,selected,merge_columns)
        for p in root.xpath('.//w:p',namespaces=NS):replace_tokens(p,fields)
        if '{{' in text(root):raise ValueError('Unresolved template tokens remain')
    if named and set(payload.get('blocks',{}))-seen_blocks:raise ValueError('Payload includes an unknown row block')
    for n,root in docs.items():parts[n]=E.tostring(root,xml_declaration=True,encoding='UTF-8',standalone=True)
    settings=E.fromstring(parts['word/settings.xml'],XML) if 'word/settings.xml' in parts else E.Element(W+'settings',nsmap={'w':NS['w']})
    update=settings.find(W+'updateFields')
    if update is None:update=E.SubElement(settings,W+'updateFields')
    update.set(W+'val','true');parts['word/settings.xml']=E.tostring(settings,xml_declaration=True,encoding='UTF-8')
    with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
        for n,b in parts.items():z.writestr(n,b)
    if soffice:
        with tempfile.TemporaryDirectory() as tmp:
            profile=Path(tmp,'profile').as_uri()
            subprocess.run([soffice,'-env:UserInstallation='+profile,'--headless','--convert-to','pdf','--outdir',str(Path(output).parent),str(output)],check=True,timeout=90,capture_output=True)
        if not Path(output).with_suffix('.pdf').exists():raise ValueError('Renderer did not produce a PDF preview')
    return {'docx':str(output),'pdf':str(Path(output).with_suffix('.pdf')) if soffice else None}

def validate_template(data):
    parts=package(data);docs=roots(parts);tokens=[]
    for root in docs.values():tokens+=re.findall(r'\{\{\s*([\w.:-]+)\s*\}\}',text(root))
    if not {'sample.name','sample.ml','sample.batch'}.issubset(tokens):raise ValueError('Template needs sample.name, sample.ml and sample.batch placeholders')
    if 'tests' not in tokens and not any(t.startswith(('result.','rows.')) for t in tokens):raise ValueError('Template needs a results block or explicit result placeholders')
    # Signed reference files are never automatically accepted as sanitized templates.
    drawings=sum(len(r.xpath('.//w:drawing|.//w:pict',namespaces=NS)) for r in docs.values())
    fields=' '.join(' '.join(r.xpath('.//w:instrText/text()',namespaces=NS)) for r in docs.values())
    if not re.search(r'\bPAGE\b',fields) or not re.search(r'\bNUMPAGES\b',fields):raise ValueError('Use automatic PAGE and NUMPAGES fields')
    return {'tokens':sorted(set(tokens)),'drawingsRequiringReview':drawings,'requiresHumanSanitizationReview':True}

def demo_template(output):
    from docx import Document
    from docx.shared import Inches,Pt
    d=Document();s=d.sections[0];s.header.paragraphs[0].text='DE-IDENTIFIED DEVELOPMENT FIXTURE · NOT AN IPI APPROVED FORM'
    d.add_heading('Microbiology Analysis Report',0)
    for line in ['Sample: {{sample.name}}','ML number: {{sample.ml}}    Batch: {{sample.batch}}','Date received: {{sample.received}}','Analysis date: {{analysisDate}}    Logbook: {{logbookReference}}']:
        d.add_paragraph(line)
    t=d.add_table(rows=2,cols=4);t.style='Table Grid'
    for c,label in zip(t.rows[0].cells,['Analysis desired','Standard specification','Actual result','Remarks']):c.text=label
    for c,label in zip(t.rows[1].cells,['{{tests}}{{test}}','{{criterion}}','{{value}}','{{remarks}}']):c.text=label
    d.add_paragraph('Analyzed by: {{analyst}}');d.add_paragraph('Reviewed by: __________________    Date: __________')
    p=s.footer.paragraphs[0];p.add_run('Page ')
    for instruction in ['PAGE','NUMPAGES']:
        if instruction=='NUMPAGES':p.add_run(' of ')
        for tag,value in [('fldChar','begin'),('instrText',instruction),('fldChar','end')]:
            r=E.SubElement(p._p,W+'r');el=E.SubElement(r,W+tag)
            if tag=='fldChar':el.set(W+'fldCharType',value)
            else:el.text=value
    d.save(output)

def main():
    p=argparse.ArgumentParser();p.add_argument('action',choices=['inventory','generate','validate','demo','prepare','environmental-batch','environmental-layout']);p.add_argument('--input');p.add_argument('--payload');p.add_argument('--output');p.add_argument('--soffice');p.add_argument('--family');args=p.parse_args()
    if args.action=='environmental-batch':
        from environmental_batch import scan
        result=scan(args.input,args.output)
    elif args.action=='inventory':
        path=Path(args.input)
        if path.suffix.lower()=='.zip':
            result=[]
            with zipfile.ZipFile(path) as z:
                for item in z.infolist():
                    if item.filename.endswith('.docx') and not Path(item.filename).name.startswith('~$'):
                        try:result.append(inventory(z.read(item),item.filename))
                        except Exception as e:result.append({'name':item.filename,'error':str(e)})
        else:result=inventory(path.read_bytes(),path.name,args.family)
    elif args.action=='environmental-layout':result=upgrade_environmental_layout(Path(args.input).read_bytes(),args.output)
    elif args.action=='generate':result=render(args.input,json.loads(Path(args.payload).read_text(encoding='utf8')),args.output,args.soffice)
    elif args.action=='validate':result=validate_template(Path(args.input).read_bytes())
    elif args.action=='prepare':result=prepare_template(Path(args.input).read_bytes(),args.output,args.family)
    else:demo_template(args.output);result={'path':args.output}
    print(json.dumps(result,ensure_ascii=True))
if __name__=='__main__':main()
