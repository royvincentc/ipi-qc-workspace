import {z} from 'zod';
import {environmentalActivityDate,environmentalKey,environmentalCriterionKey,environmentalStageKey,processArea,environmentalSourceIssue,environmentalTemplateIssue,resolveEnvironmentalProfile,type EnvironmentalProfile,type EnvironmentalOutput,type EnvironmentalSelection,type EnvironmentalSetup,type EquipmentCatalog} from './environmental.js';
import type {Sample,Template} from './model.js';

export const equipmentSelectionSchema=z.object({
 profileId:z.string().max(200).optional(),outputId:z.string().max(200).optional(),
 equipmentRevision:z.string().max(20000).optional(),
 includeOpenPlate:z.boolean().optional(),
 equipment:z.array(z.object({id:z.string().trim().min(1).max(200),quantity:z.number().int().min(0).max(300),labels:z.array(z.string().trim().min(1).max(200)).max(300).optional()})).max(300).optional(),
});
type Definition={profile:EnvironmentalProfile;output:EnvironmentalOutput;rows:EnvironmentalOutput['instances'];signature:string;conflict:boolean};
const methods=['accupoint','spc-my'] as const;
/** Only equipment ordinals collapse; facility/model/phase numbers keep their identity. */
function equipmentName(location:string){
 return location.trim().replace(/(\b(?:drum|pail|nozzle|hose|tank|spatula|pipe|barrel|bucket|vessel|beaker|flask|tray|container|tub|bottle|bin|funnel|scoop|mixer|utensil|pump|filter))\s*(?:no\.?\s*)?#?\d+$/i,'$1');
}
const rowIdentity=(r:EnvironmentalOutput['instances'][number])=>JSON.stringify([r.test,environmentalStageKey(r),r.replicate,r.block,r.channel||'']);
function signature(output:EnvironmentalOutput,rows:EnvironmentalOutput['instances']){
 return JSON.stringify([output.templateId,output.templateRevision,rows.map(r=>[rowIdentity(r),r.type,environmentalKey(r.unit).replace(/\s/g,''),environmentalCriterionKey(r.criterion)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
}
function equipmentDefinition(profile:EnvironmentalProfile,output:EnvironmentalOutput,instances:EnvironmentalOutput['instances']):Definition{
 const parameters=new Map<string,typeof instances[number]>();let conflict=false;
 for(const row of instances){const key=rowIdentity(row),previous=parameters.get(key);if(previous&&signature(output,[previous])!==signature(output,[row]))conflict=true;else if(!previous)parameters.set(key,row);}
 const rows=[...parameters.values()];return {profile,output,rows,signature:signature(output,rows),conflict};
}

export function resolveEnvironmentalEquipment(sample:Sample,productId:string,profiles:EnvironmentalProfile[],templates:Template[],selection:EnvironmentalSelection={},scannedLocations:string[]=[]):EnvironmentalSetup{
 const activityDate=environmentalActivityDate(sample);
 const contextMatches=(p:EnvironmentalProfile)=>!p.context||environmentalKey(p.context)===environmentalKey(sample.context);
 const applicable=profiles.filter(p=>p.active&&p.productId===productId&&p.category===sample.category&&environmentalKey(p.facility)===environmentalKey(sample.fields.facility||'')&&processArea(p.area)===processArea(sample.fields.area||'')&&(p.outputs.some(o=>o.mode==='surface')||contextMatches(p))&&activityDate&&p.effectiveFrom<=activityDate&&(!p.effectiveTo||p.effectiveTo>=activityDate)).sort((a,b)=>a.id.localeCompare(b.id));
 const selectedProfile=selection.profileId?applicable.find(p=>p.id===selection.profileId):undefined;
 const selectedOutput=selectedProfile?.outputs.find(o=>o.id===selection.outputId);
 const otherOutputs=applicable.filter(contextMatches).flatMap(p=>p.outputs.filter(o=>o.mode!=='surface').map(o=>({profileId:p.id,outputId:o.id,name:`${p.name} · ${o.name}`,mode:o.mode})));
 if(selectedOutput&&selectedOutput.mode!=='surface'||selectedProfile&&!selectedProfile.outputs.some(o=>o.mode==='surface')||!applicable.some(p=>p.outputs.some(o=>o.mode==='surface'))){
  const legacy=resolveEnvironmentalProfile(sample,productId,profiles,templates,selection);
  return selection.equipment?.some(q=>q.quantity>0)?{profiles:legacy.profiles,outputs:legacy.outputs,otherOutputs,resolution:{status:'conflict',message:'Equipment quantities require approved surface-swab outputs for this activity. Reload the applicable monitoring output.'}}:{...legacy,otherOutputs};
 }
 const base:EnvironmentalSetup={profiles:applicable.filter(p=>p.outputs.some(o=>o.mode==='surface')).map(({id,name,equipmentSet,revision})=>({id,name,equipmentSet,revision})),outputs:[],otherOutputs:otherOutputs.filter(o=>o.mode!=='open-plate'),resolution:{status:'selection',message:'Select the equipment sampled and set its quantity to build both method tables.'}};
 const fail=(status:EnvironmentalSetup['resolution']['status'],message:string):EnvironmentalSetup=>({...base,resolution:{status,message}});
 if(selection.profileId&&!applicable.some(p=>p.id===selection.profileId))return fail('selection','The selected sampling pattern is unavailable for this activity.');
 const definitionProfiles=selection.profileId?applicable.filter(p=>p.id===selection.profileId):applicable;
 const sourceIssue=environmentalSourceIssue(sample);if(sourceIssue)return fail('conflict',sourceIssue);
 const definitions=new Map<string,{name:string;defaultQuantity:number;byMethod:Map<string,Definition[]>}>();
 for(const profile of definitionProfiles){
 const profileQuantities=new Map<string,Set<string>>();
 for(const output of profile.outputs.filter(o=>o.mode==='surface'&&methods.includes(o.method as typeof methods[number]))){
  const locations=new Map<string,EnvironmentalOutput['instances']>();
  for(const row of output.instances){const key=environmentalKey(equipmentName(row.location));locations.set(key,[...(locations.get(key)||[]),row]);}
  for(const rows of locations.values()){
   const name=equipmentName(rows[0].location),id=environmentalKey(name),entry=definitions.get(id)||{name,defaultQuantity:0,byMethod:new Map<string,Definition[]>()};
   entry.byMethod.set(output.method,[...(entry.byMethod.get(output.method)||[]),equipmentDefinition(profile,output,rows)]);definitions.set(id,entry);
   const points=profileQuantities.get(id)||new Set<string>();for(const row of rows)points.add(environmentalKey(row.location));profileQuantities.set(id,points);
  }
 }
 for(const [id,points] of profileQuantities)definitions.get(id)!.defaultQuantity=Math.max(definitions.get(id)!.defaultQuantity,points.size);
 }
 // Discovery spans the archive; only applicable approved patterns supply parameters.
 const inventory=[...scannedLocations,...profiles.filter(p=>p.active&&p.category===sample.category).flatMap(p=>p.outputs.filter(o=>o.mode==='surface').flatMap(o=>o.instances.map(row=>row.location)))];
 for(const location of inventory){
  const name=equipmentName(location),id=environmentalKey(name);
  if(!definitions.has(id))definitions.set(id,{name,defaultQuantity:0,byMethod:new Map()});
 }
 // A scanned method may live in a separate pattern; fill missing approved definitions without changing defaults.
 if(selectedProfile)for(const [id,entry] of definitions)for(const method of methods){
  if(entry.byMethod.get(method)?.length)continue;
  const choices:Definition[]=[];
  for(const profile of applicable.filter(p=>p.id!==selectedProfile.id&&environmentalKey(p.areaType||'')===environmentalKey(selectedProfile.areaType||'')))for(const output of profile.outputs.filter(o=>o.mode==='surface'&&o.method===method)){
   const rows=output.instances.filter(r=>environmentalKey(equipmentName(r.location))===id);
   if(rows.length)choices.push(equipmentDefinition(profile,output,rows));
  }
  entry.byMethod.set(method,choices);
 }
 const revision=JSON.stringify([sample.source.fingerprint,applicable.map(p=>[p.id,p.revision,p.outputs.map(o=>[o.id,o.templateId,o.templateRevision])])]);
 const items:EquipmentCatalog['items']=[...definitions].sort((a,b)=>a[0].localeCompare(b[0])).map(([id,entry])=>{
  let issue:string|undefined;const parameters:EquipmentCatalog['items'][number]['parameters']=[];
  for(const method of methods){
   const choices=entry.byMethod.get(method)||[],label=method==='accupoint'?'Accupoint':'SPCMY';
   if(!choices.length){issue=issue||`${label} has no approved definition for ${entry.name}.`;continue;}
   if(choices.some(c=>c.conflict)||new Set(choices.map(c=>c.signature)).size!==1){issue=issue||`Approved ${label} definitions conflict for ${entry.name}. Ask an administrator to reconcile the standards or layouts.`;continue;}
   const definition=choices[0],layout=templates.find(t=>t.id===definition.output.templateId);
   const problem=environmentalTemplateIssue(layout,definition.rows,sample.category);
   if(problem||layout?.revision!==definition.output.templateRevision)issue=issue||`${label}: ${problem||'The approved template revision changed. Publish an updated definition.'}`;
   parameters.push(...definition.rows.map(r=>({method,test:r.test,label:r.label,criterion:r.criterion,unit:r.unit})));
  }
  const defaultLabels=selectedProfile?[...new Map(selectedProfile.outputs.filter(o=>o.mode==='surface').flatMap(o=>o.instances).filter(r=>environmentalKey(equipmentName(r.location))===id).map(r=>[environmentalKey(r.location),r.location])).values()]:undefined;
  return {id,name:entry.name,defaultQuantity:entry.defaultQuantity,defaultLabels,issue,parameters};
 });
 base.equipment={revision,profileId:selection.profileId,items};
 const selectedAir=selectedProfile?.outputs.filter(o=>o.mode==='open-plate')||[];
 const airChoices=(selectedAir.length?selectedAir.map(output=>({profile:selectedProfile!,output})):applicable.filter(p=>contextMatches(p)&&(!selectedProfile||environmentalKey(p.areaType||'')===environmentalKey(selectedProfile.areaType||''))).flatMap(profile=>profile.outputs.filter(o=>o.mode==='open-plate').map(output=>({profile,output}))));
 const air=airChoices[0],includeAir=selection.includeOpenPlate!==false&&Boolean(air);
 const airIssue=airChoices.length>1?'Multiple approved open plate patterns apply. Select a pattern with the required open plate output.':air?(environmentalTemplateIssue(templates.find(t=>t.id===air.output.templateId),air.output.instances,sample.category)|| (templates.find(t=>t.id===air.output.templateId)?.revision!==air.output.templateRevision?'The open plate template revision changed.':undefined)):undefined;
 if(air)base.openPlate={included:includeAir,issue:airIssue};
 const parsed=equipmentSelectionSchema.safeParse(selection);
 if(!parsed.success)return fail('conflict','Use whole-number equipment quantities from 0 to 300 and nonblank equipment labels.');
 const selectedQuantities=parsed.data.equipment?.filter(q=>q.quantity>0)||[];
 const patternItems=items.filter(item=>item.defaultQuantity>0);
 const usePatternDefaults=!selectedQuantities.length&&Boolean(selection.profileId)&&patternItems.length>0&&patternItems.every(item=>!item.issue);
 const quantities:NonNullable<typeof parsed.data.equipment>=usePatternDefaults?items.filter(item=>item.defaultQuantity>0).map(item=>({id:item.id,quantity:item.defaultQuantity,...(item.defaultLabels?{labels:item.defaultLabels}:{})})):selectedQuantities;
 if(!quantities.length)return base;
 if(!usePatternDefaults&&selection.equipmentRevision!==revision)return fail('conflict','Approved equipment definitions or the source activity changed. Reload the equipment list before creating the session.');
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
   output=output||{...chosen.output,id:method==='accupoint'?'accupoint':'spcmy',name:method==='accupoint'?'ACCUPOINT':'SPCMY',instances:[]};
   for(const definition of definitionsForType)used.set(definition.profile.id,definition.profile);
   const item=items.find(i=>i.id===quantity.id)!;
   for(let index=0;index<quantity.quantity;index++)instances.push(...chosen.rows.map(r=>({...r,location:quantity.labels?.[index]||`${item.name} ${index+1}`})));
  }
  if(instances.length>300)return fail('conflict',`${method==='accupoint'?'Accupoint':'SPCMY'} would exceed the 300-row report limit. Reduce the equipment quantities.`);
  const complete={...output!,instances},layout=templates.find(t=>t.id===complete.templateId),issue=environmentalTemplateIssue(layout,instances,sample.category);
  if(issue)return fail('conflict',issue);
  outputs.push(complete);
 }
 if(includeAir&&air){if(airIssue)return fail('conflict',airIssue);outputs.push({...air.output,id:'envi-open-plate',name:'Envi Open Plate'});used.set(air.profile.id,air.profile);}
 const sources=[...used.values()].sort((a,b)=>a.id.localeCompare(b.id)),profile=selectedProfile||sources[0];
 const output=outputs.find(o=>o.id===selection.outputId)||outputs[0];
 return {...base,outputs:outputs.map(({id,name,method,mode})=>({id,name,method,mode})),pairedOutputs:outputs,resolution:{status:'ready',message:`${labels.length} equipment points · ${outputs.map(o=>o.name).join(' + ')}`},snapshot:{profile,output,sourceFingerprint:sample.source.fingerprint,equipment:{selection:quantities,sources:sources.map(({id,revision,evidenceIds})=>({id,revision,evidenceIds})),revision}}};
}
