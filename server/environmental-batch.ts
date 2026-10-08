import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile} from 'node:fs/promises';
import {db,locked,audit} from './db.js';
import {getConfiguration,saveConfiguration} from './configuration.js';
import {Fault,hash} from './domain.js';
import {worker,privatePath} from './reports.js';
import {publishEnvironmentalProfile} from './environmental.js';
import {prepareEnvironmentalBatch,outputMeaning,type BatchCandidate,type BatchRules} from '../shared/environmental-batch.js';
import type {Sample,Template} from '../shared/model.js';
import {environmentalProfileSchema} from '../shared/environmental.js';
import {environmentalProductKey,environmentalVariant} from '../shared/environmental-routing.js';

export async function scanEnvironmentalBatch(blob:Buffer,name:string,actor:string){
 const sha256=createHash('sha256').update(blob).digest('hex');
 return locked('environmental-import',async()=>{
  const cached=(await db.query("SELECT data FROM files WHERE data->>'kind'='environmental-import' AND data->>'sha256'=$1",[sha256])).rows[0]?.data;
  if(cached)return batchSummary(cached);
  const id=randomUUID(),folder=`environmental-imports/${id}`;
  await mkdir(privatePath(folder),{recursive:true});await writeFile(privatePath(folder+'/source.zip'),blob);
  const batch={id,kind:'environmental-import',name,sha256,path:folder+'/source.zip',createdAt:new Date().toISOString(),status:'scanning',actor,documents:0,exceptions:[],candidates:[],publications:[]};
  await db.query('INSERT INTO files(id,data) VALUES($1,$2)',[id,JSON.stringify(batch)]);
  startScan(batch);return batchSummary(batch);
 });
}
const jobs=new Set<string>();
function startScan(batch:any){
 if(jobs.has(batch.id))return;
 jobs.add(batch.id);
 void (async()=>{
  try{
   const folder=batch.path.slice(0,batch.path.lastIndexOf('/'));
   const result=await worker(['environmental-batch','--input',privatePath(batch.path),'--output',privatePath(folder)]);
   const candidates:BatchCandidate[]=[];
   for(const candidate of result.candidates){
    const identity=hash([batch.id,candidate.id]).slice(0,32),referenceId=[identity.slice(0,8),identity.slice(8,12),identity.slice(12,16),identity.slice(16,20),identity.slice(20)].join('-'),metadata=candidate.evidence[0];
    const evidence={paragraphs:[{text:metadata.ml||''}],tables:[{rows:[['Name of Sample',metadata.product||''],['Area',metadata.area||''],['Date&Time Received',metadata.received||'']]}]};
    const reference={id:referenceId,kind:'reference',name:candidate.sourceName,path:folder+'/'+candidate.sourceSha256+'.docx',sha256:candidate.sourceSha256,evidence,createdAt:new Date().toISOString(),environmentalImportId:batch.id};
    await db.query('INSERT INTO files(id,data) VALUES($1,$2) ON CONFLICT (id) DO NOTHING',[referenceId,JSON.stringify(reference)]);
    candidates.push({...candidate,referenceId});
   }
   Object.assign(batch,{status:'ready',documents:result.documents,lockFiles:result.lockFiles,exceptions:result.exceptions,candidates});
   await audit(batch.actor,'environmental_archive_prepared',batch.id,{documents:result.documents,candidates:candidates.length,exceptions:result.exceptions.length});
  }catch(error:any){Object.assign(batch,{status:'failed',error:error.message});}
  finally{await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(batch),batch.id]);jobs.delete(batch.id);}
 })().catch(()=>jobs.delete(batch.id));
}

