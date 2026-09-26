import {getConfiguration} from './configuration.js';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,access} from 'node:fs/promises';
import {spawn} from 'node:child_process';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {db,locked,setting,demo,audit} from './db.js';
import {Fault,hash,latestCriteria} from './domain.js';
import {defaultConnections} from './samples.js';
import {readApplicability,rangeValues} from './google.js';
import {categories,reportIssues,resultKey,type Draft,type Sample,type Template,type Specification,type Result,type User,type ReportSetup} from '../shared/model.js';
import {reportRows} from './template.js';
export const storage=path.resolve(process.env.PRIVATE_STORAGE||'private');
export function privatePath(file:string){const p=path.resolve(storage,file);if(!p.startsWith(storage+path.sep))throw new Fault(400,'Invalid private file path');return p;}
export async function worker(args:string[]){return new Promise<any>((resolve,reject)=>{const proc=spawn(process.env.PYTHON_PATH||'python',[path.resolve('worker/docx_worker.py'),...args],{windowsHide:true,env:{...process.env,PYTHONIOENCODING:'utf-8'},stdio:['ignore','pipe','pipe']});let out='',err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'Document processing timed out'));},120000);proc.stdout.on('data',b=>{out+=b;if(out.length>20_000_000){proc.kill();reject(new Fault(413,'Document inventory is too large'));}});proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'Python document worker is unavailable; configure PYTHON_PATH'));});proc.on('close',code=>{clearTimeout(timer);if(code!==0)return reject(new Fault(422,`Document processing failed: ${err.split('\n').filter(Boolean).at(-1)||'invalid document'}`));try{resolve(JSON.parse(out));}catch{reject(new Fault(500,'Invalid document worker response'));}});});}
async function renderPdf(docx:string,pdf:string){const mode=process.env.PDF_RENDERER||(process.platform==='win32'?'word':'libreoffice');if(mode==='libreoffice'){if(!process.env.SOFFICE_PATH)throw new Fault(503,'Set SOFFICE_PATH for document preview');await new Promise<void>((resolve,reject)=>{const proc=spawn(process.env.SOFFICE_PATH!,['-env:UserInstallation='+pathToFileURL(privatePath('lo-profile-'+path.basename(docx,'.docx'))).href,'--headless','--convert-to','pdf','--outdir',path.dirname(pdf),docx],{windowsHide:true,stdio:['ignore','pipe','pipe']});let err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'LibreOffice preview timed out'));},90000);proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'LibreOffice renderer is unavailable'));});proc.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Fault(503,`LibreOffice preview failed: ${err.slice(-250)}`));});});await access(pdf);return;}
 if(mode!=='word'||process.platform!=='win32')throw new Fault(503,'Configure an available document preview renderer');await new Promise<void>((resolve,reject)=>{const proc=spawn('powershell.exe',['-NoProfile','-NonInteractive','-File',path.resolve('scripts/render-word.ps1'),docx,pdf],{windowsHide:true,stdio:['ignore','pipe','pipe']});let err='';const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'Word preview timed out'));},90000);proc.stderr.on('data',b=>err+=b);proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'Microsoft Word renderer is unavailable'));});proc.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Fault(503,`Word preview failed: ${err.slice(-250)}`));});});await access(pdf);}

