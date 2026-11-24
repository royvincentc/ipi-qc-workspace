import assert from 'node:assert/strict';
import test from 'node:test';
import {reportRows,validateBindings} from '../server/template.js';
import {resultIssues,type Draft,type Template} from '../shared/model.js';

const tokens=['result.0.criterion','result.0.value','result.0.remarks','result.1.criterion','result.1.value','result.1.remarks'];
test('evaluation monitoring exports fixed row remarks even from an older saved draft',()=>{
 const draft={sample:{category:'EM',name:'Herbycin Syrup'},specification:{tests:[{test:'SPC',type:'numeric',unit:'cfu/mL',criterion:'FOR EVALUATION'}]},results:[{test:'SPC',state:'entered',value:'5',qualifier:'',unit:'cfu/mL',remarks:'Failed',remarkMode:'manual'}]} as unknown as Draft;
 const rows=reportRows(draft,{family:'standard',manifest:{}} as Template);
 assert.equal(rows[0].remarks,'————');
 assert.equal(rows[0].criterion,'FOR EVALUATION');
 assert.equal(rows[0].value,'5 cfu/mL');
 assert.equal(draft.results[0].remarks,'Failed');
});
test('quantity-based surface exports keep merge groups contiguous and results attached to their points',()=>{
 const tests=['Drum 1','Drum 2'].flatMap(location=>['SPC','MY'].map(test=>({test,location,type:'numeric',unit:'cfu/mL',criterion:`Nmt ${test==='SPC'?100:30} cfu/mL`,revision:'approved',date:'2026-10-01'})));
 const draft={sample:{category:'EM'},environmentalSnapshot:{equipment:{selection:[]},output:{method:'spc-my',mode:'surface'}},specification:{tests},results:tests.map((t,i)=>({...t,state:'entered',qualifier:'',value:String(i+1),remarks:'Passed'}))} as unknown as Draft;
 const rows=reportRows(draft,{family:'environmental-grouped-5c',manifest:{rowGrouping:{mergeColumns:[0,2]}}} as unknown as Template);
 assert.deepEqual(rows.map(r=>[r.test,r.location,r.value]),[['Standard Plate Count (SPC)','Drum 1','1 cfu/mL'],['Standard Plate Count (SPC)','Drum 2','3 cfu/mL'],['Molds and Yeast','Drum 1','2 cfu/mL'],['Molds and Yeast','Drum 2','4 cfu/mL']]);
 assert.deepEqual(rows.map(r=>r.index),[0,1,2,3]);
});

