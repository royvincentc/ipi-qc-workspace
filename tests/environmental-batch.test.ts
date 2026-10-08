import {test} from 'node:test';
import assert from 'node:assert/strict';
import {prepareEnvironmentalBatch,type BatchCandidate,type BatchRules} from '../shared/environmental-batch.js';
import type {Configuration} from '../shared/configuration.js';
import type {Template} from '../shared/model.js';
import type {Sample} from '../shared/model.js';
const config={sampleTypes:[{id:'EM',active:true,register:'environmental'}],tests:[{id:'SPC',active:true,categories:['EM']}],products:[{id:'boost',name:'Boost',category:'EM',active:true,aliases:[]}]} as unknown as Configuration;
const template={id:'layout',name:'Approved layout',path:'fixture.docx',category:'EM',family:'environmental-grouped-5c',active:true,verified:true,revision:'1',manifest:{tokens:['tests','test','location','criterion','value','remarks'],adaptiveBlocks:true}} satisfies Template;
const rules:BatchRules={facility:'Plant 1',context:'Regular',criterionDate:'2026-10-08',effectiveFrom:'0001-01-01',createProducts:false,unchanged:true,layouts:{'environmental-grouped-5c':'layout'}};
const candidate:BatchCandidate={id:'pattern1',productHint:'Boost',areaHint:'Compounding',family:template.family,mode:'surface',referenceId:'ref',sourceName:'source.docx',sourceSha256:'hash',evidence:[{path:'archive/source.docx',sha256:'hash',product:'Boost',category:'Environmental Monitoring'}],rows:[{test:'SPC',label:'SPC',location:'Mixing tank',stage:'',block:'tests',criterion:'Nmt 100 cfu/mL',unit:'cfu/mL',sourceLocation:'table1:row1'}]};
test('bulk setup requires one confirmed routing scope and maps approved layouts without result imports',()=>{
 const [p]=prepareEnvironmentalBatch([candidate],config,[template],[],rules);
 assert.deepEqual(p.issues,[]);assert.equal(p.profile.productId,'boost');assert.equal(p.profile.outputs[0].templateId,'layout');assert.equal(p.profile.outputs[0].instances[0].date,'2026-10-08');assert.equal(p.profile.outputs[0].instances[0].value,undefined);
 const [missing]=prepareEnvironmentalBatch([candidate],config,[template],[],{...rules,facility:'',criterionDate:''});assert.ok(missing.issues.length);
});
test('methods sharing a location set combine while conflicting historical criteria remain exceptions',()=>{
 const other={...candidate,id:'pattern2',referenceId:'ref2',mode:'open-plate'};
 const [p]=prepareEnvironmentalBatch([candidate,other],config,[template],[],rules);assert.equal(p.profile.outputs.length,2);assert.deepEqual(p.issues,[]);
 const conflict={...other,mode:'surface',rows:[{...candidate.rows[0],criterion:'Nmt 10 cfu/mL'}]};
 const [blocked]=prepareEnvironmentalBatch([candidate,conflict],config,[template],[],rules);assert.match(blocked.issues.join(' '),/Different historical/);
 const identical={...candidate,id:'same-criteria',referenceId:'ref3',rows:[{...candidate.rows[0],label:'Standard Plate Count',sourceLocation:'table2:row3',criterion:'Nmt  100 cfu/mL'}]};
 const [deduplicated]=prepareEnvironmentalBatch([candidate,identical],config,[template],[],rules);assert.deepEqual(deduplicated.issues,[]);assert.equal(deduplicated.profile.outputs.length,1);assert.equal(deduplicated.evidenceCount,2);assert.deepEqual(deduplicated.profile.evidenceIds,['ref','ref3']);
});
test('new products require explicit bulk opt-in and mismatching header names stay in review',()=>{
 const incoming={...candidate,productHint:'New Product',evidence:[{...candidate.evidence[0],product:'New Product'}]};
 assert.ok(prepareEnvironmentalBatch([incoming],config,[template],[],rules)[0].issues.length);
 const [ready]=prepareEnvironmentalBatch([incoming],config,[template],[],{...rules,createProducts:true});assert.deepEqual(ready.issues,[]);assert.equal(ready.newProduct?.name,'New Product');
 assert.match(ready.newProduct!.id,/^[A-Za-z][A-Za-z0-9_-]{0,49}$/);
 const mismatched={...candidate,evidence:[{...candidate.evidence[0],product:'Different Product'}]};assert.match(prepareEnvironmentalBatch([mismatched],config,[template],[],rules)[0].issues.join(' '),/header product disagrees/);
});
test('an exact document product takes precedence over its broader archive folder',()=>{
 const variants={...config,products:[...config.products,{id:'boost-pro',name:'Boost-Pro',category:'EM',active:true,aliases:[],code:''}]};
 const source={...candidate,evidence:[{...candidate.evidence[0],product:'Boost-Pro'}]};
 const [matched]=prepareEnvironmentalBatch([source],variants,[template],[],rules);assert.equal(matched.profile.productId,'boost-pro');assert.deepEqual(matched.issues,[]);
});
test('distinct product variants remain exceptions and unique activities provide routing metadata',()=>{
 const changed={...candidate,evidence:[{...candidate.evidence[0],product:'Boost-Pro (Old Specs)'}]};
 assert.match(prepareEnvironmentalBatch([changed],config,[template],[],rules)[0].issues.join(' '),/Product variant differs/);
 const source={...candidate,evidence:[{...candidate.evidence[0],ml:'ML-EM-26-0491',batch:'EYJ81',area:'Compounding'}]};
 const sample={id:'sample',category:'EM',ml:'ML-EM-26-0491',batch:'EYJ81',name:'Boost',context:'Regular',received:'2026-10-01',status:'ON-GOING',remarks:'',fields:{facility:'PF2',area:'Compounding'},source:{spreadsheetId:'fixture',sheetId:1,sheet:'October',section:'EM',row:5,range:'A5:R5',fingerprint:'fixture',observedAt:'2026-10-08',url:'',mappingRevision:'1',raw:[]}} satisfies Sample;
 const [routed]=prepareEnvironmentalBatch([source],config,[template],[sample],{...rules,facility:'',context:''});
 assert.deepEqual(routed.issues,[]);assert.equal(routed.profile.facility,'PF2');assert.equal(routed.profile.context,'Regular');
 const [unlinked]=prepareEnvironmentalBatch([source],config,[template],[{...sample,batch:'different'}],{...rules,facility:'',context:''});
 assert.match(unlinked.issues.join(' '),/Confirm facility/);
 const noMl={...source,evidence:[{...source.evidence[0],ml:undefined,path:'PF/2026/Boost/source.docx'}]};
 assert.deepEqual(prepareEnvironmentalBatch([noMl],config,[template],[sample],{...rules,facility:'',context:''})[0].issues,[]);
 const older={...noMl,evidence:[{...noMl.evidence[0],path:'PF/2025/Boost/source.docx'}]};
 assert.match(prepareEnvironmentalBatch([older],config,[template],[sample],{...rules,facility:'',context:''})[0].issues.join(' '),/Confirm facility/);
 assert.match(prepareEnvironmentalBatch([noMl],config,[template],[sample,{...sample,id:'another'}],{...rules,facility:'',context:''})[0].issues.join(' '),/Confirm facility/);
 assert.deepEqual(prepareEnvironmentalBatch([source],config,[template],[{...sample,duplicate:true}],{...rules,facility:'',context:''})[0].issues,[]);
});
test('document facility and unique logbook scope fill metadata without a repeated batch match',()=>{
 const doc={...candidate,evidence:[{...candidate.evidence[0],area:'PF2 Compounding Area',product:'Boost (Pilot 1)'}]};
 const [prepared]=prepareEnvironmentalBatch([doc],config,[template],[],{...rules,facility:'',context:''});assert.deepEqual(prepared.issues,[]);assert.equal(prepared.profile.facility,'PF2');assert.equal(prepared.profile.context,'Pilot');
 const conflict={...doc,evidence:[{...doc.evidence[0],ml:'ML-EM-26-0491',batch:'EYJ81'}]};
 const sample={category:'EM',ml:'ML-EM-26-0491',batch:'EYJ81',name:'Boost',context:'Regular',fields:{facility:'PF1',area:'Compounding'}} as unknown as Sample;
 assert.match(prepareEnvironmentalBatch([conflict],config,[template],[sample],{...rules,facility:'',context:''})[0].issues.join(' '),/Document facility disagrees/);
 const regular={...candidate,evidence:[{...candidate.evidence[0],area:'PF1 Compounding Area'}]};
 const [scope]=prepareEnvironmentalBatch([regular],config,[template],[sample],{...rules,facility:'',context:''});assert.equal(scope.profile.context,'Regular');assert.deepEqual(scope.issues,[]);
 const [ambiguous]=prepareEnvironmentalBatch([regular],config,[template],[sample,{...sample,context:'Pilot'}],{...rules,facility:'',context:''});assert.match(ambiguous.issues.join(' '),/Confirm testing context/);
});
