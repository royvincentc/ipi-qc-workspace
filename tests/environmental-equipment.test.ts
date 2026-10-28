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
test('selecting a pattern preserves its defaults and exposes other approved equipment for manual selection',()=>{
 const competing=profile('competing',['Mixing Tank 1']);competing.outputs[1].instances[0].criterion='Not more than 200 cfu/mL';
 const input=[profile('selected',['Mixing Tank','Stainless Pail 1','Stainless Pail 2','Spatula 1','Spatula 2']),competing,...profiles];
 const setup=resolve({profileId:'selected'},input);
 assert.equal(setup.equipment.profileId,'selected');assert.deepEqual(setup.equipment.items.map((item:any)=>[item.name,item.defaultQuantity]),[['Inlet Hose',0],['Mixing Tank',1],['Spatula',2],['Stainless Drum',0],['Stainless Pail',2]]);
 const selection={profileId:'selected',equipmentRevision:setup.equipment.revision,equipment:[{id:'mixing tank',quantity:1}]};
 assert.equal(resolve(selection,input).resolution.status,'ready');assert.equal(resolve({...selection,profileId:undefined},input).resolution.status,'conflict');
 assert.equal(resolve({profileId:'missing'}).resolution.status,'selection');
});

test('a tank-only historical pattern can add approved Spatula points to both swab methods',()=>{
 const selected=profile('tank-only',['Mixing Tank']);
 const companion=profile('tank-and-spatula',['Mixing Tank','Spatula 1','Spatula 2']);
 const unrelated={...profile('other-area',['Scoop']),areaType:'Unrelated area'};
 const input=[selected,companion,unrelated];
 const setup=resolve({profileId:selected.id},input);
 assert.equal(setup.resolution.status,'ready');
 assert.deepEqual(setup.snapshot.equipment.selection.map((q:any)=>[q.id,q.quantity]),[['mixing tank',1]]);
 assert.deepEqual(setup.equipment.items.map((item:any)=>[item.name,item.defaultQuantity]),[['Mixing Tank',1],['Spatula',0]]);
 const selection={profileId:selected.id,equipmentRevision:setup.equipment.revision,equipment:[{id:'mixing tank',quantity:1},{id:'spatula',quantity:2}]};
 const manual=resolve(selection,input);
 assert.equal(manual.resolution.status,'ready');
 assert.deepEqual(manual.pairedOutputs.map((o:any)=>[o.method,o.instances.length]),[['accupoint',3],['spc-my',6]]);
 assert.deepEqual(manual.pairedOutputs[0].instances.map((r:any)=>r.location),['Mixing Tank 1','Spatula 1','Spatula 2']);
 assert.equal(resolve({...selection,equipment:[{id:'unapproved',quantity:1}]},input).resolution.status,'conflict');
 const conflict=profile('conflicting-spatula',['Spatula']);conflict.outputs[1].instances[0].criterion='Nmt 50 cfu/mL';
 assert.equal(resolve({profileId:selected.id},[...input,conflict]).resolution.status,'ready','unused optional equipment must not block the pattern defaults');
 assert.equal(resolve(selection,[...input,conflict]).resolution.status,'conflict');
});
test('a selected single-method pattern cannot silently drop the required Accupoint report',()=>{
 const selected=profile('single-method',['Mixing Tank','Spatula 1','Spatula 2','Stainless Drum 1','Stainless Drum 2','Stainless Drum 3','Stainless Drum 4','Stainless Pail 1','Stainless Pail 2','Stainless Pail 3']);
 selected.outputs=selected.outputs.filter(output=>output.method==='spc-my');
 const setup=resolve({profileId:selected.id},[selected]);
 assert.deepEqual(setup.equipment.items.map((item:any)=>[item.name,item.defaultQuantity,item.issue]),[['Mixing Tank',1,'Accupoint has no approved definition for Mixing Tank.'],['Spatula',2,'Accupoint has no approved definition for Spatula.'],['Stainless Drum',4,'Accupoint has no approved definition for Stainless Drum.'],['Stainless Pail',3,'Accupoint has no approved definition for Stainless Pail.']]);
 assert.equal(setup.resolution.status,'selection');
 const selection={profileId:selected.id,equipmentRevision:setup.equipment.revision,equipment:[{id:'mixing tank',quantity:1}]};
 assert.equal(resolve(selection,[selected]).resolution.status,'conflict');
 const nonsequential=profile('nonsequential',['Stainless Drum 3','Stainless Drum 4']);nonsequential.outputs=nonsequential.outputs.filter(output=>output.method==='spc-my');
 assert.equal(resolve({profileId:nonsequential.id},[nonsequential]).equipment.items[0].defaultQuantity,2);
});
test('a selected SPCMY pattern retains its counts and labels while using scoped approved Accupoint definitions',()=>{
 const selected=profile('selected',['Mixing Tank','Spatula 1','Spatula 2','Stainless Drum 3','Stainless Drum 4']);
 selected.outputs=selected.outputs.filter(o=>o.method==='spc-my');
 const companion=profile('companion',['Mixing Tank','Spatula 1','Spatula 2','Stainless Drum 2','Stainless Drum 3']);
 companion.outputs=companion.outputs.filter(o=>o.method==='accupoint');
 const setup=resolve({profileId:selected.id},[selected,companion]);
 assert.equal(setup.resolution.status,'ready');
 assert.deepEqual(setup.snapshot.equipment.selection.map((q:any)=>[q.id,q.quantity]),[['mixing tank',1],['spatula',2],['stainless drum',2]]);
 assert.deepEqual(setup.pairedOutputs[0].instances.map((r:any)=>r.location),['Mixing Tank','Spatula 1','Spatula 2','Stainless Drum 3','Stainless Drum 4']);
 assert.deepEqual(setup.snapshot.equipment.sources.map((p:any)=>p.id),['companion','selected']);
 const conflicting=structuredClone(companion);conflicting.id='conflict';conflicting.outputs[0].instances[0].criterion='Not more than 50 RLU';
 assert.notEqual(resolve({profileId:selected.id},[selected,companion,conflicting]).resolution.status,'ready');
});
test('detected open plate is a third session output and can be toggled off without losing either surface method',()=>{
 const selected=profile('with-air',['Stainless Drum 3','Stainless Drum 4']);
 selected.outputs.push({...selected.outputs[1],id:'open-plate',name:'Open plate',mode:'open-plate',instances:[{...row,location:'Compounding room',unit:'cfu/plate',criterion:'Not more than 100 cfu/plate'}]});
 const setup=resolve({profileId:selected.id},[selected]);
 assert.deepEqual(setup.pairedOutputs.map((o:any)=>o.name),['ACCUPOINT','SPCMY','Envi Open Plate']);
 assert.equal(setup.pairedOutputs[2].instances.length,1);
 const without=resolve({profileId:selected.id,includeOpenPlate:false},[selected]);
 assert.deepEqual(without.pairedOutputs.map((o:any)=>o.method),['accupoint','spc-my']);
});
test('scanned SPC and MY rows on different numbered drums form one equipment panel without losing the four points',()=>{
 const selected=profile('split-rows',['Stainless Drum 1','Stainless Drum 2','Stainless Drum 3','Stainless Drum 4']);
 selected.outputs[1].instances=selected.outputs[1].instances.filter(r=>r.test===(['Stainless Drum 1','Stainless Drum 2'].includes(r.location)?'SPC':'MY'));
 const setup=resolve({profileId:selected.id},[selected]);assert.equal(setup.resolution.status,'ready');
 assert.equal(setup.equipment.items[0].defaultQuantity,4);assert.equal(setup.pairedOutputs[1].instances.length,8);
 assert.deepEqual([...new Set(setup.pairedOutputs[1].instances.map((r:any)=>r.test))],['SPC','MY']);
 selected.outputs[1].instances[1].criterion='Not more than 200 cfu/mL';
 assert.notEqual(resolve({profileId:selected.id},[selected]).resolution.status,'ready');
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
 const singleMethod=structuredClone(profiles);singleMethod.forEach(p=>p.outputs=p.outputs.filter(o=>o.method==='spc-my'));assert.ok(resolve({},singleMethod).equipment.items.every((item:any)=>item.issue?.includes('Accupoint')));assert.equal(resolve(select(),singleMethod).resolution.status,'conflict');
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
 const pilotSample={...sample,context:'Pilot'};
 const pilotAccupoint={...profile('pilot-accu',['Mixing Tank','Spatula 1','Spatula 2']),context:'Pilot'};
 pilotAccupoint.outputs=pilotAccupoint.outputs.filter(o=>o.method==='accupoint');
 const validationPaired={...profile('val-paired',['Mixing Tank','Spatula 1','Spatula 2']),context:'Process Validation'};
 const regularDrums=profile('regular-drums',['Inlet Hose','Outlet Hose','Stainless Drum 1','Stainless Drum 2']);
 const pilotSetup=resolve({},[pilotAccupoint,validationPaired,regularDrums],[template],pilotSample);
 assert.deepEqual(pilotSetup.profiles.map((p:any)=>p.id),['pilot-accu','regular-drums','val-paired']);
 assert.equal(resolve({profileId:'regular-drums'},[pilotAccupoint,validationPaired,regularDrums],[template],pilotSample).resolution.status,'ready');
 assert.equal(resolve({profileId:'pilot-accu'},[pilotAccupoint,validationPaired,regularDrums],[template],pilotSample).resolution.status,'ready');
});
