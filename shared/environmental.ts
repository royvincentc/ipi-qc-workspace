import {z} from 'zod';
import type {Criterion,Sample,Template} from './model.js';

const text=z.string().trim().min(1).max(200);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/).refine(value=>Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value,'Use a valid date');
export const environmentalInstanceSchema=z.object({
 test:text,label:text,location:text,stage:z.string().max(200).default(''),replicate:z.string().max(100).default(''),block:z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/).default('tests'),
 type:z.enum(['numeric','finding']),channel:z.enum(['active-air','passive-air']).optional(),unit:z.string().max(60),criterion:text.refine(v=>!/^[-\s]+$/.test(v),'Confirm a specification; dashes are not a criterion'),
 source:text,sourceLocation:text,date,dateBasis:z.enum(['release','analysis','owner-confirmed']),revision:text,
});
export const environmentalOutputSchema=z.object({id:z.string().regex(/^[a-z][a-z0-9_-]{0,39}$/),name:text,method:z.enum(['accupoint','spc-my','microbial']),mode:z.enum(['surface','open-plate','water-validation','gip','phase-air']),templateId:text,templateRevision:text,instances:z.array(environmentalInstanceSchema).min(1).max(300)});
export const environmentalProfileSchema=z.object({
 name:text,productId:text,product:text,category:text.default('EM'),facility:text,area:text,areaType:z.string().trim().max(200).optional(),context:z.string().trim().max(200).default(''),equipmentSet:text,
 effectiveFrom:date,effectiveTo:date.optional(),evidenceIds:z.array(text).min(1).max(100),outputs:z.array(environmentalOutputSchema).min(1).max(10),
}).superRefine((p,c)=>{
 if(p.effectiveTo&&p.effectiveTo<p.effectiveFrom)c.addIssue({code:'custom',message:'End date precedes the effective date'});
 if(new Set(p.outputs.map(o=>o.id)).size!==p.outputs.length)c.addIssue({code:'custom',message:'Output IDs must be unique'});
 for(const output of p.outputs){
  const keys=output.instances.map(i=>[i.test,i.location,i.stage,i.replicate,i.block,i.channel||''].map(environmentalKey).join('|'));
  if(new Set(keys).size!==keys.length)c.addIssue({code:'custom',message:`${output.name}: each location/test/stage/replicate/block must be unique`});
 }
});
export type EnvironmentalOutput=z.infer<typeof environmentalOutputSchema>;
export type EnvironmentalProfile=z.infer<typeof environmentalProfileSchema>&{id:string;revision:string;active:boolean;approvedBy:string;approvedAt:string;previousId?:string};
export interface EnvironmentalSelection {profileId?:string;outputId?:string}
export interface EnvironmentalSnapshot {profile:EnvironmentalProfile;output:EnvironmentalOutput;sourceFingerprint:string}
export interface LayoutResolution {status:'ready'|'missing'|'selection'|'conflict';message:string;choices?:{id:string;name:string}[]}
export interface EnvironmentalSetup {resolution:LayoutResolution;profiles:Pick<EnvironmentalProfile,'id'|'name'|'equipmentSet'|'revision'>[];outputs:Pick<EnvironmentalOutput,'id'|'name'|'method'|'mode'>[];snapshot?:EnvironmentalSnapshot}
export const environmentalKey=(value:string)=>value.normalize('NFKC').toLowerCase().replace(/[’‘]/g,"'").replace(/\s+/g,' ').trim();
export const processArea=(value:string)=>environmentalKey(value).replace(/^for\s+/,'').replace(/\s+area$/,'');

/** A plan creates stable instances, never analytical results or evidence that a swab occurred. */
export function environmentalCriteria(profile:EnvironmentalProfile,output:EnvironmentalOutput):Criterion[]{
 return output.instances.map((row,index)=>({...row,instanceId:`${profile.id}:${output.id}:${index}`,revision:row.revision}));
}

