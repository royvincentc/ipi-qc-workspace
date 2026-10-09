import {createHash,randomUUID} from 'node:crypto';
import {mkdir,readFile,writeFile,rename,unlink} from 'node:fs/promises';
import path from 'node:path';
import {db} from './db.js';
import {Fault} from './domain.js';
import {downloadDriveReport} from './google.js';

// Keep document bytes in PostgreSQL, separate from library metadata.
export async function retainReportArtifact(id:string,format:'docx'|'pdf',content:Buffer){
 const sha256=createHash('sha256').update(content).digest('hex');
 await db.query('INSERT INTO report_artifacts(file_id,format,content,sha256) VALUES($1,$2,$3,$4) ON CONFLICT(file_id,format) DO NOTHING',[id,format,content.toString('base64'),sha256]);
}

export async function reportArtifact(file:{id:string;sha256?:string;driveId?:string},format:'docx'|'pdf',localPath:string){
 const saved=(await db.query('SELECT content,sha256 FROM report_artifacts WHERE file_id=$1 AND format=$2',[file.id,format])).rows[0];
 let content:Buffer;
 if(saved){
  content=Buffer.from(saved.content,'base64');
  if(createHash('sha256').update(content).digest('hex')!==saved.sha256)throw new Fault(409,'The archived report failed its integrity check. Contact an administrator.');
 }else{
  try{content=await readFile(localPath);}catch(error:any){
   if(error.code!=='ENOENT')throw error;
   if(format==='docx'&&file.driveId)content=await downloadDriveReport(file.driveId);
   else throw new Fault(409,'This report file is no longer on the server. Open its saved draft and generate a new report, then sync it to Drive.');
  }
 }
 if(format==='docx'&&file.sha256&&createHash('sha256').update(content).digest('hex')!==file.sha256)throw new Fault(409,'The report does not match its recorded checksum. Contact an administrator.');
 if(!saved)await retainReportArtifact(file.id,format,content);
 // Atomic replacement prevents simultaneous previews from reading a partial copy.
 try{if((await readFile(localPath)).equals(content))return content;}catch(error:any){if(error.code!=='ENOENT')throw error;}
 await mkdir(path.dirname(localPath),{recursive:true});
 const temporary=localPath+'.'+randomUUID()+'.tmp';
 try{await writeFile(temporary,content);await rename(temporary,localPath);}
 finally{await unlink(temporary).catch(()=>{});}
 return content;
}
