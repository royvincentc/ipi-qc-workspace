import {test,after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp} from 'node:fs/promises';
import path from 'node:path';
const folder=await mkdtemp(path.resolve('.data/config-test-'));
process.env.DEMO_MODE='true';process.env.DEMO_DB_PATH=folder;
const {db,migrate,close}=await import('../server/db.js');
const {getConfiguration,saveConfiguration,connectionFingerprint}=await import('../server/configuration.js');
const {validateIntake,configSchema}=await import('../shared/configuration.js');
const {allocate}=await import('../server/domain.js');
const {reportTestLabel,reportIssues,resultDisplayValue}=await import('../shared/model.js');
const {mapResultHeaders}=await import('../server/google.js');
const {submitSample}=await import('../server/samples.js');
const {createDraft,createAutomaticDraft,resolveReportSetup,reportTemplateFields,reportFormatName,resolveApplicabilityMatches,matchScore,sameSpecificationVariant}=await import('../server/reports.js');
const {requireRole}=await import('../server/auth.js');
await migrate();after(close);

test('Results headers map to configured tests and imported raw text stays unchanged',()=>{
 const columns=mapResultHeaders(['ML Number','Remarks','Standard Plate Count (SPC)','Molds and Yeast','P.aeruginosa','S.aureus','C.albicans','E.coli','Salmonella','Enterobacteriaceae','Coliform'],[
  {id:'SPC',name:'Standard Plate Count (SPC)',sheetHeader:'SPC'},
  {id:'MY',name:'Molds and Yeast',sheetHeader:'MY'},
  {id:'PA',name:'P.aeruginosa',sheetHeader:'P.aeruginosa'}
 ]);
 assert.deepEqual([...columns],[['SPC',2],['MY',3],['PA',4]]);
 const raw='Nmt 10 cfu/mL';
 assert.equal(resultDisplayValue({test:'SPC',label:'Standard Plate Count (SPC)'} as any,{test:'SPC',state:'entered',value:raw,sourceValue:raw,qualifier:'',unit:'cfu/mL',reason:'',remarks:''} as any),raw);
 const issues=reportIssues({sample:{category:'FG'},specification:{issues:[],tests:[{test:'SPC',label:'SPC',criterion:'Nmt 10 cfu/mL',source:'acceptance sheet',date:'2026-09-01',unit:'cfu/mL',type:'numeric'}]},results:[{test:'SPC',state:'entered',value:raw,sourceValue:raw,qualifier:'',unit:'cfu/mL',reason:'',remarks:''}],fields:{analysisDate:'2026-10-01',logbook:'p.123'},templateSnapshot:{manifest:{requiredFields:[]}}} as any);
 assert.deepEqual(issues,[]);
 assert.throws(()=>mapResultHeaders(['SPC','Standard Plate Count (SPC)'],[{id:'SPC',name:'Standard Plate Count (SPC)',sheetHeader:'SPC'}]),/ambiguous columns/);
});

