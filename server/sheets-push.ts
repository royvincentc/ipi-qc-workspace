import express,{type Express} from 'express';
import {createHash,createHmac,timingSafeEqual} from 'node:crypto';
import {z} from 'zod';
import {Fault,monthOf} from './domain.js';

const payloadSchema=z.object({
 spreadsheetId:z.string().regex(/^[\w-]{10,200}$/),
 sheet:z.object({
  id:z.number().int().nonnegative(),
  name:z.string().max(100).refine(name=>Boolean(monthOf(name)),'Use a recognized monthly logbook tab'),
  rowCount:z.number().int().min(1).max(5000),
  rows:z.array(z.array(z.string().max(10000)).max(153)).max(5000),
  merges:z.array(z.string().regex(/^[A-Z]+\d+:[A-Z]+\d+$/)).max(1000),
 }).refine(sheet=>sheet.rows.length<=sheet.rowCount,'Rows exceed the sheet grid'),
}).strict();
export type SheetsPush=z.infer<typeof payloadSchema>;

export function verifySheetsPush(raw:Buffer,timestamp:string,signature:string,secret:string|undefined,now=Date.now()){
 if(!secret||secret.length<32)throw new Fault(503,'The Sheets push integration is not configured');
 if(!/^\d{13}$/.test(timestamp)||Math.abs(now-Number(timestamp))>5*60*1000||!/^[a-f0-9]{64}$/.test(signature))throw new Fault(401,'Invalid or expired Sheets push signature');
 const expected=createHmac('sha256',secret).update(timestamp+'.').update(raw).digest();
 if(!timingSafeEqual(expected,Buffer.from(signature,'hex')))throw new Fault(401,'Invalid or expired Sheets push signature');
}

// Register before browser CSRF/session middleware; only this route accepts HMAC authentication.
export function registerSheetsPush(app:Express,dependencies:{
 secret?:()=>string|undefined;
 accept?:(payload:SheetsPush,timestamp:string,digest:string)=>Promise<{count:number;errors:string[]}>;
}={}){
 app.post('/api/integrations/sheets/push',express.raw({type:'application/json',limit:'8mb'}),async(req,res)=>{
  res.setHeader('Cache-Control','no-store');
  if(!Buffer.isBuffer(req.body))throw new Fault(415,'Send a JSON snapshot');
  const timestamp=req.get('X-IPI-Timestamp')||'',signature=req.get('X-IPI-Signature')||'';
  verifySheetsPush(req.body,timestamp,signature,dependencies.secret?.()??process.env.SHEETS_PUSH_SECRET);
  let body:unknown;
  try{body=JSON.parse(req.body.toString('utf8'));}catch{throw new Fault(400,'Invalid JSON snapshot');}
  const payload=payloadSchema.parse(body);
  const accept=dependencies.accept??(await import('./samples.js')).pushSourceSheet;
  const result=await accept(payload,timestamp,createHash('sha256').update(req.body).digest('hex'));
  res.status(result.errors.length?207:200).json(result);
 });
}
