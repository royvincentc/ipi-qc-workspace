import assert from 'node:assert/strict';
import test from 'node:test';
import {reportRows,validateBindings} from '../server/template.js';
import type {Draft,Template} from '../shared/model.js';

const tokens=['result.0.criterion','result.0.value','result.0.remarks','result.1.criterion','result.1.value','result.1.remarks'];
test('fixed report rows must each bind to one explicit test instance',()=>{
 assert.throws(()=>validateBindings(tokens,[{index:0,test:'SPC'}]),/every numbered result row/i);
 assert.throws(()=>validateBindings(tokens,[{index:0,test:'SPC'},{index:1,test:'SPC'}]),/same test instance/i);
 validateBindings(tokens,[{index:0,test:'MY'},{index:1,test:'SPC'}]);
});
test('report results follow the document row order rather than specification order',()=>{
 const criteria=[{test:'SPC',label:'SPC',type:'numeric' as const,unit:'cfu/g',criterion:'Nmt 50 cfu/g',source:'fixture',sourceLocation:'row 1',date:'2026-09-01',dateBasis:'release' as const,revision:'1'},{test:'MY',label:'Molds and Yeast',type:'numeric' as const,unit:'cfu/g',criterion:'Nmt 10 cfu/g',source:'fixture',sourceLocation:'row 2',date:'2026-09-01',dateBasis:'release' as const,revision:'1'}];
 const draft={specification:{tests:criteria},results:[{test:'SPC',state:'entered',value:'0',qualifier:'',unit:'cfu/g',reason:'',remarks:''},{test:'MY',state:'entered',value:'4',qualifier:'',unit:'cfu/g',reason:'',remarks:''}]} as Draft;
 const template={manifest:{resultBindings:[{index:0,test:'MY'},{index:1,test:'SPC'}]}} as unknown as Template;
 assert.deepEqual(reportRows(draft,template).map(r=>r.value),['4 cfu/g','0 cfu/g']);
});
test('template with a missing applicable test cannot start a report',()=>{
 const draft={specification:{tests:[{test:'SPC'},{test:'MY'}]},results:[{test:'SPC'},{test:'MY'}]} as Draft;
 const template={manifest:{resultBindings:[{index:0,test:'SPC'}]}} as unknown as Template;
 assert.throws(()=>reportRows(draft,template),/does not represent every applicable test/i);
});
