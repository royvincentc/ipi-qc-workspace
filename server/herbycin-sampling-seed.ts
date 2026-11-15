import {access,mkdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import path from 'node:path';
import {db,audit} from './db.js';
import {getConfiguration,saveConfiguration} from './configuration.js';
import {environmentalProfiles,publishEnvironmentalProfile} from './environmental.js';
import {privatePath,worker} from './reports.js';
import {environmentalProductKey,environmentalVariant} from '../shared/environmental-routing.js';
import {environmentalKey,processArea,resolveEnvironmentalEquipment,type EnvironmentalProfile} from '../shared/environmental.js';
import type {Sample,Template} from '../shared/model.js';
import {HERBYCIN_PATTERN_SETS,HERBYCIN_ARCHIVE_SHA256,HERBYCIN_SOURCE_DOCUMENTS,HERBYCIN_SAMPLING_REFERENCE_B64} from './herbycin-sampling-plan.js';

const actor='system:owner-authorized-herbycin-sampling';
export const herbycinSamplingReferenceId='herbycin-constant-sampling-20261115';
export async function seedHerbycinSamplingPatterns(){
 const result={published:[] as string[],held:[] as string[]};
 const config=await getConfiguration();
 const categories=config.value.sampleTypes.filter(t=>t.active&&t.register==='environmental').map(t=>t.id);
 const products=config.value.products.filter(p=>p.active&&categories.includes(p.category)&&environmentalProductKey(p.name)==='herbycinsyrup'&&!environmentalVariant(p.name));
 if(!products.length)return result;
 if(['ACCUPOINT','SPC','MY'].some(id=>!config.value.tests.some(t=>t.id===id&&t.active))){result.held.push('Enable the active ACCUPOINT, SPC and MY tests before registering Herbycin patterns.');return result;}
 const requiredCategories=[...new Set(products.map(p=>p.category))];
 if(config.value.tests.some(t=>['ACCUPOINT','SPC','MY'].includes(t.id)&&requiredCategories.some(category=>!t.categories.includes(category)))){
  await saveConfiguration({...config.value,tests:config.value.tests.map(t=>['ACCUPOINT','SPC','MY'].includes(t.id)?{...t,categories:[...new Set([...t.categories,...requiredCategories])]}:t)},config.revision,actor);
 }
 const file='references/herbycin-constant-sampling-20261115.docx',target=privatePath(file),content=Buffer.from(HERBYCIN_SAMPLING_REFERENCE_B64,'base64');
 await mkdir(path.dirname(target),{recursive:true});
 let restored=false;
 try{await access(target);}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;await writeFile(target,content);restored=true;}
 const reference={id:herbycinSamplingReferenceId,kind:'reference',name:'Herbycin Syrup constant sampling plan · owner-authorized 2026-11-15',path:file,sha256:createHash('sha256').update(content).digest('hex'),sourceArchiveSha256:HERBYCIN_ARCHIVE_SHA256,sourceDocuments:HERBYCIN_SOURCE_DOCUMENTS,evidence:await worker(['inventory','--input',target]),createdAt:new Date().toISOString()};
 const inserted=(await db.query('INSERT INTO files(id,data) VALUES($1,$2) ON CONFLICT(id) DO NOTHING RETURNING id',[reference.id,JSON.stringify(reference)])).rows.length;
 if(inserted||restored)await audit(actor,inserted?'herbycin_sampling_evidence_registered':'template_file_restored',reference.id,{sourceArchiveSha256:HERBYCIN_ARCHIVE_SHA256,authorization:'Owner requested constant sampling-pattern approval and GitHub integration on 2026-11-15; Passed/Failed remains manual.'});
 const templates=(await db.query('SELECT data FROM templates')).rows.map(r=>r.data as Template),profiles=await environmentalProfiles();
 for(const product of products)for(const set of HERBYCIN_PATTERN_SETS){
  const productArea=product.name.match(/\b(compounding|filling|weighing)\b/i)?.[0]?.toLowerCase();
  if(productArea&&productArea!==set.area.toLowerCase())continue;
  if(profiles.some(p=>p.productId===product.id&&p.equipmentSet===set.equipmentSet&&p.evidenceIds.includes(reference.id)))continue;
  const layouts=templates.filter(t=>t.category===product.category&&t.family==='environmental-grouped-5c'&&t.active!==false&&t.verified);
  const name=`${product.name} · ${set.equipmentSet}`;
  if(layouts.length!==1){result.held.push(`${name}: one active approved grouped layout is required.`);continue;}
  const template=layouts[0];
  const outputs=(['accupoint','spc-my'] as const).map(method=>({id:method==='accupoint'?'accupoint':'spcmy',name:method==='accupoint'?'ACCUPOINT':'SPCMY',method,mode:'surface' as const,templateId:template.id,templateRevision:template.revision,instances:(method==='accupoint'?['ACCUPOINT']:['SPC','MY']).flatMap(test=>set.locations.map(location=>({test,label:test==='ACCUPOINT'?'Neogen Accupoint (Rapid Testing)':test==='SPC'?'Standard Plate Count (SPC)':'Molds and Yeast',location,stage:'',replicate:'',block:'tests',type:'numeric' as const,unit:test==='ACCUPOINT'?'RLU':'cfu/mL',criterion:'FOR EVALUATION',source:reference.id,sourceLocation:`${set.equipmentSet} · ${test} · ${location}`,date:'2026-11-15',dateBasis:'owner-confirmed' as const,revision:'herbycin-constant-20261115'})))}));
  const input={name,productId:product.id,product:product.name,category:product.category,facility:'PF1',area:set.area,areaType:set.areaType,context:'',equipmentSet:set.equipmentSet,effectiveFrom:'0001-01-01',evidenceIds:[reference.id],outputs};
  const existing=profiles.filter(p=>p.active&&p.productId===product.id&&p.category===product.category&&environmentalKey(p.facility)==='pf1'&&processArea(p.area)===processArea(set.area)&&p.outputs.some(o=>o.mode==='surface'));
  const probe:Sample={id:'herbycin-seed-check',ml:'',name:'Herbycin Syrup',batch:'',received:'2026-11-15',category:product.category,context:'',status:'',remarks:'',fields:{facility:'PF1',area:set.area},source:{spreadsheetId:'',sheetId:0,sheet:'',section:product.category,row:0,range:'',fingerprint:reference.id,observedAt:'2026-11-15',url:'',mappingRevision:'',raw:[]}};
  const candidate:EnvironmentalProfile={...input,id:'herbycin-seed-preview',revision:'herbycin-constant-20261115',active:true,approvedBy:actor,approvedAt:new Date().toISOString()};
  const own=resolveEnvironmentalEquipment(probe,product.id,[candidate],templates),ids=new Set(own.equipment?.items.map(item=>item.id));
  const conflict=[...new Set(['2026-11-15',...existing.flatMap(p=>[p.effectiveFrom,...(p.effectiveTo?[p.effectiveTo]:[])])])].flatMap(received=>resolveEnvironmentalEquipment({...probe,received},product.id,[...existing,candidate],templates).equipment?.items.filter(item=>ids.has(item.id)&&item.issue).map(item=>item.issue)||[])[0];
  if(conflict){result.held.push(`${name}: ${conflict}`);continue;}
  try{const published=await publishEnvironmentalProfile(input,actor);profiles.push(published);result.published.push(name);}catch(error){result.held.push(`${name}: ${(error as Error).message}`);}
 }
 return result;
}
