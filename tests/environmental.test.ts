import {test} from 'node:test';
import assert from 'node:assert/strict';
import {environmentalProfileSchema,environmentalCriteria,resolveEnvironmentalProfile,environmentalTemplateIssue,orderNumberedSamplingPoints} from '../shared/environmental.js';
import {resultKey,type Sample,type Template} from '../shared/model.js';

const sample={id:'sample',ml:'ML-EM-26-0001',batch:'TEST',status:'',remarks:'',category:'EM',name:'Fixture Product',context:'Regular',received:'2026-10-01',fields:{facility:'Plant 1',area:'Filling'},source:{fingerprint:'source-v1',spreadsheetId:'fixture',sheetId:1,sheet:'October 2026',section:'EM',row:5,range:'A5:S5',observedAt:'2026-10-01',url:'',mappingRevision:'1',raw:[]}} satisfies Sample;
const template={id:'layout',name:'Fixture layout',path:'fixture.docx',category:'EM',family:'environmental-grouped-5c',verified:true,revision:'layout-v1',manifest:{tokens:['tests','test','location','criterion','value','remarks']}} satisfies Template;
const row={test:'SPC',label:'Standard Plate Count',type:'numeric',location:'Filling nozzle 1',unit:'cfu',criterion:'Nmt 100 cfu',source:'reference',sourceLocation:'table1:row1',date:'2026-09-01',dateBasis:'owner-confirmed',revision:'criterion-v1'};

test('swab point numbers ascend across equipment types without renumbering or moving unnumbered points',()=>{
 const labels=['Hook 19','Unnumbered control','Stirring Rod 20','Spatula 12','Stainless Drum 14','Stainless Pail 16','Ladle 17','Stainless Beaker 18','Stainless Drum 13','Stainless Pail 15'];
 const before=[...labels];
 assert.deepEqual(orderNumberedSamplingPoints(labels,label=>label),['Spatula 12','Unnumbered control','Stainless Drum 13','Stainless Drum 14','Stainless Pail 15','Stainless Pail 16','Ladle 17','Stainless Beaker 18','Hook 19','Stirring Rod 20']);
 assert.deepEqual(labels,before);
 assert.deepEqual(orderNumberedSamplingPoints(['Spatula 12','Spatula 2','Spatula 10'],label=>label),['Spatula 2','Spatula 10','Spatula 12']);
 assert.deepEqual(orderNumberedSamplingPoints(['#20 Rod','12. Spatula','#13Drum'],label=>label),['12. Spatula','#13Drum','#20 Rod']);
 assert.deepEqual(orderNumberedSamplingPoints(['PF2 Compounding','Mixing Tank 1 Surface'],label=>label),['PF2 Compounding','Mixing Tank 1 Surface']);
});

