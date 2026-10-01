import {getConfiguration} from './configuration.js';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,access, unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {db,locked,setting,demo,audit} from './db.js';
import {Fault,hash,latestCriteria} from './domain.js';
import {defaultConnections,fallbackSpecifications} from './samples.js';
import {readApplicability,readResultsRow,readMicForAnalyst,rangeValues} from './google.js';
import {categories,reportIssues,resultKey,type Draft,type Sample,type Template,type Specification,type Result,type User,type ReportSetup} from '../shared/model.js';
import {reportRows} from './template.js';
export const storage=path.resolve(process.env.PRIVATE_STORAGE||'private');
export function privatePath(file:string){const p=path.resolve(storage,file);if(!p.startsWith(storage+path.sep))throw new Fault(400,'Invalid private file path');return p;}
export async function worker(args:string[]){return new Promise<any>((resolve,reject)=>{const proc=spawn(process.env.PYTHON_PATH||'python',[path.resolve('worker/docx_worker.py'),...args],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'Document processing timed out'));},120000);proc.stdout.on('data',b=>{out+=b;if(out.length>20_000_000){proc.kill();reject(new Fault(413,'Document inventory is too large'));}});proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'Python document worker is unavailable; configure PYTHON_PATH'));});proc.on('close',code=>{clearTimeout(timer);if(code!==0)return reject(new Fault(422,`Document processing failed: ${err.split('\n').filter(Boolean).at(-1)||'invalid document'}`));try{resolve(JSON.parse(out));}catch{reject(new Fault(500,'Invalid document worker response'));}});});}
async function renderPdf(docx:string,pdf:string){const mode=process.env.PDF_RENDERER||(process.platform==='win32'?'word':'libreoffice');if(mode==='libreoffice'){if(!process.env.SOFFICE_PATH)throw new Fault(503,'Set SOFFICE_PATH for document preview');await new Promise<void>((resolve,reject)=>{const proc=spawn(process.env.SOFFICE_PATH!,['-env:UserInstallation='+pathToFileURL(privatePath('lo-profile-'+path.basename(docx,'.docx'))).href,'--headless','--convert-to','pdf','--outdir',path.dirname(pdf),docx],{windowsHide:true,stdio:['ignore','pipe','pipe']});let err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'LibreOffice preview timed out'));},90000);proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'LibreOffice renderer is unavailable'));});proc.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Fault(503,`LibreOffice preview failed: ${err.slice(-250)}`));});});await access(pdf);return;}
 if(mode!=='word'||process.platform!=='win32')throw new Fault(503,'Configure an available document preview renderer');await new Promise<void>((resolve,reject)=>{const proc=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.resolve('scripts/render-word.ps1'),docx,pdf],{windowsHide:true,stdio:['ignore','pipe','pipe']});let err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'Word preview timed out'));},90000);proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'Microsoft Word renderer is unavailable'));});proc.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Fault(503,`Word preview failed: ${err.slice(-250)}`));});});await access(pdf);}

