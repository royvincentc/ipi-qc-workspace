import type {Sample} from '../shared/model.js';

export interface SavedSourceRecord {
 id:string;
 ml:string;
 category:string;
 rev:number;
 source:{sheet:string;sheetId:number;row:number;fingerprint:string};
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

// Preserve conflicting snapshots and any relocated copies of their identity.
// Unrelated source records can still be imported without reconciling those rows.
export function planSourceSync(records:Sample[],saved:SavedSourceRecord[]){
 const currentByLocation=new Map(records.map(record=>[location(record),record]));
 const savedByLocation=new Map(saved.map(record=>[location(record),record]));
 const blockedLocations=new Set<string>(),blockedIdentities=new Set<string>();
 const conflicts:SourceIdentityConflict[]=[];
 for(const old of saved){
  const current=currentByLocation.get(location(old));
  if(current?.ml===old.ml)continue;
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
