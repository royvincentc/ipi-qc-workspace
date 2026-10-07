"""Produce review-only environmental templates and prefilled setup proposals.

No registration, pattern publication, logbook write, or historical result import.
"""
import argparse,hashlib,json,re,sys,zipfile
from pathlib import Path
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'worker'))
import docx_worker as w
from environmental_formats import FAMILIES

def header_fields(blob):
    paragraphs=[w.text(p).strip() for root in w.roots(w.package(blob)).values() for p in root.xpath('.//w:p',namespaces=w.NS)]
    fields={}
    for label,key in [('Category','category'),('Name of Sample','product'),('Area','area'),('Batch/Lot No.','batch'),('Date&Time Received','received'),('Date&Time Released','release')]:
        for i,value in enumerate(paragraphs):
            if value==label:
                values=[v for v in paragraphs[i+1:i+5] if v and v!=':']
                if values:fields[key]=values[0]
                break
    return fields

def prepare(archive_path,example_path,output):
    output=Path(output);output.mkdir(parents=True,exist_ok=True)
    manifest={'status':'awaiting-owner-review','templates':[],'registrationPerformed':False,'patternsPublished':False}
    with zipfile.ZipFile(archive_path) as archive:
        representatives={
            FAMILIES[0]:(str(example_path),Path(example_path).read_bytes()),
            FAMILIES[1]:next((n,archive.read(n)) for n in archive.namelist() if n.endswith('Herbycin Syrup GIP LWJ03.docx')),
            FAMILIES[2]:next((n,archive.read(n)) for n in archive.namelist() if n.endswith('SPCMY - Water Treatment Validation- Source.docx')),
            FAMILIES[3]:next((n,archive.read(n)) for n in archive.namelist() if n.endswith('Warehouse 4 Internal Sampling Area - For Qualification.docx')),
        }
        for family,(source,blob) in representatives.items():
            target=output/(family+'-prepared.docx')
            preparation=w.prepare_template(blob,target,family)
            validation=w.validate_template(target.read_bytes())
            evidence=header_fields(blob);pattern=w.environmental_pattern(w.roots(w.package(blob)),family)
            rows=[{**r,'criterion':'' if re.fullmatch(r'[-\s]*',r['criterion']) else r['criterion'],'date':None} for b in pattern['blocks'] for r in b['instances']]
            proposal={'name':family.replace('environmental-','EM ').replace('-',' '),'category':'EM','family':family,
                      'adaptiveBlocks':family==FAMILIES[0],'requiredFields':preparation['requiredFields'],'rowGrouping':{'mergeColumns':[0,2] if family==FAMILIES[0] else [0,3] if family==FAMILIES[3] else [1]},
                      'blocks':preparation['blocks'],'sanitized':False,'reviewed':False,'productHint':evidence.get('product'),
                      'areaHint':evidence.get('area'),'facility':None,'productId':None,'context':None,'equipmentSet':None,
                      'effectiveFrom':None,'criterionDate':None,'mode':pattern['mode'],
                      'method':'microbial' if family==FAMILIES[1] else 'spc-my','instances':rows}
            blockers=['Owner must review the prepared DOCX before registration.','Confirm canonical product, facility, context, equipment set, effective dates and criterion dates.']
            if not rows:blockers.append('Blank layout supplies no sampling plan. Analyze historical product references separately.')
            if any(not r['criterion'] for r in rows):blockers.append('Missing/dashed criteria require owner confirmation; no thresholds were invented.')
            if any(not r['test'] for r in rows):blockers.append('Ambiguous organism labels require an approved test mapping.')
            if any(r.get('channel') and not r['unit'] for r in rows):blockers.append('Confirm units independently for active and passive air.')
            if evidence.get('category')=='Goods-in-Process':blockers.append('GIP source is Goods-in-Process evidence for layout only; it is not reclassified as an environmental activity.')
            manifest['templates'].append({'family':family,'source':source,'sourceSha256':hashlib.sha256(blob).hexdigest(),'prepared':str(target.resolve()),'validation':validation,'preparationIssues':preparation['issues'],'sourceMetadata':evidence,'proposedSetup':proposal,'approvalBlockers':blockers})
    (output/'review-manifest.json').write_text(json.dumps(manifest,indent=2,ensure_ascii=False),encoding='utf-8')
    (output/'artifact.md').write_text('# Environmental report template review\n\nRetain each source unchanged. The supplied five-column file controls that family. The other families retain their respective archive layouts; they do not inherit five-column widths.\n\nPreserve section sizes, margins, typography, header logos, table grid widths and repeating headings. Growing result tables use inline flow to prevent overlap with headings. Duplicate or stale page counters are replaced with one live PAGE/NUMPAGES counter. Replace only variable metadata, result rows, remarks and sign-off content. GIP locations share the first column with the test; never merge that location-bearing cell. Warehouse keeps both air channels and phase in independent columns. No registration or scientific approval occurs.\n\n'+ '\n'.join(f"- {t['family']}: source `{t['source']}`; SHA-256 `{t['sourceSha256']}`; prepared `{t['prepared']}`." for t in manifest['templates'])+'\n',encoding='utf-8')
    return {'manifest':str((output/'review-manifest.json').resolve()),'templates':len(manifest['templates']),'status':manifest['status']}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('archive');parser.add_argument('--example',required=True);parser.add_argument('--output',required=True);args=parser.parse_args()
    print(json.dumps(prepare(args.archive,args.example,args.output)))
