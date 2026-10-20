import {test} from 'node:test';
import assert from 'node:assert/strict';
import {collectSourceSections,sourceSyncDue,planSourceSync,persistSourceUpdates,sourceScopeKey,type SavedSourceRecord} from '../server/source-sync.js';
import {mappings,type Sheet} from '../server/domain.js';
import type {SampleType} from '../shared/configuration.js';
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

test('a current-month push preserves other months and still blocks relocated identities',()=>{
 const august=sample('ML-FG-26-0001',8,4),october=sample('ML-FG-26-0477',10,4);
 const scopes=[{sheetId:10,category:'FG'}];
 assert.deepEqual(planSourceSync([october],[saved(august)],{scopes}),{updates:[october],conflicts:[]});
 const moved=sample(august.ml,10,5);
 const plan=planSourceSync([october,moved],[saved(august)],{scopes});
 assert.deepEqual(plan.updates,[october]);assert.equal(plan.conflicts.length,1);
});

test('a delayed push cannot overwrite a newer pull or omit a newer intake receipt',()=>{
 const october=sample('ML-FG-26-0477',10,4),scopes=[{sheetId:10,category:'FG'}];
 const before=String(Date.parse(october.source.observedAt)-1);
 assert.throws(()=>planSourceSync([sample(october.ml,10,4,'FG','stale')],[saved(october)],{scopes,capturedAt:before}),/predates newer source records/);
 assert.throws(()=>planSourceSync([],[saved(october)],{scopes,capturedAt:before}),/predates newer source records/);
 assert.equal(planSourceSync([sample(october.ml,10,4,'FG','updated')],[saved(october)],{scopes,capturedAt:String(Date.parse(october.source.observedAt)+1)}).updates.length,1);
 const august=sample('ML-FG-26-0001',8,4);
 august.source.observedAt='2026-10-21T00:00:00Z';
 assert.equal(planSourceSync([october],[saved(august)],{scopes,capturedAt:before}).updates.length,1);
});

test('unchanged and empty sections reject pushes captured before their latest scan',()=>{
 const october=sample('ML-FG-26-0477',10,4),scopes=[{sheetId:10,category:'FG'}];
 const observations={[sourceScopeKey(scopes[0])]:Date.parse('2026-10-20T08:02:00Z')};
 const capturedAt=String(Date.parse('2026-10-20T08:01:00Z'));
 assert.throws(()=>planSourceSync([sample(october.ml,10,4,'FG','stale')],[saved(october)],{scopes,capturedAt,observations}),/predates newer source records/);
 assert.throws(()=>planSourceSync([october],[],{scopes,capturedAt,observations}),/predates newer source records/);
});

test('complete scans report missing monthly tabs while skipping invalid sections still present',()=>{
 const august=sample('ML-FG-26-0001',8,4),october=sample('ML-FG-26-0477',10,4);
 const scopes=[{sheetId:10,category:'FG'}];
 const removed=planSourceSync([october],[saved(august)],{scopes,workbookSheetIds:[10]});
 assert.deepEqual(removed.updates,[october]);assert.equal(removed.conflicts.length,1);
 assert.equal(planSourceSync([october],[saved(august)],{scopes,workbookSheetIds:[8,10]}).conflicts.length,0);
});

test('an invalid historical section cannot prevent importing the expected 15 receipts',()=>{
 const types=['SFG','FG','RM','WS'].map(id=>({id,name:id,register:'incoming',layout:{...mappings[id],acceptedTitles:[],extraMerges:[]}} as unknown as SampleType));
 const rows:unknown[][]=Array.from({length:15},()=>[]);
 const current:Sheet={id:10,name:'October 2026',rows,rowCount:15,merges:types.map(type=>type.layout.merge)};
 for(const type of types){
  const m=type.layout;
  rows[1][m.start]=m.title;
  m.headers.forEach((header,i)=>rows[m.header-1][m.start+i]=header);
  const count=({SFG:1,FG:4,RM:1,WS:9} as Record<string,number>)[type.id];
  for(let i=0;i<count;i++){
   rows[i+m.first-1][m.start+m.fields.received]='10/20/2026';
   rows[i+m.first-1][m.start+m.fields.name]='Receipt';
   rows[i+m.first-1][m.ml]=`ML-${type.id}-26-${i+1}`;
  }
 }
 const invalid:Sheet={id:8,name:'August 2026',rows:[],rowCount:15,merges:[]};
 const result=collectSourceSections([invalid,current],types,'Asia/Manila',(sheet,type,row,values,layout)=>sample(String(values[layout.fields.ml]),sheet.id,row,type.id),new Date('2026-10-20T04:00:00Z'));
 assert.equal(result.errors.length,4);
 assert.equal(result.records.length,15);
 assert.deepEqual(Object.fromEntries(types.map(type=>[type.id,result.records.filter(record=>record.category===type.id).length])),{SFG:1,FG:4,RM:1,WS:9});
 assert.equal(result.scopes.length,4);
 // A malformed section with a valid first row must not be partially imported.
 rows[5][mappings.FG.start+mappings.FG.fields.remarks]='.';
 const partial=collectSourceSections([current],types,'Asia/Manila',(sheet,type,row,values,layout)=>sample(String(values[layout.fields.ml]),sheet.id,row,type.id),new Date('2026-10-20T04:00:00Z'));
 assert.equal(partial.records.some(record=>record.category==='FG'),false);
 assert.equal(partial.records.length,11);
});

test('automatic sync is due after a restart and retries failures with a short backoff',()=>{
 const now=Date.parse('2026-10-20T08:00:00Z');
 assert.equal(sourceSyncDue({},now),true);
 assert.equal(sourceSyncDue({lastSuccess:'2026-10-20T07:00:00Z'},now),false);
 assert.equal(sourceSyncDue({lastSuccess:'2026-10-20T03:00:00Z'},now),true);
 assert.equal(sourceSyncDue({lastSuccess:'2026-10-20T03:00:00Z',lastAttempt:'2026-10-20T07:50:00Z'},now),false);
 assert.equal(sourceSyncDue({lastSuccess:'2026-10-20T03:00:00Z',lastAttempt:'2026-10-20T07:40:00Z'},now),true);
});

test('independent saves are bounded and each planned update is saved exactly once',async()=>{
 let active=0,peak=0;const savedIds:number[]=[];
 const result=await persistSourceUpdates(Array.from({length:19},(_,i)=>i),async id=>{
  active++;peak=Math.max(peak,active);await new Promise(resolve=>setImmediate(resolve));savedIds.push(id);active--;
 });
 assert.equal(result.count,19);assert.equal(result.failure,undefined);assert.equal(peak,8);
 assert.deepEqual(savedIds.sort((a,b)=>a-b),Array.from({length:19},(_,i)=>i));
});
test('a failed batch waits for all started saves and starts no further updates',async()=>{
 const finished:number[]=[],error=new Error('Database write failed');
 const result=await persistSourceUpdates(Array.from({length:12},(_,i)=>i),async id=>{
  if(id===0)throw error;
  await new Promise(resolve=>setImmediate(resolve));finished.push(id);
 });
 assert.equal(result.count,7);assert.equal(result.failure?.reason,error);
 assert.deepEqual(finished.sort((a,b)=>a-b),[1,2,3,4,5,6,7]);
});
