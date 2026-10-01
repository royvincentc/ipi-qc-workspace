// Frozen migration defaults. Runtime catalogs are served by the configuration service.
export const categories:Record<string,string> = {SFG:'Semi-Finished Goods',FG:'Finished Goods',WS:'Water',RM:'Raw Material',ST:'Product Stability',MIS:'Miscellaneous',EM:'Environmental Monitoring'} as const;
export type Category = string;
export type Role = 'administrator'|'analyst'|'viewer';
export interface User {email:string;name:string;role:Role}
export interface Source {spreadsheetId:string;sheetId:number;sheet:string;section:string;row:number;range:string;fingerprint:string;observedAt:string;url:string;mappingRevision:string;raw:unknown[];active?:boolean}
export interface Sample {configurationRevision?:number;categoryLabel?:string;id:string;category:Category;ml:string;name:string;batch:string;received:string;status:string;remarks:string;context:string;source:Source;fields:Record<string,string>;duplicate?:boolean}
export interface Criterion {test:string;label:string;type:'numeric'|'finding';unit:string;criterion:string;source:string;sourceLocation:string;date:string;dateBasis:'release'|'analysis'|'owner-confirmed';revision:string;stage?:string;location?:string;replicate?:string}
export interface Specification {active?:boolean;previousId?:string;id:string;product:string;category:Category;context:string;revision:string;tests:Criterion[];issues:string[];source:string}
export interface ResultSource {spreadsheetId:string;url:string;sheetId:number;sheet:string;row:number;range:string;fingerprint:string;observedAt:string;ml:string;raw:string[];remarks?:string;analyst?:string}
export interface Result {test:string;location?:string;stage?:string;replicate?:string;state:'not_entered'|'not_tested'|'entered';value:string;sourceValue?:string;sourceHeader?:string;qualifier:''|'='|'<'|'<='|'Nmt';unit:string;reason:string;remarks:string}
export interface Draft {configurationRevision?:number;configurationSnapshot?:import('./configuration').Configuration;templateSnapshot?:Template;id:string;sampleId:string;sample:Sample;specification:Specification;templateId:string;templateRevision:string;revision:number;results:Result[];resultSource?:ResultSource;fields:Record<string,string>;updatedAt:string;analyst:string}
export type DraftSummary=Pick<Draft,'id'|'revision'|'updatedAt'> & {sample:Pick<Sample,'name'|'ml'>};
export interface TemplateManifest extends Record<string,unknown>{appliesToProducts?:string[];defaultForCategory?:boolean;rowGrouping?:{mergeColumns:number[]}}
export interface Template {id:string;name:string;family:string;category:Category;revision:string;path:string;manifest:TemplateManifest;verified:boolean;demo?:boolean}
export interface ReportSetup {sample:Sample;specification:Specification;template:Omit<Template,'path'>;applicableTests:string[];prefilledFields:Record<string,string>}
export const testLabels:Record<string,string>={SPC:'Standard Plate Count (SPC)',MY:'Molds and Yeast',PA:'P.aeruginosa',SA:'S.aureus',CA:'C.albicans',EC:'E. coli',SAL:'Salmonella',ENT:'Enterobacteriaceae',COL:'Coliform'};
/** The workbook uses short IDs; reports show the organism names. */
export function reportTestLabel(test:string,fallback=''){
 const labels:Record<string,string>={PA:'P.aeruginosa',SA:'S.aureus',CA:'C.albicans',EC:'E.coli',SAL:'Salmonella',ENT:'Enterobacteriaceae'};
 return labels[test]||fallback||testLabels[test]||test;
}
export function resultKey(r:Pick<Result,'test'|'location'|'stage'|'replicate'>){return [r.test,r.location||'',r.stage||'',r.replicate||''].join('|');}
export function microbiologyLimit(test:string){return test==='SPC'?'Nmt 100 cfu/mL':test==='MY'||test==='ENT'?'Nmt 10 cfu/mL':undefined;}
export function resultDisplayValue(test:Criterion,r:Result){
 if(r.sourceValue!==undefined&&r.value===r.sourceValue)return r.sourceValue;
 const limit=microbiologyLimit(test.test);
 if(limit&&r.qualifier==='Nmt')return limit;
 if(limit&&r.value.trim())return /cfu\/mL$/i.test(r.value.trim())?r.value.trim():`${r.value.trim()} cfu/mL`;
 return [r.qualifier,r.value,r.unit].filter(Boolean).join(' ');
}
export function reportIssues(d:Draft):string[]{
 const issues=[...d.specification.issues];
 for(const t of d.specification.tests){const r=d.results.find(x=>resultKey(x)===resultKey(t));const label=[t.label,t.location,t.stage].filter(Boolean).join(' · ');
  if(!t.criterion||!t.source||!t.date) issues.push(`${label}: unresolved criterion source`);
  if(!r||r.state!=='entered') {issues.push(`${label}: result required`);continue;}
  if(d.sample.category==='SFG'&&!['passed','failed'].includes(r.remarks.trim().toLocaleLowerCase()))issues.push(`${label}: select Passed or Failed so the Semi-Finished Goods report format can be chosen.`);
  const unchangedSourceValue=r.sourceValue!==undefined&&r.value===r.sourceValue;
  if(!unchangedSourceValue){
   if(!microbiologyLimit(t.test)&&r.unit!==t.unit) issues.push(`${label}: unit must be ${t.unit}`);
   if(t.type==='numeric'&&microbiologyLimit(t.test)){if(r.qualifier==='Nmt'&&r.value.trim()) issues.push(`${label}: fixed limit results do not need a value`);else if(r.qualifier!=='Nmt'&&!r.value.trim()) issues.push(`${label}: enter a value`);}
   else if(t.type==='numeric'&&(!/^\d+(\.\d+)?$/.test(r.value)||!Number.isFinite(Number(r.value)))) issues.push(`${label}: enter a non-negative number`);
   if(t.type==='finding'&&!['Positive','Negative'].includes(r.value)) issues.push(`${label}: choose Positive or Negative`);
  }
 }
 if(!d.fields.analysisDate)issues.push('Analysis date is required');
 const validReportDate=(value:string)=>{
  const iso=value.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  const displayed=value.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if(!iso&&!displayed)return false;
  const format=d.configurationSnapshot?.general.dateFormat||'en-PH';
  const [year,month,day]=iso
   ?[Number(iso[1]),Number(iso[2]),Number(iso[3])]
   :format==='en-GB'
    ?[Number(displayed![3]),Number(displayed![2]),Number(displayed![1])]
    :[Number(displayed![3]),Number(displayed![1]),Number(displayed![2])];
  const date=new Date(Date.UTC(year,month-1,day));
  return date.getUTCFullYear()===year&&date.getUTCMonth()===month-1&&date.getUTCDate()===day;
 };
 for(const key of ['analysisDate','manufactureDate','expiryDate']){const value=d.fields[key];if(value&&!validReportDate(value))issues.push(`${key==='analysisDate'?'Analysis date':key.replace(/([A-Z])/g,' $1')}: enter a valid date`);}
 if(d.fields.manufactureDate&&d.fields.expiryDate&&d.fields.expiryDate<d.fields.manufactureDate)issues.push('Expiry date cannot be earlier than manufacture date');
 const reportTokens=(d.templateSnapshot?.manifest.tokens||[]) as string[];
 const reportRequired=(d.templateSnapshot?.manifest.requiredFields||[]) as string[];
 const sourceFields=d.sample?.fields||{};
 const page=[d.fields.page,d.fields.pageNumber,sourceFields.pageNumber,sourceFields.page].map(value=>String(value??'').trim()).find(Boolean)||'';
 const mic=[d.fields.mic,sourceFields.mic].map(value=>String(value??'').trim()).find(Boolean)||'';
 if((reportTokens.includes('mic')||reportRequired.includes('mic'))&&!mic)issues.push('MIC could not be found in the October 2026 MIC lookup.');
 if((reportTokens.includes('page')||reportRequired.includes('page'))&&!page)issues.push('Page number is required');
 for(const key of reportRequired){if(['analysisDate','logbook','logbookReference','mic','page'].includes(key))continue;const value=d.fields[key];if(!value?.trim())issues.push(`${key.replace(/([A-Z])/g,' $1')}: required report detail`);}
 return issues;
}
