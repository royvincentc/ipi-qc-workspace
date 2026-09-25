import {randomUUID} from 'node:crypto';
import {db,locked,setting} from './db.js';
import {categories,testLabels} from '../shared/model.js';
import {configSchema,type Configuration,type ConfigurationRevision} from '../shared/configuration.js';
import {mappings,Fault,hash} from './domain.js';

export type ConnectionKind='incoming'|'environmental'|'specifications';
function canonical(value:unknown):unknown{return Array.isArray(value)?value.map(canonical):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).sort(([a],[b])=>a.localeCompare(b)).map(([key,item])=>[key,canonical(item)])):value;}
export function connectionFingerprint(value:Configuration,kind:ConnectionKind){
 const sampleTypes=value.sampleTypes.filter(type=>kind==='specifications'||type.register===kind).map(type=>kind==='specifications'
  ?{id:type.id,active:type.active,applicability:type.applicability,applicabilitySheet:type.applicabilitySheet}
  :{id:type.id,active:type.active,register:type.register,layout:type.layout,numbering:type.numbering,legacyNumbering:type.legacyNumbering});
 const tests=kind==='specifications'?value.tests.map(test=>({id:test.id,active:test.active,categories:test.categories,sheetHeader:test.sheetHeader,sheetColumn:test.sheetColumn})):[];
 return hash(canonical({timezone:kind==='specifications'?null:value.general.timezone,sampleTypes,tests}));
}