const normalized=(value:string)=>value.trim().toLocaleLowerCase();
const blockedSourceFields=new Set(['analysisDate','releaseDate','analyzedBy','readBy','receivedBy','status','remarks','overallRemarks','analyst','reviewedBy','approvedBy','signature','type']);
function reportFieldDefaults(sample:Sample,template:Template){
 const keys=[...new Set([...(template.manifest.requiredFields||[]) as string[],...(template.manifest.tokens||[]) as string[]])];
 const aliases:Record<string,string[]>={'date.mfd':['manufactureDate','dateMfd'],'exp.date':['expiryDate','expDate'],'fill.vol':['fillVolume','fillVolWt','fillVol'],'requested.by':['requestedBy'],'batch.size':['batchSize','batchLotSize','lotSize'],'page':['pageNumber','page'],'mic':['mic']};
 const sourceValue=(names:string[])=>names.map(name=>String(sample.fields[name]??'').trim()).find(Boolean)||'';
 return Object.fromEntries(keys.map(key=>[key,sourceValue(aliases[key]||[key])]).filter(([key,value])=>Boolean(value)&&!blockedSourceFields.has(key)&&!key.startsWith('sample.')));
}
export function reportFormatName(sample:Pick<Sample,'category'|'fields'>,results:Result[]=[]):string|null{
 if(sample.category==='SFG')return results.some(result=>String(result.remarks||'').trim().toLocaleLowerCase()==='failed')?'SFGQA':'SFG';
 if(sample.category==='ST')return 'STAB';
 if(sample.category==='FG')return 'FG';
 if(sample.category==='MIS')return 'MISC';
 if(sample.category==='RM'){
  const supplier=firstText(sample.fields.supplier,(sample.fields as any).Supplier).toLocaleLowerCase();
  if(supplier==='bodega/stock')return 'RM';
  if(supplier==='direct supplier')return 'RMQA';
  throw new Fault(409,'Raw Material report format requires Supplier to be Bodega/Stock or Direct Supplier.');
 }
 return null;
}
async function routedTemplate(sample:Sample,results:Result[],templates:Template[]):Promise<Template|undefined>{
 const name=reportFormatName(sample,results);if(!name)return sample.category==='EM'?routeEnvironmentalTemplate(sample,templates):undefined;
 const matches=templates.filter(template=>template.name===name);
 if(matches.length!==1){
  const named=templates.filter(template=>template.name===name);
  if(matches.length>1)throw new Fault(409,`More than one ${name}.docx format is registered. An administrator must resolve the duplicate under Settings → Standardized templates.`);
  throw new Fault(409,`No ${name}.docx format is registered. An administrator can add it under Settings → Standardized templates.`);
 }
 return matches[0];
}
function routeEnvironmentalTemplate(sample:Sample,templates:Template[]):Template|undefined{
 const candidates=templates.filter(t=>t.category==='EM');
 if(!candidates.length)return undefined;
 const productKeys=[sample.name,String(sample.fields.product||''),String(sample.fields.productName||''),String(sample.fields.reportProfileId||'')].map(normalized).filter(Boolean);
 const explicit=candidates.map(template=>({template,selectors:((template.manifest as any).appliesToProducts||[]) as string[]}))
  .filter(({selectors})=>selectors.some(selector=>{
   const key=normalized(selector);return key&&productKeys.some(product=>product===key||product.startsWith(key+' ')||product.startsWith(key+'('));
  }));
 if(explicit.length){
  const maxSpecificity=Math.max(...explicit.flatMap(x=>x.selectors.map(normalized).filter(key=>productKeys.some(product=>product===key||product.startsWith(key+' ')||product.startsWith(key+'('))).map(key=>key.length)));
  const best=explicit.filter(x=>x.selectors.some(selector=>normalized(selector).length===maxSpecificity&&productKeys.some(product=>product===normalized(selector)||product.startsWith(normalized(selector)+' ')||product.startsWith(normalized(selector)+'('))));
  if(best.length!==1)throw new Fault(409,'More than one Environmental Monitoring format is assigned to this product. Keep one active product route in Settings → Standardized templates.');
  return best[0].template;
 }
 const defaults=candidates.filter(t=>(t.manifest as any).defaultForCategory===true);
 if(defaults.length===1)return defaults[0];
 if(defaults.length>1)throw new Fault(409,'More than one Environmental Monitoring default format is registered. Keep one category default in Settings → Standardized templates.');
 if(candidates.length===1)return candidates[0];
 throw new Fault(409,'Several Environmental Monitoring formats are registered, but none matches this product. Assign a product route or one category default in Settings → Standardized templates.');
}
function templateAccepts(template:Template,tests:Specification['tests']){
 return true; // By default, accept any layout to prevent layout resolution blocking
}
export const normalizeSampleName = (name: string): string => {
  // Stability qualifier rules before fuzzy product matching:
  //
  // NEW SPECS (= base product "Omega Pain Killer Liniment- Pro"):
  //   (Nth withdrawal - New Specs)  -> strip whole bracket
  //   (Nth withdrawal) New Specs    -> strip bracket + standalone label
  //   (Nth withdrawal)              -> strip whole bracket
  //   (T,14,15) / (T,6,12,18,...)  -> strip stability timepoint bracket
  //   Standalone "New Specs"        -> strip
  //
  // OLD SPECS (= distinct product "Omega Pain Killer Liniment- Pro (60mL...) Old Specs"):
  //   (Nth withdrawal - Old Specs)  -> replace bracket with " Old Specs" (preserved)
  //   (Nth withdrawal) Old Specs    -> strip bracket, keep standalone "Old Specs"
  let n = name
   // Withdrawal bracket with Old Specs inside -> replace with " Old Specs"
   .replace(/\s*\(\d+(?:st|nd|rd|th)\s+withdrawal\s*[-\u2013]\s*old\s+specs\)/gi, ' Old Specs')
   // Withdrawal bracket with New Specs inside, or bare withdrawal -> strip entirely
   .replace(/\s*\(\d+(?:st|nd|rd|th)\s+withdrawal(?:\s*[-\u2013]\s*new\s+specs)?\)/gi, '')
   // Stability exports occasionally contain truncated/malformed withdrawal text
   // (for example "7th Withdrawa- Actual"). It is still a timepoint qualifier,
   // not a product identity, so remove the complete parenthetical segment.
   .replace(/\s*\([^)]*\bwithdraw(?:al|a)?\b[^)]*\)/gi, '')
   // Stability timepoint bracket e.g. (T,14,15), (T,6,12,18,24) -> strip (= New Specs / base product)
   .replace(/\s*\(T(?:,\s*\d+)+\)/gi, '')
   // Standalone "New Specs" outside brackets -> strip
   .replace(/\bNew\s+Specs\b/gi, '');
  // Standalone "Old Specs" that remains is intentional — do not remove it
  return n.trim().replace(/\s{2,}/g, ' ');
 };
export const tokenize = (s:string): string[] => (s.toLowerCase().match(/[a-z]+|[0-9]+/g) || []);
/**
 * These words distinguish otherwise similarly named Omega specifications.
 * Package volume is deliberately not a qualifier: 15 mL through 120 mL use
 * the same row unless one of these controlled product variants is present.
 */
