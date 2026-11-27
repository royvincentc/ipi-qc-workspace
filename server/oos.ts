import type {Express} from 'express';
import {z} from 'zod';
import {randomUUID,createHash} from 'node:crypto';
import {mkdir,writeFile,readFile,access,unlink} from 'node:fs/promises';
import path from 'node:path';
import {db,demo,audit} from './db.js';
import {requireRole} from './auth.js';
import {Fault} from './domain.js';
import {privatePath,storage,worker} from './reports.js';
import {oosDocuments,oosFileName,oosTypes,oosValues} from '../shared/oos.js';

const text=(max=300)=>z.string().trim().max(max);
const date=z.string().regex(/^\d{4}-\d{2}-\d{2}$/);
const formSchema=z.object({product:text().min(1),shortName:text(40).min(1),fill:text(40),batch:text(500).min(1),type:z.enum(oosTypes),number:z.string().regex(/^\d{1,4}$/),
 parameter:text(80).min(1),result:text(200).min(1),specification:text(200).min(1),dateObserved:date,dateRetest:date,includedProducts:text(1000),analyst:text(120).min(1),analystAbbrev:text(10).min(1)});
// Templates hold signatory names, so they live outside Git (private/ is ignored).
const templateDir=()=>path.resolve(process.env.OOS_TEMPLATE_DIR||path.join(storage,'oos-templates'));

export function registerOos(app:Express){
 app.post('/api/oos/generate',requireRole('administrator','analyst'),async(req,res)=>{
  const form=formSchema.parse(req.body);
  if(form.dateRetest<form.dateObserved)throw new Fault(400,'The retest date cannot be before the date the deviation was observed.');
  const values=oosValues(form),dir=templateDir();
  for(const document of oosDocuments)await access(path.join(dir,`${document}.docx`)).catch(()=>{throw new Fault(409,`OOS template "${document}.docx" is missing from ${dir}`);});
  await mkdir(privatePath('generated'),{recursive:true});
  const payloadPath=privatePath(`generated/${randomUUID()}.json`);await writeFile(payloadPath,JSON.stringify(values));
  const mlir=`MLIR/${values.type}-${values.year}-${values.number}`,files=[];
  try{
   for(const document of oosDocuments){
    const id=randomUUID(),file=`generated/${id}.docx`;
    await worker(['oos','--input',path.join(dir,`${document}.docx`),'--payload',payloadPath,'--output',privatePath(file)]);
    const record={id,name:oosFileName(form,document),kind:'oos',document,mlir,path:file,createdAt:new Date().toISOString(),sha256:createHash('sha256').update(await readFile(privatePath(file))).digest('hex'),analystEmail:req.user.email,demo};
    await db.query('INSERT INTO files(id,data) VALUES($1,$2)',[id,JSON.stringify(record)]);
    const {path:_,...safe}=record;files.push(safe);
   }
  }finally{await unlink(payloadPath).catch(()=>{});}
  await audit(req.user.email,'oos_generated',mlir,{parameter:values.parameter,batch:values.batchNo,files:files.map(f=>f.id)});
  res.json({mlir,files});
 });
}
