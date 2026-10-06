import {useContext,useEffect,useLayoutEffect,useRef,useState} from 'react';
import {Link,useSearchParams} from 'react-router-dom';
import {ArrowDown,ArrowUp,ArrowUpDown,ArrowUpRight,ChevronDown,Columns3,Database,Lock,RefreshCw,Rows3,Save,Search,Unlock,X} from 'lucide-react';
import type {Sample} from '../shared/model';
import {defaultWorksheetLayout,worksheetColumnDefinitions,type WorksheetColumnId,type WorksheetLayout} from '../shared/worksheet-layout';
import {useConfiguration} from './configuration';
import {api} from './api';
import {Badge,Empty,ErrorBox,Loading,Notice,Session,useCanEdit,useLoad,PageTitle} from './ui';

type WorksheetRecord=Sample&{
  sourceSheet?:string;
  sourceSection?:string;
  sourceRow?:string|number;
  recordUpdatedAt?:string;
  workspaceNote?:string;
  workspaceNoteUpdatedAt?:string;
};
type WorksheetResponse={items:WorksheetRecord[];total:number;page:number;limit:number;statuses:string[]};
const sortDirections:Record<string,'asc'|'desc'>={latest:'desc',recent:'desc',received:'desc',ml:'asc',name:'asc',category:'asc',source:'asc',status:'asc',note:'asc'};

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
  const {user}=useContext(Session);
  const isAdmin=user.role==='administrator';
  const notify=useContext(Notice);
  const [params,setParams]=useSearchParams();
  const [query,setQuery]=useState(params.get('q')||'');
  const [editingId,setEditingId]=useState<string|null>(null);
  const [noteDraft,setNoteDraft]=useState('');
  const [noteError,setNoteError]=useState('');
  const [saving,setSaving]=useState(false);
  const [savingLayout,setSavingLayout]=useState(false);
  const [layoutSaveError,setLayoutSaveError]=useState('');
  const [layoutDraft,setLayoutDraft]=useState<WorksheetLayout>(defaultWorksheetLayout);
  const [stickyOffsets,setStickyOffsets]=useState<Partial<Record<WorksheetColumnId,number>>>({});
  const tableRef=useRef<HTMLTableElement|null>(null);
  const request=new URLSearchParams(params);
  const sort=params.get('sort')||'latest';
  request.set('limit',params.get('limit')||'25');
  request.set('sort',sort);
  request.set('direction',params.get('direction')||sortDirections[sort]||'asc');
  const {data,error,reload}=useLoad<WorksheetResponse>(()=>api('/search?'+request.toString()),[request.toString()]);
  const {data:layout,setData:setLayout,error:layoutError,reload:reloadLayout}=useLoad<WorksheetLayout>(()=>api('/worksheet/layout'),[]);
  const columns=layoutDraft.columns.map(id=>worksheetColumnDefinitions.find(column=>column.id===id)!).filter(Boolean);
  const columnOrderKey=layoutDraft.columns.join('|');
  const activeDirection=params.get('direction')||(sortDirections[sort]||'asc');

  const setFilter=(key:string,value:string)=>setParams(current=>{
    if(value)current.set(key,value);else current.delete(key);
    if(key!=='page')current.set('page','1');
    return current;
  });
  const setSort=(nextSort:string,direction: 'asc'|'desc'=sortDirections[nextSort]||'asc')=>setParams(current=>{
    current.set('sort',nextSort);
    current.set('direction',direction);
    current.set('page','1');
    return current;
  });
  const sortColumn=(nextSort:string,initialDirection:'asc'|'desc')=>{
    const direction=sort===nextSort?(activeDirection==='asc'?'desc':'asc'):initialDirection;
    setSort(nextSort,direction);
  };

  useEffect(()=>{
    const timer=window.setTimeout(()=>{
      const current=params.get('q')||'';
      if(query!==current)setFilter('q',query.trim());
    },250);
    return()=>window.clearTimeout(timer);
  },[query,params]);
  useEffect(()=>setQuery(params.get('q')||''),[params]);
  useEffect(()=>{if(layout)setLayoutDraft(layout);},[layout]);
  useLayoutEffect(()=>{
    const headerCells=Array.from(tableRef.current?.tHead?.rows[0]?.cells||[]);
    let left=0;
    const next:Partial<Record<WorksheetColumnId,number>>={};
    columns.forEach((column,index)=>{
      next[column.id]=left;
      left+=headerCells[index]?.getBoundingClientRect().width||column.width;
    });
    setStickyOffsets(next);
  },[columnOrderKey]);
  useEffect(()=>{
    const table=tableRef.current;
    const head=table?.tHead;
    const rows=Array.from(table?.tBodies[0]?.rows||[]);
    if(!table||!head||!rows.length||layoutDraft.frozenRows===0)return;
    const measureRows=()=>{
      let top=head.getBoundingClientRect().height;
      const offsets=rows.map(row=>{
        const offset=top;
        top+=row.getBoundingClientRect().height;
        return offset;
      });
      rows.forEach((row,index)=>row.style.setProperty('--worksheet-sticky-row-top',`${offsets[index]}px`));
    };
    measureRows();
    const observer=new ResizeObserver(measureRows);
    observer.observe(head);
    rows.slice(0,layoutDraft.frozenRows).forEach(row=>observer.observe(row));
    return()=>observer.disconnect();
  },[data?.items,layoutDraft.columns,layoutDraft.frozenRows,editingId,noteDraft.length]);

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
  const saveLayout=async()=>{
    setSavingLayout(true);setLayoutSaveError('');
    try{
      const saved=await api<WorksheetLayout>('/worksheet/layout','PUT',layoutDraft);
      setLayout(saved);
      setLayoutDraft(saved);
      notify('Shared worksheet layout saved.');
    }catch(problem:any){setLayoutSaveError(problem.message||'The shared layout could not be saved.');}
    finally{setSavingLayout(false);}
  };
  const moveColumn=(id:WorksheetColumnId,step:-1|1)=>setLayoutDraft(current=>{
    const index=current.columns.indexOf(id),nextIndex=index+step;
    if(index<0||nextIndex<0||nextIndex>=current.columns.length)return current;
    const next=[...current.columns];
    [next[index],next[nextIndex]]=[next[nextIndex],next[index]];
    return {...current,columns:next};
  });
  const clearFilters=()=>{setQuery('');setParams({});setEditingId(null);};
  const page=data?.page||1;
  const limit=data?.limit||Number(request.get('limit'))||25;
  const total=data?.total||0;
  const first=total?((page-1)*limit)+1:0;
  const last=Math.min(page*limit,total);
  const pageCount=Math.max(1,Math.ceil(total/limit));
  const hasFilters=Boolean(query||params.get('status')||params.get('category'));
  const layoutDirty=Boolean(layout&&JSON.stringify(layout)!==JSON.stringify(layoutDraft));
  const columnStyle=(id:WorksheetColumnId,index:number)=>{
    if(index>=layoutDraft.frozenColumns)return undefined;
    const left=stickyOffsets[id]??columns.slice(0,index).reduce((sum,column)=>sum+column.width,0);
    return {left:`${left}px`};
  };

  const renderCell=(record:WorksheetRecord,column:WorksheetColumnId)=>{
    switch(column){
      case 'identity':return <>
        <Link to={`/samples/${record.id}`}><strong>{record.name||'Incomplete source record'}</strong><small>{record.ml||'No control number recorded'}</small><small className="worksheet-db-id" title={`Database record ID: ${record.id}`}><Database size={11}/>{shortDatabaseId(record.id)}</small></Link>
        {record.duplicate?<Badge tone="red">Duplicate ML · separate record</Badge>:null}
      </>;
      case 'type':return <span className="worksheet-category">{config.value.sampleTypes.find(type=>type.id===record.category)?.name||record.categoryLabel||record.category}</span>;
      case 'batch':return <><strong>{record.batch||'No batch recorded'}</strong><small>{record.received||'No received date'}</small></>;
      case 'source':return <><strong>{record.sourceSheet||'Source not recorded'}</strong><small>{record.sourceSection||'Section unavailable'}{record.sourceRow?` · row ${record.sourceRow}`:''}</small></>;
      case 'status':return <Badge tone={record.status==='RELEASED'?'green':'neutral'}>{record.status||'Not recorded'}</Badge>;
      case 'note':return editingId===record.id?<form className="worksheet-note-editor" onSubmit={event=>{event.preventDefault();void saveNote(record);}}>
        <label className="sr-only" htmlFor={`worksheet-note-${record.id}`}>Workspace note for {record.ml||record.name}</label>
        <textarea id={`worksheet-note-${record.id}`} autoFocus maxLength={500} rows={2} value={noteDraft} onChange={event=>setNoteDraft(event.target.value)} onKeyDown={event=>{if(event.key==='Escape')cancelNoteEdit();if(event.key==='Enter'&&(event.ctrlKey||event.metaKey)){event.preventDefault();void saveNote(record);}}} placeholder="Add a database-only note…"/>
        <small className="worksheet-note-count">{noteDraft.length}/500</small>
        {noteError?<small role="alert" className="worksheet-note-error">{noteError}</small>:null}
        <div className="worksheet-note-actions"><button className="button primary small" type="submit" disabled={saving}><Save size={14}/>{saving?'Saving…':'Save'}</button><button className="button secondary small" type="button" onClick={cancelNoteEdit} disabled={saving}><X size={14}/>Cancel</button></div>
      </form>:<div className="worksheet-note-value"><span>{record.workspaceNote||<em>No note</em>}</span>{record.workspaceNoteUpdatedAt?<small>Updated {formatTime(record.workspaceNoteUpdatedAt,config.value.general.timezone)}</small>:null}{canEdit?<button type="button" className="worksheet-edit-note" onClick={()=>beginNoteEdit(record)} aria-label={`${record.workspaceNote?'Edit':'Add'} workspace note for ${record.ml||record.name}`}>{record.workspaceNote?'Edit':'Add note'}</button>:null}</div>;
      case 'updated':return <><small>Updated {formatTime(record.recordUpdatedAt,config.value.general.timezone)}</small><Link className="worksheet-open-record" to={`/samples/${record.id}`}>Open <ArrowUpRight size={14}/></Link></>;
    }
  };

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
        <label className="worksheet-filter"><span>Sort</span><select aria-label="Sort worksheet records" value={sort} onChange={event=>setSort(event.target.value)}><option value="latest">Newest samples</option><option value="recent">Recently updated</option><option value="ml">ML number</option><option value="name">Sample name</option><option value="category">Sample type</option><option value="received">Received date</option><option value="source">Source location</option><option value="status">Source status</option><option value="note">Workspace note</option></select></label>
        <label className="worksheet-filter worksheet-page-size"><span>Rows</span><select aria-label="Rows per page" value={params.get('limit')||'25'} onChange={event=>setFilter('limit',event.target.value)}><option value="25">25</option><option value="50">50</option></select></label>
      </div>

      {isAdmin?<details className="worksheet-layout-details">
        <summary>
          <span className="worksheet-layout-summary-copy"><Columns3 size={16}/><span>Shared table layout</span></span>
          <span className={`worksheet-layout-lock ${layoutDraft.locked?'is-locked':'is-unlocked'}`}>{layoutDraft.locked?<Lock size={13}/>:<Unlock size={13}/>} {layoutDraft.locked?'Locked':'Unlocked'}<ChevronDown size={14}/></span>
        </summary>
        {layoutError?<div className="worksheet-layout-load-error"><ErrorBox message={layoutError}/><button className="text-button" type="button" onClick={reloadLayout}>Retry</button></div>:null}
        {layout?<div className="worksheet-layout-editor">
          <p className="worksheet-layout-help">Column order and frozen panes apply to every workspace user. Unlock the layout to make changes.</p>
          <div className="worksheet-layout-order" role="list" aria-label="Shared worksheet column order">
            {columns.map((column,index)=><div className="worksheet-layout-order-item" role="listitem" key={column.id}>
              <span><small>{String(index+1).padStart(2,'0')}</small><strong>{column.label}</strong></span>
              <span className="worksheet-order-actions">
                <button type="button" className="icon-button" aria-label={`Move ${column.label} earlier`} title={`Move ${column.label} earlier`} disabled={layoutDraft.locked||savingLayout||index===0} onClick={()=>moveColumn(column.id,-1)}><ArrowUp size={15}/></button>
                <button type="button" className="icon-button" aria-label={`Move ${column.label} later`} title={`Move ${column.label} later`} disabled={layoutDraft.locked||savingLayout||index===columns.length-1} onClick={()=>moveColumn(column.id,1)}><ArrowDown size={15}/></button>
              </span>
            </div>)}
          </div>
          <div className="worksheet-layout-options">
            <label><span><Columns3 size={14}/> Freeze columns</span><select aria-label="Freeze first columns" value={layoutDraft.frozenColumns} disabled={layoutDraft.locked||savingLayout} onChange={event=>setLayoutDraft(current=>({...current,frozenColumns:Number(event.target.value)}))}>{Array.from({length:columns.length},(_,index)=><option key={index} value={index}>{index===0?'None':`First ${index} ${index===1?'column':'columns'}`}</option>)}</select></label>
            <label><span><Rows3 size={14}/> Freeze data rows</span><select aria-label="Freeze first data rows" value={layoutDraft.frozenRows} disabled={layoutDraft.locked||savingLayout} onChange={event=>setLayoutDraft(current=>({...current,frozenRows:Number(event.target.value)}))}>{Array.from({length:6},(_,index)=><option key={index} value={index}>{index===0?'None':`First ${index} ${index===1?'row':'rows'}`}</option>)}</select></label>
            <div className="worksheet-layout-actions">
              <button type="button" className="button secondary small" disabled={savingLayout} onClick={()=>setLayoutDraft(current=>({...current,locked:!current.locked}))}>{layoutDraft.locked?<><Unlock size={14}/> Unlock layout</>:<><Lock size={14}/> Lock layout</>}</button>
              <button type="button" className="button primary small" disabled={!layoutDirty||savingLayout||!!layoutError} onClick={()=>void saveLayout()}><Save size={14}/>{savingLayout?'Saving…':'Save for everyone'}</button>
            </div>
          </div>
          {layoutDraft.locked?<p className="worksheet-layout-state"><Lock size={13}/> The saved column order and frozen panes are locked for all users.</p>:<p className="worksheet-layout-state"><Unlock size={13}/> Changes are drafts until you save them for everyone.</p>}
          {layoutSaveError?<div className="worksheet-layout-save-error" role="alert">{layoutSaveError}</div>:null}
        </div>:null}
      </details>:<div className="worksheet-layout-readonly" role="status"><Lock size={13}/><span>Shared layout · {layoutDraft.frozenColumns} frozen {layoutDraft.frozenColumns===1?'column':'columns'} · {layoutDraft.frozenRows} pinned {layoutDraft.frozenRows===1?'row':'rows'}</span></div>}

      <div className="worksheet-register-line"><span><Database size={14}/> Stored sample records</span>{data?<strong aria-live="polite">{total.toLocaleString()} {total===1?'record':'records'}</strong>:null}</div>
      <ErrorBox message={error}/>
      {!data&&!error?<Loading/>:null}
      {error?<div className="worksheet-retry"><button className="button secondary small" onClick={reload}>Retry table load</button></div>:null}
      {data&&!data.items.length?<Empty title={hasFilters?'No records match this view':'No records stored yet'}>{hasFilters?'Clear a filter or search term to widen the worksheet.':'Records appear here after a source sync has saved them to the workspace database.'}</Empty>:null}

      {data&&data.items.length? <>
        <div className="table-scroll worksheet-table-scroll" aria-label="Scrollable sample table">
          <table className="data-table worksheet-table" ref={tableRef}>
            <caption className="sr-only">Saved sample records with source traceability and workspace notes. Newest received samples appear first by default.</caption>
            <colgroup>{columns.map(column=><col key={column.id} style={{width:`${column.width}px`}}/>)}</colgroup>
            <thead><tr>{columns.map((column,index)=>{
              const sorted=sort===column.sort;
              const direction=sorted?activeDirection:column.defaultDirection;
              const SortIcon=sorted?(direction==='asc'?ArrowUp:ArrowDown):ArrowUpDown;
              return <th key={column.id} scope="col" aria-sort={sorted?(direction==='asc'?'ascending':'descending'):'none'} data-column={column.id} data-frozen-column={index<layoutDraft.frozenColumns||undefined} data-frozen-edge={index===layoutDraft.frozenColumns-1&&layoutDraft.frozenColumns>0||undefined} style={columnStyle(column.id,index)}>
                <button type="button" className="worksheet-sort-button" onClick={()=>sortColumn(column.sort,column.defaultDirection)} aria-label={`Sort by ${column.label}, ${direction==='asc'?'ascending':'descending'}`}><span>{column.label}</span><SortIcon size={14} aria-hidden="true"/></button>
              </th>;
            })}</tr></thead>
            <tbody>{data.items.map((record,rowIndex)=><tr key={record.id} data-frozen-row={rowIndex<layoutDraft.frozenRows||undefined}>
              {columns.map((column,index)=><td key={column.id} data-label={column.label} data-column={column.id} data-frozen-column={index<layoutDraft.frozenColumns||undefined} data-frozen-edge={index===layoutDraft.frozenColumns-1&&layoutDraft.frozenColumns>0||undefined} style={columnStyle(column.id,index)}>{renderCell(record,column.id)}</td>)}
            </tr>)}</tbody>
          </table>
        </div>
        <div className="pagination worksheet-pagination"><span>Showing {first.toLocaleString()}–{last.toLocaleString()} of {total.toLocaleString()} · Page {page} of {pageCount}</span><div className="worksheet-page-actions"><button className="button secondary small" aria-label="Previous worksheet page" disabled={page===1} onClick={()=>setFilter('page',String(page-1))}>Previous</button><button className="button secondary small" aria-label="Next worksheet page" disabled={page>=pageCount} onClick={()=>setFilter('page',String(page+1))}>Next</button></div><button type="button" className="text-button worksheet-clear" onClick={clearFilters}><X size={14}/> Clear filters</button></div>
      </>:null}
    </section>
  </div>;
}