test('migration seeds existing categories once and configuration survives reloading',async()=>{
 const first=await getConfiguration();assert.equal(first.value.sampleTypes.length,7);const value=structuredClone(first.value);value.general.appName='Configured laboratory';
 const saved=await saveConfiguration(value,first.revision,'admin@example.test');assert.equal((await getConfiguration()).value.general.appName,'Configured laboratory');assert.equal(saved.revision,first.revision+1);
 await assert.rejects(()=>saveConfiguration(value,first.revision,'admin@example.test'),/another session/);
 assert.equal(Number((await db.query('SELECT count(*) FROM configuration_revisions')).rows[0].count),2);
 const event=(await db.query("SELECT details FROM audit WHERE entity='configuration'")).rows[0].details;assert.equal(event.previous.general.appName,'IPI Micro-QC');assert.equal(event.newValue.general.appName,'Configured laboratory');
});
test('configuration rejects overlapping sections, removed fields and duplicate names',async()=>{
 const current=await getConfiguration();const invalid=structuredClone(current.value);invalid.sampleTypes[1].layout=invalid.sampleTypes[0].layout;assert.equal(configSchema.safeParse(invalid).success,false);
 const removed=structuredClone(current.value);removed.sampleTypes.pop();await assert.rejects(()=>saveConfiguration(removed,current.revision,'admin@example.test'));
 const duplicate=structuredClone(current.value);duplicate.tests[1].name=duplicate.tests[0].name;assert.equal(configSchema.safeParse(duplicate).success,false);
});
test('configured form requirements, dropdown options and inactive types are enforced',async()=>{
 const c=(await getConfiguration()).value;const type=structuredClone(c.sampleTypes.find(t=>t.id==='FG')!);type.fields.push({key:'source',label:'Source',type:'dropdown',required:true,active:true,order:99,help:'',defaultValue:'',options:['Approved source'],lookup:'',column:null});
 const fields={name:'Example',batch:'TEST',received:'2026-09-24T09:00',source:'Unknown'};assert.match(validateIntake(type,fields,c).join(),/available option/);fields.source='Approved source';assert.equal(validateIntake(type,fields,c).length,0);type.active=false;assert.match(validateIntake(type,fields,c).join(),/inactive/);
 assert.match(validateIntake({...type,active:true},{...fields,ml:'Invented'},c).join(),/form has changed/);
});
test('configured numbering recognizes legacy series and still appends only in the current section',async()=>{
 const c=(await getConfiguration()).value;const type=structuredClone(c.sampleTypes.find(t=>t.id==='FG')!);type.legacyNumbering=[type.numbering];type.numbering={prefix:'IPI-FG',separator:'/',yearDigits:4,padding:5};const m=type.layout;const rows:unknown[][]=Array.from({length:15},()=>[]);rows[1][m.start]=m.title;m.headers.forEach((h,i)=>rows[m.header-1][m.start+i]=h);rows[5][m.ml]='ML-FG-26-0042';rows[5][m.start+1]='Sample';
 const result=allocate([{id:1,name:'September 2026',rows,rowCount:15,merges:[m.merge,...m.extraMerges]}],'FG',new Date('2026-09-24T00:00Z'),'Asia/Manila',[],type);assert.equal(result.ml,'IPI-FG/2026/00043');assert.equal(result.row,7);
});
test('simultaneous demo intake and retry preserve unique numbers and one record per submission',async()=>{
 const {randomUUID}=await import('node:crypto');const first={submissionId:randomUUID(),category:'FG',fields:{name:'Example',batch:'TEST',received:'2026-09-24T09:00'}};
 const [a,b]=await Promise.all([submitSample('admin@example.test',first),submitSample('admin@example.test',{...first,submissionId:randomUUID()})]);assert.notEqual(a.ml,b.ml);assert.equal((await submitSample('admin@example.test',first)).id,a.id);
});
test('draft pins template, criteria, manual empty results and configuration revision',async()=>{
 let current=await getConfiguration();const value=structuredClone(current.value);value.sampleTypes.find(t=>t.id==='FG')!.applicability='managed';value.products.push({id:'example-product',name:'Example',category:'FG',code:'',aliases:[],active:true});current=await saveConfiguration(value,current.revision,'admin@example.test');
 const sampleRow=(await db.query('SELECT id,data FROM samples LIMIT 1')).rows[0];const sample=sampleRow.id;await db.query('UPDATE samples SET data=$1 WHERE id=$2',[JSON.stringify({...sampleRow.data,context:'Routine',fields:{...sampleRow.data.fields,context:'Routine',manufactureDate:'2026-09-01',analysisDate:'2026-09-24',status:'RELEASED'}}),sample]);
 const criterion={test:'SPC',label:'Standard Plate Count',type:'numeric',unit:'cfu/g',criterion:'Nmt 50 cfu/g',source:'fixture',sourceLocation:'Table 1',date:'2026-09-01',dateBasis:'release',revision:'1'};
 await db.query('INSERT INTO specifications(id,data) VALUES($1,$2)',['spec',JSON.stringify({id:'spec',product:'Example',category:'FG',context:'Routine',revision:'1',tests:[criterion],issues:[],source:'fixture'})]);
 await db.query('INSERT INTO templates(id,data) VALUES($1,$2)',['template',JSON.stringify({id:'template',name:'FG',category:'FG',family:'routine',revision:'1',path:'fixture.docx',verified:true,manifest:{requiredFields:['manufactureDate','analysisDate']}})]);
 const setup=await resolveReportSetup(sample);assert.deepEqual(setup.applicableTests,['Standard Plate Count']);assert.equal(setup.template.id,'template');assert.equal(setup.prefilledFields.manufactureDate,'2026-09-01');assert.equal(setup.prefilledFields.analysisDate,undefined);
 const automatic=await createAutomaticDraft(sample,{email:'admin@example.test',name:'Analyst',role:'administrator'});assert.equal(automatic.templateId,'template');assert.equal(automatic.fields.manufactureDate,'2026-09-01');assert.equal(automatic.fields.analysisDate,'');assert.equal(automatic.results[0].state,'not_entered');
 const draft=await createDraft(sample,'spec','template',{email:'admin@example.test',name:'Analyst',role:'administrator'});assert.equal(draft.results[0].state,'not_entered');assert.equal(draft.results[0].value,'');assert.equal(draft.templateSnapshot?.revision,'1');
 const changed=structuredClone(current.value);changed.reports.notedBy='Changed person';await saveConfiguration(changed,current.revision,'admin@example.test');
 const reopened=(await db.query('SELECT data FROM drafts WHERE id=$1',[draft.id])).rows[0].data;assert.equal(reopened.configurationSnapshot.reports.notedBy,'Celeste P. Yandug');assert.equal(reopened.specification.tests[0].criterion,'Nmt 50 cfu/g');
});
test('viewer cannot administer configuration',()=>{
 const middleware=requireRole('administrator');assert.throws(()=>middleware({user:{role:'viewer'}} as any,{} as any,()=>{}),(e:any)=>e.status===403);
});

