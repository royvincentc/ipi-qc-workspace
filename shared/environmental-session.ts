import type {Draft} from './model.js';

// Common report metadata only. Results, remarks and method analyst identity stay independent.
export const sessionDetailGroups=[
 ['analysisDate'],['date.mfd','manufactureDate'],['exp.date','expiryDate'],
 ['fill.vol','fillVolume'],['batch.size','batchSize'],['requested.by','requestedBy'],
 ['temperature'],['relativeHumidity'],['purpose'],['additionalCC'],['page','pageNumber'],
] as const;

export function sharedSessionDetails(drafts:Draft[]):Record<string,string>{
 const ordered=[...drafts].sort((a,b)=>b.updatedAt.localeCompare(a.updatedAt)||a.id.localeCompare(b.id));
 const fields:Record<string,string>={};
 for(const group of sessionDetailGroups){
  const value=ordered.flatMap(d=>group.map(key=>d.fields[key])).find(value=>value?.trim());
  if(value!==undefined)for(const key of group)fields[key]=value;
 }
 return fields;
}

export function editedSessionDetails(shared:Record<string,string>,submitted:Record<string,string>){
 const fields={...shared};
 for(const group of sessionDetailGroups){
  const changed=group.find(key=>key in submitted&&submitted[key]!== (shared[key]||''));
  if(changed)for(const key of group)fields[key]=submitted[changed];
 }
 return fields;
}