const normalized=(value:string)=>value.trim().toLocaleLowerCase();
const blockedSourceFields=new Set(['analysisDate','releaseDate','analyzedBy','readBy','receivedBy','status','remarks','overallRemarks','analyst','reviewedBy','approvedBy','signature']);
function reportFieldDefaults(sample:Sample,template:Template){
 const keys=[...new Set([...(template.manifest.requiredFields||[]) as string[],...(template.manifest.tokens||[]) as string[]])];
 return Object.fromEntries(keys.filter(key=>!key.includes('.')&&!blockedSourceFields.has(key)&&String(sample.fields[key]||'').trim()).map(key=>[key,String(sample.fields[key])]));
}
function templateAccepts(template:Template,tests:Specification['tests']){
 const bindings=(template.manifest.resultBindings||[]) as {test:string;location?:string;stage?:string;replicate?:string}[];
 if(!bindings.length)return true;
 const expected=new Set(tests.map(resultKey));
 return bindings.length===expected.size&&bindings.every(binding=>expected.has(resultKey(binding)));
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
 const normalizeSampleName = (name: string): string => {
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
   // Stability timepoint bracket e.g. (T,14,15), (T,6,12,18,24) -> strip (= New Specs / base product)
   .replace(/\s*\(T(?:,\s*\d+)+\)/gi, '')
   // Standalone "New Specs" outside brackets -> strip
   .replace(/\bNew\s+Specs\b/gi, '');
  // Standalone "Old Specs" that remains is intentional — do not remove it
  return n.trim().replace(/\s{2,}/g, ' ');
 };
 const tokenize = (s:string): string[] => (s.toLowerCase().match(/[a-z]+|[0-9]+/g) || []);
 const matchScore = (sampleName:string, productName:string) => {
   const s = sampleName.toLowerCase();
   const p = productName.toLowerCase();
   if (s === p) return 10000;
   if (s.startsWith(p)) return 5000 + p.length;
   if (s.includes(p)) return 1000 + p.length;

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
    if (dice > 0.85) return dice * 100;
   }
   
   const sampleTokens = tokenize(sampleName);
   const productTokens = tokenize(productName);
   let matched = 0;
   for (const t of productTokens) {
    const idx = sampleTokens.indexOf(t);
    if (idx !== -1) {
     matched++;
     sampleTokens.splice(idx, 1);
    }
   }
   return productTokens.length > 0 && matched === productTokens.length ? matched : 0;
  };

 const normalizedName = normalizeSampleName(sample.name);
 const candidates = managed.value.products.filter(p=>p.active&&p.category===sample.category);
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

 if(products.length!==1)throw new Fault(409,products.length?`More than one managed product matches this sample name (${products.map(p=>p.name).join(', ')}). Remove the duplicate alias in Settings.`:'No active managed product matches the sample name from the incoming logger. Add the product or a matching prefix alias in Settings.');
 const product=products[0];
 const specifications=(await db.query('SELECT data FROM specifications')).rows.map(row=>row.data as Specification).filter(s=>s.active!==false);
 let safeContext = sample.context?.trim();
 if (!safeContext) {
  const productSpecs = specifications.filter(s => s.product === product.name && s.category === sample.category);
  const uniqueContexts = [...new Set(productSpecs.map(s => s.context))];
  safeContext = uniqueContexts.length === 1 ? uniqueContexts[0] : 'Routine';
 }
 const exact=specifications.filter(s=>s.product===product.name&&s.category===sample.category&&normalized(s.context)===normalized(safeContext));
 if(!exact.length)throw new Fault(409,`Mapped to "${product.name}", but no specification exists for context "${safeContext}". If this mapping is correct, add the specification in Settings. If it mapped to the WRONG product, add the sample's full name as an alias to the CORRECT product in Settings.`);
 const config=await setting('connections',defaultConnections);const applicability=demo?await setting<any[]>('applicability',[]):config.specifications?await readApplicability(config.specifications):[];
 const matches=type.applicability==='managed'?[{tests:[...new Set(exact.flatMap(s=>s.tests.map(t=>t.test)))]}]:applicability.filter(x=>x.product===product.name&&x.sheet===type.applicabilitySheet);
 if(matches.length!==1||!matches[0].tests.length)throw new Fault(409,'The QC Micro Products Specifications checklist has no single applicable-test row for this product, or every test is unchecked.');
 const tests=latestCriteria(specifications,product.name,sample.category,exact[0].context,matches[0].tests);
 const issues=[...new Set(exact.flatMap(s=>s.issues))];if(issues.length)throw new Fault(409,issues.join('; '));
 if(tests.some(t=>!managed.value.tests.some(x=>x.id===t.test&&x.active&&x.categories.includes(sample.category))))throw new Fault(409,'An applicable checklist test is inactive or unavailable for this sample type. Ask an administrator to review it.');
 const templates=(await db.query('SELECT data FROM templates')).rows.map(row=>row.data as Template).filter(t=>t.verified&&t.category===sample.category&&templateAccepts(t,tests));
 if(!templates.length)throw new Fault(409,'No verified report layout can represent all tests selected by the QC Micro Products Specifications checklist. Register a repeating-row layout or a matching fixed layout in Settings.');
 const repeating=templates.filter(t=>!((t.manifest.resultBindings||[]) as unknown[]).length);const choices=repeating.length?repeating:templates;
 if(choices.length!==1)throw new Fault(409,'More than one verified report layout matches this sample. Keep one active repeating-row layout for this category or configure a unique layout.');
 const template=choices[0];const candidate=[...exact].sort((a,b)=>Math.max(...b.tests.map(t=>Date.parse(t.date)||0))-Math.max(...a.tests.map(t=>Date.parse(t.date)||0)))[0];const {path:_privatePath,...safeTemplate}=template;
 return {sample,specification:{...candidate,product:product.name,context:candidate.context,tests,revision:hash(tests)},template:safeTemplate,applicableTests:tests.map(t=>t.label),prefilledFields:reportFieldDefaults(sample,template)};
}