test('report template aliases populate the approved custom template tags',()=>{
 const draft={
  sample:{name:'Omega Pain Killer Liniment - Pro',ml:'ML-FG-26-9999',batch:'LOT-42',received:'2026-09-29 08:00',category:'FG',fields:{manufactureDate:'2026-01-01',expiryDate:'2028-01-01',fillVolume:'60 mL',requestedBy:'QC'}},
  fields:{logbookReference:'MIC-42 p.7',analyst:'Analyst'},
  configurationSnapshot:{general:{timezone:'Asia/Manila'},reports:{}},
 } as any;
 const template={manifest:{tokens:['d.release','t.release','date.mfd','exp.date','fill.vol','requested.by','logbook']}} as any;
 const fields=reportTemplateFields(draft,template,new Date('2026-09-29T01:23:00Z'));
 assert.equal(fields['date.mfd'],'2026-01-01');assert.equal(fields['exp.date'],'2028-01-01');assert.equal(fields['fill.vol'],'60 mL');assert.equal(fields['requested.by'],'QC');assert.equal(fields.logbook,'MIC-42 p.7');assert.equal(fields['d.release'],'09/29/2026');assert.match(fields['t.release'],/^\d{2}:\d{2} (AM|PM)$/);
});

test('report format routing follows category and explicit Supplier values',()=>{
 const source=(category:string,supplier='')=>({category,fields:{supplier}});
 assert.equal(reportFormatName(source('ST') as any),'STAB');
 assert.equal(reportFormatName(source('FG') as any),'FG');
 assert.equal(reportFormatName(source('MIS') as any),'MISC');
 assert.equal(reportFormatName(source('SFG') as any),'SFG');
 assert.equal(reportFormatName(source('SFG') as any,[{remarks:'Failed'} as any]),'SFGQA');
 assert.equal(reportFormatName(source('RM','Bodega/Stock') as any),'RM');
 assert.equal(reportFormatName(source('RM','Direct Supplier') as any),'RMQA');
 assert.throws(()=>reportFormatName(source('RM') as any),/Supplier/);
});

