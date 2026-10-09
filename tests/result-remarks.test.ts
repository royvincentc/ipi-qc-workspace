import {test} from 'node:test';
import assert from 'node:assert/strict';
import {suggestedAnalystRemark,overallAnalystRemarks,resultDisplayValue,type Criterion,type Result} from '../shared/model.js';
const spc:Criterion={test:'SPC',label:'Standard Plate Count (SPC)',type:'numeric',unit:'cfu/mL',criterion:'Nmt 100 cfu/mL',source:'spec',sourceLocation:'cell',date:'2026-10-08',dateBasis:'analysis',revision:'1'};
const result=(value:string,remarks=''):Result=>({test:'SPC',state:'entered',value,qualifier:'',unit:'cfu/mL',reason:'',remarks});
test('actual result boundary follows the requested strict threshold',()=>{for(const [value,expected] of [['0','Passed'],['99','Passed'],['99.9','Passed'],['100','Failed'],['101','Failed'],['',''],['abc',''],['-1','']])assert.equal(suggestedAnalystRemark(spc,result(value)),expected);});
test('result reporting limit is independent of standard and environmental limits',()=>{const r={...result(''),qualifier:'Nmt' as const};assert.equal(resultDisplayValue(spc,r,'FG'),'Nmt 10 cfu/mL');assert.equal(spc.criterion,'Nmt 100 cfu/mL');assert.equal(resultDisplayValue(spc,r,'EM'),spc.criterion);assert.equal(suggestedAnalystRemark(spc,r),'Passed');});
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
