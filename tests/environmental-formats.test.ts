import {test} from 'node:test';
import assert from 'node:assert/strict';
import {warehouseRows} from '../server/template.js';
import {environmentalOutputSchema,environmentalTemplateIssue} from '../shared/environmental.js';

test('warehouse columns preserve independent channel values, remarks, criteria and phases',()=>{
 const row={index:0,block:'tests',phase:'1',groupKey:'a',test:'SPC',location:'Center',criterion:'Active limit',value:'0 cfu/m3',remarks:'Passed',channel:'active-air'};
 const result=warehouseRows([row,{...row,index:1,channel:'passive-air',criterion:'Passive limit',value:'2 cfu',remarks:'Failed'}, {...row,index:2,phase:'2',value:''},{...row,index:3,phase:'2',channel:'passive-air',value:''}]);
 assert.equal(result.length,2);assert.equal(result[0].activeValue,'0 cfu/m3');assert.equal(result[0].passiveValue,'2 cfu');assert.match(result[0].criterion,/Active: Active limit\nPassive: Passive limit/);assert.match(result[0].remarks,/Active: Passed\nPassive: Failed/);assert.equal(result[1].activeValue,'');assert.equal(result[1].passiveValue,'');
 assert.throws(()=>warehouseRows([row]),/exactly one/);assert.throws(()=>warehouseRows([row,row,{...row,channel:'passive-air'}]),/exactly one/);
});

test('warehouse layout readiness requires both channels and confirmed units',()=>{
 const t={id:'layout',category:'EM',active:true,verified:true,family:'environmental-warehouse-phase-air-7c',manifest:{tokens:['tests','test','location','phase','criterion','activeValue','passiveValue','remarks']}} as any;
 const row={test:'SPC',label:'SPC',location:'Center',stage:'1',replicate:'',block:'tests',channel:'active-air',type:'numeric',unit:'cfu/m3',criterion:'Approved limit',date:'2026-10-01',source:'reference',sourceLocation:'table0row2',dateBasis:'owner-confirmed',revision:'1'} as any;
 assert.match(environmentalTemplateIssue(t,[row],'EM')!,/one active-air and one passive-air/);
 assert.equal(environmentalTemplateIssue(t,[row,{...row,channel:'passive-air',unit:'cfu'}],'EM'),undefined);
 assert.match(environmentalTemplateIssue(t,[row,{...row,channel:'passive-air',unit:''}],'EM')!,/unit/);
});

test('GIP finding instances retain organism types instead of forcing numeric SPC/MY',()=>{
 const output=environmentalOutputSchema.parse({id:'gip',name:'GIP microbial panel',method:'microbial',mode:'gip',templateId:'layout',templateRevision:'1',instances:[{test:'EC',label:'E. coli',location:'Top',type:'finding',unit:'',criterion:'Negative',source:'reference',sourceLocation:'row1',date:'2026-10-01',dateBasis:'owner-confirmed',revision:'1'}]});
 assert.equal(output.instances[0].type,'finding');assert.equal(output.method,'microbial');
});
