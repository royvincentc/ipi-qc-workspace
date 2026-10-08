import Dialog from './dialog';
import {useContext,useEffect,useState} from 'react';
import {ArrowUpRight,CloudUpload,FileText,RefreshCw} from 'lucide-react';
import {api} from './api';
import {PageTitle,useLoad,Notice,Session,SearchInput,ErrorBox,Loading,Empty,Badge} from './ui';

const kindLabels:Record<string,string>={
 report:'Generated report',
 reference:'Historical reference',
 'template-candidate':'Prepared template',
 library:'Authorized Drive file',
};

export default function FileLibrary(){
 const [q,setQ]=useState(''),[search,setSearch]=useState(''),[kind,setKind]=useState(''),[sort,setSort]=useState('numeric'),[page,setPage]=useState(1),[busy,setBusy]=useState(false),[syncing,setSyncing]=useState(''),[preview,setPreview]=useState<any>();
 const notify=useContext(Notice),{user,demo}=useContext(Session);
 useEffect(()=>{const t=setTimeout(()=>{setSearch(q);setPage(1);},250);return()=>clearTimeout(t);},[q]);
 const params=new URLSearchParams({q:search,kind,sort,page:String(page)});const {data,error,reload}=useLoad(()=>api('/library-items?'+params),[params.toString()]);
 async function syncReport(id:string){setSyncing(id);try{await api(`/files/${id}/sync`,'POST');notify('Report synced to Google Drive');reload();}catch(e:any){notify(e.message,true);}finally{setSyncing('');}}
 const refreshLibrary=async()=>{setBusy(true);try{const r=await api('/library/sync','POST');notify(`Library refreshed: ${r.count} files`);reload();}catch(e:any){notify(e.message,true);}finally{setBusy(false);}};
 const syncAll=async()=>{setSyncing('all');try{const r=await api('/files/sync-all','POST');notify(`${r.synced} reports synced to Drive · ${r.skipped} already synced${r.failed.length?` · ${r.failed.length} failed; retry the reports marked “Drive sync needs attention”`:''}`,r.failed.length>0);reload();}catch(e:any){notify(e.message,true);}finally{setSyncing('');}};
 const pageCount=data?Math.max(1,Math.ceil(data.total/data.limit)):1;

 return <div className="library-page">
  <PageTitle title="Files & documents" description="Find generated reports, historical references and authorized library files." action={<div className="library-header-actions">{user.role==='administrator'?<button className="button secondary" disabled={demo||busy||!!syncing} title={demo?'Drive refresh is unavailable in the local demo':undefined} onClick={refreshLibrary}><RefreshCw size={16}/>{busy?'Refreshing…':'Refresh library'}</button>:null}{user.role!=='viewer'?<button className="button secondary" disabled={demo||busy||!!syncing} title={demo?'Drive sync is unavailable in the local demo':'Upload all pending generated reports, across all pages and filters'} onClick={syncAll}><CloudUpload size={16}/>{syncing==='all'?'Syncing reports…':'Sync all to drive'}</button>:null}</div>}/>
  <section className="panel library-panel" aria-label="Document library">
   <div className="library-toolbar">
    <SearchInput value={q} onChange={setQ} placeholder="Find a document or control number…"/>
    <label className="library-filter"><span className="sr-only">Document type</span><select aria-label="Document type" value={kind} onChange={e=>{setKind(e.target.value);setPage(1);}}><option value="">All documents</option><option value="report">Generated reports</option><option value="reference">Historical references</option><option value="template-candidate">Prepared templates</option><option value="library">Drive library</option></select></label>
    <label className="library-filter library-sort"><span className="sr-only">Document order</span><select aria-label="Document order" value={sort} onChange={e=>{setSort(e.target.value);setPage(1);}}><option value="numeric">Identifier order ↑</option><option value="recent">Newest first</option></select></label>
   </div>
   <ErrorBox message={error}/>
   {!data?<Loading/>:data.items.length?<>
    <div className="library-list-heading"><span>Document</span><span>Record details</span><span className="sr-only">Actions</span></div>
    <div className="library-list">
     {data.items.map((f:any)=><article className="library-row" key={f.id} aria-label={`Document ${f.name}`}>
      <FileText className="library-file-icon" size={20} aria-hidden="true"/>
      <div className="library-document"><strong title={f.name}>{f.name}</strong><small>{kindLabels[f.kind]||'Document'}{f.resultRevision?` · Result revision ${f.resultRevision}`:''}</small></div>
      <div className="library-record-state">{f.driveSyncError?<Badge tone="amber">Drive sync needs attention</Badge>:f.externalReviewRequired?<Badge tone="amber">External review required</Badge>:f.driveSyncedAt?<Badge tone="green">Synced to Drive</Badge>:<span className="library-state-quiet">Available</span>}</div>
      <div className="library-actions">
       {f.hasPreview?<button className="button secondary small" aria-label={`Preview ${f.name}`} onClick={()=>setPreview(f)}>Preview</button>:null}
       {f.sourceUrl?<><a className="button secondary small" aria-label={`Open ${f.name} in Drive`} href={f.sourceUrl} target="_blank" rel="noreferrer">Open in Drive <ArrowUpRight size={14}/></a>{f.kind==='report'?<a className="button secondary small" aria-label={`Download ${f.name}`} href={`/api/files/${f.id}/download`}>Download</a>:null}</>:f.kind==='report'&&user.role!=='viewer'&&!demo?<button className="button secondary small" aria-label={`Sync ${f.name} to Drive`} disabled={!!syncing} onClick={()=>syncReport(f.id)}><CloudUpload size={14}/>{syncing===f.id?'Syncing…':'Sync to Drive'}</button>:<a className="button secondary small" aria-label={`Download ${f.name}`} href={`/api/files/${f.id}/download`}>Download</a>}
      </div>
     </article>)}
    </div>
    <div className="pagination library-pagination"><span>{data.total} {data.total===1?'document':'documents'} <span className="library-page-position">· Page {data.page} of {pageCount}</span></span><div className="library-page-actions"><button className="button secondary small" disabled={page===1} onClick={()=>setPage(p=>p-1)}>Previous</button><button className="button secondary small" disabled={page*data.limit>=data.total} onClick={()=>setPage(p=>p+1)}>Next</button></div></div>
   </>:<Empty title={q||kind?'No documents match these filters':'Your documents will appear here'}>Generate a report or ask an administrator to connect an authorized library folder.</Empty>}
  </section>
  {preview?<Dialog title={preview.name} onClose={()=>setPreview(undefined)} wide><iframe title="Document preview" src={`/api/files/${preview.id}/preview`}/></Dialog>:null}
 </div>;
}
