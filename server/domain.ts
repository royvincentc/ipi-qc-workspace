import {formatNumber,type SampleType} from '../shared/configuration.js';
import {createHash} from 'node:crypto';
import {categories,type Category,type Criterion,type Specification} from '../shared/model.js';
export class Fault extends Error {constructor(public status:number,message:string){super(message);}}
export const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const normalized=(s:unknown)=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase();
export function column(n:number){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
const common=['Date Recieve','Sample Name','Batch No.','ML Number','RECIEVED BY','ANALYZED BY','DATE ANALYZED','PROCEED BY / READ BY','DATE RELEASED','STATUS','REMARKS'];
export interface Mapping {start:number;end:number;ml:number;header:number;first:number;title:string;merge:string;fields:Record<string,number>;headers:string[];extraMerges?:string[]}
function simple(start:number,title:string,merge:string):Mapping{return {start,end:start+10,ml:start+3,header:5,first:6,title,merge,headers:common,fields:{received:0,name:1,batch:2,ml:3,receivedBy:4,analyzedBy:5,analysisDate:6,readBy:7,releaseDate:8,status:9,remarks:10}};}
const goods=(start:number,title:string,merge:string):Mapping=>({start,end:start+12,ml:start+5,header:5,first:6,title,merge,headers:['Date Recieved','Sample Name','Batch No.','Category','','ML Number','RECIEVED BY','ANALYZED BY','DATE ANALYZED','PROCEED BY / READ BY','DATE RELEASED','STATUS','REMARKS'],fields:{received:0,name:1,batch:2,context:3,secondaryCategory:4,ml:5,receivedBy:6,analyzedBy:7,analysisDate:8,readBy:9,releaseDate:10,status:11,remarks:12}});
// Frozen layout baseline for migration and legacy submission reconciliation.
export const mappings:Record<Category,Mapping>={SFG:goods(0,'Semi-Finished Goods','A2:M4'),FG:goods(14,'FINISHED','O2:AA4'),WS:simple(29,'Water','AD2:AN4'),RM:simple(41,'Raw Material','AP2:AZ4'),ST:{...simple(53,'Stability','BB2:BM4'),end:64,ml:57,headers:['Date Recieve','Sample Name','','Batch No.','ML Number','RECIEVED BY','ANALYZED BY','DATE ANALYZED','PROCEED BY / READ BY','DATE RELEASED','STATUS','REMARKS'],fields:{received:0,name:1,secondaryCategory:2,batch:3,ml:4,receivedBy:5,analyzedBy:6,analysisDate:7,readBy:8,releaseDate:9,status:10,remarks:11}},MIS:simple(66,'Miscellaneous','BO2:BY4'),EM:{start:0,end:17,ml:2,header:4,first:5,title:'ENVIRONMENTAL MONITORING',merge:'A1:R3',headers:['DATE RECEIVED','FACILITY','ML Number','PRODUCT','Area','Category','','BATCH NO.','AREA/EQUIPMENT MONITORED','ACCUPOINT SAMPLERS USED','PLATES USED','RECIEVED BY','ANALYZED BY','PROCEED BY / READ BY:','DATE ANALYZED','DATE RELEASED','STATUS','REMARKS'],fields:{received:0,facility:1,ml:2,name:3,area:4,context:5,secondaryCategory:6,batch:7,equipmentCount:8,samplerCount:9,plateCount:10,receivedBy:11,analyzedBy:12,readBy:13,analysisDate:14,releaseDate:15,status:16,remarks:17}}};
export interface Sheet {id:number;name:string;rows:unknown[][];merges:string[];rowCount:number}
export function monthOf(name:string){const m=name.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s*(?:\(ENVI\))?\s+(\d{4})$/i);return m?{month:['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m[1].toLowerCase())+1,year:Number(m[2])}:null;}
export function currentMonth(now:Date,zone:string){const parts=new Intl.DateTimeFormat('en',{timeZone:zone,month:'numeric',year:'numeric'}).formatToParts(now);return {month:Number(parts.find(p=>p.type==='month')!.value),year:Number(parts.find(p=>p.type==='year')!.value)};}
export function validateLayout(s:Sheet,category:Category,type?:SampleType){const m=type?.layout||mappings[category];const row=s.rows[m.header-1]||[];
 for(let i=0;i<m.headers.length;i++)if(normalized(row[m.start+i])!==normalized(m.headers[i]))throw new Fault(409,`${s.name}: ${column(m.start+i)}${m.header} does not match the approved ${type?.name||categories[category]} header`);
 if(!s.merges.includes(m.merge))throw new Fault(409,`${s.name}: section boundary ${m.merge} has changed`);
 const acceptedTitles=[m.title,...(type?.layout.acceptedTitles||[])].map(normalized);
 if((type?.register|| (category==='EM'?'environmental':'incoming'))!=='environmental'&&!acceptedTitles.includes(normalized(s.rows[1]?.[m.start])))throw new Fault(409,`${s.name}: section title has changed`);
 if((type?.register|| (category==='EM'?'environmental':'incoming'))==='environmental'&&!String(s.rows[0]?.[0]||'').includes(m.title))throw new Fault(409,`${s.name}: environmental title missing`);
 if((type?type.layout.extraMerges:category==='SFG'?['D5:E5']:category==='FG'?['R5:S5']:category==='EM'?['F4:G4']:[]).some(x=>!s.merges.includes(x)))throw new Fault(409,`${s.name}: category boundary changed`);
 // Body merges can join two source records. They need a separate reviewed mapping.
 for(const merge of s.merges){const match=merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);if(!match)continue;const num=(c:string)=>[...c].reduce((a,v)=>a*26+v.charCodeAt(0)-64,0)-1;if(Number(match[2])>=m.first&&num(match[1])<=m.end&&num(match[3])>=m.start)throw new Fault(409,`${s.name}: merged data cells ${merge} require review`);}
}
export function sectionRows(s:Sheet,c:Category,type?:SampleType){const m=type?.layout||mappings[c];const result:{row:number;values:unknown[];occupied:boolean;reserved:boolean;ml:string}[]=[];
 for(let row=m.first;row<=s.rowCount;row++){const values=Array.from({length:m.end-m.start+1},(_,i)=>s.rows[row-1]?.[m.start+i]??'');
  if((type?.register==='environmental'||c==='EM')&&values.some(v=>normalized(v)==='reports generated'))break;
  const occupied=values.some((v,i)=>i!==m.ml-m.start&&String(v??'').trim()!=='');
  if(values.some(v=>String(v).trim()==='.')){if(occupied)throw new Fault(409,`${s.name} row ${row}: unclassified content within sample area`);}
  result.push({row,values,occupied,reserved:String(values[m.fields.remarks]).trim()==='RESERVED',ml:String(values[m.ml-m.start]??'').trim()});
 }return result;
}
export function allocate(sheets:Sheet[],category:Category,now:Date,zone:string,pending:string[]=[],type?:SampleType){const current=currentMonth(now,zone);const matches=sheets.filter(s=>{const d=monthOf(s.name);return d?.month===current.month&&d.year===current.year;});if(matches.length!==1)throw new Fault(409,'Exactly one current-month tab is required. No other month will be used.');
 const m=type?.layout||mappings[category],sheet=matches[0];let high=0;const seen=new Set<string>();const rule=type?.numbering||{prefix:`ML-${category}`,separator:'-' as const,yearDigits:2 as const,padding:4};const rules=[rule,...(type?.legacyNumbering||[])];const escape=(v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const patterns=rules.map(r=>new RegExp(`^${escape(r.prefix+r.separator+String(current.year).slice(-r.yearDigits)+r.separator)}(\\d{${r.padding},})$`));const matchNumber=(ml:string)=>patterns.map(p=>ml.match(p)).find(Boolean);
 const consider=(ml:string)=>{const match=matchNumber(ml);if(!match)throw new Fault(409,`Invalid or missing ML number on an occupied record: ${ml||'(blank)'}`);if(seen.has(ml))throw new Fault(409,`Duplicate used/reserved ML number requires reconciliation: ${ml}`);seen.add(ml);high=Math.max(high,Number(match[1]));};
 for(const s of sheets.filter(s=>monthOf(s.name)?.year===current.year)){validateLayout(s,category,type);for(const row of sectionRows(s,category,type))if(row.occupied)consider(row.ml);}
 for(const ml of pending)if(matchNumber(ml)&&!seen.has(ml))consider(ml);
 const rows=sectionRows(sheet,category,type);const last=rows.filter(r=>r.occupied).at(-1)?.row??m.first-1;const target=last+1;
 if(target>sheet.rowCount||target>(rows.at(-1)?.row??0))throw new Fault(409,'No verified empty data row available before the section boundary');
 const destination=rows.find(r=>r.row===target)!;const ml=formatNumber(rule,current.year,high+1);
 if(destination.occupied)throw new Fault(409,'Destination became occupied');
 if(destination.ml&&destination.ml!==ml)throw new Fault(409,`Placeholder ${destination.ml} differs from next valid number ${ml}; reconcile before logging`);
 return {sheet,row:target,ml,range:`${column(m.start)}${target}:${column(m.end)}${target}`,before:destination.values};
}
export function googleId(url:string,kind:'sheet'|'folder'='sheet'){const parsed=new URL(url);if(parsed.protocol!=='https:'||!(kind==='sheet'?parsed.hostname==='docs.google.com':parsed.hostname==='drive.google.com'))throw new Fault(400,'Use a Google Sheets or Drive HTTPS link');const m=parsed.pathname.match(kind==='sheet'?/^\/spreadsheets\/d\/([\w-]+)/:/\/folders\/([\w-]+)/);if(!m)throw new Fault(400,'The link does not identify the expected Google resource');return m[1];}
export function latestCriteria(candidates:Specification[],product:string,category:Category,context:string,tests:string[]):Criterion[]{const exact=candidates.filter(s=>s.product===product&&s.category===category&&s.context===context);if(!exact.length)throw new Fault(409,'No exact product and testing-context match');const result:Criterion[]=[];
 for(const test of tests){const all=exact.flatMap(s=>s.tests.filter(t=>t.test===test));if(!all.length||all.some(t=>!/^\d{4}-\d{2}-\d{2}$/.test(t.date)||!Number.isFinite(Date.parse(t.date))))throw new Fault(409,`${test}: missing or unresolved report date`);
  const latest=all.map(x=>x.date).sort().at(-1)!;const chosen=all.filter(x=>x.date===latest);const byKey=new Map<string,Criterion[]>();for(const t of chosen){const key=[t.test,t.location||'',t.stage||'',t.replicate||''].join('|');byKey.set(key,[...(byKey.get(key)||[]),t]);}
  for(const values of byKey.values()){if(new Set(values.map(x=>JSON.stringify([x.criterion,x.unit,x.type]))).size>1)throw new Fault(409,`${test}: equally dated reports disagree`);result.push(values[0]);}
 }return result;
}
