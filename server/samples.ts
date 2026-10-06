import {getConfiguration,saveConfiguration,sourceTypes} from './configuration.js';
import {type SampleType,formatNumber,validateIntake} from '../shared/configuration.js';
import {randomUUID} from 'node:crypto';
import {db,locked,setting,setSetting,audit,demo,tryLocked} from './db.js';
import {readWorkbook,rangeValues,writeRange,readApplicability} from './google.js';
import {allocate,Fault,hash,mappings,validateLayout,sectionRows,sourceLayout,column,type Mapping,type Sheet} from './domain.js';
import {categories,type Category,type Sample,type Source} from '../shared/model.js';
import {planSourceSync,type SourceIdentityConflict} from './source-sync.js';
let lastApplicabilityFingerprint:string|undefined;
let syncInFlight:Promise<any>|undefined;
export interface Connections {incoming:string;environmental:string;specifications:string;folders:string[];reportFolder:string;timezone:string;reservationsReconciled:boolean;manualIntakeCoordinated:boolean;writesEnabled:boolean}
export const defaultConnections:Connections={incoming:'',environmental:'',specifications:'https://docs.google.com/spreadsheets/d/1MuV-oZd_6EO89usUdeqhgozrzsR15zDIFWxT8rRLjxs/edit',folders:[],reportFolder:'https://drive.google.com/drive/u/0/folders/0AJ1DArdKmngAUk9PVA',timezone:'Asia/Manila',reservationsReconciled:false,manualIntakeCoordinated:false,writesEnabled:false};
export const fallbackSpecifications='https://docs.google.com/spreadsheets/d/1JsvC5LIjxu1Hf5Yh7f1bi2XLqfxKTfSAM1taBQlMgr0/edit';
export function sourceSample(book:string,sheet:Sheet,c:Category,row:number,values:unknown[],type?:SampleType,revision?:number,layout?:Mapping):Sample{const m=layout||type?.layout||mappings[c],fields=Object.fromEntries(Object.entries(m.fields).map(([name,i])=>[name,String(values[i]??'')]));const headerRow=sheet.rows[m.header-1]||[];const normalizedHeader=(value:unknown)=>String(value??'').normalize('NFKC').replace(/[^a-z0-9]/gi,'').toLowerCase();const reportHeaders:Record<string,string[]>={analysisDate:['DATE ANALYZED','DATE ANALYZE','ANALYSIS DATE'],releaseDate:['DATE RELEASED','RELEASE DATE'],analyzedBy:['ANALYZED BY','ANALYST'],batchSize:['BATCH/LOT SIZE','BATCH SIZE','LOT SIZE'],fillVolume:['FILL VOL./WT.','FILL VOL/WT','FILL VOLUME','FILL WEIGHT'],manufactureDate:['DATE MDF','MFD DATE','DATE MANUFACTURED','MANUFACTURE DATE'],expiryDate:['EXP DATE','EXPIRY DATE','EXPIRATION DATE'],requestedBy:['REQUESTED BY'],pageNumber:['PAGE NUMBER','PAGE'],sampleNameSuffix:['SAMPLE NAME SUFFIX'],logbookReference:['LOGBOOK REFERENCE'],mic:['MIC']};for(let i=0;i<=m.end-m.start;i++){const header=normalizedHeader(headerRow[m.start+i]);const key=Object.entries(reportHeaders).find(([,aliases])=>aliases.some(alias=>normalizedHeader(alias)===header))?.[0];const value=String(values[i]??'').trim();if(key&&value)fields[key]=value;}const range=`${column(m.start)}${row}:${column(m.end)}${row}`;const source:Source={spreadsheetId:book,sheetId:sheet.id,sheet:sheet.name,section:type?.name||categories[c],row,range,fingerprint:hash(values),observedAt:new Date().toISOString(),url:`https://docs.google.com/spreadsheets/d/${book}/edit#gid=${sheet.id}&range=${range}`,mappingRevision:revision?String(revision):'ipi-2026-v1',raw:values,active:true};return {id:randomUUID(),configurationRevision:revision,categoryLabel:type?.name||categories[c],category:c,ml:fields.ml,name:fields.name,batch:fields.batch,received:fields.received,status:fields.status,remarks:fields.remarks,context:fields.context||'',fields,source};}
async function saveSnapshot(s:Sample){const key=[s.source.spreadsheetId,s.source.sheetId,s.category,s.source.row].join(':');const old=(await db.query('SELECT id,data FROM samples WHERE source_key=$1',[key])).rows[0];if(old&&old.data.ml?.trim()&&old.data.ml!==s.ml)throw new Fault(409,`${s.source.sheet} row ${s.source.row}: record moved or replaced; reconcile source identity`);if(old){s.id=old.id;s.fields={...old.data.fields,...s.fields};if(old.data.source.fingerprint!==s.source.fingerprint)await db.query('INSERT INTO source_history(id,sample_id,data) VALUES($1,$2,$3)',[randomUUID(),s.id,JSON.stringify(old.data.source)]);}await db.query('INSERT INTO samples(id,source_key,data) VALUES($1,$2,$3) ON CONFLICT(source_key) DO UPDATE SET data=$3,updated_at=now()',[s.id,key,JSON.stringify(s)]);return s;}
const normalized=(value:string)=>value.trim().toLocaleLowerCase();
async function autoCreateProducts(actor:string){
 try {
  const current=await getConfiguration();const products=[...current.value.products];
  const allSamples=(await db.query('SELECT DISTINCT data->>\'name\' AS name, data->>\'category\' AS category FROM samples')).rows as {name:string;category:string}[];
  let added=0;
  for(const {name,category} of allSamples){
   if(!name?.trim()||!category)continue;
   const tokenize = (s:string): string[] => (s.toLowerCase().match(/[a-z]+|[0-9]+/g) || []);
    const matchScore = (sampleName:string, productName:string) => {
      const sampleTokens = tokenize(sampleName);
      const productTokens = tokenize(productName);
      for (const t of productTokens) {
        const idx = sampleTokens.indexOf(t);
        if (idx === -1) return 0;
        sampleTokens.splice(idx, 1);
      }
      return productTokens.length;
    };
    const already=products.some(p=>p.active&&p.category===category&&[p.name,...p.aliases].some(n=>matchScore(name, n) > 0));
   if(already)continue;
   // Use the full sample name as the product name (it may include batch suffixes — the prefix matching in reports will still work)
   const id='product-'+randomUUID().replace(/-/g,'').slice(0,16);
   products.push({id,name:name.trim(),code:'',category,aliases:[],active:true});
   added++;
  }
  if(added>0){
   const updated=structuredClone(current.value);updated.products=products;
   await saveConfiguration(updated,current.revision,actor);
  }
  return added;
 } catch (e) {
  return 0;
 }
}
export async function syncSources(actor:string){if(demo)return {count:0,message:'De-identified demo; live synchronization is disabled'};if(syncInFlight)return syncInFlight;const running=tryLocked('source-sync',()=>syncSourcesOnce(actor)).then(result=>{if(result)return result;if(actor==='system')return {count:0,skipped:true,message:'Source synchronization is already running on another instance'};return {count:0,skipped:true,message:'Source synchronization is already running. Try again shortly.'};});syncInFlight=running;try{return await running;}finally{if(syncInFlight===running)syncInFlight=undefined;}}
async function syncSourcesOnce(actor:string){const config=await setting('connections',defaultConnections);const managed=await getConfiguration();const sourceCatalog=await sourceTypes();let count=0;const conflicts:SourceIdentityConflict[]=[];
 for(const [url,cs] of [[config.incoming,sourceCatalog.filter(t=>t.register==='incoming').map(t=>t.id)],[config.environmental,sourceCatalog.filter(t=>t.register==='environmental').map(t=>t.id)]] as [string,Category[]][]){if(!url)continue;const book=await readWorkbook(url);await locked(book.id,async()=>{const records:Sample[]=[];for(const sheet of book.sheets)for(const c of cs){const type=managed.value.sampleTypes.find(t=>t.id===c)!;const layout=sourceLayout(sheet,c,type,new Date(),managed.value.general.timezone);for(const r of sectionRows(sheet,c,type,layout))if(r.occupied&&!r.reserved&&r.ml.trim())records.push(sourceSample(book.id,sheet,c,r.row,r.values,type,managed.revision,layout));}
  // Plan the entire workbook before persisting. Identity conflicts block only
  // their own rows and relocated copies, while preserving the saved snapshots.
  const existing = (await db.query('SELECT id, data->>\'ml\' as ml, data->\'source\'->>\'sheet\' as sheet, data->\'source\'->>\'sheetId\' as sheet_id, data->>\'category\' as category, data->\'source\'->>\'row\' as row, data->\'source\'->>\'fingerprint\' as fingerprint, data->>\'configurationRevision\' as rev FROM samples WHERE data->\'source\'->>\'spreadsheetId\'=$1', [book.id])).rows.filter(r => r.ml?.trim());
    const old_records = existing.map(r => ({ id: r.id, ml: r.ml, category: r.category, rev: Number(r.rev), source: { sheet: r.sheet, sheetId: Number(r.sheet_id), row: Number(r.row), fingerprint: r.fingerprint } }));
    const plan=planSourceSync(records,old_records);conflicts.push(...plan.conflicts);
    for(const record of plan.updates){
      await saveSnapshot(record);
      count++;
    }
 });}
 if(config.specifications){const applicability=await readApplicability(config.specifications);const fingerprint=hash({url:config.specifications,applicability});if(fingerprint!==lastApplicabilityFingerprint){await setSetting('applicability',applicability);lastApplicabilityFingerprint=fingerprint;}}
 // Auto-create managed products for any sample names without a matching product entry
 const added=count?await autoCreateProducts(actor):0;
 const message=conflicts.length?`Synchronized ${count} source records; ${conflicts.length} historical source record${conflicts.length===1?'':'s'} require reconciliation. ${conflicts[0].message}`:null;
 const previous=await setting<any>('sync',{});const attemptedAt=new Date().toISOString();
 await setSetting('sync',{...previous,lastSuccess:conflicts.length?previous.lastSuccess||null:attemptedAt,lastAttempt:attemptedAt,count,error:message,conflicts});
 if(actor!=='system'||count||added||JSON.stringify(previous.conflicts||[])!==JSON.stringify(conflicts))await audit(actor,'synchronize','sources',{count,productsAutoCreated:added,conflicts});
 if(message)throw new Fault(409,message);
 return {count,productsAutoCreated:added};
}
export async function submitSample(actor:string,input:{submissionId:string;category:Category;fields:Record<string,string>}){const managed=await getConfiguration();const type=managed.value.sampleTypes.find(t=>t.id===input.category);if(!type?.active)throw new Fault(400,'Choose an active sample type');const issues=validateIntake(type,input.fields,managed.value);if(issues.length)throw new Fault(400,issues.join('; '));if(demo)return submitDemo(actor,input,type,managed.revision,managed.value.general.timezone);const config=await setting('connections',defaultConnections);if(!config.writesEnabled||!config.reservationsReconciled||!config.manualIntakeCoordinated)throw new Fault(409,'An administrator must validate connections, reconcile reservations and coordinate manual intake before enabling writes');const url=type.register==='environmental'?config.environmental:config.incoming;if(!url)throw new Fault(409,'Configure the logbook connection first');const payloadHash=hash(input);const book=await readWorkbook(url);
 return locked(book.id,async()=>{const old=(await db.query('SELECT * FROM submissions WHERE id=$1',[input.submissionId])).rows[0];if(old){if(old.payload_hash!==payloadHash)throw new Fault(409,'Submission ID was already used with different values');if(old.state==='complete')return old.data.sample;throw new Fault(409,'This submission requires reconciliation; it will not be sent again automatically');}
  const pending=(await db.query('SELECT ml FROM submissions WHERE workbook=$1 AND category=$2 AND state<>\'complete\' AND ml IS NOT NULL',[book.id,input.category])).rows.map(r=>r.ml);
  const fresh=await readWorkbook(url);const target=allocate(fresh.sheets,input.category,new Date(),managed.value.general.timezone,pending,type);const m=type.layout;const values=Array.from({length:m.end-m.start+1},()=>'' as unknown);for(const [key,i] of Object.entries(m.fields)){if(key==='ml')values[i]=target.ml;else if(input.fields[key]!==undefined)values[i]=input.fields[key];}values[m.fields.receivedBy]=actor;
  const read=await rangeValues(book.id,target.sheet.name,target.range);const padded=Array.from({length:values.length},(_,i)=>read[i]??'');if(hash(padded)!==hash(target.before))throw new Fault(409,'Destination changed during logging; refresh and retry');
  const intent={configurationRevision:managed.revision,type,sheet:target.sheet.name,sheetId:target.sheet.id,row:target.row,range:target.range,before:target.before,values,actor,input};await db.query('INSERT INTO submissions(id,payload_hash,workbook,category,state,ml,data) VALUES($1,$2,$3,$4,$5,$6,$7)',[input.submissionId,payloadHash,book.id,input.category,'pending',target.ml,JSON.stringify(intent)]);
  try{await writeRange(book.id,target.sheet.name,target.range,values);const observed=await rangeValues(book.id,target.sheet.name,target.range);if(hash(Array.from({length:values.length},(_,i)=>observed[i]??''))!==hash(values))throw new Error('Readback differs');const record=sourceSample(book.id,target.sheet,input.category,target.row,values,type,managed.revision);record.fields={...input.fields,...record.fields};const sample=await saveSnapshot(record);await db.query('UPDATE submissions SET state=$1,data=$2 WHERE id=$3',['complete',JSON.stringify({...intent,sample}),input.submissionId]);await audit(actor,'sample_logged',sample.id,{submissionId:input.submissionId,source:sample.source});await autoCreateProducts(actor);return sample;}catch{await db.query('UPDATE submissions SET state=$1 WHERE id=$2',['uncertain',input.submissionId]);throw new Fault(409,'The write outcome is uncertain. Do not create a new submission; ask an administrator to reconcile it.');}
 });
}

