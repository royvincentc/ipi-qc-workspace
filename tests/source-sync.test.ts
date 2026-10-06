import {test} from 'node:test';
import assert from 'node:assert/strict';
import {planSourceSync,type SavedSourceRecord} from '../server/source-sync.js';
import type {Sample} from '../shared/model.js';

function sample(ml:string,sheetId:number,row:number,category='FG',fingerprint='fresh',revision=19):Sample{
 return {id:`${category}-${sheetId}-${row}`,ml,category,name:'Source sample',batch:'B1',received:'10/01/2026',status:'',remarks:'',context:'',fields:{},configurationRevision:revision,source:{spreadsheetId:'book',sheetId,sheet:sheetId===8?'August 2026':'October 2026',row,section:category,range:'',fingerprint,observedAt:'2026-10-06T00:00:00Z',url:'',mappingRevision:String(revision),raw:[]}};
}
function saved(record:Sample):SavedSourceRecord{return {id:record.id,ml:record.ml,category:record.category,rev:record.configurationRevision!,source:record.source};}

test('missing August ML does not block October imports or change the preserved record',()=>{
 const historical=saved(sample('ML-ST-26-0221',8,12,'ST'));
 const before=JSON.stringify(historical),october=sample('ML-FG-26-0477',10,4);
 const plan=planSourceSync([october],[historical]);
 assert.deepEqual(plan.updates,[october]);assert.equal(plan.conflicts.length,1);
 assert.equal(plan.conflicts[0].sampleId,historical.id);
 assert.match(plan.conflicts[0].message,/ML-ST-26-0221.*August 2026.*row 12/);
 assert.equal(JSON.stringify(historical),before);
});
test('replaced rows stay blocked while unrelated rows can synchronize',()=>{
 const old=sample('ML-FG-26-0001',8,12),replacement=sample('ML-FG-26-9999',8,12),unrelated=sample('ML-FG-26-0477',10,4);
 const plan=planSourceSync([replacement,unrelated],[saved(old)]);
 assert.deepEqual(plan.updates,[unrelated]);assert.equal(plan.conflicts.length,1);
});
test('moved identities cannot be silently imported again at their new location',()=>{
 const old=sample('ML-ST-26-0221',8,12,'ST'),moved=sample(old.ml,8,13,'ST'),unrelated=sample('ML-FG-26-0477',10,4);
 const plan=planSourceSync([moved,unrelated],[saved(old)]);
 assert.deepEqual(plan.updates,[unrelated]);assert.equal(plan.conflicts.length,1);
});
test('unchanged snapshots are skipped and changed content or mapping revisions are refreshed',()=>{
 const unchanged=sample('ML-FG-26-0001',8,4),changed=sample('ML-FG-26-0002',8,5),remapped=sample('ML-FG-26-0003',8,6);
 const plan=planSourceSync([unchanged,changed,remapped],[saved(unchanged),saved({...changed,source:{...changed.source,fingerprint:'old'}}),saved({...remapped,configurationRevision:16})]);
 assert.deepEqual(plan.updates,[changed,remapped]);assert.deepEqual(plan.conflicts,[]);
});