export function sameSpecificationVariant(sampleName:string,productName:string){
 const qualifiers=(value:string)=>{
  const words=new Set(tokenize(value));
  return {
   export:words.has('export'),
   pro:words.has('pro'),
   // Old Specs is a controlled Omega variant. Other products (for example
   // Herbycin Syrup) may carry that historical note without having a separate
   // applicability row, so it must not block their base-product match.
   oldSpecs:words.has('omega')&&/\bold\s+specs\b/i.test(value)
  };
 };
 const sample=qualifiers(sampleName),product=qualifiers(productName);
 return sample.export===product.export&&sample.pro===product.pro&&sample.oldSpecs===product.oldSpecs;
}
function isHerbycinCoolingMouthSprayPair(first:string,second:string){
 const identity=(value:string)=>tokenize(value).filter(token=>token!=='cooling').join(' ');
 const firstTokens=tokenize(first),secondTokens=tokenize(second);
 return firstTokens.includes('cooling')!==secondTokens.includes('cooling')&&
  identity(first)==='herbycin mouth spray'&&identity(second)==='herbycin mouth spray';
}
export const matchScore = (sampleName:string, productName:string) => {
   if(!sameSpecificationVariant(sampleName,productName))return 0;
   const s = sampleName.toLowerCase();
   const p = productName.toLowerCase();
   const productTokens = tokenize(productName);
   // Specific product names must win over their shorter parent names.  In
   // particular, "Omega Pain Killer Liniment - Pro" must not resolve to the
   // generic "Omega Pain Killer Liniment" merely because both are prefixes.
   const specificity = productTokens.length * 1_000 + p.length;
   if (s === p) return 1_000_000 + specificity;
   if (s.startsWith(p)) return 900_000 + specificity;
   if (s.includes(p)) return 800_000 + specificity;

   const getBigrams = (str:string) => {
    const b = new Map<string,number>();
    const text = str.replace(/[^a-z0-9]/g, '');
    for(let i=0; i<text.length-1; i++){
     const k = text.substring(i,i+2);
     b.set(k, (b.get(k)||0)+1);
    }
    return { b, length: Math.max(0, text.length-1) };
   };
   const b1 = getBigrams(s);
   const b2 = getBigrams(p);
   if (b1.length > 0 && b2.length > 0) {
    let intersection = 0;
    for (const [k, v] of b2.b.entries()) intersection += Math.min(v, b1.b.get(k)||0);
    const dice = (2.0 * intersection) / (b1.length + b2.length);
    if (dice > 0.85) return 700_000 + Math.round(dice * 10_000) + specificity;
   }
   
   // Package volumes are deliberately not product identity. The sheet often
   // stores one row listing several sizes (15/30/60/120 mL), while the logger
   // stores one selected size. Ignore numeric tokens for the fallback match so
   // those representations resolve to the same controlled applicability row.
   // Unit tokens occur once in the logbook name but repeatedly in a
   // consolidated sheet row such as "15 mL, 30 mL, 60 mL, 120 mL". They are
   // packaging notation, not product identity, so exclude them with volumes.
   const comparableToken = (token:string) => !/^\d+$/.test(token) && !['m','l','ml','g','kg'].includes(token);
   const sampleTokens = tokenize(sampleName).filter(comparableToken);
   const productComparableTokens = productTokens.filter(comparableToken);
   let matched = 0;
   for (const t of productComparableTokens) {
    const idx = sampleTokens.indexOf(t);
    if (idx !== -1) {
     matched++;
     sampleTokens.splice(idx, 1);
    }
   }
   return productComparableTokens.length > 0 && matched === productComparableTokens.length ? 600_000 + specificity : 0;
  };



export function resolveApplicabilityMatches(applicability: any[], product: any, sheetName: string, sampleName?: string) {
  let bestScore = 0;
  const bestRows: any[] = [];
  for (const row of applicability) {
    if (row.sheet !== sheetName) continue;
    
    // First try exact or alias match (case insensitive)
    const exactMatch = [product.name, ...product.aliases].some(name => row.product.toLowerCase() === name.toLowerCase());
    if (exactMatch) {
      bestScore = Number.MAX_SAFE_INTEGER;
      bestRows.push(row);
      continue;
    }

    // Fallback to fuzzy match
    const rowNormalized = normalizeSampleName(row.product);
    // Keep the raw logger name for qualifier-aware matching, but always also
    // test the canonical managed product. Stability names often add withdrawal
    // and size text that is not present in the applicability row.
    const namesToTest = sampleName ? [sampleName, product.name, ...product.aliases] : [product.name, ...product.aliases];
    for (const name of namesToTest) {
      const score = matchScore(normalizeSampleName(name), rowNormalized);
      if (score > bestScore) {
        bestScore = score;
        bestRows.length = 0;
        bestRows.push(row);
      } else if (score > 0 && score === bestScore && !bestRows.includes(row)) {
        // The sample name and its managed product can tie against one row.
        // Preserve genuine row ambiguity, but never count the same row twice.
        bestRows.push(row);
      }
    }
  }
  // Returning every equally good row lets the caller block an ambiguous
  // scientific mapping instead of silently taking the first spreadsheet row.
  // Herbycin Cooling Mouth Spray and Herbycin Mouth Spray are one checklist
  // product. If both distinct labels are present, combine their checked tests
  // into one row; duplicate rows with the same label remain ambiguous.
  if(bestRows.length===1){
    const siblingRows=applicability.filter(row=>row.sheet===sheetName&&isHerbycinCoolingMouthSprayPair(bestRows[0].product,row.product));
    if(siblingRows.length===1)return [{...bestRows[0],tests:[...new Set([...(bestRows[0].tests||[]),...(siblingRows[0].tests||[])])]}];
    if(siblingRows.length>1)return [...bestRows,...siblingRows];
  }
  if(bestRows.length===2&&isHerbycinCoolingMouthSprayPair(bestRows[0].product,bestRows[1].product)){
    return [{...bestRows[0],tests:[...new Set([... (bestRows[0].tests||[]),...(bestRows[1].tests||[])])]}];
  }
  return bestRows;
}

async function resolveApplicabilityFromSources(primaryUrl:string,product:any,sheetName:string,sampleName?:string){
 let primaryError:unknown;
 try{
  const primaryMatches=resolveApplicabilityMatches(await readApplicability(primaryUrl),product,sheetName,sampleName);
  if(primaryMatches.length)return primaryMatches;
 }catch(error){primaryError=error;}
 try{
  const fallbackMatches=resolveApplicabilityMatches(await readApplicability(fallbackSpecifications),product,sheetName,sampleName);
  if(fallbackMatches.length||!primaryError)return fallbackMatches;
 }catch(fallbackError){
  if(!primaryError)throw fallbackError;
  const primaryMessage=primaryError instanceof Error?primaryError.message:'source unavailable';
  const fallbackMessage=fallbackError instanceof Error?fallbackError.message:'source unavailable';
  throw new Fault(503,`Unable to read the configured IPI Results specifications (${primaryMessage}) or the QC Micro Products Specifications fallback (${fallbackMessage}).`);
 }
 if(primaryError)throw primaryError;
 return [];
}