export function environmentalTemplateIssue(template:Template|undefined,tests:Criterion[],category:string):string|undefined{
 if(!template||template.active===false||!template.verified||template.category!==category)return 'No active approved environmental template is available for this output.';
 const tokens=(template.manifest.tokens||[]) as string[];
 if(template.family==='environmental-warehouse-phase-air-7c'){
  const groups=new Map<string,Criterion[]>();
  for(const row of tests){
   if(!row.channel||!row.stage?.trim()||!row.unit.trim())return 'Confirm the phase, air channel and unit for each warehouse instance.';
   const key=JSON.stringify([row.block||'tests',row.test,row.location,row.stage,row.replicate]);
   groups.set(key,[...(groups.get(key)||[]),row]);
  }
  if([...groups.values()].some(pair=>pair.length!==2||new Set(pair.map(row=>row.channel)).size!==2))return 'Every warehouse test/location/phase needs one active-air and one passive-air instance.';
 }
 const bindings=(template.manifest.resultBindings||[]) as {test:string;location?:string;stage?:string;replicate?:string}[];
 if(bindings.length){
  const key=(r:{test:string;location?:string;stage?:string;replicate?:string})=>[r.test,r.location||'',r.stage||'',r.replicate||''].join('|');
  if(bindings.length!==tests.length||new Set(bindings.map(key)).size!==tests.length||bindings.some(b=>!tests.some(t=>key(t)===key(b))))return 'The fixed layout does not represent every selected location and test.';
 }else{
  const blocks=[...new Set(tests.map(t=>t.block||'tests'))];
  for(const block of blocks)if(!tokens.includes(block==='tests'?'tests':`rows.${block}`)&&!(template.manifest.adaptiveBlocks===true&&tokens.includes('tests')))return `The layout is missing the ${block} row block.`;
  const missing=['test','criterion',...(template.family==='environmental-warehouse-phase-air-7c'?['activeValue','passiveValue','phase']:['value']),'remarks',...(tests.some(t=>t.location)?['location']:[])].filter(token=>!tokens.includes(token));
  if(missing.length)return `The layout is missing row fields: ${missing.join(', ')}.`;
 }
 return undefined;
}

export function environmentalSourceIssue(sample:Sample):string|undefined{
 const area=processArea(sample.fields.area||'');
 const named=sample.name.match(/\b(filling|compounding|weighing)\b/gi)?.map(processArea)||[];
 if(area&&named.length===1&&named[0]!==area)return `The sample name says ${named[0]}, but the source Area is ${sample.fields.area}. Reconcile the source activity before choosing its sampling pattern.`;
 if(!sample.fields.facility?.trim())return 'Facility is not recorded. Confirm the source facility before selecting a sampling pattern.';
 if(!area)return 'Area is not recorded. Confirm the source process area before selecting a sampling pattern.';
 return undefined;
}

export function resolveEnvironmentalProfile(sample:Sample,productId:string,profiles:EnvironmentalProfile[],templates:Template[],selection:EnvironmentalSelection={}):EnvironmentalSetup{
 const sourceIssue=environmentalSourceIssue(sample);
 const available=profiles.filter(p=>p.active&&p.productId===productId&&p.category===sample.category&&environmentalKey(p.facility)===environmentalKey(sample.fields.facility||'')&&processArea(p.area)===processArea(sample.fields.area||'')&&(!p.context||environmentalKey(p.context)===environmentalKey(sample.context)));
 const summary=available.map(({id,name,equipmentSet,revision})=>({id,name,equipmentSet,revision}));
 const fail=(status:LayoutResolution['status'],message:string):EnvironmentalSetup=>({resolution:{status,message},profiles:summary,outputs:[]});
 if(sourceIssue)return fail('conflict',sourceIssue);
 if(!available.length)return fail('missing',`No approved sampling pattern matches ${sample.name} in ${sample.fields.area} (${sample.context||'unspecified context'}). Registering a DOCX layout does not supply locations or criteria. Configure a matching pattern in Settings → Report templates.`);
 const rawDate=sample.received.match(/(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{4})/)?.[0];
 const slash=rawDate?.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
 const candidateDate=slash?`${slash[3]}-${slash[1].padStart(2,'0')}-${slash[2].padStart(2,'0')}`:rawDate;
 const activityDate=candidateDate&&date.safeParse(candidateDate).success?candidateDate:'';
 if(!activityDate)return fail('selection','A valid received date is needed to select the effective sampling-plan revision.');
 const effective=available.filter(p=>p.effectiveFrom<=activityDate&&(!p.effectiveTo||p.effectiveTo>=activityDate));
 const chosen=selection.profileId?effective.filter(p=>p.id===selection.profileId):effective;
 if(chosen.length!==1)return fail(chosen.length?'selection':'missing',selection.profileId?'The selected sampling pattern is unavailable or is not effective for this activity.':chosen.length?'Select the confirmed equipment set / sampling pattern for this activity.':'No sampling pattern is effective on the activity date.');
 const profile=chosen[0];
 const outputs=profile.outputs.map(({id,name,method,mode})=>({id,name,method,mode}));
 const picked=selection.outputId?profile.outputs.filter(o=>o.id===selection.outputId):profile.outputs;
 if(picked.length!==1)return {...fail('selection',selection.outputId?'The selected monitoring output is not in this pattern.':'Select the monitoring method and output for this activity.'),outputs};
 const output=picked[0],template=templates.find(t=>t.id===output.templateId);
 const issue=environmentalTemplateIssue(template,environmentalCriteria(profile,output),sample.category);
 if(issue||template?.revision!==output.templateRevision)return {...fail('conflict',issue||'The template revision changed. Review and publish a new sampling-pattern revision.'),outputs,snapshot:{profile,output,sourceFingerprint:sample.source.fingerprint}};
 return {profiles:summary,outputs,resolution:{status:'ready',message:`${profile.name} · ${output.name}`},snapshot:{profile,output,sourceFingerprint:sample.source.fingerprint}};
}
