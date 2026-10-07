"""Extract review candidates from archive bytes; never export historical result cells.

Usage: python scripts/export-environmental-candidates.py ARCHIVE --output OUTPUT_DIR
The manifest is local operational evidence. It is not an approved sampling plan.
"""
import argparse,collections,hashlib,json,re,sys,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'worker'))
from docx_worker import package,roots,environmental_pattern

def export(archive_path,output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    candidates={};exceptions=[];counts=collections.Counter()
    with zipfile.ZipFile(archive_path) as archive:
        for entry in archive.infolist():
            if not entry.filename.lower().endswith('.docx'):continue
            if Path(entry.filename).name.startswith('~$'):counts['lockFiles']+=1;continue
            counts['documents']+=1
            try:
                blob=archive.read(entry);pattern=environmental_pattern(roots(package(blob)),'environmental-gip-4c' if re.search(r'\bGIP\b',entry.filename,re.I) else None)
                if not pattern:raise ValueError('Unsupported layout: confirm water validation / warehouse / other structure separately')
                parts=entry.filename.split('/');product_hint=parts[2] if len(parts)>3 else ''
                path_mode='open-plate' if re.search(r'open\s*plate',entry.filename,re.I) else pattern['mode']
                definition={'productHint':product_hint,'modeHint':path_mode,'family':pattern['family'],'blocks':pattern['blocks']}
                # Preserve equipment and criteria differences. Ignore physical row coordinates.
                signature={**definition,'blocks':[{**b,'table':None,'headerRow':None,'instances':[{k:v for k,v in r.items() if k!='sourceLocation'} for r in b['instances']]} for b in pattern['blocks']]}
                identity=hashlib.sha256(json.dumps(signature,sort_keys=True).encode()).hexdigest()
                evidence={'path':entry.filename,'sha256':hashlib.sha256(blob).hexdigest(),'archiveTimestamp':list(entry.date_time),'criterionDate':None,'timestampIsCriterionDate':False}
                if identity not in candidates:candidates[identity]={'id':identity,'definition':definition,'requiresApproval':True,'evidence':[]}
                candidates[identity]['evidence'].append(evidence);counts['supportedDocuments']+=1
            except Exception as error:exceptions.append({'path':entry.filename,'reason':str(error)});counts['reviewExceptions']+=1
    result={'archiveSha256':hashlib.sha256(Path(archive_path).read_bytes()).hexdigest(),'counts':dict(counts),'candidateCount':len(candidates),'candidates':list(candidates.values()),'exceptions':exceptions,'instruction':'Inspect representative DOCX files in Settings → Report templates, prepare layouts, then confirm product, facility, area, equipment set, dates, criteria and outputs before publishing.'}
    (output/'candidates.json').write_text(json.dumps(result,indent=2,ensure_ascii=False),encoding='utf-8')
    return {'counts':dict(counts),'candidateCount':len(candidates),'manifest':str(output/'candidates.json')}
if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('archive');parser.add_argument('--output',required=True);args=parser.parse_args();print(json.dumps(export(args.archive,args.output)))
