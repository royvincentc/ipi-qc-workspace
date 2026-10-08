"""Deduplicate archive sampling evidence without importing analytical results."""
import hashlib,json,re,zipfile
from pathlib import Path
import docx_worker as w

def fields(docs):
    ordered=sorted(docs.items(),key=lambda item:0 if 'header' in item[0] else 1)
    values=[w.text(p).strip() for _,r in ordered for p in r.xpath('.//w:p',namespaces=w.NS) if not p.xpath('.//w:p',namespaces=w.NS)]
    found={}
    for label,key in [('Category','category'),('Name of Sample','product'),('Area','area'),('Batch/Lot No.','batch'),('Date&Time Received','received')]:
        for i,value in enumerate(values):
            if value.rstrip(':').strip()==label:
                following=[v for v in values[i+1:i+5] if v and v!=':']
                if following and following[0] not in ('Standard Specifications','Results','Remarks','Area','Category','Name of Sample'):
                    found[key]=following[0];break
    header=' '.join(w.text(r) for n,r in docs.items() if 'header' in n)
    found['ml']=next(iter(re.findall(r'\bML-EM-\d{2}-\d+\b',header,re.I)),'')
    return found

def scan(archive_path,output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    groups={};exceptions=[];documents=0;locks=0
    with zipfile.ZipFile(archive_path) as archive:
        entries=archive.infolist()
        if len(entries)>20000 or sum(e.file_size for e in entries)>2_000_000_000:raise ValueError('Archive exceeds processing limit')
        for entry in entries:
            if not entry.filename.lower().endswith('.docx'):continue
            if Path(entry.filename).name.startswith('~$'):locks+=1;continue
            documents+=1
            if documents%50==0:(output/'progress.json').write_text(json.dumps({'documents':documents,'candidates':len(groups),'exceptions':len(exceptions)}),encoding='utf-8')
            try:
                if entry.file_size>40_000_000:raise ValueError('DOCX exceeds processing limit')
                blob=archive.read(entry);docs=w.roots(w.package(blob))
                pattern=w.environmental_pattern(docs,'environmental-gip-4c' if re.search(r'\bGIP\b',entry.filename,re.I) else None)
                if not pattern:raise ValueError('Unsupported environmental layout')
                metadata=fields(docs)
                if re.sub(r'\W','',metadata.get('category','')).lower()!='environmentalmonitoring':raise ValueError('Source category is not Environmental Monitoring; do not reclassify it')
                rows=[{**r,'block':b['id']} for b in pattern['blocks'] for r in b['instances']]
                if not rows:raise ValueError('Blank layout has no sampling locations')
                parts=entry.filename.split('/');product_hint=parts[2] if len(parts)>3 else ''
                area_match=re.search(r'\b(Compounding|Compouding|Filling|Weighing)\b',metadata.get('area','')+' '+Path(entry.filename).name,re.I)
                area=area_match.group(1).title().replace('Compouding','Compounding') if area_match else metadata.get('area','')
                mode='open-plate' if re.search(r'open[\s_-]*plate',entry.filename,re.I) else pattern['mode']
                variant=re.findall(r'\bpro\b|old\s*specs|new\s*specs',metadata.get('product','').lower())
                signature={'productHint':product_hint or metadata.get('product',''),'headerProduct':' '.join(metadata.get('product','').lower().split()),'variant':variant,'area':area,'areaType':re.findall(r'\(([^()]*)\)',metadata.get('area','')),'mode':mode,'family':pattern['family'],'rows':[{k:v for k,v in r.items() if k not in ('sourceLocation',)} for r in rows]}
                identity=hashlib.sha256(json.dumps(signature,sort_keys=True).encode()).hexdigest()
                digest=hashlib.sha256(blob).hexdigest()
                if identity not in groups:
                    (output/(digest+'.docx')).write_bytes(blob)
                    groups[identity]={'id':identity,'productHint':product_hint or metadata.get('product',''),'areaHint':area,'family':pattern['family'],'mode':mode,'rows':rows,'sourceSha256':digest,'sourceName':Path(entry.filename).name,'evidence':[]}
                groups[identity]['evidence'].append({'path':entry.filename,'sha256':digest,**metadata})
            except Exception as error:exceptions.append({'path':entry.filename,'reason':str(error)})
    return {'documents':documents,'lockFiles':locks,'candidates':list(groups.values()),'exceptions':exceptions}
