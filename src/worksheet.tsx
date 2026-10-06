import {useContext,useEffect,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowUpRight,Database,RefreshCw,Save,Search,X} from 'lucide-react';
import type {Sample} from '../shared/model';
import {useConfiguration} from './configuration';
import {api} from './api';
import {Badge,Empty,ErrorBox,Loading,Notice,useCanEdit,useLoad,PageTitle} from './ui';

type WorksheetRecord=Sample&{
  sourceSheet?:string;
  sourceSection?:string;
  sourceRow?:string|number;
  recordUpdatedAt?:string;
  workspaceNote?:string;
  workspaceNoteUpdatedAt?:string;
};
type WorksheetResponse={items:WorksheetRecord[];total:number;page:number;limit:number;statuses:string[]};

function shortDatabaseId(id:string){return id.length>12?`${id.slice(0,8)}…${id.slice(-3)}`:id;}
function formatTime(value:string|undefined,timezone:string){
  if(!value)return '—';
  const date=new Date(value);
  if(Number.isNaN(date.getTime()))return value;
  return new Intl.DateTimeFormat(undefined,{month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',timeZone:timezone}).format(date);
}

export default function Worksheet(){
  const {config}=useConfiguration();
  const canEdit=useCanEdit();
  const notify=useContext(Notice);
  const [params,setParams]=useSearchParams();
  const [query,setQuery]=useState(params.get('q')||'');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [noteDraft,setNoteDraft]=useState('');
  const [noteError,setNoteError]=useState('');
  const [saving,setSaving]=useState(false);
  const request=new URLSearchParams(params);
  request.set('limit',params.get('limit')||'25');
  const {data,error,reload}=useLoad<WorksheetResponse>(()=>api('/search?'+request.toString()),[request.toString()]);
  const setFilter=(key:string,value:string)=>setParams(current=>{
    if(value)current.set(key,value);else current.delete(key);
    if(key!=='page')current.set('page','1');
    return current;
  });

  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      const current=params.get('q')||'';
      if(query!==current)setFilter('q',query.trim());
    },250);
    return()=>window.clearTimeout(timer);
  },[query,params]);
  useEffect(()=>setQuery(params.get('q')||''),[params]);

  const beginNoteEdit=(record:WorksheetRecord)=>{
    setEditingId(record.id);
    setNoteDraft(record.workspaceNote||'');
    setNoteError('');
  };
  const cancelNoteEdit=()=>{setEditingId(null);setNoteError('');};
  const saveNote=async(record:WorksheetRecord)=>{
    setSaving(true);setNoteError('');
    try{
      await api(`/worksheet/${encodeURIComponent(record.id)}/note`,'PUT',{note:noteDraft});
      setEditingId(null);
      notify('Worksheet note saved.');
      reload();
    }catch(problem:any){setNoteError(problem.message||'The note could not be saved.');}
    finally{setSaving(false);}
  };
  const clearFilters=()=>{setQuery('');setParams({});setEditingId(null);};
  const page=data?.page||1;
  const limit=data?.limit||Number(request.get('limit'))||25;
  const total=data?.total||0;
  const first=total?((page-1)*limit)+1:0;
  const last=Math.min(page*limit,total);
  const pageCount=Math.max(1,Math.ceil(total/limit));
  const hasFilters=Boolean(query||params.get('status')||params.get('category'));

  return <div className="worksheet-page">
    <PageTitle title="Worksheet" description="A database-backed sample register with source traceability and editable workspace notes." action={<button className="button secondary worksheet-refresh" onClick={reload} aria-label="Refresh worksheet records"><RefreshCw size={16}/> Refresh table</button>}/>
    <section className="panel worksheet-panel" aria-label="Sample worksheet">
      <nav className="worksheet-types" aria-label="Filter by sample type">
        <button type="button" className="worksheet-type-tab" aria-pressed={!params.get('category')} onClick={()=>setFilter('category','')}>All records</button>
        {config.value.sampleTypes.map(type=><button key={type.id} type="button" className="worksheet-type-tab" aria-pressed={params.get('category')===type.id} onClick={()=>setFilter('category',type.id)}>{type.name}</button>)}
      </nav>

      <div className="worksheet-toolbar">
        <label className="search search-field worksheet-search">
          <Search size={17}/><span className="sr-only">Search worksheet records</span>
          <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search ML, sample, batch, source or note…"/>
        </label>
        <label className="worksheet-filter"><span>Status</span><select aria-label="Filter by source status" value={params.get('status')||''} onChange={event=>setFilter('status',event.target.value)}><option value="">All statuses</option>{(data?.statuses||[]).map(status=><option key={status} value={status}>{status}</option>)}</select></label>
        <label className="worksheet-filter"><span>Sort</span><select aria-label="Sort worksheet records" value={params.get('sort')||'recent'} onChange={event=>setFilter('sort',event.target.value)}><option value="recent">Recently updated</option><option value="ml">ML number</option><option value="name">Sample name</option><option value="received">Received date</option></select></label>
        <label className="worksheet-filter worksheet-page-size"><span>Rows</span><select aria-label="Rows per page" value={params.get('limit')||'25'} onChange={event=>setFilter('limit',event.target.value)}><option value="25">25</option><option value="50">50</option></select></label>
      </div>

      <div className="worksheet-register-line"><span><Database size={14}/> Stored sample records</span>{data?<strong aria-live="polite">{total.toLocaleString()} {total===1?'record':'records'}</strong>:null}</div>
      <ErrorBox message={error}/>
      {!data&&!error?<Loading/>:null}
      {error?<div className="worksheet-retry"><button className="button secondary small" onClick={reload}>Retry table load</button></div>:null}
      {data&&!data.items.length?<Empty title={hasFilters?'No records match this view':'No records stored yet'}>{hasFilters?'Clear a filter or search term to widen the worksheet.':'Records appear here after a source sync has saved them to the workspace database.'}</Empty>:null}

      {data&&data.items.length? <>
        <div className="table-scroll worksheet-table-scroll">
          <table className="data-table worksheet-table">
            <caption className="sr-only">Saved sample records with source traceability and workspace notes</caption>
            <thead><tr><th>Sample / control number</th><th>Sample type</th><th>Batch / received</th><th>Source location</th><th>Source status</th><th>Workspace note</th><th>Workspace record</th></tr></thead>
            <tbody>{data.items.map(record=><tr key={record.id}>
              <td data-label="Sample / control number" data-column="identity" className="worksheet-identity">
                <Link to={`/samples/${record.id}`}><strong>{record.name||'Incomplete source record'}</strong><small>{record.ml||'No control number recorded'}</small><small className="worksheet-db-id" title={`Database record ID: ${record.id}`}><Database size={11}/>{shortDatabaseId(record.id)}</small></Link>
                {record.duplicate?<Badge tone="red">Duplicate ML · separate record</Badge>:null}
              </td>
              <td data-label="Sample type"><span className="worksheet-category">{config.value.sampleTypes.find(type=>type.id===record.category)?.name||record.categoryLabel||record.category}</span></td>
              <td data-label="Batch / received" data-column="batch"><strong>{record.batch||'No batch recorded'}</strong><small>{record.received||'No received date'}</small></td>
              <td data-label="Source location" data-column="source"><strong>{record.sourceSheet||'Source not recorded'}</strong><small>{record.sourceSection||'Section unavailable'}{record.sourceRow?` · row ${record.sourceRow}`:''}</small></td>
              <td data-label="Source status" data-column="status"><Badge tone={record.status==='RELEASED'?'green':'neutral'}>{record.status||'Not recorded'}</Badge></td>
              <td data-label="Workspace note" data-column="note">
                {editingId===record.id?<form className="worksheet-note-editor" onSubmit={event=>{event.preventDefault();void saveNote(record);}}>
                  <label className="sr-only" htmlFor={`worksheet-note-${record.id}`}>Workspace note for {record.ml||record.name}</label>
                  <textarea id={`worksheet-note-${record.id}`} autoFocus maxLength={500} rows={2} value={noteDraft} onChange={event=>setNoteDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')cancelNoteEdit();if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();void saveNote(record);}}} placeholder="Add a database-only note…"/>
                  <small className="worksheet-note-count">{noteDraft.length}/500</small>
                  {noteError?<small role="alert" className="worksheet-note-error">{noteError}</small>:null}
                  <div className="worksheet-note-actions"><button className="button primary small" type="submit" disabled={saving}><Save size={14}/>{saving?'Saving…':'Save'}</button><button className="button secondary small" type="button" onClick={cancelNoteEdit} disabled={saving}><X size={14}/>Cancel</button></div>
                </form>:<div className="worksheet-note-value"><span>{record.workspaceNote||<em>No note</em>}</span>{record.workspaceNoteUpdatedAt?<small>Updated {formatTime(record.workspaceNoteUpdatedAt,config.value.general.timezone)}</small>:null}{canEdit?<button type="button" className="worksheet-edit-note" onClick={()=>beginNoteEdit(record)} aria-label={`${record.workspaceNote?'Edit':'Add'} workspace note for ${record.ml||record.name}`}>{record.workspaceNote?'Edit':'Add note'}</button>:null}</div>}
              </td>
              <td data-label="Workspace record" data-column="updated"><small>Updated {formatTime(record.recordUpdatedAt,config.value.general.timezone)}</small><Link className="worksheet-open-record" to={`/samples/${record.id}`}>Open <ArrowUpRight size={14}/></Link></td>
            </tr>)}</tbody>
          </table>
        </div>
        <div className="pagination worksheet-pagination"><span>Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()} · Page {page} of {pageCount}</span><div className="worksheet-page-actions"><button className="button secondary small" aria-label="Previous worksheet page" disabled={page===1} onClick={()=>setFilter('page',String(page-1))}>Previous</button><button className="button secondary small" aria-label="Next worksheet page" disabled={page>=pageCount} onClick={()=>setFilter('page',String(page+1))}>Next</button></div><button type="button" className="text-button worksheet-clear" onClick={clearFilters}><X size={14}/> Clear filters</button></div>
      </>:null}
    </section>
  </div>;
}
