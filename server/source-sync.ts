import type {Sample} from '../shared/model.js';
import type {SampleType} from '../shared/configuration.js';
import {Fault,sourceLayout,sectionRows,type Sheet,type Mapping} from './domain.js';

export interface SavedSourceRecord {
 id:string;
 ml:string;
 category:string;
 rev:number;
 source:{sheet:string;sheetId:number;row:number;fingerprint:string;observedAt?:string};
}
export interface SourceIdentityConflict {
 sampleId:string;
 ml:string;
 sheet:string;
 row:number;
 message:string;
}
const location=(record:{category:string;source:{sheetId:number;row:number}})=>JSON.stringify([record.source.sheetId,record.category,record.source.row]);
const identity=(record:{category:string;ml:string})=>JSON.stringify([record.category,record.ml]);
export interface SourceScope {sheetId:number;category:string}
export const sourceScopeKey=(record:SourceScope)=>JSON.stringify([record.sheetId,record.category]);

// Validate each section in full before accepting any of its rows.
export function collectSourceSections(sheets:Sheet[],types:SampleType[],zone:string,makeSample:(sheet:Sheet,type:SampleType,row:number,values:unknown[],layout:Mapping)=>Sample,now=new Date()){
 const records:Sample[]=[],scopes:SourceScope[]=[],errors:string[]=[];
 for(const sheet of sheets)for(const type of types){
  try{
   const layout=sourceLayout(sheet,type.id,type,now,zone);
   const section=sectionRows(sheet,type.id,type,layout).filter(row=>row.occupied&&!row.reserved&&row.ml.trim());
   records.push(...section.map(row=>makeSample(sheet,type,row.row,row.values,layout)));
   scopes.push({sheetId:sheet.id,category:type.id});
  }catch(error){
   errors.push(`${sheet.name} / ${type.name}: ${error instanceof Error?error.message:'Section could not be read'}`);
  }
 }
 return {records,scopes,errors};
}

export function sourceSyncDue(status:{lastSuccess?:string;lastAttempt?:string},now=Date.now()){
 const success=Date.parse(status.lastSuccess||''),attempt=Date.parse(status.lastAttempt||'');
 return (!Number.isFinite(success)||now-success>=4*60*60*1000)&&(!Number.isFinite(attempt)||now-attempt>=15*60*1000);
}

// Preserve conflicting snapshots and any relocated copies of their identity.
// Unrelated source records can still be imported without reconciling those rows.
export function planSourceSync(records:Sample[],saved:SavedSourceRecord[],options:{
 scopes?:SourceScope[];
 capturedAt?:string;
 observations?:Record<string,number>;
 workbookSheetIds?:number[];
}={}){
 const {scopes,capturedAt,observations={},workbookSheetIds}=options;
 const currentByLocation=new Map(records.map(record=>[location(record),record]));
 const currentIdentities=new Set(records.map(identity));
 const scanned=scopes&&new Set(scopes.map(sourceScopeKey));
 if(capturedAt&&(scopes?.some(section=>observations[sourceScopeKey(section)]>Number(capturedAt))||saved.some(old=>(!scanned||scanned.has(sourceScopeKey({sheetId:old.source.sheetId,category:old.category})))&&Date.parse(old.source.observedAt||'')>Number(capturedAt)))){
  throw new Fault(409,'This snapshot predates newer source records. Run a fresh push.');
 }
 const savedByLocation=new Map(saved.map(record=>[location(record),record]));
 const blockedLocations=new Set<string>(),blockedIdentities=new Set<string>();
 const conflicts:SourceIdentityConflict[]=[];
 for(const old of saved){
  const current=currentByLocation.get(location(old));
  if(current?.ml===old.ml)continue;
  // An omitted/invalid section is not evidence of deletion. Still protect its
  // identities if a copy appears in one of the successfully scanned sections.
  const missingTab=workbookSheetIds&&!workbookSheetIds.includes(old.source.sheetId);
  if(scanned&&!scanned.has(sourceScopeKey({sheetId:old.source.sheetId,category:old.category}))&&!currentIdentities.has(identity(old))&&!missingTab)continue;
  blockedLocations.add(location(old));blockedIdentities.add(identity(old));
  conflicts.push({sampleId:old.id,ml:old.ml,sheet:old.source.sheet,row:old.source.row,message:`A source record (${old.ml}) on sheet "${old.source.sheet}" row ${old.source.row} moved, disappeared, or changed identity. Reconcile the spreadsheet before synchronizing this record.`});
 }
 const updates=records.filter(record=>{
  if(blockedLocations.has(location(record))||blockedIdentities.has(identity(record)))return false;
  const old=savedByLocation.get(location(record));
  return !old||old.source.fingerprint!==record.source.fingerprint||old.rev!==record.configurationRevision;
 });
 return {updates,conflicts};
}

// Keep below the database pool limit. Finish every started save before the
// caller releases its workbook lock, including when one save fails.
export async function persistSourceUpdates<T>(records:T[],save:(record:T)=>Promise<unknown>){
 let count=0;
 for(let offset=0;offset<records.length;offset+=8){
  const results=await Promise.allSettled(records.slice(offset,offset+8).map(async record=>save(record)));
  count+=results.filter(result=>result.status==='fulfilled').length;
  const failure=results.find(result=>result.status==='rejected');
  if(failure?.status==='rejected')return {count,failure};
 }
 return {count,failure:undefined};
}
