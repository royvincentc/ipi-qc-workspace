import {getConfiguration} from './configuration.js';
import {GoogleAuth} from 'google-auth-library';
import {Fault,googleId,column,hash,monthOf,type Sheet} from './domain.js';
import {demo} from './db.js';
const auth=new GoogleAuth({scopes:['https://www.googleapis.com/auth/spreadsheets','https://www.googleapis.com/auth/drive.readonly']});
export async function google<T=any>(url:string,method='GET',data?:unknown):Promise<T>{if(demo)throw new Fault(400,'Google access is disabled in the de-identified demo');try{const client=await auth.getClient();return (await client.request<T>({url,method:method as any,data,timeout:30000})).data;}catch(e:any){const status=e.response?.status;const upstream=e.response?.data?.error;const detail=typeof upstream?.message==='string'?upstream.message:typeof e.message==='string'?e.message:'No response details';throw new Fault(502,`Google API request failed (${status||'connection'}): ${detail.slice(0,400)}`);}}
export async function readWorkbook(url:string):Promise<{id:string;title:string;sheets:Sheet[]}>{const id=googleId(url);const meta=await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=spreadsheetId,properties(title),sheets(properties,merges)`);const sheets:Sheet[]=[];
 for(const s of meta.sheets){if(!monthOf(s.properties.title))continue;if(s.properties.gridProperties.rowCount>5000)throw new Fault(409,'Monthly sheet exceeds the reviewed 5,000-row limit');const range=`'${s.properties.title.replaceAll("'","''")}'!A1:DK${s.properties.gridProperties.rowCount}`;const data=await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`);sheets.push({id:s.properties.sheetId,name:s.properties.title,rowCount:s.properties.gridProperties.rowCount,rows:data.values||[],merges:(s.merges||[]).map((m:any)=>`${column(m.startColumnIndex||0)}${(m.startRowIndex||0)+1}:${column(m.endColumnIndex-1)}${m.endRowIndex}`)});}
 if(!sheets.length)throw new Fault(409,'No recognized monthly logbook tabs found');return {id,title:meta.properties.title,sheets};}
