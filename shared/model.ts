// Frozen migration defaults. Runtime catalogs are served by the configuration service.
export const categories:Record<string,string> = {SFG:'Semi-Finished Goods',FG:'Finished Goods',WS:'Water',RM:'Raw Material',ST:'Stability',MIS:'Miscellaneous',EM:'Environmental Monitoring'} as const;
export type Category = string;
export type Role = 'administrator'|'analyst'|'viewer';
export interface User {email:string;name:string;role:Role}
export interface Source {spreadsheetId:string;sheetId:number;sheet:string;section:string;row:number;range:string;fingerprint:string;observedAt:string;url:string;mappingRevision:string;raw:unknown[];active?:boolean}
export interface Sample {configurationRevision?:number;categoryLabel?:string;id:string;category:Category;ml:string;name:string;batch:string;received:string;status:string;remarks:string;context:string;source:Source;fields:Record<string,string>;duplicate?:boolean}
export interface Criterion {test:string;label:string;type:'numeric'|'finding';unit:string;criterion:string;source:string;sourceLocation:string;date:string;dateBasis:'release'|'analysis';revision:string;stage?:string;location?:string;replicate?:string}
export interface Specification {active?:boolean;previousId?:string;id:string;product:string;category:Category;context:string;revision:string;tests:Criterion[];issues:string[];source:string}
export interface Result {test:string;location?:string;stage?:string;replicate?:string;state:'not_entered'|'not_tested'|'entered';value:string;qualifier:''|'='|'<'|'<='|'Nmt';unit:string;reason:string;remarks:string}
export interface Draft {configurationRevision?:number;configurationSnapshot?:import('./configuration').Configuration;templateSnapshot?:Template;id:string;sampleId:string;sample:Sample;specification:Specification;templateId:string;templateRevision:string;revision:number;results:Result[];fields:Record<string,string>;updatedAt:string;analyst:string}
export interface Template {id:string;name:string;family:string;category:Category;revision:string;path:string;manifest:Record<string,unknown>;verified:boolean;demo?:boolean}
export interface ReportSetup {sample:Sample;specification:Specification;template:Omit<Template,'path'>;applicableTests:string[];prefilledFields:Record<string,string>}
export const testLabels:Record<string,string>={SPC:'Standard Plate Count (SPC)',MY:'Molds and Yeast',PA:'P. aeruginosa',SA:'S. aureus',CA:'C. albicans',EC:'E. coli',SAL:'Salmonella',ENT:'Enterobacteriaceae',COL:'Coliform'};
export function resultKey(r:Pick<Result,'test'|'location'|'stage'|'replicate'>){return [r.test,r.location||'',r.stage||'',r.replicate||''].join('|');}
export function reportIssues(d:Draft):string[]{
 const issues=[...d.specification.issues];
 for(const t of d.specification.tests){const r=d.results.find(x=>resultKey(x)===resultKey(t));const label=[t.label,t.location,t.stage].filter(Boolean).join(' · ');
  if(!t.criterion||!t.source||!t.date) issues.push(`${label}: unresolved criterion source`);
  if(!r||r.state!=='entered') {issues.push(`${label}: result required`);continue;}
  if(r.unit!==t.unit) issues.push(`${label}: unit must be ${t.unit}`);
  if(t.type==='numeric'&&(!/^\d+(\.\d+)?$/.test(r.value)||!Number.isFinite(Number(r.value)))) issues.push(`${label}: enter a non-negative number`);
  if(t.type==='finding'&&!['Positive','Negative'].includes(r.value)) issues.push(`${label}: choose Positive or Negative`);
 }
 if(!d.fields.analysisDate)issues.push('Analysis date is required');
 for(const key of ['analysisDate','manufactureDate','expiryDate']){const value=d.fields[key];if(value&&(!/^\d{4}-\d{2}-\d{2}$/.test(value)||!Number.isFinite(Date.parse(value))||new Date(value).toISOString().slice(0,10)!==value))issues.push(`${key.replace(/([A-Z])/g,' $1')}: enter a valid date`);}
 if(d.fields.manufactureDate&&d.fields.expiryDate&&d.fields.expiryDate<d.fields.manufactureDate)issues.push('Expiry date cannot be earlier than manufacture date');
 for(const key of (d.templateSnapshot?.manifest.requiredFields||[]) as string[])if(!d.fields[key]?.trim()&&!['analysisDate','logbookReference'].includes(key))issues.push(`${key.replace(/([A-Z])/g,' $1')}: required report detail`);
 if(!d.fields.logbookReference)issues.push('Logbook reference is required');
 return issues;
}