export interface IntakeItem {submissionId:string;category:Category;fields:Record<string,string>}
export interface PreparedIntakeItem {submissionId:string;category:Category;ml:string;state:string;name:string;batch:string;received:string;error?:string}

// Prepare is a read-only source operation for live workbooks. The held submission
// makes the server-assigned number stable between the review screen and commit.
export async function prepareSample(actor:string,input:IntakeItem,batchId:string,index:number):Promise<PreparedIntakeItem>{
 const managed=await getConfiguration(),type=managed.value.sampleTypes.find(t=>t.id===input.category);
 if(!type?.active)throw new Fault(400,'Choose an active sample type');
 const issues=validateIntake(type,input.fields,managed.value);if(issues.length)throw new Fault(400,issues.join('; '));
 const payloadHash=hash({input,batchId,index,revision:managed.revision});
 if(demo)return locked(`demo-intake:${input.category}`,async tx=>{
  const old=(await tx.query('SELECT * FROM submissions WHERE id=$1',[input.submissionId])).rows[0];
  if(old){if(old.payload_hash!==payloadHash)throw new Fault(409,'This submission ID is already attached to different values. Start a new review.');if(old.state==='complete')return {...previewRecord(input,old.ml,'complete'),submissionId:input.submissionId};if(old.state==='ready')return {...previewRecord(input,old.ml,'ready'),submissionId:input.submissionId};throw new Fault(409,'This sample is held for reconciliation and cannot be prepared again.');}
  const year=Number(new Intl.DateTimeFormat('en',{timeZone:managed.value.general.timezone,year:'numeric'}).format(new Date()));
  const records=(await tx.query("SELECT data FROM samples WHERE data->>'category'=$1",[input.category])).rows.map(r=>r.data);
  const held=(await tx.query("SELECT ml FROM submissions WHERE category=$1 AND state IN ('ready','pending','uncertain','blocked') AND ml IS NOT NULL",[input.category])).rows.map(r=>r.ml);
  const prefix=`${type.numbering.prefix}${type.numbering.separator}${String(year).slice(-type.numbering.yearDigits)}${type.numbering.separator}`;const re=new RegExp(`^${prefix.replace(/[.*+?^${}()|[\\]\\\\]/g,'\\\\$&')}(\\d+)$`);
  const high=Math.max(0,...[...records.map(s=>s.ml),...held].map(ml=>{const m=String(ml||'').match(re);return m?Number(m[1]):0;}));
  const ml=formatNumber(type.numbering,year,high+1);const data={input,batchId,index,configurationRevision:managed.revision,preparedBy:actor,preparedAt:new Date().toISOString(),type,zone:managed.value.general.timezone};
  await tx.query('INSERT INTO submissions(id,payload_hash,workbook,category,state,ml,data) VALUES($1,$2,$3,$4,$5,$6,$7)',[input.submissionId,payloadHash,'demo',input.category,'ready',ml,JSON.stringify(data)]);
  await tx.query('INSERT INTO audit(id,actor,action,entity,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,'Prepared sample logging review',input.submissionId,JSON.stringify({batchId,index,category:input.category,ml,configurationRevision:managed.revision})]);
  return {...previewRecord(input,ml,'ready'),submissionId:input.submissionId};
 });
 const config=await setting('connections',defaultConnections);const url=type.register==='environmental'?config.environmental:config.incoming;
 if(!url)throw new Fault(409,'Configure the correct logbook connection before reviewing this sample.');
 if(!config.writesEnabled||!config.reservationsReconciled||!config.manualIntakeCoordinated)throw new Fault(409,'Sample numbers are held until an administrator finishes logbook readiness. In Settings → Connections, validate the current logbook, reconcile existing and reserved numbers, record any manual intake during setup, then enable writes. No logbook values have changed.');
 const book=await readWorkbook(url);return locked(book.id,async()=>{
  const old=(await db.query('SELECT * FROM submissions WHERE id=$1',[input.submissionId])).rows[0];if(old){if(old.payload_hash!==payloadHash)throw new Fault(409,'This submission ID is already attached to different values. Start a new review.');if(old.state==='ready')return {...previewRecord(input,old.ml,'ready'),submissionId:input.submissionId};if(old.state==='complete')return {...previewRecord(input,old.ml,'complete'),submissionId:input.submissionId};throw new Fault(409,'This sample is held for reconciliation and cannot be prepared again.');}
  const pending=(await db.query("SELECT ml FROM submissions WHERE workbook=$1 AND category=$2 AND state IN ('ready','pending','uncertain','blocked') AND ml IS NOT NULL",[book.id,input.category])).rows.map(r=>r.ml);
  const fresh=await readWorkbook(url),target=allocate(fresh.sheets,input.category,new Date(),managed.value.general.timezone,pending,type),m=type.layout;
  const values=Array.from({length:m.end-m.start+1},(_,i)=>target.before[i]??'');const writes:Array<{cell:string;value:string}>=[];
  for(const [key,offset] of Object.entries(m.fields)){if(key==='ml')values[offset]=target.ml;else if(key==='receivedBy')values[offset]=actor;else if(input.fields[key]!==undefined&&input.fields[key]!=='')values[offset]=input.fields[key];}
  for(const [key,offset] of Object.entries(m.fields)){if(key==='ml')writes.push({cell:`${column(m.start+offset)}${target.row}`,value:target.ml});else if(key==='receivedBy')writes.push({cell:`${column(m.start+offset)}${target.row}`,value:actor});else if(input.fields[key]!==undefined&&input.fields[key]!=='')writes.push({cell:`${column(m.start+offset)}${target.row}`,value:input.fields[key]});}
  const range=`${column(m.start)}${target.row}:${column(m.end)}${target.row}`;const data={input,batchId,index,configurationRevision:managed.revision,type,sheet:target.sheet.name,sheetId:target.sheet.id,row:target.row,range,before:target.before,values,writes,actor,preparedBy:actor,preparedAt:new Date().toISOString()};
  await db.query('INSERT INTO submissions(id,payload_hash,workbook,category,state,ml,data) VALUES($1,$2,$3,$4,$5,$6,$7)',[input.submissionId,payloadHash,book.id,input.category,'ready',target.ml,JSON.stringify(data)]);
  await audit(actor,'sample_logging_prepared',input.submissionId,{batchId,index,category:input.category,ml:target.ml,sheet:target.sheet.name,row:target.row,configurationRevision:managed.revision});
  return {...previewRecord(input,target.ml,'ready'),submissionId:input.submissionId};
 });
}
function previewRecord(input:IntakeItem,ml:string,state:string):PreparedIntakeItem{return {submissionId:input.submissionId,category:input.category,ml,state,name:input.fields.name||'',batch:input.fields.batch||'',received:input.fields.received||''};}

export async function commitPreparedSample(id:string,actor:string){
 const row=(await db.query('SELECT * FROM submissions WHERE id=$1',[id])).rows[0];if(!row)throw new Fault(404,'Prepared sample was not found. Review the batch again.');
 if(demo)return locked(`demo-intake:${row.category}`,async tx=>{
  const current=(await tx.query('SELECT * FROM submissions WHERE id=$1',[id])).rows[0];if(current.state==='complete')return current.data.sample;if(current.state!=='ready')throw new Fault(409,'This item is not ready to commit. Reconcile its state before retrying.');
  const {input,type,configurationRevision,zone}=current.data;const year=Number(new Intl.DateTimeFormat('en',{timeZone:zone,year:'numeric'}).format(new Date()));const sample:Sample={id:randomUUID(),configurationRevision,categoryLabel:type.name,category:type.id,ml:current.ml,name:input.fields.name,batch:input.fields.batch,received:input.fields.received,status:'',remarks:'De-identified demonstration',context:input.fields.context||'',fields:{...input.fields,receivedBy:actor},source:{spreadsheetId:'demo',sheetId:0,sheet:new Intl.DateTimeFormat('en',{timeZone:zone,month:'long',year:'numeric'}).format(new Date()),section:type.name,row:0,range:'',fingerprint:hash({input,batchId:current.data.batchId,index:current.data.index,revision:configurationRevision}),observedAt:new Date().toISOString(),url:'',mappingRevision:String(configurationRevision),raw:[]}};
  await tx.query('BEGIN');try{await tx.query('INSERT INTO samples(id,source_key,data) VALUES($1,$2,$3)',[sample.id,'demo:'+sample.id,JSON.stringify(sample)]);await tx.query("UPDATE submissions SET state='complete',data=$1 WHERE id=$2",[JSON.stringify({...current.data,sample,committedBy:actor,committedAt:new Date().toISOString()}),id]);await tx.query('INSERT INTO audit(id,actor,action,entity,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,'Logged demonstration sample',sample.id,JSON.stringify({submissionId:id,ml:sample.ml,configurationRevision})]);await tx.query('COMMIT');}catch(e){await tx.query('ROLLBACK');throw e;}return sample;
 });
 if(row.state==='complete')return row.data.sample;if(row.state!=='ready')throw new Fault(409,'This item needs reconciliation and will not be sent again automatically.');
 const config=await setting('connections',defaultConnections);if(!config.writesEnabled||!config.reservationsReconciled||!config.manualIntakeCoordinated)throw new Fault(409,'The logbook is not ready for writes. An administrator must finish connection checks, number reconciliation, and manual-intake coordination in Settings → Connections. No values were sent.');
 return locked(row.workbook,async()=>{const current=(await db.query('SELECT * FROM submissions WHERE id=$1',[id])).rows[0];if(current.state==='complete')return current.data.sample;if(current.state!=='ready')throw new Fault(409,'This item is held for reconciliation and will not be resent automatically.');
  const intent=current.data;const url=intent.type.register==='environmental'?config.environmental:config.incoming;const book=await readWorkbook(url);const sheet=book.sheets.find(s=>s.id===intent.sheetId);if(!sheet)throw new Fault(409,'The reviewed month tab changed or is missing. Reconcile before logging.');validateLayout(sheet,current.category,intent.type);
  const reservations=(await db.query("SELECT id,ml,data FROM submissions WHERE workbook=$1 AND category=$2 AND state IN ('ready','pending','uncertain','blocked') AND ml IS NOT NULL",[current.workbook,current.category])).rows.filter((r:any)=>r.id!==id&&!(r.data.batchId===intent.batchId&&Number(r.data.index)>Number(intent.index))).map((r:any)=>r.ml);
  const sequence=allocate(book.sheets,current.category,new Date(),(await getConfiguration()).value.general.timezone,reservations,intent.type);
  if(sequence.row!==intent.row||sequence.ml!==current.ml||sequence.range!==intent.range)throw new Fault(409,'The current month, next number, or destination no longer matches the review. No value was written; prepare a fresh review.');
  const observed=await rangeValues(current.workbook,intent.sheet,intent.range),padded=Array.from({length:intent.before.length},(_,i)=>observed[i]??'');if(hash(padded)!==hash(intent.before))throw new Fault(409,'The reviewed destination changed. Return to review and ask an administrator to reconcile.');
  // Re-read each intended cell immediately before writing. Only mapped input
  // cells are touched; formulas, validation cells, and other columns stay intact.
  const latest=await rangeValues(current.workbook,intent.sheet,intent.range);if(hash(Array.from({length:intent.before.length},(_,i)=>latest[i]??''))!==hash(intent.before))throw new Fault(409,'The destination changed immediately before logging. No value was written.');
  await db.query("UPDATE submissions SET state='pending' WHERE id=$1",[id]);
  try{for(const item of intent.writes)await writeRange(current.workbook,intent.sheet,item.cell,[item.value]);const readback=await rangeValues(current.workbook,intent.sheet,intent.range);for(const item of intent.writes){const index=Number(item.cell.match(/\d+$/)?.[0])-intent.row+0;const col=item.cell.match(/^[A-Z]+/)?.[0];const fromColumn=(v:string)=>[...v].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;const offset=fromColumn(col!)-intent.type.layout.start;if(readback[offset]!==item.value)throw new Error('Readback differs');void index;}
   const record=sourceSample(current.workbook,sheet,current.category,intent.row,readback,intent.type,intent.configurationRevision);record.fields={...intent.input.fields,...record.fields};const sample=await saveSnapshot(record);await db.query("UPDATE submissions SET state='complete',data=$1 WHERE id=$2",[JSON.stringify({...intent,sample,committedAt:new Date().toISOString(),committedBy:actor}),id]);await audit(actor,'sample_logged',sample.id,{submissionId:id,batchId:intent.batchId,source:sample.source});return sample;
  }catch{await db.query("UPDATE submissions SET state='uncertain' WHERE id=$1",[id]);throw new Fault(409,'The outcome is uncertain. The number remains held; ask an administrator to reconcile this submission.');}
 });
}

export async function commitPreparedBatch(actor:string,ids:string[]){const byId=new Map<string,any>(),halted=new Set<string>();for(const id of ids){const row=(await db.query('SELECT workbook,category,state FROM submissions WHERE id=$1',[id])).rows[0];const key=row?`${row.workbook}:${row.category}`:'';if(key&&halted.has(key)){byId.set(id,{submissionId:id,state:'blocked',error:'A prior item in this sample type needs review; this item was not sent.'});continue;}try{const sample=await commitPreparedSample(id,actor);byId.set(id,{submissionId:id,state:'complete',sample});}catch(e:any){const current=(await db.query('SELECT state,workbook,category FROM submissions WHERE id=$1',[id])).rows[0];byId.set(id,{submissionId:id,state:current?.state==='uncertain'?'uncertain':'blocked',error:e.message});if(current)halted.add(`${current.workbook}:${current.category}`);}}
 return ids.map(id=>byId.get(id)||{submissionId:id,state:'blocked',error:'This item was not processed.'});
}
export async function cancelPreparedBatch(actor:string,batchId:string){const rows=(await db.query("SELECT id,data,state,ml FROM submissions WHERE state='ready'")).rows.filter((r:any)=>r.data.batchId===batchId&&r.data.preparedBy===actor);if(!rows.length)return {cancelled:0};for(const row of rows){await db.query("UPDATE submissions SET state='cancelled',ml=NULL WHERE id=$1 AND state='ready'",[row.id]);await audit(actor,'sample_logging_review_cancelled',row.id,{batchId,ml:row.ml,reservationReleased:true});}return {cancelled:rows.length};}
export async function reconcileSubmission(id:string,actor:string){const row=(await db.query('SELECT * FROM submissions WHERE id=$1',[id])).rows[0];if(!row)throw new Fault(404,'Submission not found');return locked(row.workbook,async()=>{const current=(await db.query('SELECT * FROM submissions WHERE id=$1',[id])).rows[0];if(current.state==='complete')return current.data.sample;const intent=current.data;const values=await rangeValues(current.workbook,intent.sheet,intent.range);if(hash(Array.from({length:intent.values.length},(_,i)=>values[i]??''))!==hash(intent.values))throw new Fault(409,'Source does not exactly match the intended write; manual reconciliation is required. Number remains held.');const config=await setting('connections',defaultConnections);const book=await readWorkbook((intent.type?.register==='environmental'||current.category==='EM')?config.environmental:config.incoming);const sheet=book.sheets.find(s=>s.id===intent.sheetId);if(!sheet)throw new Fault(409,'Original sheet is missing');const layout=sourceLayout(sheet,current.category,intent.type,new Date(),(await getConfiguration()).value.general.timezone);const record=sourceSample(current.workbook,sheet,current.category,intent.row,intent.values,intent.type,intent.configurationRevision,layout);record.fields={...intent.input.fields,...record.fields};const sample=await saveSnapshot(record);await db.query('UPDATE submissions SET state=$1,data=$2 WHERE id=$3',['complete',JSON.stringify({...intent,sample}),id]);await audit(actor,'submission_reconciled',id);await autoCreateProducts(actor);return sample;});}

async function submitDemo(actor:string,input:{submissionId:string;category:string;fields:Record<string,string>},type:SampleType,revision:number,zone:string){
 const sample=await locked('demo-intake',async tx=>{
  const old=(await tx.query('SELECT * FROM submissions WHERE id=$1',[input.submissionId])).rows[0];if(old){if(old.payload_hash!==hash(input))throw new Fault(409,'This submission was already used with different values');return old.data.sample;}
  const year=Number(new Intl.DateTimeFormat('en',{timeZone:zone,year:'numeric'}).format(new Date()));const existing=(await tx.query("SELECT data FROM samples WHERE data->>'category'=$1",[type.id])).rows.map(r=>r.data);const high=Math.max(0,...existing.map(s=>String(s.ml).match(/[-/](\d{2}|\d{4})[-/](\d+)$/)).filter(m=>m&&(Number(m[1])===year||Number(m[1])===year%100)).map(m=>Number(m![2])));
  const ml=formatNumber(type.numbering,year,high+1);const id=randomUUID();const sample:Sample={id,configurationRevision:revision,categoryLabel:type.name,category:type.id,ml,name:input.fields.name,batch:input.fields.batch,received:input.fields.received,status:'',remarks:'De-identified demonstration',context:input.fields.context||'',fields:{...input.fields,receivedBy:actor},source:{spreadsheetId:'demo',sheetId:0,sheet:new Intl.DateTimeFormat('en',{timeZone:zone,month:'long',year:'numeric'}).format(new Date()),section:type.name,row:0,range:'',fingerprint:hash(input),observedAt:new Date().toISOString(),url:'',mappingRevision:String(revision),raw:[]}};
  await tx.query('BEGIN');try{await tx.query('INSERT INTO samples(id,source_key,data) VALUES($1,$2,$3)',[id,'demo:'+id,JSON.stringify(sample)]);await tx.query('INSERT INTO submissions(id,payload_hash,workbook,category,state,ml,data) VALUES($1,$2,$3,$4,$5,$6,$7)',[input.submissionId,hash(input),'demo',type.id,'complete',ml,JSON.stringify({sample})]);await tx.query('INSERT INTO audit(id,actor,action,entity,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,'Logged demonstration sample',id,JSON.stringify({ml,configurationRevision:revision})]);await tx.query('COMMIT');}catch(e){await tx.query('ROLLBACK');throw e;}return sample;
 });
 await autoCreateProducts(actor);return sample;
}
