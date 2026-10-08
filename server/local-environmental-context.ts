import {randomUUID} from 'node:crypto';
import {db,demo,locked,audit,setSetting} from './db.js';
import {getConfiguration} from './configuration.js';
import {sourceSample} from './samples.js';
import {mappings} from './domain.js';

/** Copy an authenticated read-only snapshot into the local demo; never invoke Google writes. */
export async function importLocalEnvironmentalContext(snapshot:any,actor:string){
 if(!demo)throw new Error('Context snapshot import is restricted to the local demo.');
 if(!snapshot.spreadsheetId||!snapshot.readAt||!Array.isArray(snapshot.tabs)||!snapshot.tabs.length)throw new Error('Use a complete environmental logbook snapshot.');
 const config=await getConfiguration(),type=config.value.sampleTypes.find(t=>t.active&&t.register==='environmental');
 if(!type)throw new Error('Enable an environmental sample type.');
 const mapping=mappings.EM;
 const key=(v:unknown)=>String(v??'').normalize('NFKC').replace(/[^a-z0-9]/gi,'').toLowerCase().replace(/reciev(ed|e)/g,'received');
 const planned=snapshot.tabs.flatMap((tab:any)=>{
  if(!Number.isInteger(tab.sheetId)||!tab.tab||!Array.isArray(tab.values))throw new Error('Snapshot tab identity is incomplete.');
  const headers=tab.values[mapping.header-1]||[];
  if(mapping.headers.some((expected,i)=>key(headers[i])!==key(expected)&&!(key(expected)==='batchlotno'&&key(headers[i])==='batchno')))throw new Error(`${tab.tab}: environmental headers require review.`);
  return tab.values.flatMap((row:any[],i:number)=>{
   if(i<mapping.first-1||!/^ML-EM-\d{2}-\d+$/i.test(String(row[mapping.ml]??''))||!String(row[mapping.fields.name]??'').trim())return [];
   const sample=sourceSample(snapshot.spreadsheetId,{id:tab.sheetId,name:tab.tab,rows:tab.values,rowCount:tab.rowCount||tab.values.length,merges:[]},type.id,i+1,row,type,config.revision,mapping);
   sample.source.observedAt=snapshot.readAt;
   return [sample];
  });
 });
 const counts=new Map<string,number>();for(const sample of planned)counts.set(sample.ml,(counts.get(sample.ml)||0)+1);
 const duplicates=[...counts].filter(([,count])=>count>1).map(([ml])=>ml);
 for(const sample of planned)if(duplicates.includes(sample.ml))sample.duplicate=true;
 return locked('local-context',async tx=>{
  await tx.query('BEGIN');try{
   let inserted=0,updated=0;
   for(const sample of planned){
    const sourceKey=[sample.source.spreadsheetId,sample.source.sheetId,sample.category,sample.source.row].join(':');
    const old=(await tx.query('SELECT id,data FROM samples WHERE source_key=$1',[sourceKey])).rows[0];
    if(old&&old.data.ml!==sample.ml)throw new Error(`${sample.source.sheet} row ${sample.source.row} changed identity; reconcile it first.`);
    if(old){sample.id=old.id;sample.fields={...old.data.fields,...sample.fields};if(old.data.source.fingerprint!==sample.source.fingerprint)await tx.query('INSERT INTO source_history(id,sample_id,data) VALUES($1,$2,$3)',[randomUUID(),old.id,JSON.stringify(old.data.source)]);updated++;}else inserted++;
    await tx.query('INSERT INTO samples(id,source_key,data) VALUES($1,$2,$3) ON CONFLICT(source_key) DO UPDATE SET data=$3,updated_at=now()',[sample.id,sourceKey,JSON.stringify(sample)]);
   }
   const summary={spreadsheetId:snapshot.spreadsheetId,title:snapshot.title,readAt:snapshot.readAt,tabs:snapshot.tabs.length,inserted,updated,total:planned.length,duplicates,googleWritesEnabled:false};
   await setSetting('localEnvironmentalContext',summary);await audit(actor,'local_environmental_context_imported',snapshot.spreadsheetId,summary);await tx.query('COMMIT');return summary;
  }catch(error){await tx.query('ROLLBACK');throw error;}
 });
}
