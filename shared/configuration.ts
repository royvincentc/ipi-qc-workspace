import {z} from 'zod';

const id=z.string().regex(/^[A-Za-z][A-Za-z0-9_-]{0,49}$/, 'Use letters, numbers, hyphens or underscores, starting with a letter');
const text=z.string().trim().min(1).max(200);
export const fieldSchema=z.object({key:id,label:text,type:z.enum(['text','number','date','datetime-local','dropdown','checkbox','longtext','generated']),integer:z.boolean().optional(),required:z.boolean(),active:z.boolean(),order:z.number().int().min(0),help:z.string().max(500),defaultValue:z.string().max(1000),options:z.array(text).max(100),lookup:z.string(),column:z.number().int().min(0).max(100).nullable()});
export const numberSchema=z.object({prefix:z.string().regex(/^[A-Z][A-Z0-9-]{0,24}$/),separator:z.enum(['-','/']),yearDigits:z.union([z.literal(2),z.literal(4)]),padding:z.number().int().min(4).max(8)});
export const layoutSchema=z.object({start:z.number().int().min(0).max(100),end:z.number().int().min(0).max(100),ml:z.number().int().min(0).max(100),header:z.number().int().min(1).max(20),first:z.number().int().min(2).max(21),title:text,merge:z.string().regex(/^[A-Z]+\d+:[A-Z]+\d+$/),headers:z.array(z.string().max(100)).min(1).max(101),fields:z.record(z.number().int().min(0).max(100)),extraMerges:z.array(z.string().regex(/^[A-Z]+\d+:[A-Z]+\d+$/)).default([])});
export const sampleTypeSchema=z.object({id,name:text,active:z.boolean(),order:z.number().int().min(0),register:z.enum(['incoming','environmental']),fields:z.array(fieldSchema).max(60),layout:layoutSchema,numbering:numberSchema,legacyNumbering:z.array(numberSchema).default([]),applicability:z.enum(['spreadsheet','managed']),applicabilitySheet:text});
export const testSchema=z.object({id,name:text,shortName:text,reportLabel:text,unit:z.string().max(60),inputType:z.enum(['numeric','finding']),active:z.boolean(),order:z.number().int().min(0),categories:z.array(id),sheetHeader:z.string().max(100),sheetColumn:z.number().int().min(1).max(100).nullable().optional()});
export const productSchema=z.object({id,name:text,code:z.string().max(60),category:id,aliases:z.array(text),active:z.boolean()});
export const configSchema=z.object({
 general:z.object({appName:text,laboratoryName:text,department:text,site:z.string().max(200),timezone:text,dateFormat:z.enum(['en-PH','en-GB','en-US']),pageSize:z.union([z.literal(10),z.literal(25),z.literal(50)]),theme:z.enum(['light','dark','system']),density:z.enum(['comfortable','compact'])}),
 sampleTypes:z.array(sampleTypeSchema).min(1).max(30),tests:z.array(testSchema).max(100),products:z.array(productSchema).max(10000),lookups:z.array(z.object({id,name:text,options:z.array(text).max(200),active:z.boolean()})).max(100),
 reports:z.object({title:text,notedBy:text,notedByRole:text,filenamePrefix:z.string().regex(/^[A-Za-z0-9 _-]{0,40}$/),footer:z.string().max(300)})
}).superRefine((c,ctx)=>{
 const fail=(message:string)=>ctx.addIssue({code:'custom',message});
 for(const [name,list] of Object.entries({sampleTypes:c.sampleTypes,tests:c.tests,products:c.products,lookups:c.lookups})){
  if(new Set(list.map(x=>x.id)).size!==list.length)fail(`${name}: identifiers must be unique`);
  const names=list.map(x=>`${'category' in x?x.category+':':''}${x.name.toLowerCase()}`);if(new Set(names).size!==names.length)fail(`${name}: names must be unique`);
 }
 try{new Intl.DateTimeFormat('en',{timeZone:c.general.timezone});}catch{fail('Choose a valid laboratory timezone');}
 for(const t of c.sampleTypes){const m=t.layout,width=m.end-m.start+1;
  if(width<1||m.headers.length!==width||m.ml<m.start||m.ml>m.end||m.first!==m.header+1)fail(`${t.name}: invalid section boundaries or headers`);
  const merge=m.merge.match(/^([A-Z]+)(\d+):([A-Z]+)(\d+)$/);const column=(v:string)=>[...v].reduce((n,c)=>n*26+c.charCodeAt(0)-64,0)-1;
  if(merge&&(column(merge[1])!==m.start||column(merge[3])!==m.end||Number(merge[4])!==m.header-1||Number(merge[2])>Number(merge[4])))fail(`${t.name}: merged title must span this section above its header`);
  if(m.fields.ml!==m.ml-m.start||['name','batch','received','remarks','receivedBy'].some(k=>m.fields[k]===undefined))fail(`${t.name}: required source fields are missing`);
  if(new Set(Object.values(m.fields)).size!==Object.values(m.fields).length||Object.values(m.fields).some(v=>v>=width))fail(`${t.name}: source columns overlap or exceed the section`);
  if(new Set(t.fields.map(f=>f.key)).size!==t.fields.length)fail(`${t.name}: form field keys must be unique`);
  for(const f of t.fields){if((f.column===null&&m.fields[f.key]!==undefined)||(f.column!==null&&(f.column>=width||m.fields[f.key]!==f.column)))fail(`${t.name}: ${f.label} must match its source column`);if(f.lookup&&!c.lookups.some(l=>l.id===f.lookup))fail(`${f.label}: lookup does not exist`);if(['ml','status','releaseDate','analysisDate','analyzedBy','readBy','receivedBy','remarks'].includes(f.key)&&f.type!=='generated')fail(`${f.label}: this source field cannot be edited during intake`);}
  for(const key of ['name','batch','received'])if(!t.fields.some(f=>f.key===key&&f.active&&f.required))fail(`${t.name}: ${key} must remain required`);
  for(const other of c.sampleTypes)if(t.id!==other.id&&t.register===other.register&&t.active&&other.active&&m.start<=other.layout.end&&m.end>=other.layout.start)fail(`${t.name}: section overlaps ${other.name}`);
 }
 for(const p of c.products)if(!c.sampleTypes.some(t=>t.id===p.category))fail(`${p.name}: sample type does not exist`);
 for(const test of c.tests)if(test.categories.some(id=>!c.sampleTypes.some(t=>t.id===id)))fail(`${test.name}: sample type does not exist`);
 for(const t of c.tests)if(t.sheetColumn!==undefined&&Boolean(t.sheetHeader)!==(t.sheetColumn!==null))fail(`${t.name}: provide both a spreadsheet header and column, or leave both blank`);
 const sourceColumns=c.tests.filter(t=>t.sheetHeader&&t.sheetColumn!=null).map(t=>t.sheetColumn);if(new Set(sourceColumns).size!==sourceColumns.length)fail('Each applicability test must use a different spreadsheet column');
 const prefixes=c.sampleTypes.map(t=>t.numbering.prefix);if(new Set(prefixes).size!==prefixes.length)fail('Each sample type needs a unique number prefix');
});
export type Configuration=z.infer<typeof configSchema>;
export type SampleType=z.infer<typeof sampleTypeSchema>;
export type FormField=z.infer<typeof fieldSchema>;
export type NumberRule=z.infer<typeof numberSchema>;
export interface ConfigurationRevision {revision:number;value:Configuration;changedAt:string;changedBy:string}
export function formatNumber(rule:NumberRule,year:number,sequence:number){return [rule.prefix,String(year).slice(-rule.yearDigits),String(sequence).padStart(rule.padding,'0')].join(rule.separator);}
export function validateIntake(type:SampleType,fields:Record<string,string>,config:Configuration){
 const issues:string[]=[];if(!type.active)issues.push('This sample type is inactive. Choose an active type.');
 if(config.products.some(p=>!p.active&&p.category===type.id&&[p.name,...p.aliases].some(n=>n.toLowerCase()===(fields.name||'').trim().toLowerCase())))issues.push('This product is inactive. Ask an administrator to review it before logging.');
 const enabled=type.fields.filter(f=>f.active&&f.type!=='generated');
 for(const key of Object.keys(fields))if(!enabled.some(f=>f.key===key))issues.push('This form has changed. Reload it before logging.');
 for(const f of enabled){const v=fields[f.key]??'';if(f.required&&!v.trim())issues.push(`${f.label} is required`);if(!v)continue;
  if(f.type==='number'&&(!/^\d+(\.\d+)?$/.test(v)||!Number.isFinite(Number(v))||(f.integer!==false&&!Number.isInteger(Number(v)))))issues.push(`${f.label}: enter a non-negative ${f.integer!==false?'whole number':'number'}`);
  if(['date','datetime-local'].includes(f.type)&&(!/^\d{4}-\d{2}-\d{2}/.test(v)||!Number.isFinite(Date.parse(v))||!Number.isFinite(Date.parse(v.slice(0,10)+'T00:00:00Z'))||new Date(v.slice(0,10)+'T00:00:00Z').toISOString().slice(0,10)!==v.slice(0,10)))issues.push(`${f.label}: enter a valid date`);
  if(f.type==='dropdown'){const opts=f.lookup?config.lookups.find(l=>l.id===f.lookup&&l.active)?.options||[]:f.options;if(!opts.includes(v))issues.push(`${f.label}: choose an available option`);}
  if(f.type==='checkbox'&&!['true','false'].includes(v))issues.push(`${f.label}: choose yes or no`);
 }return [...new Set(issues)];
}
