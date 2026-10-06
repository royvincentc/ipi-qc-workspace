import {formatNumber,type SampleType} from '../shared/configuration.js';
import {createHash} from 'node:crypto';
import {categories,type Category,type Criterion,type Specification} from '../shared/model.js';
export class Fault extends Error {constructor(public status:number,message:string){super(message);}}
export const hash=(v:unknown)=>createHash('sha256').update(JSON.stringify(v)).digest('hex');
export const normalized=(s:unknown)=>String(s??'').replace(/\s+/g,' ').trim().toLowerCase();
export const normalizeHeader=(value:unknown)=>String(value??'').normalize('NFKC').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLocaleLowerCase().replace(/[^\p{L}\p{N}]/gu,'');
export function resolveHeaderMap(headers:unknown[],aliases:Record<string,string[]>){const fields:Record<string,number>={},ambiguous:Record<string,number[]>={},claimed=new Set<number>();for(const [field,names] of Object.entries(aliases)){const accepted=new Set(names.map(normalizeHeader));const hits=headers.flatMap((header,index)=>accepted.has(normalizeHeader(header))?[index]:[]);if(hits.length===1){fields[field]=hits[0];claimed.add(hits[0]);}else if(hits.length>1)ambiguous[field]=hits;}const unknown=headers.flatMap((header,index)=>String(header??'').trim()&&!claimed.has(index)?[{index,header:String(header)}]:[]);return {fields,ambiguous,unknown};}
export function column(n:number){let s='';for(n++;n;n=Math.floor((n-1)/26))s=String.fromCharCode(65+(n-1)%26)+s;return s;}
export interface Mapping {start:number;end:number;ml:number;header:number;first:number;title:string;merge:string;fields:Record<string,number>;headers:string[];extraMerges?:string[]}
const configuredMapping=(c:Category,type?:SampleType):Mapping=>(type?.layout||mappings[c]) as Mapping;
const goods=(start:number,title:string,merge:string):Mapping=>({
 start,end:start+19,ml:start+12,header:3,first:4,title,merge,headers:[
  'Date Received','Sample Name','Sample Name Suffix','Batch/Lot No.','Batch/Lot Size','Fill Vol./Wt.','DATE MDF','EXP DATE','Requested by','Page Number','Category','No.','ML Number','Received By','Analyzed By','Date Analyzed','Proceed By / Read By','Date Released','Status','Remarks'
 ],fields:{received:0,name:1,sampleNameSuffix:2,batch:3,batchSize:4,fillVolume:5,manufactureDate:6,expiryDate:7,requestedBy:8,pageNumber:9,context:10,secondaryCategory:11,ml:12,receivedBy:13,analyzedBy:14,analysisDate:15,readBy:16,releaseDate:17,status:18,remarks:19}
});
const semiFinishedGoods:Mapping={
 start:0,end:19,ml:12,header:3,first:4,title:'Semi-Finished Goods',merge:'A2:T2',headers:[
  'Date Received','Sample Name','Sample Name Suffix','Batch/Lot No.','Batch/Lot Size','Fill Vol./Wt.','DATE MDF','EXP DATE','Requested by','Page Number','Category','No.','ML Number','Received By','Analyzed By','Date Analyzed','Proceed By / Read By','Date Released','Status','Remarks'
 ],fields:{received:0,name:1,sampleNameSuffix:2,batch:3,batchSize:4,fillVolume:5,manufactureDate:6,expiryDate:7,requestedBy:8,pageNumber:9,context:10,secondaryCategory:11,ml:12,receivedBy:13,analyzedBy:14,analysisDate:15,readBy:16,releaseDate:17,status:18,remarks:19}
};
// Frozen layout baseline for migration and legacy submission reconciliation.
export const mappings:Record<Category,Mapping>={
 SFG:semiFinishedGoods,
 FG:goods(21,'Finished Goods','V2:AO2'),
 WS:{start:43,end:59,ml:52,header:3,first:4,title:'Water',merge:'AR2:BH2',headers:['Date Received','Sample Name','Batch/Lot No.','Batch/Lot Size','Fill Vol./Wt.','DATE MDF','EXP DATE','Requested by','Page Number','ML Number','Received By','Analyzed By','Date Analyzed','Proceed By / Read By','Date Released','Status','Remarks'],fields:{received:0,name:1,batch:2,batchSize:3,fillVolume:4,manufactureDate:5,expiryDate:6,requestedBy:7,pageNumber:8,ml:9,receivedBy:10,analyzedBy:11,analysisDate:12,readBy:13,releaseDate:14,status:15,remarks:16}},
 RM:{start:61,end:79,ml:72,header:3,first:4,title:'Raw Material',merge:'BJ2:CB2',headers:['Date Received','Sample Name','Sample Name Suffix','Batch No.','Batch/Lot Size','Fill Vol./Wt.','DATE MDF','EXP DATE','Supplier','Requested by','Page Number','ML Number','Received By','Analyzed By','Date Analyzed','Proceed By / Read By','Date Released','Status','Remarks'],fields:{received:0,name:1,sampleNameSuffix:2,batch:3,batchSize:4,fillVolume:5,manufactureDate:6,expiryDate:7,supplier:8,requestedBy:9,pageNumber:10,ml:11,receivedBy:12,analyzedBy:13,analysisDate:14,readBy:15,releaseDate:16,status:17,remarks:18}},
 ST:{start:81,end:99,ml:92,header:3,first:4,title:'Product Stability',merge:'CD2:CV2',headers:['Date Received','Sample Name','Sample Name Suffix','Type','Batch/Lot No.','Batch/Lot Size','Fill Vol./Wt.','DATE MDF','EXP DATE','Requested by','Page Number','ML Number','Received By','Analyzed By','Date Analyzed','Proceed By / Read By','Date Released','Status','Remarks'],fields:{received:0,name:1,sampleNameSuffix:2,context:3,batch:4,batchSize:5,fillVolume:6,manufactureDate:7,expiryDate:8,requestedBy:9,pageNumber:10,ml:11,receivedBy:12,analyzedBy:13,analysisDate:14,readBy:15,releaseDate:16,status:17,remarks:18}},
 MIS:{start:101,end:118,ml:111,header:3,first:4,title:'Miscellaneous',merge:'CX2:DO2',headers:['Date Received','Sample Name','Sample Name Suffix','Batch No.','Batch/Lot Size','Fill Vol./Wt.','DATE MDF','EXP DATE','Requested by','Page Number','ML Number','Received By','Analyzed By','Date Analyzed','Proceed By / Read By','Date Released','Status','Remarks'],fields:{received:0,name:1,sampleNameSuffix:2,batch:3,batchSize:4,fillVolume:5,manufactureDate:6,expiryDate:7,requestedBy:8,pageNumber:9,ml:10,receivedBy:11,analyzedBy:12,analysisDate:13,readBy:14,releaseDate:15,status:16,remarks:17}},
 EM:{start:0,end:17,ml:2,header:4,first:5,title:'ENVIRONMENTAL MONITORING',merge:'A1:R3',extraMerges:['F4:G4'],headers:['DATE RECEIVED','FACILITY','ML Number','PRODUCT','Area','Category','','BATCH NO.','AREA/EQUIPMENT MONITORED','ACCUPOINT SAMPLERS USED','PLATES USED','RECEIVED BY','ANALYZED BY','PROCEED BY / READ BY:','DATE ANALYZED','DATE RELEASED','STATUS','REMARKS'],fields:{received:0,facility:1,ml:2,name:3,area:4,context:5,secondaryCategory:6,batch:7,equipmentCount:8,samplerCount:9,plateCount:10,receivedBy:11,analyzedBy:12,readBy:13,analysisDate:14,releaseDate:15,status:16,remarks:17}}
};
export interface Sheet {id:number;name:string;rows:unknown[][];merges:string[];rowCount:number}
export function monthOf(name:string){const m=name.match(/^(January|February|March|April|May|June|July|August|September|October|November|December)\s*(?:\(ENVI\))?\s+(\d{4})$/i);return m?{month:['january','february','march','april','may','june','july','august','september','october','november','december'].indexOf(m[1].toLowerCase())+1,year:Number(m[2])}:null;}
export function currentMonth(now:Date,zone:string){const parts=new Intl.DateTimeFormat('en',{timeZone:zone,month:'numeric',year:'numeric'}).formatToParts(now);return {month:Number(parts.find(p=>p.type==='month')!.value),year:Number(parts.find(p=>p.type==='year')!.value)};}
function sameSourceHeader(expected:unknown,actual:unknown){
 const key=(value:unknown)=>{
  // The historical logbooks use both "Received" and the misspelling
  // "Recieved" (for example, "RECIEVED BY"). A few early tabs also use
  // "Recieve". Treat these as the same header while keeping other changes
  // subject to review.
  return normalizeHeader(value).replace(/reciev(ed|e)/g,'received');
 };
 const expectedKey=key(expected),actualKey=key(actual);
 const batchHeaders=new Set(['batchno','batchlotno']);
 return expectedKey===actualKey||(batchHeaders.has(expectedKey)&&batchHeaders.has(actualKey));
}
export function validateLayout(s:Sheet,category:Category,type?:SampleType){const m=type?.layout||mappings[category];const row=s.rows[m.header-1]||[];
 for(let i=0;i<m.headers.length;i++)if(!sameSourceHeader(m.headers[i],row[m.start+i]))throw new Fault(409,`${s.name}: ${column(m.start+i)}${m.header} does not match the approved ${type?.name||categories[category]} header`);
 if(!s.merges.includes(m.merge))throw new Fault(409,`${s.name}: section boundary ${m.merge} has changed`);
 const acceptedTitles=[m.title,...(type?.layout.acceptedTitles||[])].map(normalized);
 if((type?.register|| (category==='EM'?'environmental':'incoming'))!=='environmental'&&!acceptedTitles.includes(normalized(s.rows[1]?.[m.start])))throw new Fault(409,`${s.name}: section title has changed`);
 if((type?.register|| (category==='EM'?'environmental':'incoming'))==='environmental'&&!String(s.rows[0]?.[0]||'').includes(m.title))throw new Fault(409,`${s.name}: environmental title missing`);
 if((type?type.layout.extraMerges:m.extraMerges||[]).some(x=>!s.merges.includes(x)))throw new Fault(409,`${s.name}: category boundary changed`);
 // Body merges can join two source records. They need a separate reviewed mapping.
 for(const merge of s.merges){const match=merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);if(!match)continue;const num=(c:string)=>[...c].reduce((a,v)=>a*26+v.charCodeAt(0)-64,0)-1;if(Number(match[2])>=m.first&&num(match[1])<=m.end&&num(match[3])>=m.start)throw new Fault(409,`${s.name}: merged data cells ${merge} require review`);}
}
const incomingTitles:Record<string,string[]>={SFG:['Semi-Finished Goods'],FG:['Finished Goods','Finished'],WS:['Water'],RM:['Raw Material','Raw Materials'],ST:['Product Stability','Stability'],MIS:['Miscellaneous']};
const historicalFields:Record<string,string[]>={
 received:['Date Received'],name:['Sample Name'],sampleNameSuffix:['Sample Name Suffix'],batch:['Batch/Lot No.','Batch No.'],batchSize:['Batch/Lot Size','Batch Size','Lot Size'],fillVolume:['Fill Vol./Wt.','Fill Vol/WT','Fill Volume','Fill Weight'],manufactureDate:['DATE MDF','MFD DATE','DATE MANUFACTURED','MANUFACTURE DATE'],expiryDate:['EXP DATE','EXPIRY DATE','EXPIRATION DATE'],supplier:['Supplier'],requestedBy:['Requested By'],pageNumber:['Page Number','Page'],context:['Type'],ml:['ML Number'],receivedBy:['Received By'],analyzedBy:['Analyzed By','Analyst'],analysisDate:['Date Analyzed','Date Analyze','Analysis Date'],readBy:['Proceed By / Read By','Proceed By / Read By:'],releaseDate:['Date Released','Release Date'],status:['Status'],remarks:['Remarks']
};
const historicalKey=(value:unknown)=>normalizeHeader(value).replace(/reciev(ed|e)/g,'received');
function historicalLayout(s:Sheet,c:Category,type?:SampleType):Mapping{
 if(c==='EM')throw new Fault(409,`${s.name}: no approved historical environmental layout is available`);
 const titleRow=s.rows[1]||[];
 const aliases=[...new Set([...(incomingTitles[c]||[]),type?.name||'',type?.layout.title||'',...(type?.layout.acceptedTitles||[])].filter(Boolean).map(normalized))];
 const start=titleRow.findIndex(value=>aliases.includes(normalized(value)));
 if(start<0)throw new Fault(409,`${s.name}: ${type?.name||categories[c]} section title is missing`);
 const allTitles=new Set(Object.values(incomingTitles).flat().map(normalized));
 const nextTitle=titleRow.flatMap((value,index)=>index>start&&allTitles.has(normalized(value))?[index]:[]).sort((a,b)=>a-b)[0];
 const stop=nextTitle??Number.POSITIVE_INFINITY;
 const aliasesFor=(field:string)=>{
  if(field==='context'&&['SFG','FG'].includes(c))return ['Category'];
  if(field==='context'&&c==='ST')return ['Type'];
  if(field==='secondaryCategory'&&['SFG','FG'].includes(c))return ['No.'];
  return historicalFields[field]||[];
 };
 let found:{header:number;fields:Record<string,number>;end:number}|undefined;
 for(let rowIndex=0;rowIndex<Math.min(s.rows.length,10);rowIndex++){
  const row=s.rows[rowIndex]||[];
  const mapped:Record<string,number>={};
  for(const [field] of Object.entries(type?.layout.fields||mappings[c].fields)){
   const names=aliasesFor(field);if(!names.length)continue;
   const keys=new Set(names.map(historicalKey));
   const hits=row.flatMap((value,index)=>index>=start&&index<stop&&keys.has(historicalKey(value))?[index]:[]);
   if(hits.length===1)mapped[field]=hits[0]-start;
   else if(hits.length>1&&['received','name','batch','ml','remarks'].includes(field))throw new Fault(409,`${s.name}: ambiguous ${field} header in ${type?.name||categories[c]}`);
  }
  if(['received','name','batch','ml','remarks'].every(key=>key in mapped)){
   const end=start+mapped.remarks;
   if(end<start||end>=stop)continue;
   // Older goods tabs leave the "No." cell unnamed immediately before ML.
   if(['SFG','FG'].includes(c)&&mapped.context!==undefined&&mapped.ml>mapped.context+1&&!('secondaryCategory'in mapped))mapped.secondaryCategory=mapped.ml-1;
   // Older stability tabs store Type in an unnamed cell before Batch No.
   if(c==='ST'&&mapped.ml===mapped.batch+1&&mapped.batch===mapped.name+2&&!('context'in mapped))mapped.context=mapped.batch-1;
   found={header:rowIndex+1,fields:mapped,end};break;
  }
 }
 if(!found)throw new Fault(409,`${s.name}: supported historical headers for ${type?.name||categories[c]} were not found`);
 const row=s.rows[found.header-1]||[];
 const end=found.end;
 for(const merge of s.merges){const match=merge.match(/([A-Z]+)(\d+):([A-Z]+)(\d+)/);if(!match)continue;const num=(letters:string)=>[...letters].reduce((value,letter)=>value*26+letter.charCodeAt(0)-64,0)-1;const firstColumn=num(match[1]),lastColumn=num(match[3]),firstRow=Number(match[2]);if(firstRow>=found.header+1&&firstColumn<=end&&lastColumn>=start)throw new Fault(409,`${s.name}: merged historical data cells ${merge} require review`);}
 return {start,end,ml:start+found.fields.ml,header:found.header,first:found.header+1,title:String(titleRow[start]||type?.name||categories[c]),merge:'',fields:found.fields,headers:row.slice(start,end+1).map(value=>String(value??''))};
}
export function sourceLayout(s:Sheet,c:Category,type?:SampleType,now=new Date(),zone='Asia/Manila'):Mapping{
 const date=monthOf(s.name),active=currentMonth(now,zone);
 if(date&&date.month===active.month&&date.year===active.year){validateLayout(s,c,type);return configuredMapping(c,type);}
 if(c==='EM'){validateLayout(s,c,type);return configuredMapping(c,type);}
 return historicalLayout(s,c,type);
}
export function sectionRows(s:Sheet,c:Category,type?:SampleType,layout?:Mapping){const m=layout||configuredMapping(c,type);const result:{row:number;values:unknown[];occupied:boolean;reserved:boolean;ml:string}[]=[];
 for(let row=m.first;row<=s.rowCount;row++){const values=Array.from({length:m.end-m.start+1},(_,i)=>s.rows[row-1]?.[m.start+i]??'');
  if((type?.register==='environmental'||c==='EM')&&values.some(v=>normalized(v)==='reports generated'))break;
  // Some blank Water rows are prefilled with reusable fill-volume and N/A
  // defaults. A sample row is occupied when it has a core identity field;
  // ML-only placeholders remain reusable below.
  const occupied=String(values[m.fields.remarks]??'').trim()==='RESERVED'||['received','name','batch'].some(key=>{const offset=m.fields[key];return offset!==undefined&&String(values[offset]??'').trim()!=='';});
  if(values.some(v=>String(v).trim()==='.')){if(occupied)throw new Fault(409,`${s.name} row ${row}: unclassified content within sample area`);}
  result.push({row,values,occupied,reserved:String(values[m.fields.remarks]).trim()==='RESERVED',ml:String(values[m.ml-m.start]??'').trim()});
 }return result;
}
export function allocate(sheets:Sheet[],category:Category,now:Date,zone:string,pending:string[]=[],type?:SampleType){const current=currentMonth(now,zone);const matches=sheets.filter(s=>{const d=monthOf(s.name);return d?.month===current.month&&d.year===current.year;});if(matches.length!==1)throw new Fault(409,'Exactly one current-month tab is required. No other month will be used.');
 const sheet=matches[0],m=sourceLayout(sheet,category,type,now,zone);let high=0;const seen=new Set<string>();const rule=type?.numbering||{prefix:`ML-${category}`,separator:'-' as const,yearDigits:2 as const,padding:4};const rules=[rule,...(type?.legacyNumbering||[])];const escape=(v:string)=>v.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const patterns=rules.map(r=>new RegExp(`^${escape(r.prefix+r.separator+String(current.year).slice(-r.yearDigits)+r.separator)}(\\d{${r.padding},})$`));const matchNumber=(ml:string)=>patterns.map(p=>ml.match(p)).find(Boolean);
 const consider=(ml:string)=>{const match=matchNumber(ml);if(!match)throw new Fault(409,`Invalid or missing ML number on an occupied record: ${ml||'(blank)'}`);if(seen.has(ml))throw new Fault(409,`Duplicate used/reserved ML number requires reconciliation: ${ml}`);seen.add(ml);high=Math.max(high,Number(match[1]));};
 for(const s of sheets.filter(s=>monthOf(s.name)?.year===current.year)){const layout=sourceLayout(s,category,type,now,zone);for(const row of sectionRows(s,category,type,layout))if(row.occupied)consider(row.ml);}
 for(const ml of pending)if(matchNumber(ml)&&!seen.has(ml))consider(ml);
 const rows=sectionRows(sheet,category,type,m);const last=rows.filter(r=>r.occupied).at(-1)?.row??m.first-1;const target=last+1;
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
