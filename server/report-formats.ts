import {access,mkdir,writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import path from 'node:path';
import {REPORT_FORMATS} from './report-formats.b64.js';
import {audit,db} from './db.js';
import {hash} from './domain.js';
import {privatePath,worker} from './reports.js';

export async function seedBundledReportFormats(){
 const names=REPORT_FORMATS.map(format=>format.name);
 const existingRows=(await db.query("SELECT id,data->>'name' AS name,data->>'path' AS path FROM templates WHERE data->>'name'=ANY($1::text[])",[names])).rows;
 const existing=new Map(existingRows.map(row=>[row.name,row]));

 for(const format of REPORT_FORMATS){
  const row=existing.get(format.name);
  const slug=format.name.toLocaleLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');
  const filePath=row?.path||`templates/report-formats/${slug}.docx`;
  const target=privatePath(filePath);
  await mkdir(path.dirname(target),{recursive:true});

  let missing=false;
  try{await access(target);}catch(error){
   if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;
   missing=true;
  }

  if(!missing&&row)continue;

  if(missing)await writeFile(target,Buffer.from(format.base64,'base64'));
  const manifest=await worker(['validate','--input',target]);

  if(row){
   await audit('system:bundled-template-repair','template_file_restored',row.id,{name:format.name,path:filePath});
   console.warn(`Restored missing bundled report format ${format.name}.`);
   continue;
  }

  const template={
   id:randomUUID(),
   name:format.name,
   family:'standard',
   category:format.category,
   revision:hash(format.base64),
   path:filePath,
   verified:true,
   manifest:{...manifest,requiredFields:[]}
  };
  await db.query('INSERT INTO templates(id,data) VALUES($1,$2)',[template.id,JSON.stringify(template)]);
  await audit('system:bundled-template-seed','template_seeded',template.id,{name:template.name,revision:template.revision,category:template.category});
 }
 console.log('Bundled report formats are ready.');
}
