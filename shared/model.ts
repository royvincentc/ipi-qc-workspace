import {reportDateRange} from './report-dates.js';
// Frozen migration defaults. Runtime catalogs are served by the configuration service.
export const categories:Record<string,string> = {SFG:'Semi-Finished Goods',FG:'Finished Goods',WS:'Water',RM:'Raw Material',ST:'Product Stability',MIS:'Miscellaneous',EM:'Environmental Monitoring'} as const;
export type Category = string;
export type Role = 'administrator'|'analyst'|'viewer';
export interface User {email:string;name:string;role:Role}
export interface Source {spreadsheetId:string;sheetId:number;sheet:string;section:string;row:number;range:string;fingerprint:string;observedAt:string;url:string;mappingRevision:string;raw:unknown[];active?:boolean}
export interface Sample {configurationRevision?:number;categoryLabel?:string;id:string;category:Category;ml:string;name:string;batch:string;received:string;status:string;remarks:string;context:string;source:Source;fields:Record<string,string>;duplicate?:boolean}
export interface Criterion {test:string;label:string;type:'numeric'|'finding';unit:string;criterion:string;source:string;sourceLocation:string;date:string;dateBasis:'release'|'analysis'|'owner-confirmed';revision:string;stage?:string;location?:string;replicate?:string;channel?:'active-air'|'passive-air';instanceId?:string;block?:string}
export interface Specification {active?:boolean;previousId?:string;id:string;product:string;category:Category;context:string;revision:string;tests:Criterion[];issues:string[];source:string}
export interface ResultSource {spreadsheetId:string;url:string;sheetId:number;sheet:string;row:number;range:string;fingerprint:string;observedAt:string;ml:string;raw:string[];remarks?:string;analyst?:string}
export interface Result {test:string;location?:string;stage?:string;replicate?:string;channel?:'active-air'|'passive-air';instanceId?:string;block?:string;state:'not_entered'|'not_tested'|'entered';value:string;sourceValue?:string;sourceHeader?:string;qualifier:''|'='|'<'|'<='|'Nmt';unit:string;reason:string;remarks:string}
export interface Draft {configurationRevision?:number;configurationSnapshot?:import('./configuration').Configuration;templateSnapshot?:Template;environmentalSnapshot?:import('./environmental.js').EnvironmentalSnapshot;id:string;sampleId:string;sample:Sample;specification:Specification;templateId:string;templateRevision:string;revision:number;results:Result[];resultSource?:ResultSource;resultLookup?:'matched'|'not_found'|'demo';fields:Record<string,string>;updatedAt:string;analyst:string}
export type DraftSummary=Pick<Draft,'id'|'revision'|'updatedAt'> & {sample:Pick<Sample,'name'|'ml'>;outputName?:string};
export interface Draft {environmentalSession?:{id:string;members:{draftId:string;outputId:string;name:string;method:'accupoint'|'spc-my'|'microbial'}[]}}
export interface EnvironmentalSessionReview {id:string;members:{draftId:string;name:string;method:string;revision:number;issues:string[]}[]}
export interface TemplateManifest extends Record<string,unknown>{appliesToProducts?:string[];defaultForCategory?:boolean;rowGrouping?:{mergeColumns:number[]};blocks?:Record<string,{mergeColumns:number[]}>}
export interface Template {id:string;name:string;family:string;category:Category;revision:string;path:string;manifest:TemplateManifest;verified:boolean;demo?:boolean;active?:boolean}
export interface ReportSetup {sample:Sample;specification:Specification;template?:Omit<Template,'path'>;applicableTests:string[];prefilledFields:Record<string,string>;layoutResolution?:import('./environmental.js').LayoutResolution;environmental?:import('./environmental.js').EnvironmentalSetup}
export const testLabels:Record<string,string>={SPC:'Standard Plate Count (SPC)',MY:'Molds and Yeast',PA:'P.aeruginosa',SA:'S.aureus',CA:'C.albicans',EC:'E. coli',SAL:'Salmonella',ENT:'Enterobacteriaceae',COL:'Coliform'};
/** The workbook uses short IDs; reports show the organism names. */
export function reportTestLabel(test:string,fallback=''){
 const labels:Record<string,string>={PA:'P.aeruginosa',SA:'S.aureus',CA:'C.albicans',EC:'E.coli',SAL:'Salmonella',ENT:'Enterobacteriaceae'};
 return labels[test]||fallback||testLabels[test]||test;
}
export function resultKey(r:Pick<Result,'test'|'location'|'stage'|'replicate'|'instanceId'>){return r.instanceId||[r.test,r.location||'',r.stage||'',r.replicate||''].join('|');}
export function microbiologyLimit(test:string,criterion?:string){if(criterion!==undefined)return (/^\s*Nmt\b/i.test(criterion)||(['SPC','MY'].includes(test)&&/^\s*Not\s+more\s+than\s*\d/i.test(criterion)))?criterion.trim():undefined;return test==='SPC'?'Nmt 100 cfu/mL':test==='MY'||test==='ENT'?'Nmt 10 cfu/mL':undefined;}
export function microbiologyResultLimit(test:Criterion){return 'Nmt 10 '+(test.unit||'cfu/mL');}
export function suggestedAnalystRemark(test:Criterion,r:Result):string{
 if(r.state!=='entered')return '';
 if(test.type==='finding')return ['Positive','Negative'].includes(r.value)&&['positive','negative'].includes(test.criterion.trim().toLowerCase())?(r.value.toLowerCase()===test.criterion.trim().toLowerCase()?'Passed':'Failed'):'';
 const limit=test.criterion.match(/^\s*(?:Nmt|Not\s+more\s+than)\s+(\d+(?:\.\d+)?)/i);
 if(!limit)return '';
 if(r.qualifier==='Nmt')return 10<=Number(limit[1])?'Passed':'Failed';
 if(r.qualifier!==''&&r.qualifier!=='=')return '';
 if(!/^\d+(?:\.\d+)?$/.test(r.value.trim()))return '';
 // Actual results at the standard's boundary fail in the requested workflow.
 return Number(r.value)<Number(limit[1])?'Passed':'Failed';
}
export function overallAnalystRemarks(d:Pick<Draft,'sample'|'specification'|'results'|'environmentalSnapshot'>):string|undefined{
 const output=d.environmentalSnapshot?.output;
 if(output?.mode==='surface'&&['accupoint','spc-my'].includes(output.method)){
  const rows=d.specification.tests.map(t=>({test:t,result:d.results.find(r=>resultKey(r)===resultKey(t))}));
  const failed=rows.filter(({result:r})=>r?.state==='entered'&&r.remarks.trim().toLowerCase()==='failed').map(({test:t})=>`Failed in ${t.label}${t.location?' for '+[t.location,t.stage,t.replicate,t.channel].filter(Boolean).join(' · '):''}`);
  if(failed.length)return failed.length===1?failed[0]:failed.slice(0,-1).join(', ')+', and '+failed[failed.length-1];
  return rows.length&&rows.every(({result:r})=>r?.state==='entered'&&r.remarks.trim().toLowerCase()==='passed')?'Passed':'';
 }
 if(!['SFG','FG','ST','MIS'].includes(d.sample.category))return undefined;
 const rows=d.specification.tests.map(t=>({test:t,result:d.results.find(r=>resultKey(r)===resultKey(t))}));
 const failed=[...new Set(rows.filter(({result:r})=>r?.state==='entered'&&r.remarks.trim().toLowerCase()==='failed').map(({test:t})=>t.label))];
 if(failed.length)return 'Failed in '+failed.join(', ');
 return rows.length&&rows.every(({result:r})=>r?.state==='entered'&&r.remarks.trim().toLowerCase()==='passed')?'PASSED':'';
}
export function isSurfaceSpcMy(d:Pick<Draft,'environmentalSnapshot'>){return d.environmentalSnapshot?.output.mode==='surface'&&d.environmentalSnapshot.output.method==='spc-my';}
export function resultDisplayValue(test:Criterion,r:Result,category?:string,surfaceSpcMy=false){
 if(r.sourceValue!==undefined&&r.value===r.sourceValue)return r.sourceValue;
 const limit=microbiologyLimit(test.test,test.criterion);
 if(limit&&r.qualifier==='Nmt')return surfaceSpcMy||category&&['SFG','FG','ST','MIS'].includes(category)?microbiologyResultLimit(test):limit;
 const value=r.value.trim();
 if(limit&&value)return test.unit&&value.toLocaleLowerCase().endsWith(test.unit.toLocaleLowerCase())?value:`${value} ${test.unit}`.trim();
 return [test.test==='ACCUPOINT'&&r.qualifier==='='?'':r.qualifier,r.value,r.unit].filter(Boolean).join(' ');
}
export function resultIssues(d:Draft):string[]{
 const issues:string[]=[];
 for(const t of d.specification.tests){const r=d.results.find(x=>resultKey(x)===resultKey(t));const label=[t.label,t.location,t.stage].filter(Boolean).join(' · ');
  if(!t.criterion||!t.source||!t.date) issues.push(`${label}: unresolved criterion source`);
  if(!r||r.state!=='entered') {issues.push(`${label}: result required`);continue;}
  if(d.sample.category==='SFG'&&!['passed','failed'].includes(r.remarks.trim().toLocaleLowerCase()))issues.push(`${label}: select Passed or Failed so the Semi-Finished Goods report format can be chosen.`);
  const unchangedSourceValue=r.sourceValue!==undefined&&r.value===r.sourceValue;
  if(!unchangedSourceValue){
  if(r.unit!==t.unit) issues.push(`${label}: unit must be ${t.unit}`);
  if(t.type==='numeric'&&microbiologyLimit(t.test,t.criterion)){if(r.qualifier==='Nmt'&&r.value.trim()) issues.push(`${label}: fixed limit results do not need a value`);else if(r.qualifier!=='Nmt'&&(!/^\d+(\.\d+)?$/.test(r.value.trim())||!Number.isFinite(Number(r.value)))) issues.push(`${label}: enter a non-negative number`);}
   else if(t.type==='numeric'&&(!/^\d+(\.\d+)?$/.test(r.value)||!Number.isFinite(Number(r.value)))) issues.push(`${label}: enter a non-negative number`);
   if(t.type==='finding'&&!['Positive','Negative'].includes(r.value)) issues.push(`${label}: choose Positive or Negative`);
  }
 }
 return issues;
}
export function reportIssues(d:Draft):string[]{
 const issues=[...d.specification.issues,...resultIssues(d)];
 if(!d.fields.analysisDate)issues.push('Analysis date is required');
 const format=d.configurationSnapshot?.general.dateFormat||'en-PH';
 if(d.fields.analysisDate&&!reportDateRange(d.fields.analysisDate,format))issues.push('Analysis date: enter a valid date');
 const manufacture=d.fields['date.mfd']||d.fields.manufactureDate;
 const expiry=d.fields['exp.date']||d.fields.expiryDate;
 const manufactureRange=manufacture?reportDateRange(manufacture,format,true):undefined;
 const expiryRange=expiry?reportDateRange(expiry,format,true):undefined;
 if(manufacture&&!manufactureRange)issues.push('Manufacture date: use MM/DD/YYYY or MM/YYYY');
 if(expiry&&!expiryRange)issues.push('Expiry date: use MM/DD/YYYY or MM/YYYY');
 if(manufactureRange&&expiryRange&&expiryRange.end<manufactureRange.start)issues.push('Expiry date cannot be earlier than manufacture date');
 const reportTokens=(d.templateSnapshot?.manifest.tokens||[]) as string[];
 const reportRequired=(d.templateSnapshot?.manifest.requiredFields||[]) as string[];
 const sourceFields=d.sample?.fields||{};
 const page=[d.fields.page,d.fields.pageNumber,sourceFields.pageNumber,sourceFields.page].map(value=>String(value??'').trim()).find(Boolean)||'';
 const mic=[d.fields.mic,sourceFields.mic].map(value=>String(value??'').trim()).find(Boolean)||'';
 if((reportTokens.includes('mic')||reportRequired.includes('mic'))&&!mic)issues.push('MIC could not be found in the IPI Results MIC tab.');
 if((reportTokens.includes('page')||reportRequired.includes('page'))&&!page)issues.push('Page number is required');
 for(const key of reportRequired){if(['analysisDate','logbook','logbookReference','mic','page'].includes(key))continue;const value=d.fields[key];if(!value?.trim())issues.push(`${key.replace(/([A-Z])/g,' $1')}: required report detail`);}
 return issues;
}
