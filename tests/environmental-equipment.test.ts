import {test} from 'node:test';
import assert from 'node:assert/strict';
import * as environmental from '../shared/environmental.js';
import type {Sample,Template} from '../shared/model.js';

const sample={id:'sample',ml:'ML-EM-26-0001',category:'EM',name:'Fixture Product',batch:'FIXTURE',context:'Regular',received:'2026-10-01',status:'',remarks:'',fields:{facility:'PF1',area:'Compounding'},source:{fingerprint:'source-1',spreadsheetId:'fixture',sheetId:1,sheet:'October 2026',section:'EM',row:1,range:'A1:S1',observedAt:'2026-10-01',url:'',mappingRevision:'1',raw:[]}} satisfies Sample;
const template={id:'layout',revision:'layout-1',name:'Fixture',category:'EM',family:'environmental-grouped-5c',verified:true,path:'fixture.docx',manifest:{tokens:['tests','test','location','criterion','value','remarks']}} as Template;
const row={test:'SPC',label:'SPC',type:'numeric',location:'Stainless Drum 1',stage:'',replicate:'',block:'tests',unit:'cfu/mL',criterion:'Not more than 100 cfu/mL',source:'evidence',sourceLocation:'Table 1',date:'2026-09-01',dateBasis:'owner-confirmed',revision:'criterion-1'} as const;
function profile(id:string,locations:string[]){return {...environmental.environmentalProfileSchema.parse({name:id,productId:'product',product:sample.name,category:'EM',facility:'PF1',area:'Compounding',context:'Regular',equipmentSet:locations.join(', '),effectiveFrom:'2026-09-01',evidenceIds:['evidence'],outputs:[
 {id:'accupoint',name:'Accupoint',method:'accupoint',mode:'surface',templateId:template.id,templateRevision:template.revision,instances:locations.map(location=>({...row,location,test:'ACCUPOINT',label:'Accupoint',unit:'RLU',criterion:'Not more than 100 RLU'}))},
 {id:'spcmy',name:'SPCMY',method:'spc-my',mode:'surface',templateId:template.id,templateRevision:template.revision,instances:locations.flatMap(location=>[{...row,location},{...row,location,test:'MY',label:'Molds and Yeast',criterion:'Not more than 30 cfu/mL'}])},
 ]}),id,revision:id+'-1',active:true,approvedBy:'owner',approvedAt:'2026-09-01'};}
