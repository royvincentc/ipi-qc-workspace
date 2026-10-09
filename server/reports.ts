import {sessionDetailGroups,sharedSessionDetails,editedSessionDetails} from '../shared/environmental-session.js';
import {reportPurpose} from '../shared/report-purpose.js';
import {reportArtifact,retainReportArtifact} from './report-artifacts.js';
import {getConfiguration} from './configuration.js';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,access, unlink} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {db,locked,setting,demo,audit} from './db.js';
import {Fault,hash,latestCriteria,googleId} from './domain.js';
import {defaultConnections,fallbackSpecifications} from './samples.js';
import {readApplicability,readResultsRow,readMicAnalystDetails,rangeValues,ensureDriveFolder,uploadDriveFile} from './google.js';
import {categories,overallAnalystRemarks,reportIssues,resultKey,type Draft,type Sample,type Template,type Specification,type Result,type User,type ReportSetup} from '../shared/model.js';
import {reportRows} from './template.js';
import {environmentalProfiles,resolveEnvironmentalLayout} from './environmental.js';
import {resolveEnvironmentalProfile,environmentalCriteria,environmentalSourceIssue,type EnvironmentalSelection,type EnvironmentalSnapshot} from '../shared/environmental.js';
import {environmentalAreaType} from '../shared/environmental-routing.js';
export const storage=path.resolve(process.env.PRIVATE_STORAGE||'private');
export function privatePath(file:string){const p=path.resolve(storage,file);if(!p.startsWith(storage+path.sep))throw new Fault(400,'Invalid private file path');return p;}
export async function worker(args:string[]){return new Promise<any>((resolve,reject)=>{const proc=spawn(process.env.PYTHON_PATH||'python',[path.resolve('worker/docx_worker.py'),...args],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'Document processing timed out'));},args[0]==='environmental-batch'?900000:120000);proc.stdout.on('data',b=>{out+=b;if(out.length>20_000_000){proc.kill();reject(new Fault(413,'Document inventory is too large'));}});proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'Python document worker is unavailable; configure PYTHON_PATH'));});proc.on('close',code=>{clearTimeout(timer);if(code!==0)return reject(new Fault(422,`Document processing failed: ${err.split('\n').filter(Boolean).at(-1)||'invalid document'}`));try{resolve(JSON.parse(out));}catch{reject(new Fault(500,'Invalid document worker response'));}});});}
async function renderPdf(docx:string,pdf:string){const mode=process.env.PDF_RENDERER||(process.platform==='win32'?'word':'libreoffice');if(mode==='libreoffice'){if(!process.env.SOFFICE_PATH)throw new Fault(503,'Set SOFFICE_PATH for document preview');await new Promise<void>((resolve,reject)=>{const proc=spawn(process.env.SOFFICE_PATH!,['-env:UserInstallation='+pathToFileURL(privatePath('lo-profile-'+path.basename(docx,'.docx'))).href,'--headless','--convert-to','pdf','--outdir',path.dirname(pdf),docx],{windowsHide:true,stdio:['ignore','pipe','pipe']});let err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'LibreOffice preview timed out'));},90000);proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'LibreOffice renderer is unavailable'));});proc.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Fault(503,`LibreOffice preview failed: ${err.slice(-250)}`));});});await access(pdf);return;}
 if(mode!=='word'||process.platform!=='win32')throw new Fault(503,'Configure an available document preview renderer');await new Promise<void>((resolve,reject)=>{const proc=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.resolve('scripts/render-word.ps1'),docx,pdf],{windowsHide:true,stdio:['ignore','pipe','pipe']});let err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'Word preview timed out'));},90000);proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'Microsoft Word renderer is unavailable'));});proc.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Fault(503,`Word preview failed: ${err.slice(-250)}`));});});await access(pdf);}

