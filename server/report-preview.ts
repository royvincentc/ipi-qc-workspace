import {spawn} from 'node:child_process';
import {access,copyFile,mkdir,mkdtemp,readFile,rename,rm,stat} from 'node:fs/promises';
import path from 'node:path';
import {pathToFileURL} from 'node:url';
import {db,locked} from './db.js';
import {Fault} from './domain.js';
import {privatePath} from './reports.js';
import {reportArtifact,retainReportArtifact} from './report-artifacts.js';

export async function renderPdf(docxPath:string,pdfPath:string){
 const mode=process.env.PDF_RENDERER||(process.platform==='win32'?'word':'libreoffice');
 if(mode!=='libreoffice'&&(mode!=='word'||process.platform!=='win32'))throw new Fault(503,'Configure Word or LibreOffice to enable document previews.');
 await mkdir(path.dirname(pdfPath),{recursive:true});
 const folder=await mkdtemp(path.join(path.dirname(pdfPath),'preview-'));
 try{
  // Render an isolated copy so field updates and conversion cannot change the DOCX.
  const input=path.join(folder,'report.docx'),output=path.join(folder,'report.pdf');
  await copyFile(docxPath,input);
  const command=mode==='word'?'powershell.exe':process.env.SOFFICE_PATH||'soffice';
  const args=mode==='word'?['-NoProfile','-NonInteractive','-File',path.resolve('scripts/render-word.ps1'),input,output]:
   ['-env:UserInstallation='+pathToFileURL(path.join(folder,'profile')).href,'--headless','--convert-to','pdf','--outdir',folder,input];
  await new Promise<void>((resolve,reject)=>{
   const proc=spawn(command,args,{windowsHide:true,stdio:'ignore'});
   const timer=setTimeout(()=>{proc.kill();reject(new Fault(504,'PDF preview timed out. Try again or download the DOCX.'));},90_000);
   proc.on('error',()=>{clearTimeout(timer);reject(new Fault(503,'The document preview renderer is unavailable. Ask an administrator to check PDF_RENDERER.'));});
   proc.on('close',code=>{clearTimeout(timer);code===0?resolve():reject(new Fault(503,'PDF conversion failed. Download the DOCX or ask an administrator to check the renderer.'));});
  });
  if((await stat(output)).size>50_000_000)throw new Fault(413,'The PDF preview is too large. Download the DOCX instead.');
  if((await readFile(output)).subarray(0,5).toString()!=='%PDF-')throw new Fault(503,'The renderer did not create a valid PDF.');
  await rename(output,pdfPath);
 }finally{
  // mkdtemp created this directory directly under the destination folder.
  if(path.dirname(folder)===path.dirname(pdfPath))await rm(folder,{recursive:true,force:true});
 }
}

export async function ensureReportPdf(fileId:string,render:typeof renderPdf=renderPdf):Promise<string>{
 return locked('file-preview:'+fileId,async()=>{
  const file=(await db.query('SELECT data FROM files WHERE id=$1',[fileId])).rows[0]?.data;
  if(!file||file.kind!=='report')throw new Fault(404,'Generated report not found');
  const relative=file.pdf||`generated/${file.id}.pdf`,pdfPath=privatePath(relative);
  const archived=(await db.query("SELECT 1 FROM report_artifacts WHERE file_id=$1 AND format='pdf'",[file.id])).rows.length>0;
  let local=false;
  if(file.pdf)try{await access(pdfPath);local=true;}catch(error:any){if(error.code!=='ENOENT')throw error;}
  if(archived||local){
   await reportArtifact(file,'pdf',pdfPath);
  }else{
   if(!file.path)throw new Fault(409,'The original DOCX is unavailable. Open the saved draft and generate a new report.');
   const docxPath=privatePath(file.path);
   await reportArtifact(file,'docx',docxPath);
   await render(docxPath,pdfPath);
   await retainReportArtifact(file.id,'pdf',await readFile(pdfPath));
  }
  // Preserve Drive sync metadata which may have changed during conversion.
  await db.query("UPDATE files SET data=data||jsonb_build_object('pdf',$2::text) WHERE id=$1",[file.id,relative]);
  return relative;
 });
}