export async function rangeValues(id:string,sheet:string,range:string){const a1=`'${sheet.replaceAll("'","''")}'!${range}`;return (await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(a1)}?valueRenderOption=FORMATTED_VALUE`)).values?.[0]||[];}
export async function writeRange(id:string,sheet:string,range:string,values:unknown[]){const a1=`'${sheet.replaceAll("'","''")}'!${range}`;return google(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(a1)}?valueInputOption=RAW`,'PUT',{range:a1,majorDimension:'ROWS',values:[values]});}
export async function readApplicability(url:string){const id=googleId(url);const meta=await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets(properties(title))`);const out:{sheet:string;row:number;product:string;tests:string[]}[]=[];const config=(await getConfiguration()).value;const tests=config.tests.filter(t=>t.sheetHeader&&t.sheetColumn!=null).sort((a,b)=>a.sheetColumn!-b.sheetColumn!);for(const requestedName of [...new Set(config.sampleTypes.filter(t=>t.applicability==='spreadsheet').map(t=>t.applicabilitySheet))]){const titles=meta.sheets.map((s:any)=>s.properties.title);const name=requestedName==='Raw Materials'&&titles.includes('RAW')?'RAW':requestedName==='RAW'&&titles.includes('Raw Materials')?'Raw Materials':requestedName;if(!titles.includes(name))throw new Fault(409,`Missing ${name} specification tab`);const a1=`'${name.replaceAll("'","''")}'!A1:${column(Math.max(1,...tests.map(t=>t.sheetColumn!)))}2000`;const data=await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(a1)}?valueRenderOption=UNFORMATTED_VALUE`);const rows=data.values||[];if(tests.some(t=>String(rows[1]?.[t.sheetColumn!]||'').trim()!==t.sheetHeader))throw new Fault(409,`${name}: applicability headers changed`);for(let i=2;i<rows.length;i++){if(!rows[i][0])continue;if(rows[i].slice(1).every((v:any)=>v==null||v===''))continue;if(tests.map(t=>rows[i][t.sheetColumn!]).some(v=>typeof v!=='boolean'))throw new Fault(409,`${name} row ${i+1}: invalid applicability value`);out.push({sheet:requestedName,row:i+1,product:rows[i][0],tests:tests.filter(t=>rows[i][t.sheetColumn!]===true).map(t=>t.id)});}}return out;}

const resultTabs:Partial<Record<string,string>>={RM:'Raw Material',FG:'Finished Goods',SFG:'Semi-Finished Goods',ST:'Product Stability',MIS:'Miscellaneous',WS:'Water'};
const resultHeaderAliases:Record<string,string[]>={SPC:['SPC','Standard Plate Count (SPC)'],MY:['MY','Molds and Yeast'],PA:['PA','P.aeruginosa','P. aeruginosa'],SA:['SA','S.aureus','S. aureus'],CA:['CA','C.albicans','C. albicans'],EC:['EC','E.coli','E. coli'],SAL:['SAL','Salmonella'],ENT:['ENT','Enterobacteriaceae'],COL:['COL','Coliform']};
const normalizedHeader=(value:unknown)=>String(value??'').normalize('NFKC').replace(/[^a-z0-9]/gi,'').toLowerCase();
export function mapResultHeaders(headers:unknown[],configuredTests:{id:string;name:string;reportLabel?:string;shortName?:string;sheetHeader?:string}[]){
 const columns=new Map<string,number>();
 for(const test of configuredTests){
  const aliases=[...(resultHeaderAliases[test.id]||[]),test.name,test.reportLabel||'',test.shortName||'',test.sheetHeader||''].map(normalizedHeader).filter(Boolean);
  const found=headers.map((header,index)=>({header,index})).filter(x=>aliases.includes(normalizedHeader(x.header)));
  if(found.length>1)throw new Fault(409,`Results sheet has ambiguous columns for ${test.name}`);
  if(found.length===1)columns.set(test.id,found[0].index);
 }
 return columns;
}

export async function readResultsRow(url:string,category:string,ml:string){
 const id=googleId(url),sheetName=resultTabs[category];
 if(!sheetName)throw new Fault(409,`No Results tab is configured for sample type ${category}`);
 const meta=await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${id}?fields=sheets.properties(title,sheetId,gridProperties)`);
 const sheet=meta.sheets?.find((item:any)=>item.properties.title===sheetName)?.properties;
 if(!sheet)throw new Fault(409,`Results workbook is missing the ${sheetName} tab`);
 const rowCount=Number(sheet.gridProperties?.rowCount||0),columnCount=Number(sheet.gridProperties?.columnCount||0);
 if(rowCount<2||rowCount>5000||columnCount>100)throw new Fault(409,`${sheetName}: Results tab is outside the reviewed size limit`);
 const endColumn=column(Math.min(columnCount,26)-1);
 const values=await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${id}/values/${encodeURIComponent(`'${sheetName.replaceAll("'","''")}'!A1:${endColumn}${rowCount}`)}?valueRenderOption=FORMATTED_VALUE`);
 const rows:unknown[][]=values.values||[];
 const headerCandidates=rows.slice(0,10).map((row,index)=>({row,index})).filter(x=>x.row.some(cell=>normalizedHeader(cell)==='mlnumber'));
 if(headerCandidates.length!==1)throw new Fault(409,`${sheetName}: Results headers are missing or ambiguous`);
 const {row:headers,index:headerIndex}=headerCandidates[0];
 const mlColumn=headers.findIndex(cell=>normalizedHeader(cell)==='mlnumber');
 const remarksColumn=headers.findIndex(cell=>normalizedHeader(cell)==='remarks');
 if(mlColumn<0||remarksColumn<0)throw new Fault(409,`${sheetName}: ML Number or Remarks header is missing`);
 const config=(await getConfiguration()).value;
 const testColumns=mapResultHeaders(headers,config.tests);
 const records=rows.map((row,index)=>({row,index})).filter(x=>x.index>headerIndex&&String(x.row[mlColumn]??'').trim()===ml.trim());
 if(records.length!==1)throw new Fault(records.length?409:404,records.length?`${sheetName}: multiple Results rows match ${ml}`:`${sheetName}: no Results row matches ${ml}`);
 const match=records[0],raw=Array.from({length:headers.length},(_,i)=>String(match.row[i]??''));
 const tests=Object.fromEntries([...testColumns].map(([test,index])=>[test,{header:String(headers[index]??''),value:String(match.row[index]??'')} ]));
 return {spreadsheetId:id,url,sheetId:Number(sheet.sheetId),sheet:sheetName,row:match.index+1,range:`A${match.index+1}:${endColumn}${match.index+1}`,fingerprint:hash(raw),observedAt:new Date().toISOString(),ml:ml.trim(),raw,remarks:String(match.row[remarksColumn]??''),analyst:String(match.row[headers.findIndex(cell=>normalizedHeader(cell)==='analyzedby')]??''),tests};
}

export async function readMicForAnalyst(spreadsheetUrl:string,analyst:string):Promise<string>{
 if(!analyst.trim())return '';
 const spreadsheetId=googleId(spreadsheetUrl);
 const meta=await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}?fields=sheets.properties(title,gridProperties)`);
 const sheet=meta.sheets?.find((item:any)=>item.properties.title==='MIC')?.properties;
 if(!sheet)return '';
 const rowCount=Number(sheet.gridProperties?.rowCount||0),columnCount=Number(sheet.gridProperties?.columnCount||0);
 if(rowCount<2||rowCount>5000||columnCount<1||columnCount>100)throw new Fault(409,'MIC: lookup tab is outside the reviewed size limit');
 const endColumn=column(Math.min(columnCount,26)-1);
 const range=`'MIC'!A1:${endColumn}${rowCount}`;
 const rows=(await google<any>(`https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${encodeURIComponent(range)}?valueRenderOption=FORMATTED_VALUE`)).values||[];
 const normalized=(value:unknown)=>String(value??'').normalize('NFKC').replace(/[^a-z0-9]/gi,'').toLocaleLowerCase();
 const headers=rows.slice(0,10).map((row:unknown[],index:number)=>({row,index})).filter(({row}:any)=>row.some((v:unknown)=>normalized(v)==='mic')&&row.some((v:unknown)=>normalized(v)==='analyst'));
 if(headers.length!==1)return '';
 const {row,index}=headers[0],micColumn=row.findIndex((v:unknown)=>normalized(v)==='mic'),analystColumn=row.findIndex((v:unknown)=>normalized(v)==='analyst'),tagColumn=row.findIndex((v:unknown)=>normalized(v)==='tag');
 const analystKey=normalized(analyst);
 const matches=rows.slice(index+1).filter((row:unknown[])=>normalized(row[analystColumn])===analystKey||(tagColumn>=0&&normalized(row[tagColumn])===analystKey)).map((row:unknown[])=>String(row[micColumn]??'').trim()).filter(Boolean);
 const distinct:string[]=[...new Set<string>(matches)];
 if(distinct.length>1)throw new Fault(409,`MIC/Analyst lookup has conflicting MIC values for ${analyst}`);
 return String(distinct[0]||'');
}
