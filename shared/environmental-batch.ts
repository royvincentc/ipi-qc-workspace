import type {Configuration} from './configuration';
import type {Sample,Template} from './model';
import {environmentalKey,processArea,environmentalProfileSchema,environmentalTemplateIssue} from './environmental';
import {environmentalProductKey,environmentalProductName,environmentalVariant,documentFacility,documentContext,environmentalAreaType} from './environmental-routing';

export interface BatchEvidence {path:string;sha256:string;product?:string;category?:string;area?:string;batch?:string;ml?:string}
export interface BatchCandidate {id:string;productHint:string;areaHint:string;family:string;mode:string;rows:any[];sourceSha256:string;sourceName:string;referenceId:string;evidence:BatchEvidence[]}
export interface BatchRules {facility:string;context:string;criterionDate:string;effectiveFrom:string;layouts:Record<string,string>;createProducts:boolean;unchanged?:boolean}
export interface BatchProposal {key:string;candidateIds:string[];profile:any;issues:string[];newProduct?:Configuration['products'][number];evidenceCount:number}
const same=(a:string,b:string)=>environmentalKey(a)===environmentalKey(b);
const matches=(name:string,selector:string)=>environmentalVariant(name)===environmentalVariant(selector)&&(environmentalProductKey(name)===environmentalProductKey(selector)||environmentalKey(name).startsWith(environmentalKey(selector)+' ')||environmentalKey(name).startsWith(environmentalKey(selector)+'('));
const variant=environmentalVariant;
export const outputMeaning=(output:any)=>JSON.stringify(output.instances.map((r:any)=>[r.test,environmentalKey(r.location||''),environmentalKey(r.stage||''),r.channel||'',r.replicate||'',r.block,environmentalKey(r.criterion).replace(/\s+/g,''),environmentalKey(r.unit||'').replace(/\s+/g,''),r.type]).sort((a:any,b:any)=>JSON.stringify(a).localeCompare(JSON.stringify(b))));
const importedProductId=(name:string)=>{
 const key=environmentalKey(name);let hash=2166136261;
 for(let i=0;i<key.length;i++)hash=Math.imul(hash^key.charCodeAt(i),16777619);
 return 'em-import-'+key.replace(/[^a-z0-9]+/g,'-').slice(0,30)+'-'+(hash>>>0).toString(16).padStart(8,'0');
};

