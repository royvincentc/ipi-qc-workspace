import {after,afterEach,beforeEach,mock,test} from 'node:test';
import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {Fault,column,mappings,type Sheet} from '../server/domain.js';
import {sourceScopeKey} from '../server/source-sync.js';
import type {Configuration,SampleType} from '../shared/configuration.js';
import type {Sample,Source} from '../shared/model.js';

if(!process.execArgv.includes('--experimental-test-module-mocks')){
 // Keep the ordinary tsx test command usable without changing package scripts.
 test('source import orchestration with isolated module mocks',()=>{
  execFileSync(process.execPath,[
   '--experimental-test-module-mocks','--import','tsx','--test',fileURLToPath(import.meta.url)
  ],{env:{...process.env,NODE_TEST_CONTEXT:undefined,TSX_DISABLE_CACHE:'1'},encoding:'utf8'});
 });
}else{
 const bookId='source-import-test-book',url=`https://docs.google.com/spreadsheets/d/${bookId}/edit`;
 const observationKey=`source-observations:${bookId}`,checkpointKey=`sheets-push:${bookId}:10`;
 const sectionKey=sourceScopeKey({sheetId:10,category:'FG'});
 const at=(time:string)=>Date.parse(`2026-10-20T${time}Z`);
 const type:SampleType={
  id:'FG',name:'Finished Goods',active:true,order:0,register:'incoming',fields:[],
  layout:{...mappings.FG,acceptedTitles:[],extraMerges:[]},
  numbering:{prefix:'ML-FG',separator:'-',yearDigits:2,padding:4},legacyNumbering:[],
  applicability:'managed',applicabilitySheet:'FG'
 };
 type Managed={revision:number;value:Pick<Configuration,'sampleTypes'|'products'>&{general:{timezone:string}}};
 function sheet(id=10,name='October 2026',product='Product A'):Sheet{
  const m=type.layout,rows=Array.from({length:4},()=>Array<string>(m.end+1).fill(''));
  rows[1][m.start]=m.title;
  m.headers.forEach((header,index)=>rows[m.header-1][m.start+index]=header);
  for(const [key,value] of Object.entries({
   received:id===8?'08/01/2026':'10/20/2026',name:product,batch:'B1',ml:id===8?'ML-FG-26-0001':'ML-FG-26-0477'
  }))rows[3][m.start+m.fields[key]]=value;
  return {id,name,rowCount:rows.length,rows,merges:[m.merge]};
 }
 function fixture(){
  return {
   book:{id:bookId,sheets:[sheet()]},
   managed:{revision:19,value:{
    general:{timezone:'Asia/Manila'},sampleTypes:[type],
    products:['A','B'].map(letter=>({id:`product-${letter}`,name:`Product ${letter}`,category:'FG',code:'',aliases:[],active:true}))
   }} as Managed,
   settings:new Map<string,any>([['connections',{incoming:url,environmental:'',specifications:''}]]),
   samples:new Map<string,Sample>(),history:[] as Source[],locks:new Set<string>(),events:[] as string[],
   reads:0,onRead:async()=>{},failCheckpointOnce:false,failProductSaveOnce:false,productSaves:0
  };
 }
 let state=fixture();
 const sourceKey=(id:number)=>`${bookId}:${id}:FG:4`;
 const stored=(id=10)=>state.samples.get(sourceKey(id))!;
 const payload=(tab=sheet())=>({spreadsheetId:bookId,sheet:tab});
 const stale=(error:unknown)=>error instanceof Fault&&error.status===409&&/predates newer source records/.test(error.message);
 async function locked<T>(key:string,run:()=>Promise<T>){
  assert.equal(state.locks.has(key),false,`Lock ${key} is already held`);
  if(key!== 'source-sync')assert.ok(state.locks.has('source-sync'),'Acquire the sync lock before the workbook lock');
  state.locks.add(key);
  try{return await run();}finally{state.locks.delete(key);}
 }
 async function query(sql:string,args:unknown[]=[]){
  if(sql.startsWith('SELECT id, data->>'))return {rows:[...state.samples.values()]
   .filter(sample=>sample.source.spreadsheetId===args[0]).map(sample=>({
    id:sample.id,ml:sample.ml,category:sample.category,rev:String(sample.configurationRevision),
    sheet:sample.source.sheet,sheet_id:String(sample.source.sheetId),row:String(sample.source.row),
    fingerprint:sample.source.fingerprint,observed_at:sample.source.observedAt
   }))};
  if(sql==='SELECT id,data FROM samples WHERE source_key=$1'){
   const sample=state.samples.get(String(args[0]));
   return {rows:sample?[{id:sample.id,data:structuredClone(sample)}]:[]};
  }
  if(sql.startsWith('INSERT INTO samples(')){
   assert.ok(state.locks.has(bookId),'Save snapshots while holding the workbook lock');
   state.events.push('save');
   state.samples.set(String(args[1]),JSON.parse(String(args[2])));
   return {rows:[]};
  }
  if(sql.startsWith('INSERT INTO source_history(')){
   state.history.push(JSON.parse(String(args[2])));
   return {rows:[]};
  }
  if(sql.startsWith("SELECT DISTINCT data->>'name'")){
   return {rows:[...state.samples.values()].map(sample=>({name:sample.name,category:sample.category}))};
  }
  throw new Error(`Unexpected source-import SQL: ${sql}`);
 }
 mock.module(new URL('../server/db.js',import.meta.url),{namedExports:{
  demo:false,db:{query},locked,tryLocked:locked,audit:async()=>{},
  setting:async(key:string,fallback:unknown)=>structuredClone(state.settings.has(key)?state.settings.get(key):fallback),
  setSetting:async(key:string,value:unknown)=>{
   if(key===observationKey){
    assert.ok(state.locks.has(bookId),'Save observations while holding the workbook lock');
    state.events.push('observe');
   }
   if(key===checkpointKey&&state.failCheckpointOnce){
    state.failCheckpointOnce=false;
    throw new Error('Replay checkpoint unavailable');
   }
   state.settings.set(key,structuredClone(value));
  }
 }});
 mock.module(new URL('../server/configuration.js',import.meta.url),{namedExports:{
  getConfiguration:async()=>structuredClone(state.managed),
  sourceTypes:async()=>structuredClone(state.managed.value.sampleTypes),
  saveConfiguration:async(value:Managed['value'],revision:number)=>{
   state.productSaves++;
   if(state.failProductSaveOnce){state.failProductSaveOnce=false;throw new Error('Configuration save interrupted');}
   assert.equal(revision,state.managed.revision);
   state.managed={revision:revision+1,value:structuredClone(value)};
   return structuredClone(state.managed);
  }
 }});
 const columnIndex=(letters:string)=>[...letters].reduce((index,letter)=>index*26+letter.charCodeAt(0)-64,0)-1;
 async function googleRequest(request:{url:string;method:string}){
  assert.equal(request.method,'GET','Imports must only read Google Sheets');
  assert.ok(state.locks.has(bookId),'Capture the source while holding the workbook lock');
  const address=new URL(request.url),base=`/v4/spreadsheets/${bookId}`;
  assert.equal(address.origin,'https://sheets.googleapis.com');
  if(address.pathname===base){
   assert.equal(address.searchParams.get('fields'),'spreadsheetId,properties(title),sheets(properties,merges)');
   state.reads++;
   const book=structuredClone(state.book);
   const sheets=book.sheets.map(tab=>({
    properties:{sheetId:tab.id,title:tab.name,gridProperties:{rowCount:tab.rowCount,columnCount:type.layout.end+1}},
    merges:tab.merges.map(merge=>{
     const [,start,startRow,end,endRow]=merge.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/)!;
     return {startColumnIndex:columnIndex(start),endColumnIndex:columnIndex(end)+1,startRowIndex:Number(startRow)-1,endRowIndex:Number(endRow)};
    })
   }));
   sheets.push({properties:{sheetId:99,title:'Summary',gridProperties:{rowCount:10,columnCount:10}},merges:[]});
   await state.onRead();
   return {data:{spreadsheetId:book.id,properties:{title:'Source import test'},sheets}};
  }
  if(address.pathname.startsWith(`${base}/values/`)){
   assert.equal(address.searchParams.get('valueRenderOption'),'FORMATTED_VALUE');
   const range=decodeURIComponent(address.pathname.slice(`${base}/values/`.length));
   const tab=state.book.sheets.find(tab=>range===`'${tab.name.replaceAll("'","''")}'!A1:${column(type.layout.end)}${tab.rowCount}`);
   assert.ok(tab,`Unexpected source range: ${range}`);
   return {data:{values:structuredClone(tab.rows)}};
  }
  throw new Error(`Unexpected Google operation: ${request.url}`);
 }
 mock.module('google-auth-library',{namedExports:{
  GoogleAuth:class{async getClient(){return {request:googleRequest};}}
 }});
 const {readWorkbook}=await import('../server/google.js');
 const {syncSources,pushSourceSheet}=await import('../server/samples.js');
 beforeEach(()=>{
  state=fixture();
  mock.timers.enable({apis:['Date'],now:at('08:00:00')});
 });
 afterEach(()=>{
  mock.timers.reset();
  assert.equal(state.locks.size,0,'Release locks even after a rejected import');
 });
 after(()=>mock.restoreAll());

 test('the real reader rejects no monthly tabs by default and returns an empty list only by opt-in',async()=>{
  state.book.sheets=[];
  await locked('source-sync',()=>locked(bookId,async()=>{
   await assert.rejects(readWorkbook(url),error=>error instanceof Fault&&error.status===409&&/No recognized monthly logbook tabs found/.test(error.message));
   const empty=await readWorkbook(url,{allowNoMonthlyTabs:true});
   assert.equal(empty.id,bookId);
   assert.deepEqual(empty.sheets,[]);
  }));
  assert.equal(state.reads,2);
  assert.equal(state.samples.size,0);
  assert.equal(state.settings.has(observationKey),false);
 });

 test('an unchanged pull rejects a push captured during its workbook read',async()=>{
  const first=await syncSources('reviewer');
  assert.equal(first.count,1);
  assert.deepEqual(first.errors,[]);
  assert.deepEqual(state.events,['observe','save']);
  const before=structuredClone(stored());
  mock.timers.setTime(at('08:02:00'));
  state.onRead=async()=>{mock.timers.setTime(at('08:03:00'));};
  const unchanged=await syncSources('reviewer');
  assert.equal(unchanged.count,0);
  assert.deepEqual(unchanged.errors,[]);
  assert.equal(state.settings.get(observationKey)[sectionKey],at('08:03:00'));
  assert.deepEqual(stored(),before);
  await assert.rejects(pushSourceSheet(payload(sheet(10,'October 2026','Product B')),String(at('08:02:30')),'delayed'),stale);
  assert.deepEqual(stored(),before);
  assert.equal(state.history.length,0);
  assert.equal(state.settings.has(checkpointKey),false);
 });

 test('successive pushes order snapshots by capture time instead of processing time',async()=>{
  mock.timers.setTime(at('08:00:10'));
  const first=await pushSourceSheet(payload(),String(at('08:00:00')),'first');
  assert.equal(first.count,1);
  assert.deepEqual(first.errors,[]);
  assert.equal(stored().source.observedAt,new Date(at('08:00:00')).toISOString());
  assert.deepEqual(state.events,['observe','save']);
  const id=stored().id;
  mock.timers.setTime(at('08:00:15'));
  const second=await pushSourceSheet(payload(sheet(10,'October 2026','Product B')),String(at('08:00:05')),'second');
  assert.equal(second.count,1);
  assert.deepEqual(second.errors,[]);
  assert.equal(stored().id,id);
  assert.equal(stored().name,'Product B');
  assert.equal(stored().source.observedAt,new Date(at('08:00:05')).toISOString());
  assert.equal(state.settings.get(observationKey)[sectionKey],at('08:00:05'));
  assert.equal(state.history.length,1);
  assert.equal(state.reads,0);
 });

 test('a replay checkpoint failure can retry the same snapshot without rewriting saved rows',async()=>{
  state.failCheckpointOnce=true;
  mock.timers.setTime(at('08:00:10'));
  const timestamp=String(at('08:00:00'));
  await assert.rejects(pushSourceSheet(payload(),timestamp,'retry'),/Replay checkpoint unavailable/);
  assert.equal(state.samples.size,1);
  assert.equal(state.settings.has(checkpointKey),false);
  const before=structuredClone(stored());
  mock.timers.setTime(at('08:00:20'));
  const retry=await pushSourceSheet(payload(),timestamp,'retry');
  assert.equal(retry.count,0);
  assert.deepEqual(retry.errors,[]);
  assert.deepEqual(stored(),before);
  assert.equal(state.settings.get(checkpointKey).timestamp,timestamp);
  const replay=await pushSourceSheet(payload(),timestamp,'retry');
  assert.equal(replay.replayed,true);
  assert.deepEqual(stored(),before);
  assert.equal(state.events.filter(event=>event==='save').length,1);
  assert.equal(state.history.length,0);
 });

 test('a partial push preserves omitted months while a full pull reports deleted tabs',async()=>{
  state.book.sheets=[sheet(8,'August 2026'),sheet()];
  const seeded=await syncSources('reviewer');
  assert.equal(seeded.count,2);
  assert.deepEqual(seeded.errors,[]);
  const august=structuredClone(stored(8));
  const lastSuccess=state.settings.get('sync').lastSuccess;
  state.book.sheets=[sheet()];
  mock.timers.setTime(at('08:01:00'));
  const partial=await pushSourceSheet(payload(),String(Date.now()),'october-only');
  assert.equal(partial.count,0);
  assert.equal(partial.conflicts,0);
  assert.deepEqual(partial.errors,[]);
  assert.deepEqual(stored(8),august);
  assert.equal(state.settings.get(observationKey)[sourceScopeKey({sheetId:8,category:'FG'})],at('08:00:00'));
  mock.timers.setTime(at('08:02:00'));
  const complete=await syncSources('reviewer');
  assert.equal(complete.count,0);
  assert.equal(complete.conflicts.length,1);
  assert.equal(complete.conflicts[0].sampleId,august.id);
  assert.match(complete.errors.join('; '),/ML-FG-26-0001.*August 2026.*row 4/);
  assert.equal(state.settings.get('sync').lastSuccess,lastSuccess);
  assert.deepEqual(stored(8),august);
  assert.equal(state.samples.size,2);
  assert.equal(state.history.length,0);
 });

 for(const missingAll of [false,true])test(
  missingAll?'a full pull with no sheets rejects delayed pushes for every saved scope':
   'a full pull rejects a delayed push for a deleted monthly tab',
  async()=>{
   const august=sheet(8,'August 2026'),october=sheet();
   state.book.sheets=[august,october];
   const seeded=await syncSources('reviewer');
   assert.equal(seeded.count,2);
   assert.deepEqual(seeded.errors,[]);
   const before=structuredClone(state.samples);
   const lastSuccess=state.settings.get('sync').lastSuccess;
   state.book.sheets=missingAll?[]:[october];
   mock.timers.setTime(at('08:02:00'));
   const complete=await syncSources('reviewer');
   const missing=missingAll?[august,october]:[august];
   assert.equal(complete.count,0);
   assert.equal(complete.conflicts.length,missing.length);
   if(missingAll)assert.match(complete.errors.join('; '),/No recognized monthly logbook tabs found/);
   assert.equal(state.settings.get('sync').lastSuccess,lastSuccess);
   assert.deepEqual(state.samples,before);
   for(const tab of missing){
    const delayed=payload(sheet(tab.id,tab.name,'Product B'));
    await assert.rejects(pushSourceSheet(delayed,String(at('08:01:00')),`deleted-${tab.id}`),stale);
    assert.equal(state.settings.get(observationKey)[sourceScopeKey({sheetId:tab.id,category:'FG'})],at('08:02:00'));
    assert.equal(state.settings.has(`sheets-push:${bookId}:${tab.id}`),false);
   }
   assert.deepEqual(state.samples,before);
   assert.equal(state.events.filter(event=>event==='save').length,2);
   assert.equal(state.history.length,0);
  }
 );

 test('an unchanged fresh push recovers interrupted product creation',async()=>{
  state.managed.value.products=[];
  state.failProductSaveOnce=true;
  const first=await pushSourceSheet(payload(),String(at('08:00:00')),'first');
  assert.equal(first.count,1);
  assert.equal(first.productsAutoCreated,0);
  assert.equal(state.productSaves,1);
  assert.equal(state.managed.value.products.length,0);
  mock.timers.setTime(at('08:01:00'));
  const retry=await pushSourceSheet(payload(),String(Date.now()),'fresh-retry');
  assert.equal(retry.count,0);
  assert.deepEqual(retry.errors,[]);
  assert.equal(retry.productsAutoCreated,1);
  assert.equal(state.productSaves,2);
  assert.equal(state.managed.value.products[0].name,'Product A');
  assert.equal(state.events.filter(event=>event==='save').length,1);
  assert.equal(state.history.length,0);
 });
}
