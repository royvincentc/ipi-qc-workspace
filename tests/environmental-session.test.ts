import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
process.env.DEMO_MODE='true';process.env.DEMO_DB_PATH=await mkdtemp(path.resolve('.data/swab-session-test-'));
const {db,migrate,close}=await import('../server/db.js');
const {getConfiguration,saveConfiguration}=await import('../server/configuration.js');
const {publishEnvironmentalProfile}=await import('../server/environmental.js');
const {getDraft,createAutomaticDraft,saveDraft,environmentalSessionReview,generateEnvironmentalSession}=await import('../server/reports.js');
await migrate();after(close);
const actor={email:'owner@example.test',name:'Fixture Analyst',role:'administrator' as const};
const row={test:'SPC',label:'SPC',type:'numeric',location:'Drum 1',stage:'',replicate:'',block:'tests',unit:'cfu/mL',criterion:'Not more than 100 cfu/mL',source:'session-reference',sourceLocation:'Table 1 row 2',date:'2026-10-01',dateBasis:'owner-confirmed',revision:'criterion-v1'};
const template={id:'session-layout',name:'Fixture layout',category:'EM',family:'environmental-grouped-5c',verified:true,revision:'layout-v1',path:'unused-fixture.docx',manifest:{tokens:['tests','test','location','criterion','value','remarks'],requiredFields:['analysisDate']}};
const sample={id:'session-sample',ml:'ML-EM-26-0001',batch:'FIXTURE',name:'Fixture Surface Product',received:'2026-10-09 08:30',status:'',remarks:'',context:'Regular',category:'EM',fields:{facility:'PF 1',area:'Compounding'},source:{fingerprint:'session-source-v1',observedAt:'2026-10-09',raw:[]}};
test('one source activity creates a paired session with independent result revisions and validates both before rendering',async()=>{
 const configuration=await getConfiguration(),value=structuredClone(configuration.value);
 value.products.push({id:'session-product',name:sample.name,category:'EM',code:'',active:true,aliases:[]});
 for(const id of ['SPC','MY']){const test=value.tests.find(t=>t.id===id)!;if(!test.categories.includes('EM'))test.categories.push('EM');}
 if(!value.tests.some(t=>t.id==='ACCUPOINT'))value.tests.push({...value.tests.find(t=>t.id==='SPC')!,id:'ACCUPOINT',name:'Accupoint',shortName:'Accupoint',reportLabel:'Accupoint',sheetHeader:'',sheetColumn:null,unit:'RLU',categories:['EM'],active:true});
 await saveConfiguration(value,configuration.revision,actor.email);
 await db.query('INSERT INTO files(id,data) VALUES($1,$2)',['session-reference',JSON.stringify({kind:'reference'})]);
 await db.query('INSERT INTO templates(id,data) VALUES($1,$2)',[template.id,JSON.stringify(template)]);
 await db.query('INSERT INTO samples(id,data) VALUES($1,$2)',[sample.id,JSON.stringify(sample)]);
 const profile=await publishEnvironmentalProfile({name:'Fixture paired swab',productId:'session-product',product:sample.name,facility:'PF 1',area:'Compounding',context:'Regular',equipmentSet:'Fixture equipment',effectiveFrom:'2026-10-01',evidenceIds:['session-reference'],outputs:[
  {id:'accupoint',name:'Accupoint surface',method:'accupoint',mode:'surface',templateId:template.id,templateRevision:template.revision,instances:[{...row,test:'ACCUPOINT',label:'Accupoint',location:'Drum 3',unit:'RLU',criterion:'Not more than 100 RLU'}]},
  {id:'spcmy',name:'SPCMY surface',method:'spc-my',mode:'surface',templateId:template.id,templateRevision:template.revision,instances:[row,{...row,test:'MY',label:'Molds and yeast',criterion:'Not more than 30 cfu/mL'}]},
 ]},actor.email);
 const primary=await createAutomaticDraft(sample.id,actor,{profileId:profile.id});
 assert.equal(primary.environmentalSession?.members.length,2);
 assert.equal(Number((await db.query('SELECT count(*) AS count FROM samples')).rows[0].count),1);
 const drafts=(await db.query('SELECT data FROM drafts')).rows.map(r=>r.data);
 assert.equal(drafts.length,2);assert.ok(drafts.every(d=>d.sampleId===sample.id&&d.sample.ml===sample.ml&&d.results.every((r:any)=>r.state==='not_entered'&&r.value==='')));
 const review=await environmentalSessionReview(primary.id),revisions=Object.fromEntries(review.members.map(m=>[m.draftId,m.revision]));
 await assert.rejects(generateEnvironmentalSession(primary.id,revisions,actor.email),/Accupoint.*result required/);
 await assert.rejects(generateEnvironmentalSession(primary.id,{[primary.id]:1},actor.email),/Review both draft revisions/);
 const saved=await saveDraft(primary.id,primary.revision,primary.results.map(r=>({...r,state:'entered' as const,value:'7',remarks:'Passed'})),{...primary.fields,analysisDate:'2026-10-09'},actor.email);
 await assert.rejects(generateEnvironmentalSession(primary.id,revisions,actor.email),/Accupoint changed/);
 const current=await environmentalSessionReview(primary.id);assert.equal(current.members[0].revision,saved.revision);assert.deepEqual(current.members[0].issues,[]);assert.ok(current.members[1].issues.length);
 const companion=(await db.query('SELECT data FROM drafts WHERE id=$1',[current.members[1].draftId])).rows[0].data;
 assert.equal(companion.results[0].value,'');assert.equal(companion.results[0].location,'Drum 1');assert.equal(saved.results[0].location,'Drum 3');
 assert.equal(companion.fields.analysisDate,'2026-10-09');
 const shared=await saveDraft(saved.id,saved.revision,saved.results,{...saved.fields,temperature:'24.5','date.mfd':'2026-10-01',requestedBy:'Fixture requester'},actor.email);
 const linked=await getDraft(companion.id);
 assert.equal(linked.fields.temperature,'24.5');assert.equal(linked.fields.manufactureDate,'2026-10-01');assert.equal(linked.fields['requested.by'],'Fixture requester');
 assert.deepEqual(linked.results,companion.results);
 await assert.rejects(saveDraft(companion.id,companion.revision,companion.results,companion.fields,actor.email),/changed in another session/);
 const cleared=await saveDraft(linked.id,linked.revision,linked.results,{...linked.fields,temperature:'',expiryDate:'2027-10-01'},actor.email);
 const returned=await getDraft(shared.id);assert.equal(returned.fields.temperature,'');assert.equal(returned.fields['exp.date'],'2027-10-01');assert.deepEqual(returned.results,JSON.parse(JSON.stringify(shared.results)));
 // Legacy sessions with metadata entered on only one method display it on both without a GET write.
 await db.query('UPDATE drafts SET data=$1 WHERE id=$2',[JSON.stringify({...cleared,fields:{...cleared.fields,fillVolume:'30 mL'}}),cleared.id]);
 assert.equal((await getDraft(shared.id)).fields['fill.vol'],'30 mL');
 assert.equal((await db.query('SELECT data FROM drafts WHERE id=$1',[shared.id])).rows[0].data.fields['fill.vol'],undefined);
 const beforeCount=Number((await db.query('SELECT count(*) AS count FROM drafts')).rows[0].count);
 const enabled=await getConfiguration(),disabled=structuredClone(enabled.value);disabled.tests.find(t=>t.id==='MY')!.active=false;
 const changed=await saveConfiguration(disabled,enabled.revision,actor.email);
 await assert.rejects(createAutomaticDraft(sample.id,actor,{profileId:profile.id}),/test is inactive/);
 assert.equal(Number((await db.query('SELECT count(*) AS count FROM drafts')).rows[0].count),beforeCount);
 await saveConfiguration(enabled.value,changed.revision,actor.email);
 // A second activity on the same day remains a different source row and session.
 const second={...sample,id:'second-session',ml:'ML-EM-26-0002',received:'2026-10-09 14:00',source:{...sample.source,fingerprint:'second-session-source'}};
 await db.query('INSERT INTO samples(id,data) VALUES($1,$2)',[second.id,JSON.stringify(second)]);
 const later=await createAutomaticDraft(second.id,actor,{profileId:profile.id});assert.notEqual(later.environmentalSession?.id,primary.environmentalSession?.id);
 await db.query('DELETE FROM draft_revisions WHERE id=$1',[companion.id]);await db.query('DELETE FROM drafts WHERE id=$1',[companion.id]);await assert.rejects(environmentalSessionReview(primary.id),/companion draft is missing/);
});
