import {access,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import type {DB} from './db.js';
import {hash} from './domain.js';
import {ENVIRONMENTAL_FORMATS} from './environmental-formats.b64.js';

const actor='system:owner-authorized-environmental-templates';
export async function seedEnvironmentalFormats(db:DB,privatePath:(file:string)=>string,validate:(file:string)=>Promise<any>,audit:(actor:string,action:string,id:string,details:any)=>Promise<unknown>){
 const existing=(await db.query("SELECT data FROM templates WHERE data->>'category'='EM'")).rows.map(row=>row.data);
 for(const format of ENVIRONMENTAL_FORMATS){
  const matches=existing.filter(t=>t.family===format.family);
  const active=matches.filter(t=>t.active!==false);
  if(active.length>1){console.warn(`Environmental template registration held: multiple active ${format.family} layouts.`);continue;}
  if(matches.length&&!active.length)continue; // Respect administrator retirement.
  const previous=active[0];
  const file=previous?.path||`templates/report-formats/${format.family}.docx`;
  const target=privatePath(file);
  await mkdir(path.dirname(target),{recursive:true});
  let missing=false;
  try{await access(target);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;missing=true;}
  if(missing){
   if(previous&&previous.manifest?.bundledContentHash!==hash(format.base64))throw new Error(`Cannot restore customized environmental layout ${previous.name}; its original file is missing.`);
   await writeFile(target,Buffer.from(format.base64,'base64'));
  }
  if(previous?.verified&&previous.manifest?.administratorApproval){
   if(missing)await audit(actor,'template_file_restored',previous.id,{family:format.family});
   continue;
  }
  const validation=await validate(target);
  const required=['test','location','criterion','remarks',...(format.family==='environmental-warehouse-phase-air-7c'?['activeValue','passiveValue','phase']:['value'])];
  if(!validation.tokens.includes('tests')||required.some(token=>!validation.tokens.includes(token)))throw new Error(`Bundled environmental layout ${format.family} is missing required row tags.`);
  const approval={approvedBy:actor,approvedAt:new Date().toISOString(),visualReviewWaived:true,authorization:'Owner explicitly requested live registration and admin approval of the four reviewed EM layouts.'};
  const template=previous?{...previous,verified:true,manifest:{...previous.manifest,administratorApproval:approval}}:{
   id:randomUUID(),name:format.name,category:'EM',family:format.family,path:file,revision:hash({content:format.base64,grouping:format.rowGrouping}),verified:true,active:true,
   manifest:{...validation,requiredFields:format.requiredFields,resultBindings:[],appliesToProducts:[],defaultForCategory:false,rowGrouping:format.rowGrouping,adaptiveBlocks:format.family==='environmental-grouped-5c',bundledContentHash:hash(format.base64),administratorApproval:approval}
  };
  if(previous)await db.query('UPDATE templates SET data=$1 WHERE id=$2',[JSON.stringify(template),template.id]);
  else await db.query('INSERT INTO templates(id,data) VALUES($1,$2)',[template.id,JSON.stringify(template)]);
  await audit(actor,previous?'template_admin_approved':'template_registered',template.id,{family:format.family,revision:template.revision,sanitizationAttested:true,administratorApproval:true,authorization:approval.authorization});
 }
 const registered=(await db.query("SELECT data FROM templates WHERE data->>'category'='EM'")).rows.map(row=>row.data).filter(t=>ENVIRONMENTAL_FORMATS.some(format=>format.family===t.family));
 console.log('EM template deployment verification',JSON.stringify(registered.map(t=>({id:t.id,name:t.name,family:t.family,active:t.active!==false,verified:t.verified,adminApproved:Boolean(t.manifest?.administratorApproval)}))));
}
