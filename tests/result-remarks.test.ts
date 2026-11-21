import {test} from 'node:test';
import assert from 'node:assert/strict';
import {suggestedAnalystRemark,overallAnalystRemarks,resultDisplayValue,type Criterion,type Result} from '../shared/model.js';
import * as model from '../shared/model.js';
const spc:Criterion={test:'SPC',label:'Standard Plate Count (SPC)',type:'numeric',unit:'cfu/mL',criterion:'Nmt 100 cfu/mL',source:'spec',sourceLocation:'cell',date:'2026-10-08',dateBasis:'analysis',revision:'1'};
const result=(value:string,remarks=''):Result=>({test:'SPC',state:'entered',value,qualifier:'',unit:'cfu/mL',reason:'',remarks});
test('the five evaluation-only environmental products have fixed remarks without relaxing measurement checks',()=>{
 for(const name of ['Herbycin Syrup','Herbycin Cooling Mouth Spray','Herbycin Mouth Spray','Dr. Wong’s Apple Drink',"Dr. Wong's Apple Fruit Juice",'Herbycin Syrup (Compounding Utensils)']){
  const criterion={...spc,criterion:'FOR EVALUATION'};
  const draft={sample:{category:'EM',name},specification:{tests:[criterion]},results:[{...result('5','Failed'),remarkMode:'manual'}]} as model.Draft;
  const results=model.initializeResultRemarks(draft);
  assert.equal(results[0].remarks,'————');
  assert.equal(results[0].remarkMode,'automatic');
  assert.equal(results[0].value,'5');
  assert.equal(draft.results[0].remarks,'Failed','initialization does not mutate prior data');
  assert.equal(model.overallAnalystRemarks(draft),'FOR EVALUATION');
  assert.deepEqual(model.resultIssues({...draft,results}),[]);
  assert.ok(model.resultIssues({...draft,results:[{...results[0],value:'invalid'}]}).some(issue=>issue.includes('non-negative number')));
  assert.ok(model.resultIssues({...draft,results:[{...results[0],state:'not_entered'}]}).some(issue=>issue.includes('result required')));
  assert.ok(model.resultIssues({...draft,results:[{...results[0],unit:'wrong'}]}).some(issue=>issue.includes('unit must be')));
  assert.equal(model.isEvaluationMonitoring({...draft,sample:{...draft.sample,category:'FG'}}),false);
 }
 const other={sample:{category:'EM',name:'Herbycin Syrup Extra'},specification:{tests:[spc]},results:[result('5','Failed')]} as model.Draft;
 assert.equal(model.isEvaluationMonitoring(other),false);
 assert.equal(model.initializeResultRemarks(other)[0].remarks,'Failed');
});
test('imported results preserve source text and default uninterpretable entered results to Passed',()=>{
 const fn=(model as any).automaticAnalystRemark;assert.equal(typeof fn,'function');
 for(const [value,expected] of [['99 cfu/mL','Passed'],['100 cfu/mL','Failed'],['0','Passed'],['Nmt 100 cfu/mL','Passed'],['<100 cfu/mL','Passed'],['99 RLU','Passed'],['unknown','Passed'],['','']]){
  const imported={...result(value),sourceValue:value};assert.equal(fn(spc,imported),expected);assert.equal(imported.value,value);assert.equal(imported.sourceValue,value);
 }
 const finding={...spc,type:'finding',criterion:'Negative'};assert.equal(fn(finding,{...result('negative'),sourceValue:'negative'}),'Passed');
});
test('comma-formatted standards compare the full limit for fixed and actual SPC results',()=>{
 for(const text of ['Nmt 1,000 cfu/mL','Not more than 1,000 cfu/mL','Nmt 1,000.5 cfu/mL','Nmt 10,000 cfu/mL']){
  const criterion={...spc,criterion:text};
  assert.equal(model.automaticAnalystRemark(criterion,{...result(''),qualifier:'Nmt'}),'Passed',text);
  assert.equal(model.automaticAnalystRemark(criterion,result('999')),'Passed',text);
 }
 const criterion={...spc,criterion:'Nmt 1,000 cfu/mL'};
 for(const value of ['1000','1001'])assert.equal(model.automaticAnalystRemark(criterion,result(value)),'Failed');
 const value='1,000 cfu/mL';
 assert.equal(model.automaticAnalystRemark(criterion,{...result(value),sourceValue:value}),'Failed');
 assert.equal(model.automaticAnalystRemark({...spc,criterion:'Nmt 5 cfu/mL'},{...result(''),qualifier:'Nmt'}),'Failed');
});
test('TNTC count results fail instead of reaching the uninterpretable-result pass fallback',()=>{
 for(const test of ['SPC','MY']){
  const criterion={...spc,test,criterion:`Nmt ${test==='MY'?10:100} cfu/mL`};
  for(const value of ['TNTC',' tntc ','TNTC cfu/mL','Too numerous to count','too NUMEROUS to COUNT (TNTC)']){
   const entered={...result(value),test};
   assert.equal(suggestedAnalystRemark(criterion,entered),'Failed');
   for(const row of [entered,{...entered,sourceValue:value}]){
    assert.equal(model.automaticAnalystRemark(criterion,row),'Failed');
    assert.equal(model.automaticAnalystRemark(criterion,{...row,qualifier:'Nmt'}),'Failed');
    assert.equal(resultDisplayValue(criterion,{...row,sourceValue:value},'FG'),value);
    for(const state of ['not_entered','not_tested'] as const)assert.equal(model.automaticAnalystRemark(criterion,{...row,state}),'');
   }
  }
  const row={...result('TNTC','Passed'),test,sourceValue:'TNTC',remarkMode:'automatic' as const};
  const draft={sample:{category:'FG'} as any,specification:{tests:[criterion]} as any,results:[row]};
  const corrected=model.initializeResultRemarks(draft);
  assert.equal(corrected[0].remarks,'Failed');
  assert.equal(model.overallAnalystRemarks({...draft,results:corrected}),`Failed in ${criterion.label}`);
  assert.equal(model.updateResultRemark(criterion,{...row,remarkMode:'manual'},{value:'tntc'}).remarks,'Passed');
 }
});
test('fallback excludes missing and untested results and preserves overrides and recognized failures',()=>{
 assert.equal(model.automaticAnalystRemark(spc,result('unknown')),'Passed');
 assert.equal(model.automaticAnalystRemark({...spc,criterion:'Unrecognized standard'},result('12')),'');
 for(const state of ['not_entered','not_tested'] as const)assert.equal(model.automaticAnalystRemark(spc,{...result('unknown'),state}),'');
 for(const value of ['','   '])assert.equal(model.automaticAnalystRemark(spc,result(value)),'');
 assert.equal(model.automaticAnalystRemark(spc,{...result(''),sourceValue:'',qualifier:'Nmt'}),'Passed');
 const finding={...spc,type:'finding' as const,criterion:'Negative'};
 assert.equal(model.automaticAnalystRemark(finding,result('Positive')),'Failed');
 assert.equal(model.updateResultRemark(spc,{...result('unknown','Failed'),remarkMode:'manual'},{value:'other'}).remarks,'Failed');
 const corrected=model.initializeResultRemarks({sample:{category:'FG'} as any,specification:{tests:[{...spc,criterion:'Nmt 1,000 cfu/mL'}]} as any,results:[{...result('','Failed'),qualifier:'Nmt',remarkMode:'automatic'}]});
 assert.equal(corrected[0].remarks,'Passed');
 assert.equal(model.overallAnalystRemarks({sample:{category:'FG'} as any,specification:{tests:[spc]} as any,results:corrected}),'PASSED');
});
test('missing acceptance limits require manual remarks and clear old automatic passes',()=>{
 for(const test of ['ACCUPOINT','SPC','MY'])for(const criterion of ['FOR EVALUATION','------','','Unrecognized standard']){
  const standard={...spc,test,criterion};
  assert.equal(model.hasAutomaticAnalystRemark(standard),false);
  const entered={...result('12'),test};
  assert.equal(model.automaticAnalystRemark(standard,entered),'');
  assert.equal(model.updateResultRemark(standard,{...entered,remarks:'Passed',remarkMode:'automatic'},{value:'15'}).remarks,'');
  for(const remarks of ['Passed','Failed']){
   const manual=model.updateResultRemark(standard,entered,{remarks});
   assert.equal(manual.remarkMode,'manual');
   assert.equal(model.updateResultRemark(standard,manual,{value:'999'}).remarks,remarks);
  }
  const draft={sample:{category:'EM'} as any,specification:{tests:[standard]} as any,results:[{...entered,remarks:'Passed',remarkMode:'automatic' as const}],environmentalSnapshot:{output:{mode:'surface',method:test==='ACCUPOINT'?'accupoint':'spc-my'}} as any};
  const corrected=model.initializeResultRemarks(draft);
  assert.equal(corrected[0].remarks,'');
  assert.equal(model.overallAnalystRemarks({...draft,results:corrected}),'');
 }
 assert.equal(model.hasAutomaticAnalystRemark(spc),true);
 assert.equal(model.hasAutomaticAnalystRemark({...spc,type:'finding',criterion:'Negative'}),true);
 assert.equal(model.hasAutomaticAnalystRemark({...spc,type:'finding',criterion:'FOR EVALUATION'}),false);
});