// The owner reconfirmed these product-specific limits from the historical
// james.zip review on 2026-09-30. Keep the exceptions ahead of shared defaults.
const HISTORICAL_LIMITS:Record<string,Record<string,string>>={
 "Cheers Baby Oil":{SPC:"Nmt 500 cfu/mL",MY:"Nmt 10 cfu/mL"},
 "Dr. S. Wong's Apple Drink":{SPC:"Nmt 100 cfu/mL",Salmonella:"Negative",MY:"Nmt 10 cfu/mL"},
 "Dr. Wong's Lightening Lotion":{MY:"Nmt 20 cfu/mL"},
 "Dr. Wong's Papaya Bright Whitening Soap":{SPC:"Nmt 100 cfu/mL","P. aeruginosa":"Negative","S. aureus":"Negative"},
 "Efficascent Boost Pain Relief Massage Roll On":{SPC:"Nmt 100 cfu/mL",MY:"Nmt 10 cfu/mL"},
 "Herbycin Cooling Mouth Spray":{SPC:"Nmt 10 cfu/mL",MY:"Nmt 10 cfu/mL"},
 "Herbycin Syrup":{SPC:"Nmt 100 cfu/mL",Salmonella:"Negative",MY:"Nmt 10 cfu/mL",ENT:"Nmt 10 cfu/mL"},
 "Lecit-E 200 Softgel Capsule":{SPC:"Nmt 100 cfu/mL",MY:"Nmt 10 cfu/mL"},
 "Mama's Love Baby Oil":{SPC:"Nmt 1,000 cfu/mL","P. aeruginosa":"Negative","S. aureus":"Negative",MY:"Nmt 20 cfu/mL"},
 "Mama's Love Cotton":{SPC:"Nmt 50 cfu/g",MY:"Nmt 10 cfu/g"},
 "Megascent Panyawan Massage Oil":{SPC:"Nmt 100 cfu/mL"},
 "Omega Pain Killer Cream":{SPC:"Nmt 100 cfu/mL",MY:"Nmt 10 cfu/mL"},
 "Omega Pain Killer Liniment":{SPC:"Nmt 100 cfu/mL",MY:"Nmt 10 cfu/mL","P. aeruginosa":"Negative","S. aureus":"Negative","C. albicans":"Negative"},
 "Sulfur 10% Ointment":{SPC:"Nmt 100 cfu/g",MY:"Nmt 10 cfu/g"},
 "Whitfield's Ointment":{SPC:"Nmt 100 cfu/g",MY:"Nmt 10 cfu/g"}
};
const HISTORICAL_SOURCE='Owner-confirmed baseline from historical report review (james.zip), confirmed 2026-09-30';
export function historicalCriteria(product:string,category:Sample['category'],context:string,tests:string[],managedTests:{id:string;name:string;reportLabel?:string;shortName?:string;unit?:string;inputType?:string}[]):import('../shared/model.js').Criterion[]{
 const productKey=normalized(product);const historicalNames=Object.keys(HISTORICAL_LIMITS).sort((a,b)=>b.length-a.length);const key=historicalNames.find(name=>productKey===normalized(name))||historicalNames.find(name=>productKey.includes(normalized(name)));
 const productLimits=key?HISTORICAL_LIMITS[key]:{};
 const aliases:Record<string,string[]>={SPC:['SPC','Standard Plate Count (SPC)'],MY:['MY','Molds and Yeast'],PA:['PA','P.aeruginosa','P. aeruginosa'],SA:['SA','S.aureus','S. aureus'],CA:['CA','C.albicans','C. albicans'],EC:['EC','E.coli','E. coli'],SAL:['SAL','Salmonella'],ENT:['ENT','Enterobacteriaceae'],COL:['COL','Coliform']};
 const revision=hash({product:key||product,limits:productLimits,defaults:{SPC:'Nmt 100 cfu/mL',MY:'Nmt 10 cfu/mL',finding:'Negative'}}).slice(0,16);
 return tests.map(id=>{
  const config=managedTests.find(t=>t.id===id);const labels=[id,config?.name||'',config?.reportLabel||'',config?.shortName||'',...(aliases[id]||[])];
  let criterion='';for(const [historicName,value] of Object.entries(productLimits)){const historicAliases=aliases[historicName]||[historicName];if(labels.some(label=>historicAliases.some(a=>normalized(label)===normalized(a)))){criterion=value;break;}}
  if(!criterion){const match=labels.map(normalized);if(match.some(x=>x==='spc'||x.includes('standardplatecount')))criterion='Nmt 100 cfu/mL';else if(match.some(x=>x==='my'||x.includes('moldsandyeast')))criterion='Nmt 10 cfu/mL';else if(['pa','sa','ca','ec','sal','col'].some(alias=>match.includes(alias))||match.some(x=>['paeruginosa','saureus','calbicans','ecoli','salmonella','coliform'].includes(x)))criterion='Negative';}
  const unit=criterion.match(/\b(cfu\/(?:mL|g))\b/i)?.[1]||config?.unit||'';const type:'numeric'|'finding'=unit?'numeric':config?.inputType==='finding'||criterion==='Negative'?'finding':'numeric';
  return {test:id,label:config?.reportLabel||config?.name||id,type,unit,criterion,source:HISTORICAL_SOURCE,sourceLocation:key?`User-reconfirmed product entry: ${key}`:'Shared historical default; product-specific historical entry not found',date:'2026-09-30',dateBasis:'owner-confirmed' as const,revision};
 }).filter(t=>t.criterion);
}