const profiles=[profile('a',['Stainless Drum 1','Stainless Pail 3']),profile('b',['Stainless Drum 4','Inlet Hose'])];
function resolve(selection:any={},input=profiles,layouts=[template],activity=sample){
 const fn=(environmental as any).resolveEnvironmentalEquipment;
 assert.equal(typeof fn,'function','equipment quantities must have a shared evidence-based resolver');
 return fn(activity,'product',input,layouts,selection);
}
function select(){const setup=resolve();return {equipmentRevision:setup.equipment.revision,equipment:[{id:'stainless drum',quantity:3},{id:'inlet hose',quantity:1}]};}
test('quantities compose an unseen equipment combination with the same points and unchanged method parameters',()=>{
 const catalog=resolve();assert.equal(catalog.resolution.status,'selection');assert.deepEqual(catalog.equipment.items.map((i:any)=>i.name),['Inlet Hose','Stainless Drum','Stainless Pail']);
 const result=resolve(select());assert.equal(result.resolution.status,'ready');assert.equal(result.pairedOutputs.length,2);
 const [accu,spcmy]=result.pairedOutputs;assert.deepEqual(accu.instances.map((i:any)=>i.location),['Inlet Hose 1','Stainless Drum 1','Stainless Drum 2','Stainless Drum 3']);
 assert.deepEqual([...new Set(spcmy.instances.map((i:any)=>i.location))],accu.instances.map((i:any)=>i.location));assert.equal(accu.instances.length,4);assert.equal(spcmy.instances.length,8);
 assert.ok(accu.instances.every((i:any)=>i.unit==='RLU'&&i.criterion==='Not more than 100 RLU'));assert.equal(spcmy.instances.find((i:any)=>i.test==='MY').criterion,'Not more than 30 cfu/mL');
 assert.deepEqual(result.snapshot.equipment.sources.map((s:any)=>s.id),['a','b']);assert.equal(result.snapshot.profile.approvedBy,'owner');assert.equal(profiles[0].outputs[0].instances[0].location,'Stainless Drum 1');
});
test('selecting a pattern narrows equipment and counts its numbered locations',()=>{
 const competing=profile('competing',['Mixing Tank 1']);competing.outputs[1].instances[0].criterion='Not more than 200 cfu/mL';
 const input=[profile('selected',['Mixing Tank','Stainless Pail 1','Stainless Pail 2','Spatula 1','Spatula 2']),competing,...profiles];
 const setup=resolve({profileId:'selected'},input);
 assert.equal(setup.equipment.profileId,'selected');assert.deepEqual(setup.equipment.items.map((item:any)=>[item.name,item.defaultQuantity]),[['Mixing Tank',1],['Spatula',2],['Stainless Pail',2]]);
 const selection={profileId:'selected',equipmentRevision:setup.equipment.revision,equipment:[{id:'mixing tank',quantity:1}]};
 assert.equal(resolve(selection,input).resolution.status,'ready');assert.equal(resolve({...selection,profileId:undefined},input).resolution.status,'conflict');
 assert.equal(resolve({profileId:'missing'}).resolution.status,'selection');
});
test('a selected single-method pattern still checks equipment counts from its locations and creates its report rows',()=>{
 const selected=profile('single-method',['Mixing Tank','Spatula 1','Spatula 2','Stainless Drum 1','Stainless Drum 2','Stainless Drum 3','Stainless Drum 4','Stainless Pail 1','Stainless Pail 2','Stainless Pail 3']);
 selected.outputs=selected.outputs.filter(output=>output.method==='spc-my');
 const setup=resolve({profileId:selected.id},[selected]);
 assert.deepEqual(setup.equipment.items.map((item:any)=>[item.name,item.defaultQuantity,item.issue]),[['Mixing Tank',1,undefined],['Spatula',2,undefined],['Stainless Drum',4,undefined],['Stainless Pail',3,undefined]]);
 const fallback=resolve({profileId:selected.id},[selected]);assert.equal(fallback.resolution.status,'ready');assert.deepEqual(fallback.snapshot.equipment.selection.map((item:any)=>[item.id,item.quantity]),[['mixing tank',1],['spatula',2],['stainless drum',4],['stainless pail',3]]);
 const selection={profileId:selected.id,equipmentRevision:setup.equipment.revision,equipment:setup.equipment.items.map((item:any)=>({id:item.id,quantity:item.defaultQuantity}))};
 const result=resolve(selection,[selected]);
 assert.equal(result.resolution.status,'ready');assert.equal(result.pairedOutputs,undefined);assert.equal(result.snapshot.output.method,'spc-my');
 assert.equal(new Set(result.snapshot.output.instances.map((instance:any)=>instance.location)).size,10);
 const nonsequential=profile('nonsequential',['Stainless Drum 3','Stainless Drum 4']);nonsequential.outputs=nonsequential.outputs.filter(output=>output.method==='spc-my');
 assert.equal(resolve({profileId:nonsequential.id},[nonsequential]).equipment.items[0].defaultQuantity,2);
});
test('invalid quantities, unknown equipment, duplicate labels and output overflow cannot form a session',()=>{
 for(const equipment of [[{id:'stainless drum',quantity:-1}],[{id:'stainless drum',quantity:1.5}],[{id:'unknown',quantity:1}],[{id:'stainless drum',quantity:151}],[{id:'stainless drum',quantity:2,labels:['Drum 3','Drum 3']}],[{id:'stainless drum',quantity:1},{id:'stainless drum',quantity:2}]]){
  assert.notEqual(resolve({...select(),equipment}).resolution.status,'ready');
 }
 assert.equal(resolve({...select(),equipment:[]}).resolution.status,'selection');
 const custom=resolve({...select(),equipment:[{id:'stainless drum',quantity:2,labels:['Stainless Drum 3','Stainless Drum 4']}]});assert.equal(custom.resolution.status,'ready');assert.deepEqual(custom.pairedOutputs[0].instances.map((i:any)=>i.location),['Stainless Drum 3','Stainless Drum 4']);
});
test('criteria conflicts, missing companion coverage, changed templates and stale source revisions are explicit',()=>{
 const conflict=structuredClone(profiles);conflict[1].outputs[0].instances[0].criterion='Not more than 200 RLU';
 assert.match(resolve({},conflict).equipment.items.find((i:any)=>i.id==='stainless drum').issue,/conflict/i);assert.equal(resolve(select(),conflict).resolution.status,'conflict');
 const singleMethod=structuredClone(profiles);singleMethod.forEach(p=>p.outputs=p.outputs.filter(o=>o.method==='spc-my'));assert.ok(resolve({},singleMethod).equipment.items.every((item:any)=>!item.issue));
 assert.equal(resolve(select(),profiles,[{...template,revision:'layout-2'}]).resolution.status,'conflict');
 const changed=structuredClone(profiles);changed[0].revision='changed';assert.equal(resolve(select(),changed).resolution.status,'conflict');
 assert.equal(resolve(select(),profiles,[template],{...sample,source:{...sample.source,fingerprint:'changed-source'}}).resolution.status,'conflict');
});
test('scope and effective-date checks cannot be bypassed, and non-surface outputs retain explicit routing',()=>{
 for(const activity of [{...sample,fields:{facility:'PF2',area:'Compounding'}},{...sample,received:'2025-01-01'},{...sample,name:'Fixture Filling'},{...sample,category:'FG'}])assert.notEqual(resolve(select(),profiles,[template],activity).resolution.status,'ready');
 const nonSurface=profile('air',['Warehouse 2']);nonSurface.outputs=nonSurface.outputs.filter(o=>o.method==='spc-my').map(o=>({...o,mode:'open-plate'}));
 assert.equal(resolve({profileId:nonSurface.id,outputId:'spcmy'},[nonSurface]).snapshot.output.mode,'open-plate');
 assert.equal(resolve({profileId:nonSurface.id},[...profiles,nonSurface]).snapshot?.output.mode,'open-plate');
 assert.notEqual(resolve({...select(),profileId:nonSurface.id,outputId:'spcmy'},[nonSurface]).resolution.status,'ready');
});