test('automatic remarks recalculate while manual overrides survive value edits and can be explicitly reset',()=>{
 const fn=(model as any).updateResultRemark;assert.equal(typeof fn,'function');
 const auto=fn(spc,result('99'),{remarkMode:'automatic'});assert.equal(auto.remarks,'Passed');
 assert.equal(fn(spc,auto,{value:'100'}).remarks,'Failed');
 const manual=fn(spc,auto,{remarks:'Failed'});assert.equal(manual.remarkMode,'manual');assert.equal(fn(spc,manual,{value:'1'}).remarks,'Failed');
 assert.equal(fn(spc,manual,{remarkMode:'automatic',value:'1'}).remarks,'Passed');
 assert.equal(fn(spc,result('99','Failed'),{value:'0'}).remarks,'Failed');
 assert.equal(fn(spc,auto,{state:'not_entered',value:''}).remarks,'');
});
test('actual result boundary follows the requested strict threshold',()=>{for(const [value,expected] of [['0','Passed'],['99','Passed'],['99.9','Passed'],['100','Failed'],['101','Failed'],['',''],['abc',''],['-1','']])assert.equal(suggestedAnalystRemark(spc,result(value)),expected);});
test('SPC and MY report manually entered and imported zero using the result reporting limit',()=>{
 for(const id of ['SPC','MY']){
  const criterion={...spc,test:id,criterion:'For evaluation'};
  for(const row of [result('0'),{...result('0.00 cfu/mL'),sourceValue:'0.00 cfu/mL'},{...result(''),qualifier:'Nmt' as const}]){
   assert.equal(resultDisplayValue(criterion,{...row,test:id},'FG'),'Nmt 10 cfu/mL');
  }
  assert.equal(resultDisplayValue(criterion,{...result('20 cfu/mL'),test:id,sourceValue:'20 cfu/mL'},'FG'),'20 cfu/mL');
 }
});
test('reports outside the original product and surface categories initialize automatic and overall remarks',()=>{
 for(const category of ['RM','WS','EM','Finished Goods']){
  const draft={sample:{category},specification:{tests:[spc]},results:[result('100')]} as model.Draft;
  const results=model.initializeResultRemarks(draft);
  assert.equal(results[0].remarks,'Failed');
  assert.equal(overallAnalystRemarks({...draft,results}),'Failed in Standard Plate Count (SPC)');
 }
});
test('result reporting limit is independent of the standard',()=>{const r={...result(''),qualifier:'Nmt' as const};assert.equal(resultDisplayValue(spc,r,'FG'),'Nmt 10 cfu/mL');assert.equal(spc.criterion,'Nmt 100 cfu/mL');assert.equal(resultDisplayValue(spc,r,'EM'),'Nmt 10 cfu/mL');assert.equal(suggestedAnalystRemark(spc,r),'Passed');});
test('overall remarks follow final analyst choices including overrides and incomplete rows',()=>{for(const category of ['SFG','FG','ST','MIS']){const d={sample:{category} as any,specification:{tests:[spc,{...spc,test:'MY',label:'Molds and Yeast'}]} as any,results:[result('100','Passed'),{...result('1','Passed'),test:'MY'}]};assert.equal(overallAnalystRemarks(d),'PASSED');d.results[1].remarks='Failed';assert.equal(overallAnalystRemarks(d),'Failed in Molds and Yeast');d.results[0].remarks='Failed';assert.equal(overallAnalystRemarks(d),'Failed in Standard Plate Count (SPC), Molds and Yeast');d.results.forEach(r=>r.remarks='');assert.equal(overallAnalystRemarks(d),'');d.results[0].remarks='Passed';d.results[1].state='not_entered';d.results[1].remarks='Passed';assert.equal(overallAnalystRemarks(d),'');}});
test('surface SPCMY reports Nmt 10 independently of unchanged standards and uses each strict boundary',()=>{
 for(const [id,limit] of [['SPC',100],['MY',30]] as const){
  const criterion={...spc,test:id,criterion:`Not more than ${limit} cfu/mL`};
  const fixed={...result(''),test:id,qualifier:'Nmt' as const};
  assert.equal(resultDisplayValue(criterion,fixed,'EM',true),'Nmt 10 cfu/mL');
  assert.equal(criterion.criterion,`Not more than ${limit} cfu/mL`);
  assert.equal(suggestedAnalystRemark(criterion,fixed),'Passed');
  assert.equal(suggestedAnalystRemark(criterion,{...fixed,qualifier:'',value:String(limit-1)}),'Passed');
  assert.equal(suggestedAnalystRemark(criterion,{...fixed,qualifier:'',value:String(limit)}),'Failed');
 }
});
test('Accupoint zero and exact results export one RLU suffix without an equals marker',()=>{
 const criterion={...spc,test:'ACCUPOINT',unit:'RLU',criterion:'Not more than 100 RLU'};
 assert.equal(resultDisplayValue(criterion,{...result('0'),test:'ACCUPOINT',unit:'RLU'}),'0 RLU');
 assert.equal(resultDisplayValue(criterion,{...result('27'),test:'ACCUPOINT',unit:'RLU',qualifier:'='}),'27 RLU');
});
test('Accupoint suggests Failed at 100 RLU and above and Passed below the boundary',()=>{
 const criterion={...spc,test:'ACCUPOINT',unit:'RLU',criterion:'Not more than 100 RLU'};
 for(const [value,expected] of [['0','Passed'],['99.9','Passed'],['100','Failed'],['101','Failed'],['','']])assert.equal(suggestedAnalystRemark(criterion,{...result(value),unit:'RLU',qualifier:'='}),expected);
});
test('surface overall remarks identify each failed test and equipment and honor final analyst overrides',()=>{
 const tests=[{...spc,location:'Fixture Tank'},{...spc,location:'Fixture Drum 1',test:'MY',label:'Molds and Yeast'}];
 const results=tests.map(t=>({...result('100','Passed'),test:t.test,location:t.location}));
 const d={sample:{category:'EM'} as any,specification:{tests} as any,results,environmentalSnapshot:{output:{mode:'surface',method:'spc-my'}} as any};
 assert.equal(overallAnalystRemarks(d),'Passed');
 results[0].remarks='Failed';results[1].remarks='Failed';
 assert.equal(overallAnalystRemarks(d),'Failed in Standard Plate Count (SPC) for Fixture Tank, and Failed in Molds and Yeast for Fixture Drum 1');
 results[0].remarks='Passed';assert.equal(overallAnalystRemarks(d),'Failed in Molds and Yeast for Fixture Drum 1');
 results[1].remarks='';assert.equal(overallAnalystRemarks(d),'');
 results[1].remarks='Passed';results[1].state='not_entered';assert.equal(overallAnalystRemarks(d),'');
 d.environmentalSnapshot.output.method='accupoint';tests[0].test='ACCUPOINT';tests[0].label='Neogen Accupoint (Rapid Testing)';results[0].test='ACCUPOINT';results[0].remarks='Failed';
 assert.equal(overallAnalystRemarks(d),'Failed in Neogen Accupoint (Rapid Testing) for Fixture Tank');
});