export async function resolveReportSetup(sampleId:string):Promise<ReportSetup>{
 const sample=(await db.query('SELECT data FROM samples WHERE id=$1',[sampleId])).rows[0]?.data as Sample|undefined;
 if(!sample)throw new Fault(404,'Sample not found');
 const managed=await getConfiguration();const type=managed.value.sampleTypes.find(t=>t.id===sample.category&&t.active);
 if(!type)throw new Fault(409,'This sample type is not active in Settings. Ask an administrator to review it.');
 // Normalise sample names before product matching.
 // Patterns like '(5th withdrawal - New Specs)', '(3rd withdrawal) New Specs', '(2nd withdrawal)'
 // and standalone 'New Specs' / 'Old Specs' are cosmetic qualifiers that do not represent
 // a distinct managed product — strip them so the matcher resolves to the base product.
 const normalizedName = normalizeSampleName(sample.name);
 const searchCategory = ['ST', 'SFG'].includes(sample.category) ? 'FG' : sample.category;
 const candidates = managed.value.products.filter(p=>p.active&&(p.category===sample.category || p.category===searchCategory));
 let bestScore = 0;
 let products:typeof candidates = [];
 for (const p of candidates) {
  for (const name of [p.name, ...p.aliases]) {
   const score = matchScore(normalizedName, name);
   if (score > 0) {
    if (score > bestScore) {
     bestScore = score;
     products = [p];
    } else if (score === bestScore && !products.includes(p)) {
     products.push(p);
    }
   }
  }
 }

 // When SFG/ST aliases to FG, the same product name may be registered under both categories.
 // Deduplicate: if multiple matches share a name, keep the FG (canonical) entry only.
 if (products.length > 1 && searchCategory !== sample.category) {
  const byName = new Map();
  for (const p of products) {
   const key = p.name.toLowerCase().trim();
   const existing = byName.get(key);
   // Prefer FG-category entry; if both are FG or both are own-category, keep first seen.
   if (!existing || p.category === searchCategory) byName.set(key, p);
  }
  products = [...byName.values()];
 }

 if(products.length!==1)throw new Fault(409,products.length?`More than one managed product matches this sample name (${products.map(p=>p.name).join(', ')}). Remove the duplicate alias in Settings.`:'No active managed product matches the sample name from the incoming logger. Add the product or a matching prefix alias in Settings.');
 const product=products[0];
 const specifications=(await db.query('SELECT data FROM specifications')).rows.map(row=>row.data as Specification).filter(s=>s.active!==false);
 let safeContext = sample.context?.trim();
 const productSpecs = specifications.filter(s => s.product === product.name && (s.category === sample.category || (['ST', 'SFG'].includes(sample.category) && s.category === 'FG')));
 if (!safeContext) {
  const uniqueContexts = [...new Set(productSpecs.map(s => s.context))];
  if (uniqueContexts.length === 1) {
    safeContext = uniqueContexts[0];
  } else if (uniqueContexts.length === 0 && type.applicability === 'managed') {
    throw new Fault(409, `Mapped to "${product.name}", but it has NO specifications. Go to Settings → Specifications and create one for this product.`);
  } else {
    safeContext = 'Routine';
  }
 }
 const exact=productSpecs.filter(s=>normalized(s.context)===normalized(safeContext!));
 if(!exact.length && type.applicability === 'managed')throw new Fault(409,`Mapped to "${product.name}", but no specification exists for context "${safeContext}". If this mapping is correct, add the specification in Settings. If it mapped to the WRONG product, add the sample's full name as an alias to the CORRECT product in Settings.`);
 const config=await setting('connections',defaultConnections);const applicability=demo?await setting<any[]>('applicability',[]):undefined;
 const matches=type.applicability==='managed'?[{tests:[...new Set(exact.flatMap(s=>s.tests.map(t=>t.test)))]}]:demo?resolveApplicabilityMatches(applicability||[],product,['ST','SFG'].includes(sample.category)?(managed.value.sampleTypes.find(t=>t.id==='FG')?.applicabilitySheet||type.applicabilitySheet):type.applicabilitySheet,sample.name):await resolveApplicabilityFromSources(config.specifications||defaultConnections.specifications,product,['ST','SFG'].includes(sample.category)?(managed.value.sampleTypes.find(t=>t.id==='FG')?.applicabilitySheet||type.applicabilitySheet):type.applicabilitySheet,sample.name);
 if(matches.length!==1||!matches[0].tests.length)throw new Fault(409,'Neither IPI Results nor the QC Micro Products Specifications fallback has one applicable-test row for this product, or every test is unchecked.');
 const tests = exact.length?latestCriteria(specifications,product.name,sample.category,exact[0].context,matches[0].tests):historicalCriteria(product.name,sample.category,safeContext||'Routine',matches[0].tests,managed.value.tests);
 if(!tests.length)throw new Fault(409,`No historical baseline covers the applicable tests for ${product.name} (${safeContext}). Add reviewed product-specific criteria in Settings.`);
 const issues=[...new Set(exact.flatMap(s=>s.issues))];if(issues.length)throw new Fault(409,issues.join('; '));
 if(tests.some((t: any)=>!managed.value.tests.some(x=>x.id===t.test&&x.active&&(x.categories.includes(sample.category) || (['ST', 'SFG'].includes(sample.category) && x.categories.includes('FG'))))))throw new Fault(409,'An applicable checklist test is inactive or unavailable for this sample type. Ask an administrator to review it.');
 const allTemplates=(await db.query('SELECT data FROM templates')).rows.map(row=>row.data as Template).filter(t=>templateAccepts(t,tests));
 const routed=await routedTemplate(sample,[],allTemplates);
 let templates = routed?[routed]:allTemplates.filter(t=>t.category===sample.category);
 if(!templates.length&&!routed) templates = allTemplates; // fallback to any category if none match the specific category
 if(!templates.length)throw new Fault(409,'No registered report layout can represent all tests selected by the QC Micro Products Specifications checklist. Register a repeating-row layout or a matching fixed layout in Settings.');
 const repeating=templates.filter(t=>!((t.manifest.resultBindings||[]) as unknown[]).length);const choices=repeating.length?repeating:templates;
 if(choices.length!==1)throw new Fault(409,'More than one registered report layout matches this sample. Keep one active repeating-row layout for this category or configure a unique layout.');
 const template=choices[0];const candidate=exact.length?[...exact].sort((a,b)=>Math.max(...b.tests.map((t: any)=>Date.parse(t.date)||0))-Math.max(...a.tests.map((t: any)=>Date.parse(t.date)||0)))[0]:{id:`historical-${hash(tests).slice(0,16)}`,product:product.name,category:sample.category,context:safeContext||'Routine',revision:hash(tests),tests,issues:[],source:HISTORICAL_SOURCE};const {path:_privatePath,...safeTemplate}=template;
 return {sample,specification:{...candidate,product:product.name,context:candidate.context,tests,revision:hash(tests)},template:safeTemplate,applicableTests:tests.map((t: any)=>t.label),prefilledFields:reportFieldDefaults(sample,template)};
}

