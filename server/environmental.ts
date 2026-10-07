import {randomUUID} from 'node:crypto';
import {db,locked,audit} from './db.js';
import {getConfiguration} from './configuration.js';
import {Fault,hash} from './domain.js';
import {environmentalProfileSchema,environmentalKey,processArea,environmentalTemplateIssue,type EnvironmentalProfile,type LayoutResolution} from '../shared/environmental.js';
import type {Sample,Template,Criterion} from '../shared/model.js';

export async function environmentalProfiles():Promise<EnvironmentalProfile[]>{return (await db.query('SELECT data FROM environmental_profiles ORDER BY created_at DESC')).rows.map(r=>r.data);}
export async function publishEnvironmentalProfile(input:unknown,actor:string,previousId?:string,expectedRevision?:string){
 const profile=environmentalProfileSchema.parse(input),config=(await getConfiguration()).value;
 if(!config.sampleTypes.some(t=>t.id===profile.category&&t.active&&t.register==='environmental'))throw new Fault(400,'Choose an active environmental sample type.');
 const product=config.products.find(p=>p.id===profile.productId&&p.active&&p.category===profile.category);
 if(!product||product.name!==profile.product)throw new Fault(400,'Choose the canonical active environmental product.');
 const evidence=(await db.query("SELECT id FROM files WHERE data->>'kind'='reference'")).rows.map(r=>r.id);
 if(profile.evidenceIds.some(id=>!evidence.includes(id)))throw new Fault(400,'Use inspected reference documents as sampling-pattern evidence.');
 const templates=(await db.query('SELECT data FROM templates')).rows.map(r=>r.data as Template);
 for(const output of profile.outputs){
  const template=templates.find(t=>t.id===output.templateId),issue=environmentalTemplateIssue(template,output.instances,profile.category);
  if(issue||template?.revision!==output.templateRevision)throw new Fault(400,`${output.name}: ${issue||'Select the current template revision.'}`);
  if(output.method==='accupoint'&&(output.mode!=='surface'||output.instances.some(i=>i.test!=='ACCUPOINT')))throw new Fault(400,'Accupoint outputs require ACCUPOINT surface instances.');
  if(output.method==='spc-my'&&output.instances.some(i=>!['SPC','MY'].includes(i.test)))throw new Fault(400,'SPC/MY outputs require SPC or MY instances.');
  if(output.mode==='gip'&&output.method!=='microbial')throw new Fault(400,'GIP outputs require the microbial method.');
  if(output.mode==='phase-air'&&(template?.family!=='environmental-warehouse-phase-air-7c'||output.instances.some(i=>!i.channel||!i.stage||!i.unit)))throw new Fault(400,'Phase/air outputs require a warehouse layout, a phase, a channel and a confirmed unit for every instance.');
  if(output.mode!=='phase-air'&&output.instances.some(i=>i.channel))throw new Fault(400,'Air channels require a phase/air output.');
  if(output.instances.some(i=>!profile.evidenceIds.includes(i.source)))throw new Fault(400,'Each criterion must reference one of the inspected evidence documents.');
  if(output.instances.some(i=>!config.tests.some(t=>t.id===i.test&&t.active&&t.categories.includes(profile.category))))throw new Fault(400,'Enable every required test for this environmental sample type in Settings → Tests.');
 }
 return locked('environmental-profiles',async tx=>{
  const existing=(await tx.query('SELECT data FROM environmental_profiles')).rows.map(r=>r.data as EnvironmentalProfile),previous=previousId?existing.find(p=>p.id===previousId):undefined;
  if(previousId&&(!previous||!previous.active||previous.revision!==expectedRevision))throw new Fault(409,'The sampling pattern changed. Reload its current revision.');
  const conflict=existing.find(p=>p.active&&p.id!==previousId&&p.productId===profile.productId&&p.category===profile.category&&environmentalKey(p.facility)===environmentalKey(profile.facility)&&processArea(p.area)===processArea(profile.area)&&environmentalKey(p.context)===environmentalKey(profile.context)&&environmentalKey(p.equipmentSet)===environmentalKey(profile.equipmentSet)&&p.effectiveFrom<=(profile.effectiveTo||'9999-12-31')&&profile.effectiveFrom<=(p.effectiveTo||'9999-12-31'));
  if(conflict)throw new Fault(409,`This equipment set overlaps the effective dates of ${conflict.name}. Publish a revision or use non-overlapping dates.`);
  const next:EnvironmentalProfile={...profile,id:randomUUID(),revision:hash(profile),active:true,approvedBy:actor,approvedAt:new Date().toISOString(),previousId};
  await tx.query('BEGIN');try{
   if(previous)await tx.query('UPDATE environmental_profiles SET data=$1 WHERE id=$2',[JSON.stringify({...previous,active:false}),previous.id]);
   await tx.query('INSERT INTO environmental_profiles(id,data) VALUES($1,$2)',[next.id,JSON.stringify(next)]);
   await tx.query('INSERT INTO audit(id,actor,action,entity,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor,'environmental_pattern_published',next.id,JSON.stringify({previousId,revision:next.revision,evidenceIds:next.evidenceIds})]);
   await tx.query('COMMIT');
  }catch(error){await tx.query('ROLLBACK');throw error;}
  return next;
 });
}
/** Legacy routes are category-bound and never resolve by database order. */
export function resolveEnvironmentalLayout(sample:Sample,templates:Template[],tests:Criterion[]):{template?:Template;resolution:LayoutResolution}{
 const categoryTemplates=templates.filter(t=>t.category===sample.category&&t.active!==false&&t.verified),compatible=categoryTemplates.filter(t=>!environmentalTemplateIssue(t,tests,sample.category));
 const names=[sample.name,sample.fields.product||'',sample.fields.productName||''].map(environmentalKey);
 const ranked=compatible.map(template=>({template,specificity:Math.max(0,...(template.manifest.appliesToProducts||[]).map(environmentalKey).filter(selector=>selector&&names.some(name=>name===selector||name.startsWith(selector+' ')||name.startsWith(selector+'('))).map(selector=>selector.length))}));
 const mostSpecific=Math.max(0,...ranked.map(row=>row.specificity));
 const specific=mostSpecific?ranked.filter(row=>row.specificity===mostSpecific).map(row=>row.template):[];
 const choices=specific.length?specific:compatible.filter(t=>t.manifest.defaultForCategory);
 if(choices.length===1)return {template:choices[0],resolution:{status:'ready',message:choices[0].name}};
 if(choices.length>1)return {resolution:{status:'conflict',message:`Conflicting environmental routes: ${choices.map(t=>t.name).join(', ')}. Assign a sampling pattern for this area and monitoring output in Settings → Standardized templates.`,choices:choices.map(t=>({id:t.id,name:t.name}))}};
 const detail=!categoryTemplates.length?'No approved environmental template is registered.':!compatible.length?'Registered environmental layouts cannot represent all selected tests and locations.':'No environmental product route or compatible default is assigned.';
 return {resolution:{status:'missing',message:`${detail} Configure an approved sampling pattern in Settings → Standardized templates.`}};
}
export async function retireEnvironmentalProfile(id:string,revision:string,actor:string){return locked('environmental-profiles',async tx=>{
 const old=(await tx.query('SELECT data FROM environmental_profiles WHERE id=$1',[id])).rows[0]?.data as EnvironmentalProfile;
 if(!old||old.revision!==revision)throw new Fault(409,'Sampling pattern changed. Reload before retiring it.');
 const next={...old,active:false};await tx.query('UPDATE environmental_profiles SET data=$1 WHERE id=$2',[JSON.stringify(next),id]);await audit(actor,'environmental_pattern_retired',id,{revision});return next;
});}