const normalized=(value:string)=>value.trim().toLocaleLowerCase();
const blockedSourceFields=new Set(['analysisDate','releaseDate','analyzedBy','readBy','receivedBy','status','remarks','overallRemarks','analyst','reviewedBy','approvedBy','signature','type']);
function reportFieldDefaults(sample:Sample,template:Template){
 const keys=[...new Set([...(template.manifest.requiredFields||[]) as string[],...(template.manifest.tokens||[]) as string[]])];
 const aliases:Record<string,string[]>={'date.mfd':['manufactureDate','dateMfd'],'exp.date':['expiryDate','expDate'],'fill.vol':['fillVolume','fillVolWt','fillVol'],'requested.by':['requestedBy'],'batch.size':['batchSize','batchLotSize','lotSize'],'page':['pageNumber','page'],'mic':['mic'],'purpose':['purpose','type','Type']};
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
 templates=templates.filter(t=>t.active!==false&&t.verified);
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
 return template.active!==false&&template.verified;
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
// The miscellaneous logger uses the short name; the applicability sheet uses
// the branded name. Keep this equivalence specific to balls, not rolls or buds.
function isCottonBalls(value:string){
 const name=tokenize(value).join(' ');
 return ['cotton balls','mama s love absorbent cotton balls','mama s love cotton balls'].includes(name);
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
    // An exact managed name must not override the logger's controlled variant.
    if(sampleName&&!sameSpecificationVariant(normalizeSampleName(sampleName),normalizeSampleName(row.product)))continue;
    
    // First try exact or alias match (case insensitive)
    const exactMatch = [product.name, ...product.aliases].some(name => row.product.toLowerCase() === name.toLowerCase());
    const cottonMatch = isCottonBalls(row.product) && isCottonBalls(sampleName || product.name);
    if (exactMatch || cottonMatch) {
      if(bestScore!==Number.MAX_SAFE_INTEGER)bestRows.length=0;
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
 const productKey=normalized(product);const historicalNames=Object.keys(HISTORICAL_LIMITS).sort((a,b)=>b.length-a.length);const key=isCottonBalls(product)?"Mama's Love Cotton":historicalNames.find(name=>productKey===normalized(name))||historicalNames.find(name=>productKey.includes(normalized(name)));
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


export async function resolveReportSetup(sampleId:string,selection:EnvironmentalSelection={},preview=false):Promise<ReportSetup>{
 const sample=(await db.query('SELECT data FROM samples WHERE id=$1',[sampleId])).rows[0]?.data as Sample|undefined;
 if(!sample)throw new Fault(404,'Sample not found');
 const managed=await getConfiguration();const type=managed.value.sampleTypes.find(t=>t.id===sample.category&&t.active);
 if(type?.register!=='environmental'&&normalized(sample.categoryLabel||categories[sample.category]||'')==='environmental monitoring')throw new Fault(409,'The displayed Environmental Monitoring category is mapped to an incoming sample type. Correct the category/source mapping in Settings → Sample types.');
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
 if(type.register==='environmental'){
  const templates=(await db.query('SELECT data FROM templates')).rows.map(r=>r.data as Template);
  const profiles=await environmentalProfiles();
  const environmental=resolveEnvironmentalProfile(sample,product.id,profiles,templates,selection);
  const legacy=specifications.filter(s=>s.product===product.name&&s.category===sample.category&&normalized(s.context)===normalized(sample.context));
  const snapshot=environmental.snapshot;
  const tests=snapshot?environmentalCriteria(snapshot.profile,snapshot.output):legacy.length?latestCriteria(legacy,product.name,sample.category,sample.context,[...new Set(legacy.flatMap(s=>s.tests.map(t=>t.test)))]):[];
  const specification:Specification={id:snapshot?snapshot.profile.id:legacy[0]?.id||'environmental-unresolved',product:product.name,category:sample.category,context:sample.context,revision:hash(tests),tests,issues:[],source:snapshot?snapshot.profile.evidenceIds.join(', '):legacy[0]?.source||''};
  let template=snapshot&&environmental.resolution.status==='ready'?templates.find(t=>t.id===snapshot.output.templateId):undefined;
  let resolution=environmental.resolution;
  if(!profiles.some(p=>p.active&&p.productId===product.id)&&tests.length&&!environmentalSourceIssue(sample)){
   const routed=resolveEnvironmentalLayout(sample,templates,tests);template=routed.template;resolution=routed.resolution;
  }
  if(!preview&&(!template||resolution.status!=='ready'))throw new Fault(409,resolution.message);
  const safe=template?(({path:_path,...rest})=>rest)(template):undefined;
  return {sample,specification,template:safe,applicableTests:tests.map(t=>t.label),prefilledFields:template?reportFieldDefaults(sample,template):{},layoutResolution:resolution,environmental:{...environmental,resolution}};
 }
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

/** Read-only workflow preview; never creates a report draft or writes results. */
export async function resolveSampleWorkflow(sampleId:string,selection:EnvironmentalSelection={}){
 const setup=await resolveReportSetup(sampleId,selection,true);
 const config=await setting('connections',defaultConnections);
 const source=!setup.environmental&&!demo&&config.specifications?await optionalResultsRow(config.specifications,setup.sample.category,setup.sample.ml):undefined;
 const results=setup.specification.tests.map(test=>{
   const value=String(source?.tests[test.test]?.value??'').trim();
   return {test:test.test,location:test.location,stage:test.stage,replicate:test.replicate,channel:test.channel,instanceId:test.instanceId,block:test.block,state:value?'entered':'not_entered',value,sourceValue:value||undefined,qualifier:'',unit:test.unit,reason:'',remarks:''};
 });
 return {...setup,results,resultLookup:source?'matched':'not_found'};
}

export async function createAutomaticDraft(sampleId:string,actor:User,selection:EnvironmentalSelection={}){
 const setup=await resolveReportSetup(sampleId,selection);
 if(!setup.template)throw new Fault(409,setup.layoutResolution?.message||'No compatible template');
 const pair=setup.environmental?.pairedOutputs,snapshot=setup.environmental?.snapshot;
 if(!pair?.length||!snapshot)return createDraft(sampleId,setup.specification.id,setup.template.id,actor,setup.specification,snapshot);
 // Prepare both outputs before persisting either. A failed companion cannot leave a half-created session.
 const drafts:Draft[]=[];
 for(const output of pair){
  const tests=environmentalCriteria(snapshot.profile,output);
  const specification={...setup.specification,tests,revision:hash(tests)};
  drafts.push(await createDraft(sampleId,specification.id,output.templateId,actor,specification,{...snapshot,output},false));
 }
 const session={id:randomUUID(),members:drafts.map(d=>({draftId:d.id,outputId:d.environmentalSnapshot!.output.id,name:d.environmentalSnapshot!.output.method==='accupoint'?'Accupoint':'SPCMY',method:d.environmentalSnapshot!.output.method}))};
 for(const draft of drafts)draft.environmentalSession=session;
 await locked('environmental-session:'+session.id,async tx=>{
  await tx.query('BEGIN');try{
   for(const draft of drafts){
    await tx.query('INSERT INTO drafts(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);
    await tx.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);
   }
   await tx.query('INSERT INTO audit(id,actor,action,entity,details) VALUES($1,$2,$3,$4,$5)',[randomUUID(),actor.email,'environmental_session_drafts_created',session.id,JSON.stringify({sampleId,members:session.members})]);
   await tx.query('COMMIT');
  }catch(error){await tx.query('ROLLBACK');throw error;}
 });
 return drafts.find(d=>d.environmentalSnapshot!.output.id===snapshot.output.id)!;
}
async function optionalResultsRow(url:string,category:string,ml:string){
 try{return await readResultsRow(url,category,ml);}
 catch(error){
  // A logged sample may not have been analyzed yet. In that case create the
  // draft with empty result fields; all other Results workbook errors remain fatal.
  if(error instanceof Fault&&error.status===404&&error.message.includes('no Results row matches'))return undefined;
  throw error;
 }
}
export async function createDraft(sampleId:string,specId:string,templateId:string,actor:User,injectedSpec?:import('../shared/model.js').Specification,environmentalSnapshot?:EnvironmentalSnapshot,persist=true){const sample=(await db.query('SELECT data FROM samples WHERE id=$1',[sampleId])).rows[0]?.data as Sample;let template=(await db.query('SELECT data FROM templates WHERE id=$1',[templateId])).rows[0]?.data as Template;const candidate=injectedSpec||(await db.query('SELECT data FROM specifications WHERE id=$1',[specId])).rows[0]?.data as Specification;if(!sample||!template||!candidate)throw new Fault(404,'Sample, specification or template not found');if(environmentalSnapshot&&(sample.source.fingerprint!==environmentalSnapshot.sourceFingerprint||template.revision!==environmentalSnapshot.output.templateRevision||template.active===false))throw new Fault(409,'Source activity or report layout changed during setup. Reload before creating the draft.');const environmentalType=(await getConfiguration()).value.sampleTypes.some(t=>t.id===sample.category&&t.register==='environmental');const routed=environmentalType?undefined:await routedTemplate(sample,[],(await db.query('SELECT data FROM templates')).rows.map(row=>row.data as Template));if(routed)template=routed;if(candidate.active===false)throw new Fault(409,'This specification is inactive. Select its current revision.');if(candidate.category!==sample.category)throw new Fault(409,'Specification category does not match sample category');
 const managed=await getConfiguration();const type=managed.value.sampleTypes.find(t=>t.id===sample.category);if(!type)throw new Fault(409,'Sample type is not configured');const productIsActive=managed.value.products.some(p=>p.active&&p.name===candidate.product&&(p.category===sample.category||(['ST','SFG'].includes(sample.category)&&p.category==='FG')));if(!productIsActive)throw new Fault(409,'This product is not active in Products / materials. Ask an administrator to review it.');const config=await setting('connections',defaultConnections);const applicability=demo?await setting<any[]>('applicability',[]):undefined;const prodObj=managed.value.products.find(p=>p.name===candidate.product&&(p.category===sample.category||(['ST','SFG'].includes(sample.category)&&p.category==='FG')))||{name:candidate.product,aliases:[]};const applicabilitySheet=['ST','SFG'].includes(sample.category)?(managed.value.sampleTypes.find(t=>t.id==='FG')?.applicabilitySheet||type.applicabilitySheet):type.applicabilitySheet;
 const matches=type.register==='environmental'?[{tests:candidate.tests.map(t=>t.test)}]:type.applicability==='managed'?[{tests:candidate.tests.map(t=>t.test)}]:demo?resolveApplicabilityMatches(applicability||[],prodObj,applicabilitySheet,sample.name):await resolveApplicabilityFromSources(config.specifications||defaultConnections.specifications,prodObj,applicabilitySheet,sample.name);if(matches.length!==1||!matches[0].tests.length)throw new Fault(409,'Product applicability is missing, ambiguous or all false');
 const all=(await db.query('SELECT data FROM specifications')).rows.map(x=>x.data as Specification);const tests=injectedSpec?injectedSpec.tests:latestCriteria(all.filter(s=>s.active!==false),candidate.product,sample.category,candidate.context,matches[0].tests);if(candidate.issues.length)throw new Fault(409,candidate.issues.join('; '));
  if(tests.some((t: any)=>!managed.value.tests.some(x=>x.id===t.test&&x.active&&(x.categories.includes(sample.category) || (['ST', 'SFG'].includes(sample.category) && x.categories.includes('FG'))))))throw new Fault(409,'An applicable checklist test is inactive or unavailable for this sample type. Ask an administrator to review the specification.');const spec={...candidate,tests,revision:hash(tests)};const now=new Date().toISOString();const resultSource=type.register!=='environmental'&&!demo&&config.specifications?await optionalResultsRow(config.specifications,sample.category,sample.ml):undefined;const analystInput=firstText(sample.fields.analyzedBy,sample.fields.analyst,resultSource?.analyst,actor.name);const analystDetails=analystInput?await resolveAnalystDetails(config.specifications||defaultConnections.specifications,analystInput):{analyst:'',mic:''};const reportAnalyst=firstText(analystDetails.analyst,analystInput);const templateTokens=(template.manifest.tokens as string[]||[]);const templateRequiredFields=(template.manifest.requiredFields as string[]||[]);const needsMic=templateTokens.includes('mic')||templateRequiredFields.includes('mic');const mic=firstText(needsMic&&!demo?analystDetails.mic:'',sample.fields.mic);const analysisDate=firstText(sample.fields.analysisDate,sample.fields.dateAnalyze,sample.fields.dateAnalyzed);const importedResults=tests.map(t=>{const item=resultSource?.tests[t.test],raw=String(item?.value??'').trim();return {test:t.test,location:t.location,stage:t.stage,replicate:t.replicate,channel:t.channel,instanceId:t.instanceId,block:t.block,state:raw?'entered':'not_entered',value:raw,sourceValue:raw||undefined,sourceHeader:String(item?.header??'')||undefined,qualifier:'',unit:t.unit,reason:'',remarks:''} as Result;});const draft:Draft={configurationRevision:managed.revision,configurationSnapshot:structuredClone(managed.value),templateSnapshot:structuredClone(template),environmentalSnapshot:environmentalSnapshot?structuredClone(environmentalSnapshot):undefined,id:randomUUID(),sampleId,sample:structuredClone(sample),specification:spec,templateId:template.id,templateRevision:template.revision,revision:1,results:importedResults,resultLookup:demo?'demo':resultSource?'matched':'not_found',resultSource:resultSource?{spreadsheetId:resultSource.spreadsheetId,url:resultSource.url,sheetId:resultSource.sheetId,sheet:resultSource.sheet,row:resultSource.row,range:resultSource.range,fingerprint:resultSource.fingerprint,observedAt:resultSource.observedAt,ml:resultSource.ml,raw:resultSource.raw,remarks:resultSource.remarks,analyst:resultSource.analyst}:undefined,fields:{...reportFieldDefaults(sample,template),analysisDate,analyst:reportAnalyst,mic,micAnalyst:reportAnalyst},updatedAt:now,analyst:actor.email};reportRows(draft,template);
 if(!persist)return draft;
 await db.query('INSERT INTO drafts(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);await db.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);await audit(actor.email,'draft_created',draft.id,{sampleId,specificationRevision:spec.revision,templateRevision:template.revision});return draft;
}
export async function saveDraft(id:string,expected:number,results:Result[],fields:Record<string,string>,actor:string){
 const initial=await getDraft(id),ids=(initial.environmentalSession?.members.map(m=>m.draftId)||[id]).sort();
 return locked('draft:'+ids[0],async(tx)=>{
  if(!demo&&ids.length>1)await tx.query('SELECT pg_advisory_lock(hashtext($1))',['draft:'+ids[1]]);
  try{const companions=initial.environmentalSession?await environmentalSessionDrafts(id,false):[];
const old=(await tx.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as Draft;if(!old)throw new Fault(404,'Draft not found');if(old.revision!==expected)throw new Fault(409,'This draft changed in another session. Reload before saving.');if(Object.keys(fields).some(k=>k.startsWith('sample.')||k.startsWith('result.')||k.startsWith('report.')||k==='releaseDate'))throw new Fault(400,'Source identifiers, report settings and approval dates cannot be edited in result fields');const keys=old.results.map(resultKey);if(results.length!==keys.length||new Set(results.map(resultKey)).size!==keys.length||results.some(r=>!keys.includes(resultKey(r))))throw new Fault(400,'Result test instances cannot be replaced');const preservedResults=results.map(r=>{const original=old.results.find(x=>resultKey(x)===resultKey(r));if(original&&['test','location','stage','replicate','channel','block'].some(k=>(r as any)[k]!== (original as any)[k]))throw new Fault(400,'Result sampling locations and test identities cannot be changed');return {...r,sourceValue:original?.sourceValue,sourceHeader:original?.sourceHeader};});const shared=companions.length?editedSessionDetails(sharedSessionDetails(companions),fields):editedSessionDetails(sharedSessionDetails([old]),fields);const nextFields={...fields,...shared};const overall=overallAnalystRemarks({...old,results:preservedResults});if(overall!==undefined){nextFields.overallRemarks=overall;nextFields['overall.remarks']=overall;}const analystInput=firstText(old.sample.fields.analyzedBy,old.sample.fields.analyst,old.resultSource?.analyst,nextFields.analyst,nextFields.micAnalyst);if(analystInput){const connections=await setting('connections',defaultConnections);const details=await resolveAnalystDetails(connections.specifications||defaultConnections.specifications,analystInput);nextFields.analyst=firstText(details.analyst,analystInput);nextFields.mic=firstText(details.mic,nextFields.mic);nextFields.micAnalyst=nextFields.analyst;}const d={...old,results:preservedResults,fields:nextFields,revision:old.revision+1,analyst:actor,updatedAt:new Date().toISOString()};const templates=(await tx.query('SELECT data FROM templates')).rows.map(row=>row.data as Template);const isEnvironmental=d.configurationSnapshot?.sampleTypes.some(t=>t.id===d.sample.category&&t.register==='environmental');const routed=isEnvironmental?undefined:await routedTemplate(d.sample,d.results,templates);if(routed){d.templateId=routed.id;d.templateRevision=routed.revision;d.templateSnapshot=structuredClone(routed);}await tx.query('BEGIN');try{await tx.query('UPDATE drafts SET revision=$1,data=$2 WHERE id=$3',[d.revision,JSON.stringify(d),id]);await tx.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,$2,$3)',[id,d.revision,JSON.stringify(d)]);for(const companion of companions.filter(c=>c.id!==id)){
 const companionFields={...companion.fields,...shared};
 if(JSON.stringify(companionFields)===JSON.stringify(companion.fields))continue;
 const next={...companion,fields:companionFields,revision:companion.revision+1,analyst:actor,updatedAt:d.updatedAt};
 await tx.query('UPDATE drafts SET revision=$1,data=$2 WHERE id=$3',[next.revision,JSON.stringify(next),next.id]);
 await tx.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,$2,$3)',[next.id,next.revision,JSON.stringify(next)]);
 }await tx.query('COMMIT');}catch(e){await tx.query('ROLLBACK');throw e;}await audit(actor,'draft_saved',id,{revision:d.revision,templateId:d.templateId,templateRevision:d.templateRevision});return d;}finally{if(!demo&&ids.length>1)await tx.query('SELECT pg_advisory_unlock(hashtext($1))',['draft:'+ids[1]]);}});}
function firstText(...values:unknown[]){return values.map(value=>String(value??'').trim()).find(Boolean)||'';}
async function resolveAnalystDetails(spreadsheetUrl:string,analysts:string){return demo?{analyst:analysts,mic:''}:readMicAnalystDetails(spreadsheetUrl,analysts);}
function formatReportDate(value:unknown,includeTime=false){
 const text=firstText(value);if(!text)return '';
 const monthOnly=text.match(/^(\d{1,2})\/(\d{4})$/);if(monthOnly)return `${monthOnly[1].padStart(2,'0')}/${monthOnly[2]}`;
 const match=text.match(/^(?:(\d{4})[/-](\d{1,2})[/-](\d{1,2})|(\d{1,2})[/-](\d{1,2})[/-](\d{4}))(.*)$/);
 if(!match)return text;
 const year=Number(match[1]||match[6]),month=Number(match[2]||match[4]),day=Number(match[3]||match[5]);
 const date=new Date(Date.UTC(year,month-1,day));
 if(date.getUTCFullYear()!==year||date.getUTCMonth()!==month-1||date.getUTCDate()!==day)return text;
 const formatted=`${String(month).padStart(2,'0')}/${String(day).padStart(2,'0')}/${year}`;
 return formatted+(includeTime?(match[7]||'').replace(/^T/,' '):'');
}
export function temperatureDisplay(value:string){const text=value.trim();return text&&!/°\s*C$/i.test(text)?text+' °C':text;}
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
 if(d.configurationSnapshot?.sampleTypes?.some(type=>type.id===d.sample.category&&type.register==='environmental')){
  fields['overall.remarks']=manual.overallRemarks||'';fields.overallRemarks=manual.overallRemarks||'';
  fields.releaseDate=`${releaseDate} @ ${releaseTime}`;fields['sample.released']=fields.releaseDate;fields['d.release']=releaseDate;fields['t.release']=releaseTime;
  fields.area=sourceFields.area||'';fields.facility=sourceFields.facility||'';fields.type=d.environmentalSnapshot?.profile.areaType||'';
  fields.temperature=temperatureDisplay(manual.temperature||'');fields.relativeHumidity=manual.relativeHumidity||'';
 }
 // Populate canonical metadata and legacy aliases with the same resolved value.
 const metadataAliases:Record<string,string[]>={manufactureDate:['date.mfd','manufactureDate','dateMfd'],expiryDate:['exp.date','expiryDate','expDate'],fillVolume:['fill.vol','fillVolume','fillVolWt','fillVol'],batchSize:['batch.size','batchSize','batchLotSize','lotSize'],requestedBy:['requested.by','requestedBy'],purpose:['purpose'],logbookReference:['logbookReference','logbook'],mic:['mic'],page:['page','pageNumber']};
 for(const [key,aliases] of Object.entries(metadataAliases)){
  let value=aliases.some(alias=>Object.prototype.hasOwnProperty.call(manual,alias))?firstText(...aliases.map(alias=>manual[alias])):firstText(...aliases.map(alias=>sourceFields[alias]));
  if(['manufactureDate','expiryDate'].includes(key))value=formatReportDate(value);
  if(key==='logbookReference')value=logbook;if(key==='page')value=page;if(key==='mic')value=mic;
  for(const alias of aliases)fields[alias]=value;
 }
 const overall=overallAnalystRemarks(d);if(overall!==undefined){fields.overallRemarks=overall;fields['overall.remarks']=overall;}
 if(['SFG','FG','ST','MIS'].includes(d.sample.category)){
  fields.purpose=reportPurpose(d.sample,manual);
  fields.type=fields.purpose;
 }
 return fields;
}
export async function inspectReportDetails(id:string){
 const d=await getDraft(id);
 const t=d.templateSnapshot||(await db.query('SELECT data FROM templates WHERE id=$1',[d.templateId])).rows[0]?.data as Template;
 if(!t||t.revision!==d.templateRevision)throw new Fault(409,'Report layout revision changed; create a new draft.');
 await mkdir(privatePath('report-inspections'),{recursive:true});
 const payload=privatePath('report-inspections/'+randomUUID()+'.json');
 try{const fields=reportTemplateFields(d,t);await writeFile(payload,JSON.stringify({fields,persistentDetails:!!d.environmentalSession||['SFG','FG','ST','MIS'].includes(d.sample.category),editableType:['SFG','FG','ST','MIS'].includes(d.sample.category)}));return await worker(['report-details','--input',privatePath(t.path),'--payload',payload]);}
 finally{await unlink(payload).catch(()=>{});}
}
async function environmentalSessionDrafts(id:string,share=true):Promise<Draft[]>{
 const draft=(await db.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as Draft;
 if(!draft)throw new Fault(404,'Draft not found');
 const session=draft.environmentalSession;
 if(!session||session.members.length!==2||new Set(session.members.map(m=>m.draftId)).size!==2||!session.members.some(m=>m.draftId===id))throw new Fault(409,'This draft has no paired surface-swab session. Create a new draft from a pattern containing Accupoint and SPCMY.');
 const rows=(await db.query('SELECT data FROM drafts WHERE id=ANY($1::text[])',[session.members.map(m=>m.draftId)])).rows;
 const drafts=session.members.map(member=>rows.find(row=>row.data.id===member.draftId)?.data as Draft|undefined);
 if(drafts.some(d=>!d||d.sampleId!==draft.sampleId||d.sample.source.fingerprint!==draft.sample.source.fingerprint||d.environmentalSession?.id!==session.id||JSON.stringify(d.environmentalSession.members)!==JSON.stringify(session.members)||d.environmentalSnapshot?.profile.revision!==draft.environmentalSnapshot?.profile.revision||d.environmentalSnapshot?.output.mode!=='surface'))throw new Fault(409,'A companion draft is missing or does not match this swabbing session. Create a new paired session.');
 const complete=drafts as Draft[];
 if(new Set(complete.map(d=>d.environmentalSnapshot?.output.method)).size!==2||!complete.some(d=>d.environmentalSnapshot?.output.method==='accupoint')||!complete.some(d=>d.environmentalSnapshot?.output.method==='spc-my'))throw new Fault(409,'Both Accupoint and SPCMY are required for this surface-swab session.');
 const fields=sharedSessionDetails(complete);
 return share?complete.map(d=>({...d,fields:{...d.fields,...fields}})):complete;
}
export async function getDraft(id:string):Promise<Draft>{
 const draft=(await db.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as Draft;
 if(!draft)throw new Fault(404,'Draft not found');
 return draft.environmentalSession?(await environmentalSessionDrafts(id)).find(d=>d.id===id)!:draft;
}
export async function environmentalSessionReview(id:string){
 const drafts=await environmentalSessionDrafts(id);
 return {id:drafts[0].environmentalSession!.id,members:drafts.map(d=>({draftId:d.id,name:d.environmentalSnapshot!.output.method==='accupoint'?'Accupoint':'SPCMY',method:d.environmentalSnapshot!.output.method,revision:d.revision,issues:reportIssues(d)}))};
}
export async function generateEnvironmentalSession(id:string,revisions:Record<string,number>,actor:string){
 const initial=await environmentalSessionDrafts(id),ids=initial.map(d=>d.id).sort();
 if(Object.keys(revisions).length!==ids.length||ids.some(key=>!Number.isInteger(revisions[key])))throw new Fault(400,'Review both draft revisions before generating the session reports.');
 // One global demo lock; on PostgreSQL acquire both draft locks in a stable order.
 return locked('draft:'+ids[0],async tx=>{
  if(!demo)await tx.query('SELECT pg_advisory_lock(hashtext($1))',['draft:'+ids[1]]);
  try{
   const drafts=await environmentalSessionDrafts(id);
   for(const draft of drafts){
    const name=draft.environmentalSnapshot!.output.method==='accupoint'?'Accupoint':'SPCMY';
    if(draft.revision!==revisions[draft.id])throw new Fault(409,`${name} changed. Review both current drafts before generation.`);
    const issues=reportIssues(draft);
    if(issues.length)throw new Fault(422,`${name}: ${issues.join('; ')}`);
   }
   const files:any[]=[],errors:string[]=[];
   for(const draft of drafts){
    try{const file=await generateReport(draft.id,draft.revision,actor);files.push(file);if(!file.pdf)errors.push(`${draft.environmentalSnapshot!.output.name}: ${file.previewError}`);}
    catch(error){errors.push(`${draft.environmentalSnapshot!.output.name}: ${(error as Error).message}`);}
   }
   const complete=files.length===2&&errors.length===0;
   await audit(actor,'environmental_session_reports_generated',drafts[0].environmentalSession!.id,{revisions,fileIds:files.map(f=>f.id),complete,errors});
   return {sessionId:drafts[0].environmentalSession!.id,complete,files,errors};
  }finally{if(!demo)await tx.query('SELECT pg_advisory_unlock(hashtext($1))',['draft:'+ids[1]]);}
 });
}
async function syncReportToDrive(file:any,actor:string){const connections=await setting('connections',defaultConnections);if(!connections.reportFolder)throw new Fault(409,'Ask an administrator to configure the report archive in Settings → Connections');const email=String(file.analystEmail||actor).toLowerCase();const user=(await db.query('SELECT name FROM users WHERE email=$1',[email])).rows[0];const analyst=String(file.analystName||user?.name||email).replace(/[\\/:*?"<>|]+/g,'-').trim()||email;const root=googleId(connections.reportFolder,'folder');let folder=await ensureDriveFolder(root,`${analyst} (${email})`);const date=new Date(file.createdAt),zone=(await getConfiguration()).value.general.timezone||'Asia/Manila';const parts=new Intl.DateTimeFormat('en',{timeZone:zone,year:'numeric',month:'2-digit'}).formatToParts(date);folder=await ensureDriveFolder(folder,parts.find(p=>p.type==='year')!.value);folder=await ensureDriveFolder(folder,parts.find(p=>p.type==='month')!.value);const uploaded=await uploadDriveFile(folder,file.name,()=>reportArtifact(file,'docx',privatePath(file.path)),file.id);const synced={...file,driveId:uploaded.id,sourceUrl:uploaded.webViewLink||`https://drive.google.com/file/d/${uploaded.id}/view`,driveFolderId:folder,driveSyncedAt:new Date().toISOString(),driveSyncError:undefined};await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(synced),file.id]);await audit(actor,'report_synced_to_drive',file.id,{driveId:uploaded.id,folderId:folder,analyst:email});return synced;}
export async function retryReportDriveSync(id:string,actor:string){if(demo)throw new Fault(409,'Google Drive sync is unavailable in the de-identified demo');const row=(await db.query('SELECT data FROM files WHERE id=$1',[id])).rows[0];if(!row||row.data.kind!=='report')throw new Fault(404,'Generated report not found');if(row.data.driveId)return row.data;const connections=await setting('connections',defaultConnections);if(!connections.reportFolder)throw new Fault(409,'Ask an administrator to configure the report archive in Settings → Connections');const file={...row.data,analystEmail:row.data.analystEmail||actor};try{return await syncReportToDrive(file,actor);}catch(e:any){const next={...file,driveSyncError:String(e.message||e)};await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(next),id]);throw e;}}
export async function generate(id:string,revision:number,actor:string){return locked('draft:'+id,()=>generateReport(id,revision,actor));}
async function generateReport(id:string,revision:number,actor:string){
 const d=await getDraft(id);if(d.revision!==revision)throw new Fault(409,'Save and review the latest draft before generation');const t=d.templateSnapshot||(await db.query('SELECT data FROM templates WHERE id=$1',[d.templateId])).rows[0]?.data as Template;if(!t||t.revision!==d.templateRevision)throw new Fault(409,'Template revision changed; create a new draft with the current registered template');
 let sourceChanged=false;if(!demo){const source=d.sample.source;const live=await rangeValues(source.spreadsheetId,source.sheet,source.range);sourceChanged=hash(Array.from({length:source.raw.length},(_,i)=>live[i]??''))!==source.fingerprint;if(d.resultSource){const result=await optionalResultsRow(d.resultSource.url,d.sample.category,d.sample.ml);if(result&&result.fingerprint!==d.resultSource.fingerprint)throw new Fault(409,'The matching Results row changed; create a new draft to capture its current values');}}
 const analystInput=firstText(d.sample.fields.analyzedBy,d.sample.fields.analyst,d.resultSource?.analyst,d.fields.analyst,d.fields.micAnalyst);const connections=await setting('connections',defaultConnections);const analystDetails=analystInput?await resolveAnalystDetails(connections.specifications||defaultConnections.specifications,analystInput):{analyst:'',mic:''};const reportAnalyst=firstText(analystDetails.analyst,analystInput);const tokens=(t.manifest.tokens||[]) as string[],required=(t.manifest.requiredFields||[]) as string[];const needsMic=tokens.includes('mic')||required.includes('mic');const renderDraft={...d,fields:{...d.fields,analyst:reportAnalyst,mic:firstText(needsMic&&!demo?analystDetails.mic:'',d.fields.mic,d.sample.fields.mic)}};
 const sessionDetailsFingerprint=hash(d.environmentalSession?sharedSessionDetails([d]):{});
 const existing=(await db.query("SELECT data FROM files WHERE data->>'renderContractRevision'='report-purpose-v4' AND data->>'sessionDetailsFingerprint'=$5 AND data->>'draftId'=$1 AND data->>'resultRevision'=$2 AND data->>'templateRevision'=$3 AND data->>'reportAnalyst'=$4 ORDER BY created_at DESC LIMIT 1",[id,String(revision),d.templateRevision,reportAnalyst,sessionDetailsFingerprint])).rows[0]?.data;if(existing){try{await reportArtifact(existing,'docx',privatePath(existing.path));if(existing.pdf)await reportArtifact(existing,'pdf',privatePath(existing.pdf));let result=sourceChanged?{...existing,sourceChanged:true}:existing;if(!demo&&connections.reportFolder&&!result.driveId){try{result=await syncReportToDrive({...result,analystEmail:result.analystEmail||actor},actor);}catch(e:any){result={...result,driveSyncError:String(e.message||e)};await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(result),result.id]);}}return result;}catch{await audit(actor,'report_artifact_unavailable',existing.id,{draftId:id});}}
 if(renderDraft.environmentalSnapshot&&!renderDraft.environmentalSnapshot.profile.areaType){
  const sources=[...new Set(renderDraft.environmentalSnapshot.output.instances.map(i=>i.source))];
  const descriptions=new Set<string>();
  const batches=(await db.query("SELECT data FROM files WHERE data->>'kind'='environmental-import'")).rows;
  for(const batch of batches)for(const candidate of batch.data.candidates||[])if(sources.includes(candidate.referenceId))for(const evidence of candidate.evidence||[]){const value=environmentalAreaType(evidence.area||'');if(value)descriptions.add(value);}
  if(descriptions.size>1)throw new Fault(422,'The selected sampling pattern has conflicting parenthetical Area types. Review its source documents before generating this report.');
  renderDraft.environmentalSnapshot={...renderDraft.environmentalSnapshot,profile:{...renderDraft.environmentalSnapshot.profile,areaType:[...descriptions][0]||''}};
 }
 const fileId=randomUUID();await mkdir(privatePath('generated'),{recursive:true});const output=privatePath(`generated/${fileId}.docx`),payloadPath=privatePath(`generated/${fileId}.json`);const fields=reportTemplateFields(renderDraft,t);
 const rows=reportRows(renderDraft,t).map(({index,...row})=>{for(const [k,v]of Object.entries(row))fields[`result.${index}.${k}`]=String(v??'');return row;});
 await writeFile(payloadPath,JSON.stringify({fields,rows,blocks:Object.fromEntries([...new Set(rows.map(r=>r.block||'tests'))].map(block=>[block,rows.filter(r=>(r.block||'tests')===block)])),renderOptions:{environmental:!!d.environmentalSnapshot,rowGrouping:(t.manifest as any).rowGrouping,blocks:t.manifest.blocks,adaptiveBlocks:t.manifest.adaptiveBlocks===true},reportSettings:d.configurationSnapshot?.reports}));let renderTemplate=privatePath(t.path);if(d.environmentalSnapshot){renderTemplate=privatePath(`generated/${fileId}-layout.docx`);await worker(['environmental-layout','--input',privatePath(t.path),'--output',renderTemplate,'--family',t.family]);}const args=['generate','--input',renderTemplate,'--payload',payloadPath,'--output',output];await worker(args);const pdf=privatePath(`generated/${fileId}.pdf`);let previewError:string|undefined;try{await renderPdf(output,pdf);}catch(error){if(!d.configurationSnapshot?.sampleTypes?.some(type=>type.id===d.sample.category&&type.register==='environmental'))throw error;previewError='PDF preview is unavailable. Configure Microsoft Word or LibreOffice on the report server, then generate again. The DOCX is available for review.';}const actorRecord=(await db.query('SELECT name FROM users WHERE email=$1',[actor])).rows[0];let file:any={renderContractRevision:'report-purpose-v4',sessionDetailsFingerprint,id:fileId,name:`${d.sample.batch||'Unknown'} - ${d.sample.name||'Unknown'}${d.environmentalSnapshot?' - '+d.environmentalSnapshot.output.name:''}.docx`.replace(/[<>:"/\\|?*]+/g, '_'),kind:'report',path:`generated/${fileId}.docx`,pdf:previewError?undefined:`generated/${fileId}.pdf`,previewError,createdAt:new Date().toISOString(),sampleId:d.sampleId,ml:d.sample.ml,draftId:id,resultRevision:d.revision,specificationRevision:d.specification.revision,templateRevision:d.templateRevision,reportAnalyst,sourceSnapshot:d.sample.source,sourceChanged,configurationRevision:d.configurationRevision,sha256:createHash('sha256').update(await readFile(output)).digest('hex'),externalReviewRequired:true,environmentalSessionId:d.environmentalSession?.id,monitoringMethod:d.environmentalSnapshot?.output.method,demo,analystEmail:actor,analystName:actorRecord?.name||actor};await db.query('INSERT INTO files(id,data) VALUES($1,$2)',[fileId,JSON.stringify(file)]);await retainReportArtifact(fileId,'docx',await readFile(output));if(!previewError)await retainReportArtifact(fileId,'pdf',await readFile(pdf));await audit(actor,'report_generated',fileId,{draftId:id,revision,reportAnalyst});if(!demo&&connections.reportFolder){try{file=await syncReportToDrive(file,actor);}catch(e:any){file.driveSyncError=String(e.message||e);await db.query('UPDATE files SET data=$1 WHERE id=$2',[JSON.stringify(file),fileId]);await audit(actor,'report_drive_sync_failed',fileId,{message:file.driveSyncError});}}return file;}


  export async function deleteDraft(id:string,actor:string){return locked('draft:'+id,async(tx)=>{const d=(await tx.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as any;if(!d)throw new Fault(404,'Draft not found');await tx.query('DELETE FROM draft_revisions WHERE id=$1',[id]);await tx.query('DELETE FROM drafts WHERE id=$1',[id]);const files=(await tx.query("SELECT id, data FROM files WHERE data->>'draftId'=$1",[id])).rows;for(const f of files){await tx.query('DELETE FROM files WHERE id=$1',[f.id]);try{await unlink(privatePath(f.data.path));await unlink(privatePath(f.data.pdf));}catch(e){}}await audit(actor,'draft_deleted',id,{ml:d.sample?.ml});});}
