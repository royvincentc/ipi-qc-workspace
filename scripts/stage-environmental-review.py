"""Stage inspected references and prepared candidates in a local workspace only.

This never registers templates, publishes patterns, or creates sample records.
"""
import argparse,base64,hashlib,json,urllib.request,urllib.parse,zipfile
from pathlib import Path

def stage(manifest_path,archive_path,base_url):
    url=urllib.parse.urlparse(base_url)
    if url.hostname not in ('localhost','127.0.0.1') or url.scheme!='http':raise ValueError('Review staging is restricted to the local workspace')
    def request(route,body=None):
        req=urllib.request.Request(base_url.rstrip('/')+'/api'+route,data=json.dumps(body).encode() if body is not None else None,headers={'Content-Type':'application/json','Origin':'http://localhost:5173'})
        with urllib.request.urlopen(req,timeout=90) as response:return response.read()
    if not json.loads(request('/health')).get('demo'):raise ValueError('Use an isolated local demo workspace for review staging')
    manifest=json.loads(Path(manifest_path).read_text(encoding='utf-8'));staged=[]
    with zipfile.ZipFile(archive_path) as archive:
        for item in manifest['templates']:
            source=Path(item['source']);blob=source.read_bytes() if source.is_file() else archive.read(item['source'])
            if hashlib.sha256(blob).hexdigest()!=item['sourceSha256']:raise ValueError('Source changed after review preparation')
            refs=json.loads(request('/references?scope=templates'))['documents'];reference=None
            for candidate in refs:
                if candidate['kind']=='reference' and candidate['name']==source.name and hashlib.sha256(request('/files/'+candidate['id']+'/download')).hexdigest()==item['sourceSha256']:
                    reference=candidate;break
            if reference is None:reference=json.loads(request('/references/inspect',{'name':source.name,'base64':base64.b64encode(blob).decode()}))
            prepared=json.loads(request('/references/'+reference['id']+'/prepare-template',{'family':item['family']}))
            staged.append({'family':item['family'],'referenceId':reference['id'],'preparedId':prepared['id'],'preparationIssues':prepared['manifest']['issues'],'status':'awaiting-owner-review','registrationPayload':{'name':item['proposedSetup']['name'],'category':'EM','family':item['family'],'preparedId':prepared['id'],'requiredFields':prepared['manifest']['requiredFields'],'rowGrouping':item['proposedSetup']['rowGrouping'],'resultBindings':[],'appliesToProducts':[],'defaultForCategory':False,'sanitized':False}})
    output=Path(manifest_path).with_name('local-review-staging.json');output.write_text(json.dumps(staged,indent=2),encoding='utf-8')
    return {'staged':len(staged),'manifest':str(output),'registered':0,'published':0}

if __name__=='__main__':
    parser=argparse.ArgumentParser();parser.add_argument('manifest');parser.add_argument('--archive',required=True);parser.add_argument('--base-url',default='http://localhost:3001');args=parser.parse_args();print(json.dumps(stage(args.manifest,args.archive,args.base_url)))