test('swab reports order numbered points across equipment types within each assay and retain fixed bindings',()=>{
 const locations=['Hook 19','Stainless Drum 14','Spatula 12','Stainless Drum 13'];
 const tests=locations.flatMap(location=>['SPC','MY'].map(test=>({test,location,type:'numeric',unit:'cfu/mL',criterion:`Nmt ${test==='SPC'?100:30} cfu/mL`,revision:'approved',date:'2026-10-01'})));
 const draft={sample:{category:'EM'},environmentalSnapshot:{equipment:{selection:[]},output:{method:'spc-my',mode:'surface'}},specification:{tests},results:tests.map((t,i)=>({...t,state:'entered',qualifier:'',value:String(i+1),remarks:`Original ${i}`}))} as unknown as Draft;
 const before=JSON.stringify(draft);
 const template={family:'environmental-grouped-5c',manifest:{rowGrouping:{mergeColumns:[0,2]}}} as unknown as Template;
 const rows=reportRows(draft,template);
 assert.deepEqual(rows.map(r=>r.location),['Spatula 12','Stainless Drum 13','Stainless Drum 14','Hook 19','Spatula 12','Stainless Drum 13','Stainless Drum 14','Hook 19']);
 assert.deepEqual(rows.map(r=>[r.value,r.remarks]),[[5,'Original 4'],[7,'Original 6'],[3,'Original 2'],[1,'Original 0'],[6,'Original 5'],[8,'Original 7'],[4,'Original 3'],[2,'Original 1']].map(([value,remarks])=>[`${value} cfu/mL`,remarks]));
 assert.equal(new Set(rows.slice(0,4).map(r=>r.groupKey)).size,1);assert.equal(new Set(rows.slice(4).map(r=>r.groupKey)).size,1);
 const fixed={...template,manifest:{resultBindings:tests.map((test,index)=>({...test,index}))}} as unknown as Template;
 assert.deepEqual(reportRows(draft,fixed).map(r=>r.location),tests.map(t=>t.location));
 assert.equal(JSON.stringify(draft),before);
});
test('fixed report rows must each bind to one explicit test instance',()=>{
 assert.throws(()=>validateBindings(tokens,[{index:0,test:'SPC'}]),/every numbered result row/i);
 assert.throws(()=>validateBindings(tokens,[{index:0,test:'SPC'},{index:1,test:'SPC'}]),/same test instance/i);
 validateBindings(tokens,[{index:0,test:'MY'},{index:1,test:'SPC'}]);
});
test('report results follow the document row order rather than specification order',()=>{
 const criteria=[{test:'SPC',label:'SPC',type:'numeric' as const,unit:'cfu/g',criterion:'Nmt 50 cfu/g',source:'fixture',sourceLocation:'row 1',date:'2026-09-01',dateBasis:'release' as const,revision:'1'},{test:'MY',label:'Molds and Yeast',type:'numeric' as const,unit:'cfu/g',criterion:'Nmt 10 cfu/g',source:'fixture',sourceLocation:'row 2',date:'2026-09-01',dateBasis:'release' as const,revision:'1'}];
 const draft={specification:{tests:criteria},results:[{test:'SPC',state:'entered',value:'0',qualifier:'',unit:'cfu/g',reason:'',remarks:''},{test:'MY',state:'entered',value:'4',qualifier:'',unit:'cfu/g',reason:'',remarks:''}]} as Draft;
 const template={manifest:{resultBindings:[{index:0,test:'MY'},{index:1,test:'SPC'}]}} as unknown as Template;
 assert.deepEqual(reportRows(draft,template).map(r=>r.value),['4 cfu/g','Nmt 10 cfu/g']);
});
test('missing result fields remain blank in the generated report',()=>{
 const criteria=[{test:'SPC',label:'SPC',type:'numeric' as const,unit:'cfu/g',criterion:'Nmt 50 cfu/g',source:'fixture',sourceLocation:'row 1',date:'2026-09-01',dateBasis:'release' as const,revision:'1'}];
 const draft={specification:{tests:criteria},results:[{test:'SPC',state:'not_entered',value:'',qualifier:'',unit:'cfu/g',reason:'',remarks:''}]} as Draft;
 const template={manifest:{}} as unknown as Template;
 assert.equal(reportRows(draft,template)[0].value,'');
 draft.results=[];
 assert.equal(reportRows(draft,template)[0].value,'');
});
test('template with a missing applicable test cannot start a report',()=>{
 const draft={specification:{tests:[{test:'SPC'},{test:'MY'}]},results:[{test:'SPC'},{test:'MY'}]} as Draft;
 const template={manifest:{resultBindings:[{index:0,test:'SPC'}]}} as unknown as Template;
 assert.throws(()=>reportRows(draft,template),/does not represent every applicable test/i);
});
test('SPCMY PDF rows keep standard specifications separate from the fixed reporting result',()=>{
 const tests=['SPC','MY'].map(test=>({test,label:test,type:'numeric',unit:'cfu/mL',criterion:`Not more than ${test==='SPC'?100:30} cfu/mL`}));
 const draft={sample:{category:'EM'},environmentalSnapshot:{output:{method:'spc-my',mode:'surface'}},specification:{tests},results:tests.map(t=>({...t,state:'entered',qualifier:'Nmt',value:'',remarks:'Passed'}))} as unknown as Draft;
 const rows=reportRows(draft,{manifest:{}} as Template);
 assert.deepEqual(rows.map(r=>r.value),['Nmt 10 cfu/mL','Nmt 10 cfu/mL']);
 assert.deepEqual(rows.map(r=>r.criterion),['Not more than 100 cfu/mL','Not more than 30 cfu/mL']);
});
test('environmental control numbers report measured zero and skipped swabs distinctly',()=>{
 const tests=['ACCUPOINT','SPC','MY'].flatMap(test=>['Tank','Spatula'].map(location=>({
  test,location,label:test,type:'numeric' as const,unit:test==='ACCUPOINT'?'RLU':'cfu/mL',criterion:test==='ACCUPOINT'?'Nmt 100 RLU':'Nmt 100 cfu/mL',source:'fixture',sourceLocation:'row 1',date:'2026-11-20',dateBasis:'owner-confirmed' as const,revision:'1'
 })));
 const draft={sample:{category:'MIS',ml:'ML-EM-26-0594'},specification:{tests},results:tests.map(t=>({...t,state:t.location==='Tank'?'entered':'not_tested',qualifier:'',value:t.location==='Tank'?'0':'',reason:t.location==='Tank'?'':'N/A',remarks:''}))} as unknown as Draft;
 assert.deepEqual(resultIssues(draft),[]);
 assert.deepEqual(reportRows(draft,{manifest:{}} as Template).map(row=>row.value),['0 RLU','————','0 cfu/mL','————','0 cfu/mL','————']);
 assert.equal(resultIssues({...draft,sample:{...draft.sample,ml:'ML-MIS-26-0594'}}).length,3);
 assert.equal(resultIssues({...draft,results:draft.results.map(r=>({...r,reason:''}))}).length,3);
});