/** Document Area supplies explicit facility; corroborated logbook scope supplies context. */
export function prepareEnvironmentalBatch(candidates:BatchCandidate[],config:Configuration,templates:Template[],samples:Sample[],rules:BatchRules):BatchProposal[]{
 const category=config.sampleTypes.find(t=>t.active&&t.register==='environmental')?.id||'EM';
 const products=config.products.filter(p=>p.active&&p.category===category),groups=new Map<string,BatchProposal>();
 for(const c of candidates){
  const issues:string[]=[];
  const names=[c.productHint,...c.evidence.map(e=>e.product||'')].filter(Boolean);
  const headerNames=c.evidence.map(e=>e.product||'').filter(Boolean);
  const exactHeaders=products.filter(p=>headerNames.some(name=>[p.name,...p.aliases].some(alias=>environmentalProductKey(name)===environmentalProductKey(alias))));
  const exact=exactHeaders.length?exactHeaders:products.filter(p=>[p.name,...p.aliases].some(alias=>environmentalProductKey(c.productHint)===environmentalProductKey(alias))&&headerNames.every(name=>variant(name)===variant(p.name)));
  const matchesByPrefix=products.map(p=>({p,length:Math.max(0,...[p.name,...p.aliases].filter(alias=>names.some(name=>matches(name,alias))).map(alias=>alias.length))})).filter(p=>p.length);
  const longest=Math.max(0,...matchesByPrefix.map(p=>p.length));
  const matchedProducts=exact.length?exact:matchesByPrefix.filter(p=>p.length===longest).map(p=>p.p);
  let product=matchedProducts.length===1?matchedProducts[0]:undefined,newProduct:Configuration['products'][number]|undefined;
  if(matchedProducts.length>1)issues.push('Multiple managed products match; confirm an alias.');
  if(!product&&!matchedProducts.length){
   if(!rules.createProducts&&headerNames.some(name=>products.some(p=>environmentalKey(name).startsWith(environmentalKey(p.name))&&variant(name)!==variant(p.name))))issues.push('Product variant differs (Pro, Old Specs or New Specs); confirm a distinct managed variant.');
   const name=environmentalProductName(headerNames[0]||c.productHint);
   if(name&&!config.products.some(p=>p.category===category&&same(p.name,name))&&rules.createProducts){newProduct={id:importedProductId(name),name,category,active:true,code:'',aliases:[]};product=newProduct;}
   else issues.push('Confirm or add the canonical environmental product.');
  }
  if(product&&c.evidence.some(e=>e.product&&![product!.name,...product!.aliases].some(alias=>matches(e.product!,alias))))issues.push('A header product disagrees with the folder/managed product; confirm an alias.');
  if(product&&c.evidence.some(e=>e.product&&variant(e.product)!==variant(product!.name)))issues.push('Product variant differs (Pro, Old Specs or New Specs); confirm a distinct managed variant.');
  if(product&&c.productHint){const folderKey=environmentalProductKey(c.productHint.replace(/\s+20\d{2}$/,'')),productKey=environmentalProductKey(product.name);if(folderKey&&!folderKey.startsWith(productKey)&&!productKey.startsWith(folderKey))issues.push('Archive folder and document header identify different product names; review before linking.');}
  const linked=c.evidence.flatMap(e=>{
   if(!e.batch||!e.area||!product||/^(none|n\/?a|-)?$/i.test(e.batch.trim()))return [];
   const evidenceYear=e.path.match(/(?:^|\/)(20\d{2})(?:\/|$)/)?.[1];
   if(!e.ml&&!evidenceYear)return [];
   const hits=samples.filter(s=>s.source?.active!==false&&s.category===category&&(e.ml?same(s.ml,e.ml):s.ml.startsWith('ML-EM-'+evidenceYear!.slice(2)+'-'))&&same(s.batch,e.batch!)&&[product!.name,...product!.aliases].some(alias=>matches(s.name,alias))&&variant(s.name)===variant(product!.name)&&processArea(s.fields.area||'')===processArea(c.areaHint));
   const facility=documentFacility(e.area!),consistent=hits.filter(s=>!facility||same(s.fields.facility||'',facility));
   if(hits.length&&!consistent.length)issues.push('Document facility disagrees with the corroborated logbook activity; review the source discrepancy.');
   return consistent.length===1?consistent:[];
  });
  const unique=(values:string[])=>[...new Set(values.map(v=>v.trim()).filter(Boolean))];
  const documentFacilities=unique(c.evidence.map(e=>documentFacility(e.area||''))),documentContexts=unique(c.evidence.map(e=>documentContext(e.product||'')));
  const facilities=unique([...linked.map(s=>s.fields.facility||''),...documentFacilities]),contexts=unique([...linked.map(s=>s.context),...documentContexts]);
  if(!linked.length&&facilities.length===1&&product){
   const scoped=samples.filter(s=>s.source?.active!==false&&s.category===category&&same(s.fields.facility||'',facilities[0])&&processArea(s.fields.area||'')===processArea(c.areaHint)&&[product!.name,...product!.aliases].some(alias=>matches(s.name,alias)));
   const scopedContexts=unique(scoped.map(s=>s.context).filter(v=>v&&!/^(n\/?a|none)$/i.test(v)));
   if(!contexts.length&&scopedContexts.length===1)contexts.push(scopedContexts[0]);
  }
  if(documentFacilities.length>1)issues.push('Document Area fields contain different facilities; split the evidence by facility.');
  if(facilities.length>1||contexts.length>1)issues.push('Historical activities have different facilities or contexts; split this pattern.');
  const facility=facilities.length===1?facilities[0]:rules.facility.trim(),context=contexts.length===1?contexts[0]:rules.context.trim();
  const locations=[...new Set(c.rows.map(r=>String(r.location||'').trim()))].sort();
  const equipmentSet=locations.join(', ').slice(0,170)+' · '+c.id.slice(0,8);
  // Stable grouping keeps methods separate but combines outputs for the same location set.
  const key=JSON.stringify([product?.id||c.productHint,facility,processArea(c.areaHint),environmentalKey(context),locations]);
  const template=templates.find(t=>t.id===rules.layouts[c.family]);
  const method=c.rows.every(r=>r.test==='ACCUPOINT')?'accupoint':c.mode==='gip'?'microbial':'spc-my';
  const instances=c.rows.map(r=>({...r,type:/negative|absent/i.test(r.criterion)?'finding':'numeric',replicate:'',block:r.block||'tests',criterion:/^[-\s]*$/.test(r.criterion)?'':r.criterion,source:c.referenceId,date:rules.criterionDate,dateBasis:'owner-confirmed',revision:'bulk-owner-confirmed'}));
  const output={id:'output-'+c.id.slice(0,12),name:method+' · '+c.mode,method,mode:c.mode,templateId:template?.id||'',templateRevision:template?.revision||'',instances};
  if(!template)issues.push('Choose an approved layout for '+c.family+'.');
  else {const issue=environmentalTemplateIssue(template,instances as any,category);if(issue)issues.push(issue);}
  if(!facility)issues.push('Confirm facility once for unmatched evidence.');
  if(!context)issues.push('Confirm testing context once for unmatched evidence.');
  if(!c.areaHint)issues.push('Process area is missing.');
  if(instances.some(r=>!r.test||!r.criterion||(!r.unit&&r.type==='numeric')))issues.push('Missing test mapping, criterion or numeric unit; review this exception.');
  if(instances.some(r=>!config.tests.some(t=>t.id===r.test&&t.active&&t.categories.includes(category))))issues.push('Enable required tests for this environmental sample type in Settings → Tests.');
  if(method==='accupoint'&&c.mode!=='surface')issues.push('Accupoint requires surface monitoring; review the source mode.');
  if(method==='spc-my'&&instances.some(r=>!['SPC','MY'].includes(r.test)))issues.push('Confirm the monitoring method for this test panel.');
  if(c.mode==='phase-air'&&instances.some(r=>!r.channel||!r.stage||!r.unit))issues.push('Confirm phase, air channel and units for every warehouse location.');
  const areaTypes=unique(c.evidence.map(e=>environmentalAreaType(e.area||'')));
  if(areaTypes.length>1)issues.push('Historical Area descriptions differ; split or confirm the equipment-specific type.');
  const profile={areaType:areaTypes.length===1?areaTypes[0]:'',name:(product?.name||c.productHint)+' · '+c.areaHint,productId:product?.id||'',product:product?.name||c.productHint,category,facility,area:c.areaHint,context,equipmentSet,effectiveFrom:rules.effectiveFrom,evidenceIds:[c.referenceId],outputs:[output]};
  if(!rules.criterionDate||!rules.effectiveFrom)issues.push('Confirm criterion date and effective start once for this batch.');
  const parsed=environmentalProfileSchema.safeParse(profile);
  if(!parsed.success&&!issues.length)issues.push(parsed.error.issues.map(i=>i.message).join('; '));
  const existing=groups.get(key);
  if(existing){
   const previous=existing.profile.outputs.find((o:any)=>o.method===method&&o.mode===c.mode);
   if(previous&&outputMeaning(previous)!==outputMeaning(output))existing.issues.push('Different historical row/criterion variants for the same method and location set; choose the approved variant.');
   if(!previous||outputMeaning(previous)!==outputMeaning(output))existing.profile.outputs.push(output);
   existing.profile.evidenceIds.push(c.referenceId);existing.candidateIds.push(c.id);existing.issues.push(...issues);existing.evidenceCount+=c.evidence.length;
  }else groups.set(key,{key,candidateIds:[c.id],profile,issues,newProduct,evidenceCount:c.evidence.length});
 }
 return [...groups.values()].map(p=>({...p,issues:[...new Set(p.issues)]}));
}