test('new report fields map from sample metadata and overall remarks use the source logbook',()=>{
 const draft={sample:{name:'Sample',ml:'ML-SFG-26-0001',batch:'B1',received:'2026-09-29',category:'SFG',fields:{sampleNameSuffix:'(Export)',batchSize:'2,500 L',pageNumber:'123',mic:'MIC-17',type:'Stability',remarks:'FAILED in SPC and Molds and Yeast.'}},fields:{'overall.remarks':'manual override must not replace source remarks','sample.name':'manual name','sample.name.suffix':'manual suffix',type:'manual type'},results:[{test:'SPC',remarks:'Failed'},{test:'PA',remarks:'Passed'},{test:'MY',remarks:'Failed'}],specification:{tests:[{test:'SPC',label:'Standard Plate Count (SPC)'},{test:'PA',label:'P. aeruginosa'},{test:'MY',label:'Molds and Yeast'}]},configurationSnapshot:{general:{timezone:'Asia/Manila'},reports:{}}} as any;
 const template={manifest:{tokens:['batch.size','page','mic','overall.remarks','sample.name','sample.name.suffix','type']}} as any;
 const fields=reportTemplateFields(draft,template);
 assert.deepEqual([fields['batch.size'],fields.page,fields.mic],['2,500 L','123','MIC-17']);
 assert.deepEqual([fields['sample.name'],fields['sample.name.suffix']],['Sample','(Export)']);
 assert.equal(fields.type,'Stability');
 assert.equal(fields['overall.remarks'],'FAILED in SPC and Molds and Yeast.');
 draft.results.forEach((result:any)=>result.remarks='Failed');
 assert.equal(reportTemplateFields(draft,template)['overall.remarks'],'FAILED in SPC and Molds and Yeast.');
 draft.results.forEach((result:any)=>result.remarks='Passed');
 assert.equal(reportTemplateFields(draft,template)['overall.remarks'],'FAILED in SPC and Molds and Yeast.');
});

test('report organism labels use the full workbook names',()=>{
 assert.equal(reportTestLabel('SA','SA'),'S.aureus');
 assert.equal(reportTestLabel('EC','EC'),'E.coli');
 assert.equal(reportTestLabel('SAL','SAL'),'Salmonella');
 assert.equal(reportTestLabel('ENT','ENT'),'Enterobacteriaceae');
});