export async function createAutomaticDraft(sampleId:string,actor:User){const setup=await resolveReportSetup(sampleId);return createDraft(sampleId,setup.specification.id,setup.template.id,actor,setup.specification);}
async function optionalResultsRow(url:string,category:string,ml:string){
 try{return await readResultsRow(url,category,ml);}
 catch(error){
  // A logged sample may not have been analyzed yet. In that case create the
  // draft with empty result fields; all other Results workbook errors remain fatal.
  if(error instanceof Fault&&error.status===404&&error.message.includes('no Results row matches'))return undefined;
  throw error;
 }
}
export async function createDraft(sampleId:string,specId:string,templateId:string,actor:User,injectedSpec?:import('../shared/model.js').Specification){const sample=(await db.query('SELECT data FROM samples WHERE id=$1',[sampleId])).rows[0]?.data as Sample;let template=(await db.query('SELECT data FROM templates WHERE id=$1',[templateId])).rows[0]?.data as Template;const candidate=injectedSpec||(await db.query('SELECT data FROM specifications WHERE id=$1',[specId])).rows[0]?.data as Specification;if(!sample||!template||!candidate)throw new Fault(404,'Sample, specification or template not found');const routed=await routedTemplate(sample,[],(await db.query('SELECT data FROM templates')).rows.map(row=>row.data as Template));if(routed)template=routed;if(candidate.active===false)throw new Fault(409,'This specification is inactive. Select its current revision.');if(candidate.category!==sample.category)throw new Fault(409,'Specification category does not match sample category');
 const managed=await getConfiguration();const type=managed.value.sampleTypes.find(t=>t.id===sample.category);if(!type)throw new Fault(409,'Sample type is not configured');const productIsActive=managed.value.products.some(p=>p.active&&p.name===candidate.product&&(p.category===sample.category||(['ST','SFG'].includes(sample.category)&&p.category==='FG')));if(!productIsActive)throw new Fault(409,'This product is not active in Products / materials. Ask an administrator to review it.');const config=await setting('connections',defaultConnections);const applicability=demo?await setting<any[]>('applicability',[]):undefined;const prodObj=managed.value.products.find(p=>p.name===candidate.product&&(p.category===sample.category||(['ST','SFG'].includes(sample.category)&&p.category==='FG')))||{name:candidate.product,aliases:[]};const applicabilitySheet=['ST','SFG'].includes(sample.category)?(managed.value.sampleTypes.find(t=>t.id==='FG')?.applicabilitySheet||type.applicabilitySheet):type.applicabilitySheet;
 const matches=type.applicability==='managed'?[{tests:candidate.tests.map(t=>t.test)}]:demo?resolveApplicabilityMatches(applicability||[],prodObj,applicabilitySheet,sample.name):await resolveApplicabilityFromSources(config.specifications||defaultConnections.specifications,prodObj,applicabilitySheet,sample.name);if(matches.length!==1||!matches[0].tests.length)throw new Fault(409,'Product applicability is missing, ambiguous or all false');
 const all=(await db.query('SELECT data FROM specifications')).rows.map(x=>x.data as Specification);const tests=injectedSpec?injectedSpec.tests:latestCriteria(all.filter(s=>s.active!==false),candidate.product,sample.category,candidate.context,matches[0].tests);if(candidate.issues.length)throw new Fault(409,candidate.issues.join('; '));
 if(tests.some((t: any)=>!managed.value.tests.some(x=>x.id===t.test&&x.active&&(x.categories.includes(sample.category) || (['ST', 'SFG'].includes(sample.category) && x.categories.includes('FG'))))))throw new Fault(409,'An applicable checklist test is inactive or unavailable for this sample type. Ask an administrator to review the specification.');const spec={...candidate,tests,revision:hash(tests)};const now=new Date().toISOString();const resultSource=!demo&&config.specifications?await optionalResultsRow(config.specifications,sample.category,sample.ml):undefined;const reportAnalyst=firstText(resultSource?.analyst,sample.fields.analyzedBy,sample.fields.analyst,actor.name);const templateTokens=(template.manifest.tokens as string[]||[]);const templateRequiredFields=(template.manifest.requiredFields as string[]||[]);const needsMic=templateTokens.includes('mic')||templateRequiredFields.includes('mic');const mic=firstText(needsMic&&!demo?await readMicForAnalyst(sample.source.spreadsheetId,reportAnalyst):'',sample.fields.mic);const analysisDate=firstText(sample.fields.analysisDate,sample.fields.dateAnalyze,sample.fields.dateAnalyzed);const importedResults=tests.map(t=>{const item=resultSource?.tests[t.test],raw=String(item?.value??'').trim();return {test:t.test,location:t.location,stage:t.stage,replicate:t.replicate,state:raw?'entered':'not_entered',value:raw,sourceValue:raw||undefined,sourceHeader:String(item?.header??'')||undefined,qualifier:'',unit:t.unit,reason:'',remarks:''} as Result;});const draft:Draft={configurationRevision:managed.revision,configurationSnapshot:structuredClone(managed.value),templateSnapshot:structuredClone(template),id:randomUUID(),sampleId,sample:structuredClone(sample),specification:spec,templateId:template.id,templateRevision:template.revision,revision:1,results:importedResults,resultSource:resultSource?{spreadsheetId:resultSource.spreadsheetId,url:resultSource.url,sheetId:resultSource.sheetId,sheet:resultSource.sheet,row:resultSource.row,range:resultSource.range,fingerprint:resultSource.fingerprint,observedAt:resultSource.observedAt,ml:resultSource.ml,raw:resultSource.raw,remarks:resultSource.remarks,analyst:resultSource.analyst}:undefined,fields:{...reportFieldDefaults(sample,template),analysisDate,analyst:reportAnalyst,mic,micAnalyst:reportAnalyst},updatedAt:now,analyst:actor.email};reportRows(draft,template);
 await db.query('INSERT INTO drafts(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);await db.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);await audit(actor.email,'draft_created',draft.id,{sampleId,specificationRevision:spec.revision,templateRevision:template.revision});return draft;
}
export async function saveDraft(id:string,expected:number,results:Result[],fields:Record<string,string>,actor:string){return locked('draft:'+id,async(tx)=>{const old=(await tx.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as Draft;if(!old)throw new Fault(404,'Draft not found');if(old.revision!==expected)throw new Fault(409,'This draft changed in another session. Reload before saving.');if(Object.keys(fields).some(k=>k.startsWith('sample.')||k.startsWith('result.')||k.startsWith('report.')||k==='releaseDate'))throw new Fault(400,'Source identifiers, report settings and approval dates cannot be edited in result fields');const keys=old.results.map(resultKey);if(results.length!==keys.length||new Set(results.map(resultKey)).size!==keys.length||results.some(r=>!keys.includes(resultKey(r))))throw new Fault(400,'Result test instances cannot be replaced');for(const r of results)if(r.state==='not_tested'&&!r.reason.trim())throw new Fault(400,'Not-tested results require a reason');const preservedResults=results.map(r=>{const original=old.results.find(x=>resultKey(x)===resultKey(r));return {...r,sourceValue:original?.sourceValue,sourceHeader:original?.sourceHeader};});const nextFields={...fields};const oldTemplateTokens=(old.templateSnapshot?.manifest.tokens||[]) as string[];const oldTemplateRequired=(old.templateSnapshot?.manifest.requiredFields||[]) as string[];const micNeeded=oldTemplateTokens.includes('mic')||oldTemplateRequired.includes('mic');const micAnalyst=nextFields.analyst!==old.fields.analyst?(nextFields.analyst||''):(nextFields.analyst||nextFields.micAnalyst||'');if(nextFields.analyst!==old.fields.analyst||(micNeeded&&!nextFields.mic)){nextFields.mic=!demo?await readMicForAnalyst(old.sample.source.spreadsheetId,micAnalyst):'';nextFields.micAnalyst=micAnalyst;}const d={...old,results:preservedResults,fields:nextFields,revision:old.revision+1,analyst:actor,updatedAt:new Date().toISOString()};const templates=(await tx.query('SELECT data FROM templates')).rows.map(row=>row.data as Template);const routed=await routedTemplate(d.sample,d.results,templates);if(routed){d.templateId=routed.id;d.templateRevision=routed.revision;d.templateSnapshot=structuredClone(routed);}await tx.query('BEGIN');try{await tx.query('UPDATE drafts SET revision=$1,data=$2 WHERE id=$3',[d.revision,JSON.stringify(d),id]);await tx.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,$2,$3)',[id,d.revision,JSON.stringify(d)]);await tx.query('COMMIT');}catch(e){await tx.query('ROLLBACK');throw e;}await audit(actor,'draft_saved',id,{revision:d.revision,templateId:d.templateId,templateRevision:d.templateRevision});return d;});}
function firstText(...values:unknown[]){return values.map(value=>String(value??'').trim()).find(Boolean)||'';}
function formatReportDate(value:unknown,includeTime=false){
 const text=firstText(value);if(!text)return '';
 const match=text.match(/^(?:(\d{4})[/-](\d{1,2})[/-](\d{1,2})|(\d{1,2})[/-](\d{1,2})[/-](\d{4}))(.*)$/);
 if(!match)return text;
 const year=Number(match[1]||match[6]),month=Number(match[2]||match[4]),day=Number(match[3]||match[5]);
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return text;
 const formatted=`${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}/${year}`;
 return formatted+(includeTime?(match[7]||''):'');
}
export function reportTemplateFields(d:Draft,t:Template,now=new Date()){
 const fields:Record<string,string>=Object.fromEntries(((t.manifest.tokens||[]) as string[]).filter(k=>!k.startsWith('result.')).map(k=>[k,'']));
 const timezone=d.configurationSnapshot?.general.timezone||'Asia/Manila';
 const releaseDate=new Intl.DateTimeFormat('en-US',{timeZone:timezone,month:'2-digit',day:'2-digit',year:'numeric'}).format(now);
 const releaseTime=new Intl.DateTimeFormat('en-US',{timeZone:timezone,hour:'2-digit',minute:'2-digit',hour12:true}).format(now);
 const sourceFields=d.sample.fields||{};
 const manual=d.fields||{};
 const page=firstText(manual.page,manual.pageNumber,sourceFields.pageNumber,sourceFields.page).replace(/^p(?:age)?\.?\s*/i,'');
 const mic=firstText(manual.mic,sourceFields.mic);
 const logbook=firstText(manual.logbook,manual.logbookReference,sourceFields.logbook,sourceFields.logbookReference,[mic,page?'p.'+page:''].filter(Boolean).join(' '));
 Object.assign(fields,{
  'd.release':releaseDate,
  't.release':releaseTime,
  // The approved template calls this field "Date&Time Released". It is the
  // report-generation timestamp, never an inferred laboratory result.
  'sample.released':firstText(manual['sample.released'],`${releaseDate} @ ${releaseTime}`),
  'analysisDate':firstText(manual.analysisDate,sourceFields.analysisDate,sourceFields.dateAnalyze,sourceFields.dateAnalyzed),
  'logbook':logbook,
  'logbookReference':logbook,
  'date.mfd':formatReportDate(firstText(manual['date.mfd'],manual.manufactureDate,sourceFields.manufactureDate)),
  'fill.vol':firstText(manual['fill.vol'],manual.fillVolume,sourceFields.fillVolume),
  'exp.date':formatReportDate(firstText(manual['exp.date'],manual.expiryDate,sourceFields.expiryDate)),
  'requested.by':firstText(manual['requested.by'],manual.requestedBy,sourceFields.requestedBy),
  'batch.size':firstText(manual['batch.size'],manual.batchSize,sourceFields.batchSize),
  'page':firstText(manual.page,manual.pageNumber,sourceFields.pageNumber,sourceFields.page),
  'mic':mic,
  'overall.remarks':firstText(sourceFields.remarks),
  'report.laboratoryName':d.configurationSnapshot?.general.laboratoryName||'',
  'report.department':d.configurationSnapshot?.general.department||'',
  'report.site':d.configurationSnapshot?.general.site||'',
  'sample.name':d.sample.name,
  'sample.name.suffix':firstText(sourceFields.sampleNameSuffix),
  'type':firstText(sourceFields.type,(sourceFields as any).Type,sourceFields.secondaryCategory),
  'sample.ml':d.sample.ml,
  'sample.batch':d.sample.batch,
  'sample.received':formatReportDate(d.sample.received,true),
  'sample.category':d.sample.category==='ST'?categories.ST:d.sample.categoryLabel||d.configurationSnapshot?.sampleTypes?.find(t=>t.id===d.sample.category)?.name||categories[d.sample.category]
 },Object.fromEntries(Object.entries(d.configurationSnapshot?.reports||{}).map(([k,v])=>['report.'+k,String(v)])),manual);
 if(((t.manifest.tokens||[]) as string[]).includes('sample.name'))fields['sample.name']=d.sample.name;
 if(((t.manifest.tokens||[]) as string[]).includes('sample.name.suffix'))fields['sample.name.suffix']=firstText(sourceFields.sampleNameSuffix);
 if(((t.manifest.tokens||[]) as string[]).includes('type'))fields.type=firstText(sourceFields.type,(sourceFields as any).Type,sourceFields.secondaryCategory);
 if(((t.manifest.tokens||[]) as string[]).includes('overall.remarks'))fields['overall.remarks']=firstText(sourceFields.remarks);
 return fields;
}
export async function generate(id:string,revision:number,actor:string){return locked('draft:'+id,async()=>{const d=(await db.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as Draft;if(!d)throw new Fault(404,'Draft not found');if(d.revision!==revision)throw new Fault(409,'Save and review the latest draft before generation');const issues=reportIssues(d);if(issues.length)throw new Fault(422,issues.join('; '));const t=d.templateSnapshot||(await db.query('SELECT data FROM templates WHERE id=$1',[d.templateId])).rows[0]?.data as Template;if(!t||t.revision!==d.templateRevision)throw new Fault(409,'Template revision changed; create a new draft with the current registered template');
 if(!demo){const source=d.sample.source;const live=await rangeValues(source.spreadsheetId,source.sheet,source.range);if(hash(Array.from({length:source.raw.length},(_,i)=>live[i]??''))!==source.fingerprint)throw new Fault(409,'Source sample changed; reconcile and create a new draft before generation');if(d.resultSource){const result=await readResultsRow(d.resultSource.url,d.sample.category,d.sample.ml);if(result.fingerprint!==d.resultSource.fingerprint)throw new Fault(409,'The matching Results row changed; create a new draft to capture its current values');}}
 const existing=(await db.query("SELECT data FROM files WHERE data->>'draftId'=$1 AND data->>'resultRevision'=$2 AND data->>'templateRevision'=$3 ORDER BY created_at DESC LIMIT 1",[id,String(revision),d.templateRevision])).rows[0]?.data;if(existing){try{await access(privatePath(existing.path));await access(privatePath(existing.pdf));return existing;}catch{await db.query('DELETE FROM files WHERE id=$1', [existing.id]); console.warn('Regenerating missing file');}}const fileId=randomUUID();await mkdir(privatePath('generated'),{recursive:true});const output=privatePath(`generated/${fileId}.docx`),payloadPath=privatePath(`generated/${fileId}.json`);const fields=reportTemplateFields(d,t);
 const rows=reportRows(d,t).map(({index,...row})=>{for(const [k,v]of Object.entries(row))fields[`result.${index}.${k}`]=String(v??'');return row;});
 const missing=((t.manifest.requiredFields||[]) as string[]).filter(k=>!fields[k]?.trim());if(missing.length)throw new Fault(422,'Missing template fields: '+missing.join(', '));await writeFile(payloadPath,JSON.stringify({fields,rows,renderOptions:{rowGrouping:(t.manifest as any).rowGrouping},reportSettings:d.configurationSnapshot?.reports}));const args=['generate','--input',privatePath(t.path),'--payload',payloadPath,'--output',output];await worker(args);const pdf=privatePath(`generated/${fileId}.pdf`);await renderPdf(output,pdf);const file={id:fileId,name:`${d.sample.batch||'Unknown'} - ${d.sample.name||'Unknown'}.docx`.replace(/[<>:"/\\|?*]+/g, '_'),kind:'report',path:`generated/${fileId}.docx`,pdf:`generated/${fileId}.pdf`,createdAt:new Date().toISOString(),sampleId:d.sampleId,ml:d.sample.ml,draftId:id,resultRevision:d.revision,specificationRevision:d.specification.revision,templateRevision:d.templateRevision,sourceSnapshot:d.sample.source,configurationRevision:d.configurationRevision,sha256:createHash('sha256').update(await readFile(output)).digest('hex'),externalReviewRequired:true,demo};await db.query('INSERT INTO files(id,data) VALUES($1,$2)',[fileId,JSON.stringify(file)]);await audit(actor,'report_generated',fileId,{draftId:id,revision});return file;});}


  export async function deleteDraft(id:string,actor:string){return locked('draft:'+id,async(tx)=>{const d=(await tx.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as any;if(!d)throw new Fault(404,'Draft not found');await tx.query('DELETE FROM draft_revisions WHERE id=$1',[id]);await tx.query('DELETE FROM drafts WHERE id=$1',[id]);const files=(await tx.query("SELECT id, data FROM files WHERE data->>'draftId'=$1",[id])).rows;for(const f of files){await tx.query('DELETE FROM files WHERE id=$1',[f.id]);try{await unlink(privatePath(f.data.path));await unlink(privatePath(f.data.pdf));}catch(e){}}await audit(actor,'draft_deleted',id,{ml:d.sample?.ml});});}