function batchSummary(batch:any){return {id:batch.id,name:batch.name,status:batch.status,error:batch.error,documents:batch.documents,candidates:batch.candidates.length,exceptions:batch.exceptions,publications:batch.publications};}
async function load(id:string){const batch=(await db.query('SELECT data FROM files WHERE id=$1',[id])).rows[0]?.data;if(batch?.kind!=='environmental-import')throw new Fault(404,'Environmental import not found');return batch;}
function normalizedRules(rules:BatchRules,timezone:string):BatchRules{
 if(!rules.unchanged)return rules;
 const parts=new Intl.DateTimeFormat('en-CA',{timeZone:timezone,year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(new Date());
 const field=(type:string)=>parts.find(p=>p.type===type)!.value;
 return {...rules,criterionDate:`${field('year')}-${field('month')}-${field('day')}`,effectiveFrom:'0001-01-01'};
}
function fingerprint(profile:any,rules:BatchRules){const normalized=environmentalProfileSchema.safeParse(profile),value=normalized.success?normalized.data:profile;return hash(rules.unchanged?{...value,outputs:value.outputs.map((o:any)=>({...o,instances:o.instances.map((r:any)=>({...r,date:'unchanged'}))}))}:value);}
export async function previewEnvironmentalBatch(id:string,rules:BatchRules){
 const batch=await load(id),config=await getConfiguration();
 if(batch.status==='scanning'){
  startScan(batch);let progress={};try{progress=JSON.parse(await readFile(privatePath(batch.path.replace(/source\.zip$/,'progress.json')),'utf-8'));}catch{}
  return {...batchSummary(batch),progress,configurationRevision:config.revision,proposals:[]};
 }
 if(batch.status==='failed')throw new Fault(422,batch.error||'Archive processing failed');
 const templates=(await db.query('SELECT data FROM templates')).rows.map(r=>r.data as Template);
 const samples=(await db.query('SELECT data FROM samples')).rows.map(r=>r.data as Sample);
 const proposals=prepareEnvironmentalBatch(batch.candidates,config.value,templates,samples,normalizedRules(rules,config.value.general.timezone));
 const published=new Set(batch.publications.map((p:any)=>p.fingerprint));
 return {...batchSummary(batch),configurationRevision:config.revision,proposals:proposals.map(p=>({...p,published:published.has(fingerprint(p.profile,rules))}))};
}
let publishing:Promise<unknown>=Promise.resolve();
export async function approveEnvironmentalAliases(id:string,actor:string){
 const batch=await load(id),config=await getConfiguration(),value=structuredClone(config.value);
 const categories=value.sampleTypes.filter(t=>t.active&&t.register==='environmental').map(t=>t.id);
 const products=value.products.filter(p=>p.active&&categories.includes(p.category));
 const samples=(await db.query('SELECT data FROM samples')).rows.map(r=>r.data as Sample);
 const names=[...new Set([...batch.candidates.flatMap((c:BatchCandidate)=>[c.productHint,...c.evidence.map(e=>e.product||'')]),...samples.filter(s=>categories.includes(s.category)).map(s=>s.name)])] as string[];
 const aliases=[],held=[];
 for(const name of names){
  if(!name.trim()||name.length>200)continue;
  const matches=products.filter(p=>environmentalProductKey(p.name)===environmentalProductKey(name)&&environmentalVariant(p.name)===environmentalVariant(name));
  if(matches.length!==1){held.push({name,reason:matches.length?'Multiple canonical products':'No equivalent canonical product; meaningful variants are not collapsed'});continue;}
  const product=matches[0];if(product.name===name||product.aliases.includes(name))continue;
  if(products.some(other=>other.id!==product.id&&[other.name,...other.aliases].some(alias=>alias.trim().toLowerCase()===name.trim().toLowerCase()))){held.push({name,reason:'Alias already belongs to another product'});continue;}
  product.aliases.push(name);aliases.push({product:product.name,alias:name});
 }
 if(aliases.length){await saveConfiguration(value,config.revision,actor);await audit(actor,'environmental_aliases_automatically_approved',id,{aliases,basis:'owner-authorized cosmetic/acronym/context-suffix equivalence; meaningful variants retained'});}
 return {aliases,held};
}
export async function publishEnvironmentalBatch(id:string,rules:BatchRules,selected:string[],expectedConfiguration:number,actor:string){
 const operation=publishing.catch(()=>{}).then(async()=>{
  const preview=await previewEnvironmentalBatch(id,rules);
  if(preview.configurationRevision!==expectedConfiguration)throw new Fault(409,'Settings changed. Prepare the batch again.');
  const chosen=preview.proposals.filter(p=>selected.includes(p.key));
  if(chosen.length!==new Set(selected).size||!chosen.length)throw new Fault(400,'Select existing prepared patterns.');
  if(chosen.some(p=>p.issues.length))throw new Fault(400,'Resolve exceptions before publishing selected patterns.');
  const config=await getConfiguration(),value=structuredClone(config.value),batch=await load(id);
  for(const p of chosen)if(p.newProduct&&!value.products.some(product=>product.id===p.newProduct!.id))value.products.push(p.newProduct);
  const samples=(await db.query('SELECT data FROM samples')).rows.map(r=>r.data as Sample),aliases=[];
  for(const p of chosen){
   const product=value.products.find(product=>product.id===p.profile.productId)!;
   const names=[...batch.candidates.filter((c:BatchCandidate)=>p.candidateIds.includes(c.id)).flatMap((c:BatchCandidate)=>[c.productHint,...c.evidence.map(e=>e.product||'')]),...samples.filter(s=>s.category===product.category).map(s=>s.name)];
   for(const name of [...new Set(names)] as string[]){
    if(!name.trim()||name.length>200||name===product.name||product.aliases.includes(name)||environmentalProductKey(name)!==environmentalProductKey(product.name)||environmentalVariant(name)!==environmentalVariant(product.name))continue;
    if(value.products.some(other=>other.id!==product.id&&other.category===product.category&&[other.name,...other.aliases].some(alias=>alias.trim().toLowerCase()===name.trim().toLowerCase())))continue;
    product.aliases.push(name);aliases.push({product:product.name,alias:name});
   }
  }
  if(JSON.stringify(value)!==JSON.stringify(config.value))await saveConfiguration(value,config.revision,actor);
  if(aliases.length)await audit(actor,'environmental_aliases_automatically_approved',id,{aliases,basis:'cosmetic spelling, known acronym or context/area suffix; distinct variants preserved'});
  const results=[];
  for(const p of chosen){
   const identity=fingerprint(p.profile,rules),prior=batch.publications.find((item:any)=>item.fingerprint===identity);
   if(prior){results.push({...prior,status:'already-published'});continue;}
   try{
    // Recover a completed publication if the process stopped before recording its batch ledger.
    const existing=(await db.query('SELECT data FROM environmental_profiles')).rows.map(r=>r.data).find(profile=>profile.active&&fingerprint(Object.fromEntries(Object.keys(p.profile).map(key=>[key,profile[key]])),rules)===identity);
    if(existing){const record={fingerprint:identity,key:p.key,profileId:existing.id,name:existing.name,status:'already-published'};batch.publications.push(record);await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(batch),id]);results.push(record);continue;}
    const approved=(await db.query('SELECT data FROM environmental_profiles')).rows.map(r=>r.data).find(profile=>profile.active&&['productId','category','facility','area','context','equipmentSet','effectiveFrom','effectiveTo'].every(key=>(profile[key]||'')===(p.profile[key]||'')));
    const outputsMeaning=(profile:any)=>JSON.stringify(profile.outputs.map((o:any)=>[o.method,o.mode,o.templateId,o.templateRevision,outputMeaning(o)]).sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
    if(approved&&outputsMeaning(approved)!==outputsMeaning(p.profile))throw new Fault(409,'An active pattern has different approved outputs; review a revision before replacing it.');
    const profile=await publishEnvironmentalProfile(p.profile,actor,approved?.id,approved?.revision);
    const record={fingerprint:identity,key:p.key,profileId:profile.id,name:profile.name,status:'published'};
    batch.publications.push(record);await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(batch),id]);results.push(record);
   }catch(error:any){results.push({key:p.key,name:p.profile.name,status:'exception',message:error.message});}
  }
  await audit(actor,'environmental_batch_published',id,{results});return {results};
 });publishing=operation;return operation;
}