export async function createAutomaticDraft(sampleId:string,actor:User){const setup=await resolveReportSetup(sampleId);return createDraft(sampleId,setup.specification.id,setup.template.id,actor);}
export async function createDraft(sampleId:string,specId:string,templateId:string,actor:User){const sample=(await db.query('SELECT data FROM samples WHERE id=$1',[sampleId])).rows[0]?.data as Sample;const template=(await db.query('SELECT data FROM templates WHERE id=$1',[templateId])).rows[0]?.data as Template;const candidate=(await db.query('SELECT data FROM specifications WHERE id=$1',[specId])).rows[0]?.data as Specification;if(!sample||!template||!candidate)throw new Fault(404,'Sample, specification or template not found');if(candidate.active===false)throw new Fault(409,'This specification is inactive. Select its current revision.');if(!template.verified)throw new Fault(409,'Template must pass sanitization and layout verification');if(template.category!==sample.category||candidate.category!==sample.category)throw new Fault(409,'Category does not match');
 const managed=await getConfiguration();const type=managed.value.sampleTypes.find(t=>t.id===sample.category);if(!type)throw new Fault(409,'Sample type is not configured');if(!managed.value.products.some(p=>p.active&&p.name===candidate.product&&p.category===sample.category))throw new Fault(409,'This product is not active in Products / materials. Ask an administrator to review it.');const config=await setting('connections',defaultConnections);const applicability=demo?await setting<any[]>('applicability',[]):config.specifications?await readApplicability(config.specifications):[];const matches=type.applicability==='managed'?[{tests:candidate.tests.map(t=>t.test)}]:applicability.filter(x=>x.product===candidate.product&&x.sheet===type.applicabilitySheet);if(matches.length!==1||!matches[0].tests.length)throw new Fault(409,'Product applicability is missing, ambiguous or all false');
 const all=(await db.query('SELECT data FROM specifications')).rows.map(x=>x.data as Specification);const tests=latestCriteria(all.filter(s=>s.active!==false),candidate.product,sample.category,candidate.context,matches[0].tests);if(candidate.issues.length)throw new Fault(409,candidate.issues.join('; '));
 if(tests.some(t=>!managed.value.tests.some(x=>x.id===t.test&&x.active&&x.categories.includes(sample.category))))throw new Fault(409,'An applicable test is inactive or unavailable for this sample type. Ask an administrator to review the specification.');const spec={...candidate,tests,revision:hash(tests)};const now=new Date().toISOString();const draft:Draft={configurationRevision:managed.revision,configurationSnapshot:structuredClone(managed.value),templateSnapshot:structuredClone(template),id:randomUUID(),sampleId,sample:structuredClone(sample),specification:spec,templateId,templateRevision:template.revision,revision:1,results:tests.map(t=>({test:t.test,location:t.location,stage:t.stage,replicate:t.replicate,state:'not_entered',value:'',qualifier:'',unit:t.unit,reason:'',remarks:''})),fields:{...reportFieldDefaults(sample,template),analysisDate:'',logbookReference:'',analyst:actor.name},updatedAt:now,analyst:actor.email};reportRows(draft,template);
 await db.query('INSERT INTO drafts(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);await db.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,1,$2)',[draft.id,JSON.stringify(draft)]);await audit(actor.email,'draft_created',draft.id,{sampleId,specificationRevision:spec.revision,templateRevision:template.revision});return draft;
}
export async function saveDraft(id:string,expected:number,results:Result[],fields:Record<string,string>,actor:string){return locked('draft:'+id,async(tx)=>{const old=(await tx.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as Draft;if(!old)throw new Fault(404,'Draft not found');if(old.revision!==expected)throw new Fault(409,'This draft changed in another session. Reload before saving.');if(Object.keys(fields).some(k=>k.startsWith('sample.')||k.startsWith('result.')||k.startsWith('report.')||k==='releaseDate'))throw new Fault(400,'Source identifiers, report settings and approval dates cannot be edited in result fields');const keys=old.results.map(resultKey);if(results.length!==keys.length||new Set(results.map(resultKey)).size!==keys.length||results.some(r=>!keys.includes(resultKey(r))))throw new Fault(400,'Result test instances cannot be replaced');for(const r of results)if(r.state==='not_tested'&&!r.reason.trim())throw new Fault(400,'Not-tested results require a reason');const d={...old,results,fields,revision:old.revision+1,analyst:actor,updatedAt:new Date().toISOString()};await tx.query('BEGIN');try{await tx.query('UPDATE drafts SET revision=$1,data=$2 WHERE id=$3',[d.revision,JSON.stringify(d),id]);await tx.query('INSERT INTO draft_revisions(id,revision,data) VALUES($1,$2,$3)',[id,d.revision,JSON.stringify(d)]);await tx.query('COMMIT');}catch(e){await tx.query('ROLLBACK');throw e;}await audit(actor,'draft_saved',id,{revision:d.revision});return d;});}
export async function generate(id:string,revision:number,actor:string){return locked('draft:'+id,async()=>{const d=(await db.query('SELECT data FROM drafts WHERE id=$1',[id])).rows[0]?.data as Draft;if(!d)throw new Fault(404,'Draft not found');if(d.revision!==revision)throw new Fault(409,'Save and review the latest draft before generation');const issues=reportIssues(d);if(issues.length)throw new Fault(422,issues.join('; '));const t=d.templateSnapshot||(await db.query('SELECT data FROM templates WHERE id=$1',[d.templateId])).rows[0]?.data as Template;if(!t||!t.verified||t.revision!==d.templateRevision)throw new Fault(409,'Template revision changed; create a new draft with the verified template');
 if(!demo){const source=d.sample.source;const live=await rangeValues(source.spreadsheetId,source.sheet,source.range);if(hash(Array.from({length:source.raw.length},(_,i)=>live[i]??''))!==source.fingerprint)throw new Fault(409,'Source sample changed; reconcile and create a new draft before generation');}
 const existing=(await db.query("SELECT data FROM files WHERE data->>'draftId'=$1 AND data->>'resultRevision'=$2 AND data->>'templateRevision'=$3 ORDER BY created_at DESC LIMIT 1",[id,String(revision),d.templateRevision])).rows[0]?.data;if(existing){try{await access(privatePath(existing.path));await access(privatePath(existing.pdf));return existing;}catch{throw new Fault(409,'The saved report file is unavailable. Ask an administrator to restore its private storage.');}}const fileId=randomUUID();await mkdir(privatePath('generated'),{recursive:true});const output=privatePath(`generated/${fileId}.docx`),payloadPath=privatePath(`generated/${fileId}.json`);const fields:Record<string,string>=Object.fromEntries(((t.manifest.tokens||[]) as string[]).filter(k=>!k.startsWith('result.')).map(k=>[k,'']));Object.assign(fields,{'report.laboratoryName':d.configurationSnapshot?.general.laboratoryName||'','report.department':d.configurationSnapshot?.general.department||'','report.site':d.configurationSnapshot?.general.site||''},Object.fromEntries(Object.entries(d.configurationSnapshot?.reports||{}).map(([k,v])=>['report.'+k,v])),d.fields,{'sample.name':d.sample.name,'sample.ml':d.sample.ml,'sample.batch':d.sample.batch,'sample.received':d.sample.received,'sample.category':d.sample.categoryLabel||d.configurationSnapshot?.sampleTypes.find(t=>t.id===d.sample.category)?.name||categories[d.sample.category]});
 const rows=reportRows(d,t).map(({index,...row})=>{for(const [k,v]of Object.entries(row))fields[`result.${index}.${k}`]=v;return row;});
 const missing=((t.manifest.requiredFields||[]) as string[]).filter(k=>!fields[k]?.trim());if(missing.length)throw new Fault(422,'Missing template fields: '+missing.join(', '));await writeFile(payloadPath,JSON.stringify({fields,rows,reportSettings:d.configurationSnapshot?.reports}));const args=['generate','--input',privatePath(t.path),'--payload',payloadPath,'--output',output];await worker(args);const pdf=privatePath(`generated/${fileId}.pdf`);await renderPdf(output,pdf);const file={id:fileId,name:`${d.configurationSnapshot?.reports.filenamePrefix||''}${d.sample.ml}-draft-r${d.revision}.docx`,kind:'report',path:`generated/${fileId}.docx`,pdf:`generated/${fileId}.pdf`,createdAt:new Date().toISOString(),sampleId:d.sampleId,ml:d.sample.ml,draftId:id,resultRevision:d.revision,specificationRevision:d.specification.revision,templateRevision:d.templateRevision,sourceSnapshot:d.sample.source,configurationRevision:d.configurationRevision,sha256:createHash('sha256').update(await readFile(output)).digest('hex'),externalReviewRequired:true,demo};await db.query('INSERT INTO files(id,data) VALUES($1,$2)',[fileId,JSON.stringify(file)]);await audit(actor,'report_generated',fileId,{draftId:id,revision});return file;});}