export async function seedConfiguration():Promise<Configuration>{
 const connections=await setting<any>('connections',{});
 const labels:Record<string,string>={name:'Sample / product name',batch:'Batch / lot number',received:'Date and time received',context:'Testing context',secondaryCategory:'Secondary source field',facility:'Facility',area:'Area',equipmentCount:'Area / equipment count',samplerCount:'Accupoint samplers',plateCount:'Plates used'};
 const specs=(await db.query('SELECT data FROM specifications')).rows.map(r=>r.data);
 return configSchema.parse({general:{appName:'IPI Micro-QC',laboratoryName:'IPI Microbiology Laboratory',department:'Quality Control',site:'International Pharmaceuticals, Inc.',timezone:connections.timezone||'Asia/Manila',dateFormat:'en-PH',pageSize:25,theme:'system',density:'comfortable'},
 sampleTypes:Object.entries(categories).map(([id,name],order)=>({id,name,order,active:true,register:id==='EM'?'environmental':'incoming',layout:{...mappings[id],acceptedTitles:id==='FG'?['Finished Goods']:[],extraMerges:id==='SFG'?['D5:E5']:id==='FG'?['R5:S5']:id==='EM'?['F4:G4']:[]},numbering:{prefix:`ML-${id}`,separator:'-',yearDigits:2,padding:4},legacyNumbering:[],applicability:'spreadsheet',applicabilitySheet:id==='RM'?'Raw Materials':'RM/FP/AS',fields:Object.entries(mappings[id].fields).filter(([key])=>labels[key]).map(([key,column],order)=>({key,column,label:labels[key],type:key==='received'?'datetime-local':key.endsWith('Count')?'number':'text',required:['name','batch','received',...(id==='EM'?['facility','area']:[])].includes(key),active:true,order,help:key==='secondaryCategory'?'Preserved separately; leave blank if unused.':'',defaultValue:'',options:[],lookup:''}))})),
 tests:Object.entries(testLabels).map(([id,name],order)=>({id,name,shortName:id,reportLabel:name,unit:specs.flatMap(s=>s.tests).find(t=>t.test===id)?.unit||'',inputType:['SPC','MY'].includes(id)?'numeric':'finding',active:true,order,categories:Object.keys(categories),sheetColumn:order+1,sheetHeader:['SPC','MY','P.aeuginosa','S.aureus','C.albicans','E.coli','Salmonella','Enterobacteriaceae','Coliform'][order]})),
 products:[...new Map(specs.map(s=>[s.category+':'+s.product,{id:'product-'+randomUUID(),name:s.product,category:s.category,code:'',aliases:[],active:true}])).values()],lookups:[],
 reports:{title:'Microbiological Analysis Report',notedBy:'Celeste P. Yandug',notedByRole:'Assistant Head, Microbiology Laboratory',filenamePrefix:'',footer:''}});
}
export async function getConfiguration():Promise<ConfigurationRevision>{
 const row=(await db.query('SELECT revision,data,changed_at,changed_by FROM configuration WHERE id=1')).rows[0];
 if(row)return {revision:row.revision,value:row.data,changedAt:row.changed_at,changedBy:row.changed_by};
 return locked('configuration',async tx=>{const existing=(await tx.query('SELECT revision FROM configuration WHERE id=1')).rows[0];if(existing)throw new Fault(409,'Configuration is initializing. Refresh the page.');const value=await seedConfiguration();const time=new Date().toISOString();await tx.query('BEGIN');try{await tx.query('INSERT INTO configuration(id,revision,data,changed_at,changed_by) VALUES(1,1,$1,$2,$3)',[JSON.stringify(value),time,'migration']);await tx.query('INSERT INTO configuration_revisions(revision,data,changed_at,changed_by) VALUES(1,$1,$2,$3)',[JSON.stringify(value),time,'migration']);await tx.query('COMMIT');}catch(e){await tx.query('ROLLBACK');throw e;}return {revision:1,value,changedAt:time,changedBy:'migration'};});
}
export async function saveConfiguration(input:unknown,expected:number,actor:string){
 const value=configSchema.parse(input);
 return locked('configuration',async tx=>{const row=(await tx.query('SELECT revision,data FROM configuration WHERE id=1')).rows[0];if(row.revision!==expected)throw new Fault(409,'Settings changed in another session. Reload before saving.');const old=row.data as Configuration;
  for(const key of ['sampleTypes','tests','products','lookups'] as const)for(const item of old[key])if(!value[key].some(n=>n.id===item.id))throw new Fault(400,`Keep existing ${key} and disable them instead of deleting them.`);
  for(const type of value.sampleTypes){const previous=old.sampleTypes.find(t=>t.id===type.id);if(!previous)continue;
   if(type.register!==previous.register)throw new Fault(400,'An existing sample type cannot move to another register. Create a new type.');
   for(const field of previous.fields)if(!type.fields.some(f=>f.key===field.key))throw new Fault(400,'Disable existing fields instead of removing them.');
   type.legacyNumbering=previous.legacyNumbering;
   if(JSON.stringify(previous.numbering)!==JSON.stringify(type.numbering))type.legacyNumbering=[...previous.legacyNumbering,previous.numbering].filter((r,i,a)=>a.findIndex(v=>JSON.stringify(v)===JSON.stringify(r))===i);
  }
  for(const t of value.sampleTypes)for(const other of value.sampleTypes)if(t.id!==other.id&&[other.numbering,...other.legacyNumbering].some(r=>r.prefix===t.numbering.prefix))throw new Fault(400,'This prefix belongs to another sample type or its historical series. Choose a unique prefix.');
  const referenced=new Set((await tx.query("SELECT DISTINCT data->>'category' AS category FROM samples")).rows.map(r=>r.category));const sourceTypes=value.sampleTypes.filter(t=>t.active||referenced.has(t.id));for(const t of sourceTypes)for(const other of sourceTypes)if(t.id!==other.id&&t.register===other.register&&t.layout.start<=other.layout.end&&t.layout.end>=other.layout.start)throw new Fault(400,'Source sections cannot overlap, including inactive types with historical records.');
  const invalidated=(['incoming','environmental','specifications'] as ConnectionKind[]).filter(kind=>connectionFingerprint(old,kind)!==connectionFingerprint(value,kind));
  const revision=expected+1,changedAt=new Date().toISOString();await tx.query('BEGIN');try{
   await tx.query('UPDATE configuration SET revision=$1,data=$2,changed_at=$3,changed_by=$4 WHERE id=1',[revision,JSON.stringify(value),changedAt,actor]);
   await tx.query('INSERT INTO configuration_revisions(revision,data,changed_at,changed_by) VALUES($1,$2,$3,$4)',[revision,JSON.stringify(value),changedAt,actor]);
   await tx.query('INSERT INTO audit(id,actor,action,entity,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,'Updated laboratory settings','configuration',JSON.stringify({revision,previous:old,newValue:value})]);
   if(invalidated.length){const c=(await tx.query("SELECT value FROM settings WHERE key='connections'")).rows[0]?.value;if(c&&invalidated.some(kind=>kind!=='specifications'))await tx.query("UPDATE settings SET value=$1 WHERE key='connections'",[JSON.stringify({...c,writesEnabled:false})]);const tests=(await tx.query("SELECT value FROM settings WHERE key='connectionTests'")).rows[0]?.value||{};for(const kind of invalidated)delete tests[kind];await tx.query("INSERT INTO settings(key,value) VALUES('connectionTests',$1) ON CONFLICT(key) DO UPDATE SET value=$1",[JSON.stringify(tests)]);}
   await tx.query('COMMIT');
  }catch(e){await tx.query('ROLLBACK');throw e;}return {revision,value,changedAt,changedBy:actor};
 });
}

export async function sourceTypes(){const config=(await getConfiguration()).value;const referenced=new Set((await db.query("SELECT DISTINCT data->>'category' AS category FROM samples")).rows.map(r=>r.category));return config.sampleTypes.filter(t=>t.active||referenced.has(t.id));}

export async function migrateConfigurationColumns(){const c=await getConfiguration();const value=structuredClone(c.value) as any;let changed=false;
 value.tests=value.tests.map((t:any,index:number)=>{if(t.sheetColumn!==undefined)return t;changed=true;return {...t,sheetColumn:t.sheetHeader?index+1:null};});
 value.sampleTypes=value.sampleTypes.map((t:any)=>{const next={...t,layout:{...t.layout,acceptedTitles:t.layout.acceptedTitles||[]}};if(t.id==='FG'&&!next.layout.acceptedTitles.some((title:string)=>title.trim().toLowerCase()==='finished goods')){next.layout.acceptedTitles=[...next.layout.acceptedTitles,'Finished Goods'];changed=true;}if(next.applicabilitySheet==='RMFPAS'){next.applicabilitySheet='RM/FP/AS';changed=true;}return next;});
 if(changed)await saveConfiguration(value,c.revision,'migration');
}