test('numbered swab ordering preserves independent sampling contexts and attached result objects',()=>{
 const rows=[{location:'Hook 19',stage:'Before',value:'19'},{location:'Hook 19',stage:'After',value:'119'},{location:'Spatula 12',stage:'Before',value:'12'},{location:'Spatula 12',stage:'After',value:'112'}];
 const ordered=orderNumberedSamplingPoints(rows,row=>row.location,row=>row.stage);
 assert.deepEqual(ordered.map(row=>[row.location,row.stage,row.value]),[['Spatula 12','Before','12'],['Spatula 12','After','112'],['Hook 19','Before','19'],['Hook 19','After','119']]);
 assert.equal(ordered[0],rows[2]);assert.equal(ordered[3],rows[1]);
});
test('registered layouts alone cannot fabricate environmental locations or criteria',()=>{
 const result=resolveEnvironmentalProfile(sample,'product',[],[template]);
 assert.equal(result.resolution.status,'missing');assert.equal(result.snapshot,undefined);
 assert.match(result.resolution.message,/Fixture Product in Filling/);
 assert.match(result.resolution.message,/DOCX layout does not supply locations or criteria/);
 assert.deepEqual(result.profiles,[]);assert.deepEqual(result.outputs,[]);
});
function profile(){return {...environmentalProfileSchema.parse({name:'Fixture filling pattern',productId:'product',product:'Fixture Product',facility:'Plant 1',area:'Filling',equipmentSet:'Line A',context:'Regular',effectiveFrom:'2026-09-01',evidenceIds:['reference'],outputs:[{id:'spcmy',name:'SPC / MY',method:'spc-my',mode:'surface',templateId:'layout',templateRevision:'layout-v1',instances:[row,{...row,location:'Filling nozzle 2'}]}]}),id:'pattern',revision:'pattern-v1',active:true,approvedBy:'owner',approvedAt:'2026-09-01'};}
test('multiple layouts do not conflict with the approved explicit output layout',()=>{
 const result=resolveEnvironmentalProfile(sample,'product',[profile()],[template,{...template,id:'other'}]);
 assert.equal(result.resolution.status,'ready');assert.equal(result.snapshot?.output.templateId,'layout');
 const criteria=environmentalCriteria(result.snapshot!.profile,result.snapshot!.output);
 assert.notEqual(resultKey(criteria[0]),resultKey(criteria[1]));assert.equal(criteria[0].location,'Filling nozzle 1');
});
test('ambiguous equipment sets and methods require a concrete selection',()=>{
 const a=profile(),b={...profile(),id:'lineb',equipmentSet:'Line B'};
 assert.equal(resolveEnvironmentalProfile(sample,'product',[a,b],[template]).resolution.status,'selection');
 assert.equal(resolveEnvironmentalProfile(sample,'product',[a,b],[template],{profileId:b.id}).snapshot?.profile.id,b.id);
 a.outputs.push({...a.outputs[0],id:'openplate',name:'Open plate',mode:'open-plate'});
 assert.equal(resolveEnvironmentalProfile(sample,'product',[a],[template]).resolution.status,'selection');
 assert.equal(resolveEnvironmentalProfile(sample,'product',[a],[template],{outputId:'openplate'}).snapshot?.output.mode,'open-plate');
});
test('routing respects category, area, facility, effective dates, and source conflicts',()=>{
 for(const changed of [{category:'FG'},{fields:{facility:'Plant 2',area:'Filling'}},{fields:{facility:'Plant 1',area:'Compounding'}},{received:'2025-01-01'}])assert.notEqual(resolveEnvironmentalProfile({...sample,...changed},'product',[profile()],[template]).resolution.status,'ready');
 assert.equal(resolveEnvironmentalProfile({...sample,name:'Fixture Product Compounding'},'product',[profile()],[template]).resolution.status,'conflict');
 assert.equal(resolveEnvironmentalProfile({...sample,received:''},'product',[profile()],[template]).resolution.status,'selection');
 assert.equal(resolveEnvironmentalProfile({...sample,fields:{area:'Filling'}},'product',[profile()],[template]).resolution.status,'conflict');
});
test('retired or changed layouts cannot silently replace a pinned revision',()=>{
 for(const changed of [{active:false},{revision:'layout-v2'},{category:'FG'}])assert.equal(resolveEnvironmentalProfile(sample,'product',[profile()],[{...template,...changed}]).resolution.status,'conflict');
});
test('unknown row blocks and dashed criteria cannot be approved',()=>{
 assert.match(environmentalTemplateIssue(template,[{...environmentalCriteria(profile(),profile().outputs[0])[0],block:'spc'}],'EM')||'',/spc row block/);
 const input=profile();input.outputs[0].instances[0].criterion='----';assert.throws(()=>environmentalProfileSchema.parse(input));
});
test('surface sessions resolve both methods while preserving method-specific locations and criteria',()=>{
 const paired=profile();
 paired.outputs.push({...paired.outputs[0],id:'accupoint',name:'Accupoint',method:'accupoint',instances:[{...paired.outputs[0].instances[0],test:'ACCUPOINT',label:'Neogen Accupoint',location:'Stainless Drum 3',unit:'RLU',criterion:'Not more than 100 RLU'}]});
 const setup=resolveEnvironmentalProfile(sample,'product',[paired],[template]);
 assert.equal(setup.resolution.status,'ready');
 assert.deepEqual(setup.pairedOutputs?.map(o=>o.method),['accupoint','spc-my']);
 assert.equal(setup.pairedOutputs?.[0].instances[0].location,'Stainless Drum 3');
 assert.equal(setup.pairedOutputs?.[1].instances[0].unit,'cfu');
 assert.equal(resolveEnvironmentalProfile(sample,'product',[paired],[template],{outputId:'spcmy'}).pairedOutputs?.length,2);
 paired.outputs.push({...paired.outputs[0],id:'air',mode:'open-plate'});
 assert.equal(resolveEnvironmentalProfile(sample,'product',[paired],[template]).resolution.status,'selection');
 assert.equal(resolveEnvironmentalProfile(sample,'product',[paired],[template],{outputId:'air'}).pairedOutputs,undefined);
});
test('a surface pair cannot resolve when the companion layout is unavailable',()=>{
 const paired=profile();
 paired.outputs.push({...paired.outputs[0],id:'accupoint',name:'Accupoint',method:'accupoint',templateId:'missing',instances:[{...paired.outputs[0].instances[0],test:'ACCUPOINT',unit:'RLU'}]});
 const setup=resolveEnvironmentalProfile(sample,'product',[paired],[template],{outputId:'spcmy'});
 assert.equal(setup.resolution.status,'conflict');assert.match(setup.resolution.message,/Accupoint/);
});
