import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import {setTimeout as delay} from 'node:timers/promises';
import path from 'node:path';
process.env.DEMO_MODE='true';process.env.DEMO_DB_PATH=await mkdtemp(path.resolve('.data/environmental-batch-test-'));
process.env.PRIVATE_STORAGE=await mkdtemp(path.resolve('tmp/environmental-batch-storage-'));
const {db,migrate,close}=await import('../server/db.js');
const {getConfiguration}=await import('../server/configuration.js');
const {scanEnvironmentalBatch,previewEnvironmentalBatch,publishEnvironmentalBatch,approveEnvironmentalAliases}=await import('../server/environmental-batch.js');
await migrate();after(close);
test('an outdated cached ZIP rescans once while retaining its publication ledger',async()=>{
 const archive=execFileSync(process.env.PYTHON_PATH||'python',['-c',`import io,zipfile,sys
from docx import Document
d=Document()
for k,v in [('Category','Environmental Monitoring'),('Name of Sample','Fixture'),('Area','PF2 Compounding')]:
 d.add_paragraph(k);d.add_paragraph(':');d.add_paragraph(v)
t=d.add_table(rows=2,cols=5)
for c,v in zip(t.rows[0].cells,['ANALYSIS DESIRED:','Area','Standard Specifications','Results','Remarks']):c.text=v
for c,v in zip(t.rows[1].cells,['Neogen Accupoint','Spatula','Not more than 100 RLU','987654321','Passed']):c.text=v
doc=io.BytesIO();d.save(doc);archive=io.BytesIO()
with zipfile.ZipFile(archive,'w') as z:z.writestr('fixture.docx',doc.getvalue())
sys.stdout.buffer.write(archive.getvalue())`]);
 const first=await scanEnvironmentalBatch(archive,'fixture.zip','owner');
 const ready=async()=>{
  for(let n=0;n<200;n++){
   const batch=(await db.query('SELECT data FROM files WHERE id=$1',[first.id])).rows[0].data;
   if(batch.status==='ready')return batch;
   assert.notEqual(batch.status,'failed',batch.error);await delay(25);
  }
  assert.fail('Archive scan did not finish');
 };
 const original=await ready();assert.equal(original.candidates.length,1);
 const old={...original,scanRevision:'old-scanner',candidates:[],publications:[{fingerprint:'retained-publication'}]};
 await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(old),first.id]);
 const refreshed=await scanEnvironmentalBatch(archive,'fixture.zip','owner');
 assert.equal(refreshed.id,first.id);assert.equal(refreshed.status,'scanning');
 const current=await ready();assert.equal(current.candidates.length,1);assert.notEqual(current.scanRevision,'old-scanner');
 assert.deepEqual(current.publications,old.publications);assert.equal(current.candidates[0].referenceId,original.candidates[0].referenceId);
 assert.doesNotMatch(JSON.stringify(current.candidates),/987654321|Passed/);
 assert.equal((await scanEnvironmentalBatch(archive,'fixture.zip','owner')).status,'ready');
 await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(old),first.id]);
 const preview=await previewEnvironmentalBatch(first.id,{facility:'',context:'',criterionDate:'',effectiveFrom:'',createProducts:false,layouts:{}});
 assert.equal(preview.status,'scanning');assert.deepEqual(preview.proposals,[]);await ready();
});
test('unchanged parameters need no entered dates; bulk publish creates products once and retries without duplicate profiles',async()=>{
 const config=await getConfiguration();
 const template={id:'layout',name:'Approved master',path:'fixture.docx',category:'EM',family:'environmental-grouped-5c',verified:true,revision:'1',manifest:{tokens:['tests','test','location','criterion','value','remarks'],adaptiveBlocks:true}};
 await db.query('INSERT INTO templates(id,data) VALUES($1,$2)',['layout',JSON.stringify(template)]);
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['ref',JSON.stringify({kind:'reference'})]);
 const candidate={id:'candidate1',productHint:'New Environmental Product',areaHint:'Compounding',family:template.family,mode:'surface',referenceId:'ref',sourceName:'source.docx',sourceSha256:'hash',evidence:[{path:'source.docx',sha256:'hash',product:'New Environmental Product'}],rows:[{test:'SPC',label:'SPC',location:'Mixing tank',stage:'',block:'tests',criterion:'Nmt 100 cfu/mL',unit:'cfu/mL',sourceLocation:'table1:row1'}]};
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['batch',JSON.stringify({id:'batch',kind:'environmental-import',status:'ready',name:'fixture',documents:1,candidates:[candidate],exceptions:[],publications:[]})]);
 const rules={facility:'Plant 1',context:'Regular',criterionDate:'',effectiveFrom:'',createProducts:true,unchanged:true,layouts:{[template.family]:template.id}};
 const preview=await previewEnvironmentalBatch('batch',rules);assert.deepEqual(preview.proposals[0].issues,[]);assert.match(preview.proposals[0].profile.outputs[0].instances[0].date,/^\d{4}-\d{2}-\d{2}$/);assert.equal(preview.proposals[0].profile.effectiveFrom,'0001-01-01');
 const result=await publishEnvironmentalBatch('batch',rules,[preview.proposals[0].key],config.revision,'owner');assert.equal(result.results[0].status,'published');
 const again=await previewEnvironmentalBatch('batch',rules);assert.equal(again.proposals[0].published,true);
 const retry=await publishEnvironmentalBatch('batch',rules,[again.proposals[0].key],again.configurationRevision,'owner');assert.equal(retry.results[0].status,'already-published');
 await db.query("UPDATE files SET data=jsonb_set(data,'{publications}','[]'::jsonb) WHERE id='batch'");
 const recovered=await publishEnvironmentalBatch('batch',rules,[again.proposals[0].key],again.configurationRevision,'owner');assert.equal(recovered.results[0].status,'already-published');
 assert.equal((await db.query('SELECT id FROM environmental_profiles')).rows.length,1);
 await assert.rejects(()=>publishEnvironmentalBatch('batch',rules,[again.proposals[0].key],config.revision,'owner'),/Settings changed/);
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['ref2',JSON.stringify({kind:'reference'})]);
 const extra={...candidate,id:'candidate2',referenceId:'ref2',rows:candidate.rows.map(row=>({...row,stage:'After 48 hours of incubation period:',criterion:'Not more than100 cfu/mL'}))};
 await db.query("UPDATE files SET data=jsonb_set(data,'{candidates}',$1::jsonb) WHERE id='batch'",[JSON.stringify([candidate,extra])]);
 const additional=await previewEnvironmentalBatch('batch',rules);assert.deepEqual(additional.proposals[0].issues,[]);
 const revised=await publishEnvironmentalBatch('batch',rules,[additional.proposals[0].key],additional.configurationRevision,'owner');assert.equal(revised.results[0].status,'published');
 const profiles=(await db.query('SELECT data FROM environmental_profiles')).rows.map(r=>r.data);assert.equal(profiles.length,2);assert.equal(profiles.filter(p=>p.active).length,1);assert.equal(profiles.find(p=>p.active).evidenceIds.length,2);
 const contextual={...candidate,id:'contextual',evidence:[{...candidate.evidence[0],product:'New Environmental Product (Pilot 1)'}]};
 const distinct={...candidate,id:'variant',evidence:[{...candidate.evidence[0],product:'New Environmental Product (China)'}]};
 await db.query("UPDATE files SET data=jsonb_set(data,'{candidates}',$1::jsonb) WHERE id='batch'",[JSON.stringify([candidate,contextual,distinct])]);
 const approved=await approveEnvironmentalAliases('batch','owner');assert.ok(approved.aliases.some(a=>a.alias.endsWith('(Pilot 1)')));assert.ok(approved.held.some(a=>a.name.endsWith('(China)')));
 assert.equal((await approveEnvironmentalAliases('batch','owner')).aliases.length,0);
});
