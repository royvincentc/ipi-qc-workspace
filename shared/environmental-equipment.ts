import {z} from 'zod';
import {environmentalActivityDate,environmentalKey,processArea,environmentalSourceIssue,environmentalTemplateIssue,resolveEnvironmentalProfile,type EnvironmentalProfile,type EnvironmentalOutput,type EnvironmentalSelection,type EnvironmentalSetup,type EquipmentCatalog} from './environmental.js';
import type {Sample,Template} from './model.js';

export const equipmentSelectionSchema=z.object({
 profileId:z.string().max(200).optional(),outputId:z.string().max(200).optional(),
 equipmentRevision:z.string().max(20000).optional(),
 equipment:z.array(z.object({id:z.string().trim().min(1).max(200),quantity:z.number().int().min(0).max(300),labels:z.array(z.string().trim().min(1).max(200)).max(300).optional()})).max(300).optional(),
});
type Definition={profile:EnvironmentalProfile;output:EnvironmentalOutput;rows:EnvironmentalOutput['instances'];signature:string};
const methods=['accupoint','spc-my'] as const;
/** Only equipment ordinals collapse; facility/model/phase numbers keep their identity. */
function equipmentName(location:string){
 return location.trim().replace(/(\b(?:drum|pail|nozzle|hose|tank|spatula|pipe|barrel|bucket|vessel|beaker|flask|tray|container|tub|bottle|bin|funnel|scoop|mixer|utensil|pump|filter))\s+(?:no\.?\s*)?#?\d+$/i,'$1');
}
const rowIdentity=(r:EnvironmentalOutput['instances'][number])=>JSON.stringify([r.test,r.stage,r.replicate,r.block,r.channel||'']);
function signature(output:EnvironmentalOutput,rows:EnvironmentalOutput['instances']){
 return JSON.stringify([output.templateId,output.templateRevision,rows.map(r=>[rowIdentity(r),r.type,environmentalKey(r.unit).replace(/\s/g,''),environmentalKey(r.criterion).replace(/^not more than\s+/,'nmt ')]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}

export function resolveEnvironmentalEquipment(sample:Sample,productId:string,profiles:EnvironmentalProfile[],templates:Template[],selection:EnvironmentalSelection={}):EnvironmentalSetup{
 const activityDate=environmentalActivityDate(sample);
 const applicable=profiles.filter(p=>p.active&&p.productId===productId&&p.category===sample.category&&environmentalKey(p.facility)===environmentalKey(sample.fields.facility||'')&&processArea(p.area)===processArea(sample.fields.area||'')&&(!p.context||environmentalKey(p.context)===environmentalKey(sample.context))&&activityDate&&p.effectiveFrom<=activityDate&&(!p.effectiveTo||p.effectiveTo>=activityDate)).sort((a,b)=>a.id.localeCompare(b.id));
 const selectedProfile=selection.profileId?applicable.find(p=>p.id===selection.profileId):undefined;
 const selectedOutput=selectedProfile?.outputs.find(o=>o.id===selection.outputId);
 const otherOutputs=applicable.flatMap(p=>p.outputs.filter(o=>o.mode!=='surface').map(o=>({profileId:p.id,outputId:o.id,name:`${p.name} · ${o.name}`,mode:o.mode})));
 if(selectedOutput&&selectedOutput.mode!=='surface'||selectedProfile&&!selectedProfile.outputs.some(o=>o.mode==='surface')||!applicable.some(p=>p.outputs.some(o=>o.mode==='surface'))){
  const legacy=resolveEnvironmentalProfile(sample,productId,profiles,templates,selection);
  return selection.equipment?.some(q=>q.quantity>0)?{profiles:legacy.profiles,outputs:legacy.outputs,otherOutputs,resolution:{status:'conflict',message:'Equipment quantities require approved surface-swab outputs for this activity. Reload the applicable monitoring output.'}}:{...legacy,otherOutputs};
 }
 const base:EnvironmentalSetup={profiles:applicable.map(({id,name,equipmentSet,revision})=>({id,name,equipmentSet,revision})),outputs:[],otherOutputs,resolution:{status:'selection',message:'Select the equipment sampled and set its quantity to build both method tables.'}};
 const fail=(status:EnvironmentalSetup['resolution']['status'],message:string):EnvironmentalSetup=>({...base,resolution:{status,message}});
 const sourceIssue=environmentalSourceIssue(sample);if(sourceIssue)return fail('conflict',sourceIssue);
 const definitions=new Map<string,{name:string;byMethod:Map<string,Definition[]>}>();
 for(const profile of applicable)for(const output of profile.outputs.filter(o=>o.mode==='surface'&&methods.includes(o.method as typeof methods[number]))){
  const locations=new Map<string,EnvironmentalOutput['instances']>();
  for(const row of output.instances){const key=environmentalKey(row.location);locations.set(key,[...(locations.get(key)||[]),row]);}
  for(const rows of locations.values()){
   const name=equipmentName(rows[0].location),id=environmentalKey(name),entry=definitions.get(id)||{name,byMethod:new Map<string,Definition[]>()};
   entry.byMethod.set(output.method,[...(entry.byMethod.get(output.method)||[]),{profile,output,rows,signature:signature(output,rows)}]);definitions.set(id,entry);
  }
 }
 const revision=JSON.stringify([sample.source.fingerprint,applicable.map(p=>[p.id,p.revision,p.outputs.map(o=>[o.id,o.templateId,o.templateRevision])])]);
 const items:EquipmentCatalog['items']=[...definitions].sort((a,b)=>a[0].localeCompare(b[0])).map(([id,entry])=>{
  let issue:string|undefined;const parameters:EquipmentCatalog['items'][number]['parameters']=[];
  for(const method of methods){
   const choices=entry.byMethod.get(method)||[],label=method==='accupoint'?'Accupoint':'SPCMY';
   if(!choices.length){issue=issue||`${label} has no approved definition for ${entry.name}.`;continue;}
   if(new Set(choices.map(c=>c.signature)).size!==1){issue=issue||`Approved ${label} definitions conflict for ${entry.name}. Ask an administrator to reconcile the standards or layouts.`;continue;}
   const definition=choices[0],layout=templates.find(t=>t.id===definition.output.templateId);
   const problem=environmentalTemplateIssue(layout,definition.rows,sample.category);
   if(problem||layout?.revision!==definition.output.templateRevision)issue=issue||`${label}: ${problem||'The approved template revision changed. Publish an updated definition.'}`;
   parameters.push(...definition.rows.map(r=>({method,test:r.test,label:r.label,criterion:r.criterion,unit:r.unit})));
  }
  return {id,name:entry.name,issue,parameters};
 });
 base.equipment={revision,items};
 const parsed=equipmentSelectionSchema.safeParse(selection);
 if(!parsed.success)return fail('conflict','Use whole-number equipment quantities from 0 to 300 and nonblank equipment labels.');
 const quantities=parsed.data.equipment?.filter(q=>q.quantity>0)||[];
 if(!quantities.length)return base;
 if(selection.equipmentRevision!==revision)return fail('conflict','Approved equipment definitions or the source activity changed. Reload the equipment list before creating the session.');
 if(new Set(quantities.map(q=>q.id)).size!==quantities.length)return fail('conflict','Each equipment type can be selected only once.');
 quantities.sort((a,b)=>a.id.localeCompare(b.id));
 const labels:string[]=[];
 for(const quantity of quantities){
  const item=items.find(i=>i.id===quantity.id);if(!item)return fail('conflict','Selected equipment is not approved for this product, facility, area and activity date.');
  if(item.issue)return fail('conflict',item.issue);
  if(quantity.labels&&quantity.labels.length!==quantity.quantity)return fail('conflict','Every selected equipment point needs one nonblank label.');
  labels.push(...(quantity.labels||Array.from({length:quantity.quantity},(_,i)=>`${item.name} ${i+1}`)));
 }
 if(new Set(labels.map(environmentalKey)).size!==labels.length)return fail('conflict','Equipment point labels must be unique across the session.');
 const outputs:EnvironmentalOutput[]=[],used=new Map<string,EnvironmentalProfile>();
 for(const method of methods){
  let output:EnvironmentalOutput|undefined;const instances:EnvironmentalOutput['instances']=[];
  for(const quantity of quantities){
   const definitionsForType=definitions.get(quantity.id)!.byMethod.get(method)!;
   const chosen=[...definitionsForType].sort((a,b)=>b.rows[0].date.localeCompare(a.rows[0].date)||a.profile.id.localeCompare(b.profile.id))[0];
   if(output&&(output.templateId!==chosen.output.templateId||output.templateRevision!==chosen.output.templateRevision))return fail('conflict',`Selected equipment uses incompatible ${method==='accupoint'?'Accupoint':'SPCMY'} layouts. Reconcile the approved definitions before combining it.`);
   output=output||{...chosen.output,id:method==='accupoint'?'accupoint':'spcmy',name:method==='accupoint'?'Accupoint':'SPCMY',instances:[]};
   for(const definition of definitionsForType)used.set(definition.profile.id,definition.profile);
   const item=items.find(i=>i.id===quantity.id)!;
   for(let index=0;index<quantity.quantity;index++)instances.push(...chosen.rows.map(r=>({...r,location:quantity.labels?.[index]||`${item.name} ${index+1}`})));
  }
  if(instances.length>300)return fail('conflict',`${method==='accupoint'?'Accupoint':'SPCMY'} would exceed the 300-row report limit. Reduce the equipment quantities.`);
  const complete={...output!,instances},layout=templates.find(t=>t.id===complete.templateId),issue=environmentalTemplateIssue(layout,instances,sample.category);
  if(issue)return fail('conflict',issue);
  outputs.push(complete);
 }
 const sources=[...used.values()].sort((a,b)=>a.id.localeCompare(b.id)),profile=sources[0];
 const output=outputs.find(o=>o.id===selection.outputId)||outputs[0];
 return {...base,outputs:outputs.map(({id,name,method,mode})=>({id,name,method,mode})),pairedOutputs:outputs,resolution:{status:'ready',message:`${labels.length} equipment points · Accupoint + SPCMY`},snapshot:{profile,output,sourceFingerprint:sample.source.fingerprint,equipment:{selection:quantities,sources:sources.map(({id,revision,evidenceIds})=>({id,revision,evidenceIds})),revision}}};
}