test('applicability resolution respects Omega specification keywords and the Herbycin row',()=>{
 const product={name:'Omega Pain Killer Liniment - Pro',aliases:[]};
 const rows=[
  {sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment - 15 mL, 30 mL, 60 mL, 120 mL',tests:['SPC','MY','PA','SA','CA']},
  {sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment - Export (120,60)',tests:['SPC','MY','COL']},
  {sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment - Pro',tests:['SPC','MY','PA','SA','EC']},
  {sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment - Pro (60mL, 120mL & 30mL) Old Specs',tests:['SPC','MY','COL']},
 ];
 const match=resolveApplicabilityMatches(rows,product,'RM/FP/AS','Omega Pain Killer Liniment - Pro (5th withdrawal - New Specs) - 60 mL');
 assert.deepEqual(match,[rows[2]]);assert.ok(matchScore('Omega Pain Killer Liniment - Pro','Omega Pain Killer Liniment - Pro')>matchScore('Omega Pain Killer Liniment - Pro','Omega Pain Killer Liniment'));
 assert.deepEqual(resolveApplicabilityMatches(rows,product,'RM/FP/AS','Omega Pain Killer Liniment- Pro (5th withdrawal - Old Specs)-60 mL'),[rows[3]]);
 assert.equal(sameSpecificationVariant('OMEGA PAIN KILLER LINIMENT - EXPORT (30mL, 15mL)','Omega Pain Killer Liniment - Export (120,60)'),true);
 assert.equal(sameSpecificationVariant('Omega Pain Killer Liniment - Pro (60mL, 120mL & 30mL) OLD SPECS','Omega Pain Killer Liniment - Pro Old Specs'),true);
 assert.equal(sameSpecificationVariant('Omega Pain Killer Liniment - Pro (60mL)','Omega Pain Killer Liniment - Pro Old Specs'),false);
 assert.equal(sameSpecificationVariant('Omega Pain Killer Liniment - 120 mL','Omega Pain Killer Liniment - Export (120,60)'),false);
 const herbycin=resolveApplicabilityMatches([{sheet:'RM/FP/AS',product:'Herbycin Syrup',tests:['SPC','MY','SA','EC','SAL','ENT']}],{name:'Herbycin Syrup',aliases:[]},'RM/FP/AS','HERBYCIN SYRUP');
 assert.deepEqual(herbycin[0].tests,['SPC','MY','SA','EC','SAL','ENT']);
 const omegaCurrent=[{sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment- 15 mL, 30 mL, 60 mL, 120 mL',tests:['SPC','MY','PA','SA','CA']}];
 assert.ok(matchScore('Omega Pain Killer Liniment- 15 mL, 30 mL, 60 mL, 120 mL','Omega Pain Killer Liniment-  (5th withdrawal - New Specs)-30 mL')>0);
 assert.ok(matchScore('Omega Pain Killer Liniment- 15 mL, 30 mL, 60 mL, 120 mL','Omega Pain Killer Liniment-  (5th withdrawal - New Specs)-15 mL')>0);
 assert.deepEqual(resolveApplicabilityMatches(omegaCurrent,{name:'Omega Pain Killer Liniment',aliases:[]},'RM/FP/AS','Omega Pain Killer Liniment-  (5th withdrawal - New Specs)-30 mL'),omegaCurrent);
 assert.deepEqual(resolveApplicabilityMatches(omegaCurrent,{name:'Omega Pain Killer Liniment',aliases:[]},'RM/FP/AS','Omega Pain Killer Liniment-  (5th withdrawal - New Specs)-15 mL'),omegaCurrent);
 const genericOmega=[
  ...omegaCurrent,
  {sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment- Export (120,60)',tests:['SPC','MY','COL']},
  {sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment- Pro (60mL)',tests:['SPC','MY','PA']},
  {sheet:'RM/FP/AS',product:'Omega Pain Killer Liniment- Local (30mL) Old Specs',tests:['SPC','MY','COL']},
 ];
 assert.deepEqual(resolveApplicabilityMatches(genericOmega,{name:'Omega Pain Killer Liniment',aliases:[]},'RM/FP/AS','Omega Pain Killer Liniment-  (5th withdrawal - New Specs)-30 mL'),[omegaCurrent[0]]);
 assert.deepEqual(resolveApplicabilityMatches(genericOmega,{name:'Omega Pain Killer Liniment',aliases:[]},'RM/FP/AS','Omega Pain Killer Liniment-  (5th withdrawal - New Specs)-15 mL'),[omegaCurrent[0]]);
 const herbycinOld=[{sheet:'RM/FP/AS',product:'Herbycin Syrup',tests:['SPC','MY','SA','EC','SAL','ENT']}];
 assert.deepEqual(resolveApplicabilityMatches(herbycinOld,{name:'Herbycin Syrup',aliases:[]},'RM/FP/AS','Herbycin Syrup ( 7th Withdrawa- Actual) Old Specs'),herbycinOld);
 assert.equal(resolveApplicabilityMatches([...rows, {...rows[2]}],product,'RM/FP/AS').length,2);
});

test('connection validation survives appearance edits and is invalidated by routing changes',async()=>{
 let current=await getConfiguration();const incoming=connectionFingerprint(current.value,'incoming');const specifications=connectionFingerprint(current.value,'specifications');
 await db.query("INSERT INTO settings(key,value) VALUES('connections',$1) ON CONFLICT(key) DO UPDATE SET value=$1",[JSON.stringify({incoming:'https://docs.google.com/spreadsheets/d/example/edit',environmental:'',specifications:'',folders:[],timezone:current.value.general.timezone,reservationsReconciled:true,manualIntakeCoordinated:true,writesEnabled:true})]);
 await db.query("INSERT INTO settings(key,value) VALUES('connectionTests',$1) ON CONFLICT(key) DO UPDATE SET value=$1",[JSON.stringify({incoming:{url:'https://docs.google.com/spreadsheets/d/example/edit',fingerprint:incoming},specifications:{url:'https://docs.google.com/spreadsheets/d/spec/edit',fingerprint:specifications}})]);
 const appearance=structuredClone(current.value);appearance.general.theme=appearance.general.theme==='dark'?'light':'dark';current=await saveConfiguration(appearance,current.revision,'admin@example.test');
 assert.equal(connectionFingerprint(current.value,'incoming'),incoming);assert.equal((await db.query("SELECT value FROM settings WHERE key='connections'")).rows[0].value.writesEnabled,true);assert.ok((await db.query("SELECT value FROM settings WHERE key='connectionTests'")).rows[0].value.incoming);
 const routing=structuredClone(current.value);routing.general.timezone='UTC';await saveConfiguration(routing,current.revision,'admin@example.test');
 assert.equal((await db.query("SELECT value FROM settings WHERE key='connections'")).rows[0].value.writesEnabled,false);assert.equal((await db.query("SELECT value FROM settings WHERE key='connectionTests'")).rows[0].value.incoming,undefined);assert.ok((await db.query("SELECT value FROM settings WHERE key='connectionTests'")).rows[0].value.specifications);
});
