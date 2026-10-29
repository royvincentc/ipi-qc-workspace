import {useEffect,useRef,useState} from 'react';
import Dialog from './dialog';
import {Loading,ErrorBox} from './ui';
import {ExternalLink} from './components/LabIcons';
import {estimatedReportProgress} from '../shared/report-progress';

export function ReportProgress({phase,focus=false}:{phase:string;focus?:boolean}){
 const [started]=useState(Date.now),[seconds,setSeconds]=useState(0);
 const ref=useRef<HTMLElement>(null);
 useEffect(()=>{
  if(focus){ref.current?.focus({preventScroll:true});ref.current?.scrollIntoView({block:'nearest'});}
  const timer=window.setInterval(()=>setSeconds(Math.floor((Date.now()-started)/1000)),1000);
  return()=>window.clearInterval(timer);
 },[started,focus]);
 const percent=estimatedReportProgress(seconds);
 return <section className="report-progress" ref={ref} tabIndex={-1} aria-label="Report preparation progress">
  <div role="status" aria-live="polite"><Loading compact label={phase}/></div>
  <div className="report-progress-label"><strong>Estimated progress · {percent}%</strong><span aria-live="off">{seconds}s elapsed</span></div>
  <progress max={100} value={percent} aria-label="Estimated report preparation progress" aria-valuetext={`${percent}% estimated; server completion pending`}/>
  <p>Usually takes 30–60 seconds. This is a time estimate; completion is confirmed only when the server responds.</p>
  <p role="status">{seconds>=60?'This is taking longer than usual. We are still waiting for the server; please keep this page open and avoid submitting again.':'Your request has started. Keep this page open; no need to click again.'}</p>
  <small>Document preparation does not approve the report or release the sample. External review and signature are still required.</small>
 </section>;
}

export function ReportPreviewButton({file,small=false}:{file:{id:string;name:string};small?:boolean}){
 const [open,setOpen]=useState(false),[attempt,setAttempt]=useState(0),[ready,setReady]=useState(false),[error,setError]=useState('');
 const url=`/api/files/${encodeURIComponent(file.id)}/preview`;
 useEffect(()=>{
  if(!open)return;
  const controller=new AbortController();
  setReady(false);setError('');
  // HEAD runs the existing conversion without transferring the PDF twice.
  void fetch(url,{method:'HEAD',credentials:'same-origin',signal:controller.signal}).then(response=>{
   if(!response.ok||!response.headers.get('content-type')?.includes('application/pdf'))throw new Error('The PDF preview could not be prepared. Retry, or download the original DOCX below.');
   setReady(true);
  }).catch(error=>{if(!controller.signal.aborted)setError(error.message);});
  return()=>controller.abort();
 },[open,attempt,url]);
 return <><button className={`button secondary${small?' small':''}`} aria-label={`Preview PDF for ${file.name}`} onClick={()=>setOpen(true)}><ExternalLink size={17}/>Preview PDF</button>
  {open?<Dialog title="Report PDF preview" wide onClose={()=>setOpen(false)}>
   <p className="report-preview-name">{file.name}</p>
   {!ready&&!error?<ReportProgress key={attempt} phase="Preparing the PDF preview…"/>:null}
   <ErrorBox message={error}/>
   {error?<button className="button secondary" onClick={()=>setAttempt(value=>value+1)}>Retry PDF preview</button>:null}
   {ready?<><p role="status">PDF preview ready. External review and signature are still required.</p><iframe className="report-preview-frame" title={`PDF preview for ${file.name}`} src={url}/><a className="button secondary" href={url} target="_blank" rel="noopener noreferrer">Open PDF in a new tab <ExternalLink size={16}/></a></>:null}
   <p><a className="button secondary" href={`/api/files/${encodeURIComponent(file.id)}/download`}>Download original DOCX</a></p>
  </Dialog>:null}
 </>;
}
