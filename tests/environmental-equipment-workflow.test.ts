import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
process.env.DEMO_MODE='true';process.env.DEMO_DB_PATH=await mkdtemp(path.resolve('.data/equipment-test-'));
const {db,migrate,close}=await import('../server/db.js');
const {getConfiguration,saveConfiguration}=await import('../server/configuration.js');
const {publishEnvironmentalProfile}=await import('../server/environmental.js');
const {resolveReportSetup,createAutomaticDraft,getDraft,saveDraft,reportTemplateFields}=await import('../server/reports.js');
await migrate();after(close);
const actor={email:'fixture@example.test',name:'Fixture Analyst',role:'administrator' as const};
test('server composes immutable paired drafts from validated quantities and approved source revisions',async()=>{
 const current=await getConfiguration(),config=structuredClone(current.value);
 config.products.push({id:'equipment-product',name:'Fixture Quantity Product',category:'EM',code:'',active:true,aliases:[]});
 for(const id of ['SPC','MY']){const item=config.tests.find(t=>t.id===id)!;if(!item.categories.includes('EM'))item.categories.push('EM');}
 if(!config.tests.some(t=>t.id==='ACCUPOINT'))config.tests.push({...config.tests.find(t=>t.id==='SPC')!,id:'ACCUPOINT',name:'Accupoint',reportLabel:'Accupoint',shortName:'Accupoint',sheetHeader:'',sheetColumn:null,unit:'RLU',categories:['EM'],active:true});
 await saveConfiguration(config,current.revision,actor.email);
 const template={id:'equipment-layout',name:'Equipment fixture',category:'EM',family:'environmental-grouped-5c',verified:true,revision:'layout-1',path:'unused.docx',manifest:{tokens:['tests','test','location','criterion','value','remarks'],requiredFields:['analysisDate']}};
 const sample={id:'quantity-sample',ml:'ML-EM-26-0001',name:'Fixture Quantity Product',batch:'FIXTURE',received:'2026-10-09',category:'EM',context:'Regular',status:'',remarks:'',fields:{facility:'PF1',area:'Filling'},source:{fingerprint:'source-1',observedAt:'2026-10-09',raw:[]}};
 const row={test:'SPC',label:'SPC',type:'numeric',location:'Nozzle 4',unit:'cfu/mL',criterion:'Not more than 100 cfu/mL',source:'quantity-evidence',sourceLocation:'Table 1',date:'2026-10-01',dateBasis:'owner-confirmed',revision:'row-1'};
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['quantity-evidence',JSON.stringify({kind:'reference'})]);
 await db.query('INSERT INTO templates(id,data) VALUES($1,$2)',[template.id,JSON.stringify(template)]);
 await db.query('INSERT INTO samples(id,data) VALUES($1,$2)',[sample.id,JSON.stringify(sample)]);
 const pattern=await publishEnvironmentalProfile({name:'Fixture quantities',productId:'equipment-product',product:sample.name,facility:'PF1',area:'Filling',context:'Regular',equipmentSet:'Historical nozzle 4',effectiveFrom:'2026-10-01',evidenceIds:['quantity-evidence'],outputs:[
  {id:'accupoint',name:'Accupoint',method:'accupoint',mode:'surface',templateId:template.id,templateRevision:template.revision,instances:[{...row,test:'ACCUPOINT',label:'Accupoint',unit:'RLU',criterion:'Not more than 100 RLU'}]},
  {id:'spcmy',name:'SPCMY',method:'spc-my',mode:'surface',templateId:template.id,templateRevision:template.revision,instances:[row,{...row,test:'MY',label:'MY',criterion:'Not more than 30 cfu/mL'}]},
 ]},actor.email);
 const setup=await resolveReportSetup(sample.id,{},true);assert.equal(setup.layoutResolution?.status,'selection');assert.equal(setup.template,undefined);assert.ok(setup.environmental?.equipment);
 await assert.rejects(createAutomaticDraft(sample.id,actor),/equipment/i);
 const selection={equipmentRevision:setup.environmental!.equipment!.revision,equipment:[{id:'nozzle',quantity:3}]};
 const ready=await resolveReportSetup(sample.id,selection,true);assert.equal(ready.layoutResolution?.status,'ready');assert.equal(ready.environmental?.pairedOutputs?.length,2);
 const primary=await createAutomaticDraft(sample.id,actor,selection),members=primary.environmentalSession!.members;
 assert.equal(members.length,2);const drafts=await Promise.all(members.map(m=>getDraft(m.draftId)));
 assert.deepEqual(drafts.map(d=>d.results.length),[3,6]);assert.ok(drafts.every(d=>d.results.every(r=>r.state==='not_entered'&&r.value===''&&r.remarks==='')));
 for(const draft of drafts){assert.deepEqual([...new Set(draft.results.map(r=>r.location))],['Nozzle 1','Nozzle 2','Nozzle 3']);assert.deepEqual(draft.environmentalSnapshot?.equipment?.selection,selection.equipment);assert.equal(reportTemplateFields(draft,template)['overall.remarks'],'');}
 const automatic=await saveDraft(primary.id,1,primary.results.map(r=>({...r,state:'entered' as const,value:'100',remarks:'Passed',remarkMode:'automatic' as const})),primary.fields,actor.email);
 assert.ok(automatic.results.every(r=>r.remarks==='Failed'),'server must derive automatic remarks instead of trusting a submitted pass');
 const manual=await saveDraft(primary.id,automatic.revision,automatic.results.map(r=>({...r,remarks:'Passed',remarkMode:'manual' as const})),automatic.fields,actor.email);
 const edited=await saveDraft(primary.id,manual.revision,manual.results.map(r=>({...r,value:'150'})),manual.fields,actor.email);
 assert.ok((await getDraft(edited.id)).results.every(r=>r.remarks==='Passed'&&r.remarkMode==='manual'));
 await assert.rejects(saveDraft(primary.id,edited.revision,edited.results.map((r,i)=>i? r:{...r,location:'Nozzle 99'}),edited.fields,actor.email),/identities cannot be changed/);
 const count=Number((await db.query('SELECT count(*) AS count FROM drafts')).rows[0].count);
 await assert.rejects(createAutomaticDraft(sample.id,actor,{...selection,equipmentRevision:'stale'}),/changed/);
 await assert.rejects(createAutomaticDraft(sample.id,actor,{...selection,equipment:[{id:'nozzle',quantity:151}]}),/300-row/);
 assert.equal(Number((await db.query('SELECT count(*) AS count FROM drafts')).rows[0].count),count);
 await publishEnvironmentalProfile({...pattern,name:'Additional approved equipment',equipmentSet:'Spatula',outputs:pattern.outputs.map(output=>({...output,instances:output.instances.map(instance=>({...instance,location:'Spatula'}))}))},actor.email);
 const expanded=await resolveReportSetup(sample.id,{profileId:pattern.id},true);
 assert.equal(expanded.environmental!.equipment!.items.find(item=>item.id==='spatula')!.defaultQuantity,0);
 const manualSelection={profileId:pattern.id,equipmentRevision:expanded.environmental!.equipment!.revision,equipment:[{id:'nozzle',quantity:1},{id:'spatula',quantity:1}]};
 const added=await createAutomaticDraft(sample.id,actor,manualSelection);
 const paired=await Promise.all(added.environmentalSession!.members.map(member=>getDraft(member.draftId)));
 assert.deepEqual(paired.map(d=>d.results.length),[2,4]);
 assert.ok(paired.every(d=>d.results.some(result=>result.location==='Spatula 1')));
 assert.ok(paired.every(d=>d.environmentalSnapshot?.equipment?.selection.some(item=>item.id==='spatula'&&item.quantity===1)));
});
