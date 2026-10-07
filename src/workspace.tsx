import {useContext,useEffect,useRef,useState} from 'react';
import type {KeyboardEvent} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {Search,Plus,ArrowRight,FileText,FlaskConical,RefreshCw,Activity,SlidersHorizontal,ChevronRight,FolderOpen} from 'lucide-react';
import {api} from './api';
import {useCatalog,useConfiguration,useUnsaved} from './configuration';
import {LabMotionMark,PageTitle,Field,ErrorBox,Loading,Badge,Empty,Notice,Session,useLoad,useCanEdit,SampleList} from './ui';
import type {Sample, Draft} from '../shared/model';
import {environmentalCategoryOptions,validateIntake} from '../shared/configuration';
import {SampleWorkbench} from './Workbench';

function parseActivityDate(value: unknown) {
  if (!value) return undefined;
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

export function GlobalSearch(){const {categories}=useCatalog();const [q,setQ]=useState(''),[items,setItems]=useState<Sample[]>([]);useEffect(()=>{let active=true;const timer=setTimeout(()=>{if(q.trim().length<2){setItems([]);return;}api(`/search?q=${encodeURIComponent(q)}&limit=5`).then(r=>{if(active)setItems(r.items);}).catch(()=>setItems([]));},250);return()=>{active=false;clearTimeout(timer);};},[q]);return <div className="global-search"><Search size={18}/><input aria-label="Find a sample anywhere" placeholder="Find a sample, batch or ML number…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQ('');}}/>{q.length>=2?<div className="search-results">{items.map(s=><Link key={s.id} to={`/samples/${s.id}`} onClick={()=>setQ('')}><strong>{s.ml}</strong><span>{s.name}</span><small>{s.categoryLabel||categories[s.category]||s.category} · Batch {s.batch}</small></Link>)}{!items.length?<p>No matching samples.</p>:null}<Link to={`/samples?q=${encodeURIComponent(q)}`} onClick={()=>setQ('')}>View all matches →</Link></div>:null}</div>;}
export function Dashboard(){
  const {data,error}=useLoad(()=>api('/work'));
  const {config}=useConfiguration();
  const edit=useCanEdit();
  const [activeTab, setActiveTab] = useState('samples');
  const [selectedSampleId,setSelectedSampleId]=useState('');
  const [dashboardQuery,setDashboardQuery]=useState('');
  const [dashboardType,setDashboardType]=useState('');
  const [dashboardStatus,setDashboardStatus]=useState('');
  const [filtersOpen,setFiltersOpen]=useState(false);
  const [filesTab,setFilesTab]=useState<'reference'|'report'>('reference');
  const [selectedFile,setSelectedFile]=useState<any>();
  const {data:fileListing,error:fileError}=useLoad(()=>api(`/library-items?kind=${filesTab}&sort=recent&page=1`),[filesTab]);

  if(!data)return error?<ErrorBox message={error}/>:<Loading/>;
  
  const openDrafts = data.drafts.filter((d:any)=>!d.generated);
  const draftSampleIds = new Set(openDrafts.map((draft:any)=>String(draft.sample?.id||'')).filter(Boolean));
  const journeySamples = [...data.recent].sort((a:any,b:any)=>Number(draftSampleIds.has(String(b.id))) - Number(draftSampleIds.has(String(a.id))));
  const reportDraftStatus=(draft:any)=>draft.referenceIssue?'Reference needs attention':draft.missing?`${draft.missing} required item${draft.missing===1?'':'s'} missing`:'Inputs complete';
  const categories=[...new Set(data.recent.map((sample:any)=>sample.category).filter(Boolean))] as string[];
  const categoryName=(id:string)=>config.value.sampleTypes.find(type=>type.id===id)?.name||id;
  const statuses=[...new Set(data.recent.map((sample:any)=>sample.status||'Not recorded'))] as string[];
  const matchesDashboardFilters=(sample:any)=>{
    const haystack=`${sample.ml||''} ${sample.name||''} ${sample.batch||''}`.toLowerCase();
    return (!dashboardQuery||haystack.includes(dashboardQuery.toLowerCase()))&&(!dashboardType||sample.category===dashboardType)&&(!dashboardStatus||(sample.status||'Not recorded')===dashboardStatus);
  };
  const visibleSamples=data.recent.filter(matchesDashboardFilters);
  const visibleDrafts=openDrafts.filter((draft:any)=>matchesDashboardFilters(draft.sample||{}));
  const hasDashboardFilters=Boolean(dashboardQuery||dashboardType||dashboardStatus);
  const recordRows=activeTab==='samples'
    ?visibleSamples.slice(0,6).map((sample:any)=>({sample,to:`/samples/${sample.id}`,status:sample.status||'Not recorded'}))
    :visibleDrafts.slice(0,6).map((draft:any)=>({sample:draft.sample,to:`/reports/${draft.id}`,status:reportDraftStatus(draft),draft}));
  const visibleActivity=data.recent.slice(0,4);
  
  return (
    <div className="dashboard-layout dashboard-redesign">
      <header className="dashboard-heading" aria-labelledby="dashboard-welcome-heading">
        <div><h1 id="dashboard-welcome-heading">Microbiology workspace</h1><p className="sr-only">Sample intake, source records, and report preparation.</p></div>
      </header>

      <SampleWorkbench samples={journeySamples} drafts={openDrafts} edit={edit} categoryName={categoryName} assays={config.value.tests} selectedSampleId={selectedSampleId} onSelectSample={setSelectedSampleId}/>
      <div className="dashboard-workspace">
        <section className="dashboard-queue" aria-labelledby="dashboard-queue-heading">
          <div className="dashboard-queue-heading">
            <h2 id="dashboard-queue-heading">Find records</h2>
            <Link className="dashboard-queue-all" to={activeTab === 'samples' ? '/samples' : '/reports'}>View all <ArrowRight size={14} aria-hidden="true" focusable="false"/></Link>
          </div>

          <div className="record-search-row">
            <label className="record-search"><Search size={18} aria-hidden="true"/><input aria-label="Search recent records by control number, product, batch, or location" placeholder="Search by sample ID, product, batch or location" value={dashboardQuery} onChange={event=>setDashboardQuery(event.target.value)}/></label>
            <button type="button" className="record-filter-trigger" aria-label="Open record filters" aria-expanded={filtersOpen} onClick={()=>setFiltersOpen(value=>!value)}><SlidersHorizontal size={19}/></button>
          </div>

          <div className={`record-filter-panel ${filtersOpen?'is-open':''}`} aria-hidden={!filtersOpen} inert={!filtersOpen}>
            <div className="tabs dashboard-record-tabs" role="group" aria-label="Record category">
              <button type="button" className={`tab ${activeTab==='samples'?'active':''}`} aria-pressed={activeTab==='samples'} onClick={()=>setActiveTab('samples')}>Recent samples</button>
              <button type="button" className={`tab ${activeTab==='reports'?'active':''}`} aria-pressed={activeTab==='reports'} onClick={()=>setActiveTab('reports')}>Open report drafts <span className="tab-badge">{openDrafts.length}</span></button>
            </div>
            <label><span className="sr-only">Filter by sample type</span><select aria-label="Filter dashboard by sample type" value={dashboardType} onChange={event=>setDashboardType(event.target.value)}><option value="">All types</option>{categories.map(category=><option key={category} value={category}>{categoryName(category)}</option>)}</select></label>
            <label><span className="sr-only">Filter by source status</span><select aria-label="Filter dashboard by status" value={dashboardStatus} onChange={event=>setDashboardStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(status=><option key={status}>{status}</option>)}</select></label>
            {hasDashboardFilters?<button type="button" className="text-button dashboard-clear-filters" onClick={()=>{setDashboardQuery('');setDashboardType('');setDashboardStatus('');}}>Clear filters</button>:null}
          </div>

          <div className="dashboard-record-list" role="list" aria-label={activeTab==='samples'?'Recent samples':'Open report drafts'}>
            {recordRows.length?recordRows.map(({sample,to,status,draft}:any)=>{
              const selected=selectedSampleId===sample.id;
              return <article className={`dashboard-record-row ${selected?'is-current':''}`} role="listitem" key={draft?.id||sample.id}>
                <button type="button" className="record-select" aria-current={selected?'true':undefined} aria-label={`Use ${sample.ml||sample.name} in the workflow`} onClick={()=>setSelectedSampleId(sample.id)}>
                  <span className="record-icon"><FlaskConical size={20}/></span>
                  <span className="record-name"><strong>{sample.name||'Incomplete record'}</strong><small>{categoryName(sample.category)}<span className="record-status">{status}</span></small></span>
                  <span className="record-number"><strong>{sample.ml||'Not recorded'}</strong><small>{sample.batch||sample.source?.section||'Not recorded'}</small></span>
                </button>
                <Link className="record-open" to={to} aria-label={draft?`Continue report for ${sample.ml}`:`Open sample ${sample.ml}`}><ChevronRight size={21}/></Link>
              </article>;
            }):<div className="dashboard-record-empty"><strong>{hasDashboardFilters?`No ${activeTab==='samples'?'samples':'drafts'} match these filters`:activeTab==='samples'?'No recent samples':'No open report drafts'}</strong><span>{hasDashboardFilters?'Clear a filter or change your search.':activeTab==='samples'?'Log a sample or browse the source history.':'Prepare a report from a sample record to begin.'}</span></div>}
          </div>
        </section>

        <section className="dashboard-files" aria-labelledby="dashboard-files-heading">
          <div className="dashboard-files-heading">
            <h2 id="dashboard-files-heading">Files &amp; reports</h2>
            <div className="dashboard-files-actions">
              <Link className="icon-button" to="/reports" aria-label="Prepare a report" title="Prepare a report"><Plus size={22}/></Link>
              <Link className="icon-button" to="/library" aria-label="Open file library" title="Open file library"><FolderOpen size={21}/></Link>
            </div>
          </div>
          <div className="tabs dashboard-files-tabs" role="group" aria-label="File category">
            <button type="button" className={`tab ${filesTab==='reference'?'active':''}`} aria-pressed={filesTab==='reference'} onClick={()=>{setFilesTab('reference');setSelectedFile(undefined);}}>Reference files</button>
            <button type="button" className={`tab ${filesTab==='report'?'active':''}`} aria-pressed={filesTab==='report'} onClick={()=>{setFilesTab('report');setSelectedFile(undefined);}}>Generated reports</button>
          </div>
          <div className={`dashboard-file-preview ${selectedFile?'has-selected-file':''}`}>
            {selectedFile?<>
              <div className="selected-file-heading"><FileText size={21}/><span><strong>{selectedFile.name}</strong><small>{selectedFile.kind==='report'?'Generated report':'Reference file'}{selectedFile.externalReviewRequired?' · External review required':''}</small></span><button className="file-close" type="button" aria-label="Clear file preview" onClick={()=>setSelectedFile(undefined)}>×</button></div>
              {selectedFile.hasPreview?<iframe title={`Preview of ${selectedFile.name}`} src={`/api/files/${selectedFile.id}/preview#toolbar=0&navpanes=0`}/>:<p className="file-no-preview">Preview unavailable. <a href={`/api/files/${selectedFile.id}/download`}>Download the file</a>.</p>}
            </>:fileError?<p className="file-state" role="alert">Files could not be loaded. Open the File Library to retry.</p>:!fileListing?<p className="file-state" role="status">Loading {filesTab==='reference'?'reference files':'generated reports'}…</p>:fileListing.items.length?<div className="dashboard-file-list" role="list" aria-label={filesTab==='reference'?'Reference files':'Generated reports'}>
              {fileListing.items.slice(0,2).map((file:any)=><button key={file.id} type="button" className="dashboard-file-row" role="listitem" onClick={()=>setSelectedFile(file)}><FileText size={20}/><span><strong>{file.name}</strong><small>{file.ml||'No linked control number'}{file.externalReviewRequired?' · External review required':''}</small></span><ChevronRight size={18}/></button>)}
              <Link className="dashboard-files-all" to="/library">Open all {filesTab==='reference'?'reference files':'generated reports'} <ArrowRight size={14}/></Link>
            </div>:<div className="dashboard-file-empty"><FileText size={29}/><strong>{filesTab==='reference'?'No reference files available':'No generated reports available'}</strong><span>{filesTab==='reference'?'Connected reference files will appear in the File Library.':'Prepare a report from a sample record to create a preview.'}</span><Link to={filesTab==='reference'?'/library':'/reports'}>{filesTab==='reference'?'Open File Library':'Prepare a report'} <ArrowRight size={14}/></Link></div>}
          </div>
        </section>
      </div>

      <footer className="dashboard-footer"><span className="dashboard-footer-info" aria-hidden="true">i</span><span>External review and signature required. Sample release is separate.</span></footer>
      <details className="dashboard-activity-disclosure">
        <summary><Activity size={15}/> Latest source entries</summary>
        {visibleActivity.length?<div className="timeline">{visibleActivity.map((sample:any,index:number)=><div key={sample.id||sample.ml} className={`timeline-item ${index===0?'active':''}`}><div className="timeline-time">{(parseActivityDate(sample.received)||parseActivityDate(sample.source?.observedAt))?.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})||'—'}</div><div className="timeline-content"><div className="timeline-title">Sample logged</div><Link className="timeline-desc mono" to={`/samples/${sample.id}`}>{sample.ml}</Link></div></div>)}</div>:<Empty title="No recent activity">New sample entries will appear here.</Empty>}
        <Link className="dashboard-activity-all" to="/samples">Browse sample history <ArrowRight size={14}/></Link>
      </details>

    </div>
  );
}
export function SampleSearch(){const {config}=useConfiguration();const [params,setParams]=useSearchParams();const [q,setQ]=useState(params.get('q')||'');const [busy,setBusy]=useState(false);const notify=useContext(Notice);const edit=useCanEdit();const [columns,setColumns]=useState(()=>{try{return JSON.parse(localStorage.getItem('ipi.columns')||'["batch","received","status"]') as string[];}catch{return ['batch','received','status'];}});const request=new URLSearchParams(params);request.set('limit',String(config.value.general.pageSize));const {data,error,reload}=useLoad(()=>api('/search?'+request),[request.toString()]);const set=(key:string,value:string)=>{setParams(p=>{p.set(key,value);if(key!=='page')p.set('page','1');return p;});};useEffect(()=>{const timer=setTimeout(()=>{if(q!==(params.get('q')||''))set('q',q);},250);return()=>clearTimeout(timer);},[q,params]);useEffect(()=>{try{localStorage.setItem('ipi.columns',JSON.stringify(columns));}catch{}},[columns]);useEffect(()=>setQ(params.get('q')||''),[params.get('q')]);return <><PageTitle title="Samples & history" description="Search every month while keeping each source record separate." action={edit?<button disabled={busy} className="button secondary" onClick={async()=>{setBusy(true);try{const result=await api('/sync','POST');reload();notify(result.skipped?result.message:'Source refresh completed');}catch(e:any){notify(e.message,true);}finally{setBusy(false);}}}><RefreshCw size={17}/> {busy?'Refreshing…':'Refresh sources'}</button>:undefined}/><section className="panel samples-register"><div className="filters"><div className="search search-field"><Search size={17}/><input aria-label="Search samples" placeholder="Search by ML number, product, or batch" value={q} onChange={e=>setQ(e.target.value)}/></div><select aria-label="Sample type filter" value={params.get('category')||''} onChange={e=>set('category',e.target.value)}><option value="">All sample types</option>{config.value.sampleTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select aria-label="Source status filter" value={params.get('status')||''} onChange={e=>set('status',e.target.value)}><option value="">All source statuses</option>{data?.statuses.map((s:string)=><option key={s}>{s}</option>)}</select><select aria-label="Sort samples" value={params.get('sort')||'recent'} onChange={e=>set('sort',e.target.value)}><option value="recent">Recently updated</option><option value="ml">ML number ↑</option><option value="name">Sample name ↑</option><option value="received">Received date ↓</option></select></div><div className="filters secondary-filters"><Field label="Received from"><input type="date" value={params.get('from')||''} onChange={e=>set('from',e.target.value)}/></Field><Field label="Received through"><input type="date" value={params.get('to')||''} onChange={e=>set('to',e.target.value)}/></Field><details><summary>Visible columns</summary>{['batch','received','status'].map(c=><label key={c} className="checkbox"><input type="checkbox" checked={columns.includes(c)} onChange={e=>setColumns(cs=>e.target.checked?[...cs,c]:cs.filter(x=>x!==c))}/>{c}</label>)}</details><button className="text-button" onClick={()=>{setQ('');setParams({});}}>Clear filters</button></div><ErrorBox message={error}/>{!data?<Loading/>:data.items.length?<><div className="table-scroll"><table className="data-table"><thead><tr><th>Sample / control number</th><th>Sample type</th>{columns.includes('batch')?<th>Batch / lot</th>:null}{columns.includes('received')?<th>Received</th>:null}{columns.includes('status')?<th>Source status</th>:null}<th><span className="sr-only">Action</span></th></tr></thead><tbody>{data.items.map((s:Sample)=><tr key={s.id}><td><Link to={`/samples/${s.id}`}><strong>{s.name||'Incomplete record'}</strong><br /><small className="mono">{s.ml}</small></Link>{s.duplicate?<Badge tone="red">Duplicate ML — separate source</Badge>:null}</td><td>{config.value.sampleTypes.find(t=>t.id===s.category)?.name||s.category}</td>{columns.includes('batch')?<td>{s.batch||'—'}</td>:null}{columns.includes('received')?<td>{s.received||'Not recorded'}</td>:null}{columns.includes('status')?<td><Badge tone={s.status==='RELEASED'?'green':'neutral'}>{s.status||'Not recorded'}</Badge></td>:null}<td><Link to={`/samples/${s.id}`}>Open →</Link></td></tr>)}</tbody></table></div><div className="pagination"><span>{data.total} matching samples · Page {data.page} of {Math.max(1,Math.ceil(data.total/data.limit))}</span><button className="button secondary small" disabled={data.page===1} onClick={()=>set('page',String(data.page-1))}>Previous</button><button className="button secondary small" disabled={data.page*data.limit>=data.total} onClick={()=>set('page',String(data.page+1))}>Next</button></div></>:<Empty title="No samples match these filters">Try a different product, date range or control number.</Empty>}</section></>;}
type IntakeDraftRow={key:string;submissionId:string;fields:Record<string,string>};
const emptyIntakeRow=(type:any):IntakeDraftRow=>({key:crypto.randomUUID(),submissionId:crypto.randomUUID(),fields:Object.fromEntries(type.fields.filter((f:any)=>f.active&&f.type!=='generated').map((f:any)=>[f.key,f.defaultValue||'']))});
function intakeSuggestions(field:any,type:any,config:any){const categoryOptions=type.id==='EM'?environmentalCategoryOptions[field.key]:undefined;const lookupOptions=field.lookup?config.lookups.find((l:any)=>l.id===field.lookup&&l.active)?.options||[]:field.options||[];const productOptions=field.key==='name'?config.products.filter((p:any)=>p.active&&p.category===type.id).flatMap((p:any)=>[p.name,...(p.aliases||[])]):[];return productOptions.length?productOptions:categoryOptions||(lookupOptions.length?lookupOptions:field.type==='checkbox'?['true','false']:[]);}
function IntakeField({field,type,row,config,onChange,autoFocus=false}:{field:any;type:any;row:IntakeDraftRow;config:any;onChange:(key:string,value:string)=>void;autoFocus?:boolean}){
 const value=row.fields[field.key]??'';const listId=`suggestions-${type.id}-${row.key}-${field.key}`;
 const label=type.id==='EM'&&field.key==='context'?'Category (column F)':type.id==='EM'&&field.key==='secondaryCategory'?'Category (column G)':(type.id==='SFG'||type.id==='FG')&&field.key==='secondaryCategory'?'No.':field.label;
 const fieldHelp=type.id==='EM'&&field.key==='context'?'Choose the source Category value from column F.':type.id==='EM'&&field.key==='secondaryCategory'?'Choose the Category value from column G.':field.help;
 const options=intakeSuggestions(field,type,config);
 const suggested=options.length>0;
 return <Field label={`${label}${field.required?' *':''}`} hint={suggested?(fieldHelp?`${fieldHelp} Suggestions are optional; you can type another value.`:'Suggestions are optional; you can type another value.'):fieldHelp}>{field.type==='generated'?<input disabled value="Assigned by the system"/>:field.type==='longtext'?<textarea autoFocus={autoFocus} required={field.required} value={value} onChange={e=>onChange(field.key,e.target.value)}/>:<><input autoFocus={autoFocus} list={suggested?listId:undefined} required={field.required} type={field.type==='dropdown'||field.type==='checkbox'?'text':field.type} min={field.type==='number'?0:undefined} step={field.type==='number'?(field.integer===false?'any':'1'):undefined} value={value} onChange={e=>onChange(field.key,e.target.value)}/>{suggested?<datalist id={listId}>{options.map((option:string)=><option key={option} value={option}/>)}</datalist>:null}</>}</Field>;
}
export function Intake(){
 const {config}=useConfiguration();const [params]=useSearchParams();const types=config.value.sampleTypes.filter(t=>t.active&&(!params.get('register')||t.register===params.get('register'))).sort((a,b)=>a.order-b.order);
 const [category,setCategory]=useState(''),[mode,setMode]=useState<'single'|'batch'>('single'),[stage,setStage]=useState<'choose'|'edit'|'review'|'outcome'>('choose'),[rows,setRows]=useState<IntakeDraftRow[]>([]),[batchId,setBatchId]=useState(''),[review,setReview]=useState<any[]>([]),[outcomes,setOutcomes]=useState<any[]>([]),[reviewChanged,setReviewChanged]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const type=types.find(t=>t.id===category),{demo}=useContext(Session),navigate=useNavigate(),notify=useContext(Notice),canEdit=useCanEdit();
 const targetMonth=Intl.DateTimeFormat('en',{month:'long',year:'numeric',timeZone:config.value.general.timezone}).format(new Date());
 const stageHeading=useRef<HTMLHeadingElement>(null);useEffect(()=>{if(stage==='review'||stage==='outcome')stageHeading.current?.focus();},[stage]);
 const dirty=stage==='edit'||stage==='review';useUnsaved(dirty&&rows.some(r=>Object.values(r.fields).some(Boolean)));
 const change=(rowKey:string,key:string,value:string)=>{setRows(all=>all.map(row=>row.key===rowKey?{...row,fields:{...row.fields,[key]:value}}:row));if(stage==='review')setReviewChanged(true);};
 const start=(typeId:string)=>{const selected=types.find(t=>t.id===typeId);if(!selected)return;setCategory(typeId);setRows([emptyIntakeRow(selected)]);setBatchId('');setReview([]);setOutcomes([]);setReviewChanged(false);setError('');setStage('edit');};
 const prepare=async(nextRows=rows,nextBatchId=crypto.randomUUID())=>{if(!type)return;const invalid=nextRows.map(row=>({row,issues:validateIntake(type,row.fields,config.value)})).filter(x=>x.issues.length);if(invalid.length){setError(invalid.map(({row,issues})=>`Sample ${nextRows.indexOf(row)+1}: ${issues.join('; ')}`).join('\n'));return;}setBusy(true);setError('');try{const result=await api('/submissions/prepare','POST',{batchId:nextBatchId,items:nextRows.map(row=>({submissionId:row.submissionId,category,fields:row.fields}))});setBatchId(nextBatchId);setReview(result.items);setReviewChanged(false);setStage('review');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 const refreshReview=async()=>{if(!batchId){await prepare();return;}setBusy(true);setError('');try{await api('/submissions/cancel','POST',{batchId});const refreshed=rows.map(row=>({...row,submissionId:crypto.randomUUID()}));setRows(refreshed);setReview([]);await prepare(refreshed,crypto.randomUUID());}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 const commit=async(ids:string[])=>{if(!batchId||!ids.length)return;setBusy(true);setError('');try{const result=await api('/submissions/commit','POST',{batchId,submissionIds:ids});setOutcomes(result.items);setStage('outcome');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 const retry=async()=>{const ids=review.filter(r=>r.state==='ready').map(r=>r.submissionId);await commit(ids);};
 const addRow=()=>{if(type)setRows(all=>[...all,emptyIntakeRow(type)]);};
 const removeRow=(key:string)=>setRows(all=>all.length>1?all.filter(row=>row.key!==key):all);
 const returnToEntry=async()=>{setBusy(true);setError('');try{if(batchId)await api('/submissions/cancel','POST',{batchId});setRows(all=>all.map(row=>({...row,submissionId:crypto.randomUUID()})));setBatchId('');setReview([]);setReviewChanged(false);setStage('edit');}catch(e:any){setError(e.message);}finally{setBusy(false);}};
 const changeType=async()=>{if(stage==='review'&&batchId){setBusy(true);try{await api('/submissions/cancel','POST',{batchId});}catch(e:any){setError(e.message);setBusy(false);return;}setBusy(false);}setCategory('');setRows([]);setReview([]);setOutcomes([]);setBatchId('');setStage('choose');};
 const onFormKeyDown=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();if(stage==='edit')void prepare();else if(stage==='review'&&!reviewChanged)void commit(review.filter(r=>r.state==='ready').map(r=>r.submissionId));}};
 return <>
  <PageTitle title={params.get('register')==='environmental'?'Log environmental monitoring':'Log samples'} description="Enter one sample or a batch, review every assigned ML number, then submit."/>
  <ol className={`intake-workflow stage-${stage}`} aria-label="Sample logging workflow">{['Sample type','Sample details','Number assignment','Review','Logged'].map((label,index)=>{const activeIndex=stage==='choose'?0:stage==='edit'?1:stage==='review'?3:4;const complete=index<activeIndex;return <li key={label} className={`${complete?'complete':''} ${index===activeIndex?'active':''}`} aria-current={index===activeIndex?'step':undefined}><span>{complete?'✓':index+1}</span><strong>{label}</strong></li>;})}</ol>
  {stage==='choose'?<>
   <div className="intake-mode" role="group" aria-label="Entry mode"><button type="button" className={mode==='single'?'selected':''} aria-pressed={mode==='single'} onClick={()=>setMode('single')}>One sample</button><button type="button" className={mode==='batch'?'selected':''} aria-pressed={mode==='batch'} onClick={()=>setMode('batch')}>Batch entry</button></div>
   <div className="category-grid">{types.map(t=><button key={t.id} className="category-card" onClick={()=>start(t.id)}><FlaskConical size={24}/><h2>{t.name}</h2><p>{t.register==='environmental'?'Facility and monitoring details':'Sample receipt and identification'}</p><ArrowRight size={18}/></button>)}</div>
  </>:null}
  {type&&stage==='edit'?<form className="panel form-panel intake-form" onSubmit={e=>{e.preventDefault();void prepare();}} onKeyDown={onFormKeyDown}>
   <div className="intake-topline"><button className="text-button" type="button" disabled={busy} onClick={()=>void changeType()}>← Change sample type</button><span>{type.name}</span></div>
   {demo?<p className="info">Practice entry · de-identified data only. Numbers are assigned for this demonstration and no Google records change.</p>:<p className="info">Suggestions stay editable. Numbers are assigned after the logbook and reservations pass the administrator’s readiness checks.</p>}
   <div className="intake-workspace"><div className="intake-rows">{rows.map((row,index)=><section className="intake-row" key={row.key} aria-labelledby={`intake-row-title-${row.key}`}><div className="intake-row-heading"><div><small>Sample {String(index+1).padStart(2,'0')}</small><h2 id={`intake-row-title-${row.key}`}>{row.fields.name?.trim()||'New sample'}</h2></div>{mode==='batch'&&rows.length>1?<button type="button" className="text-button" onClick={()=>removeRow(row.key)} aria-label={`Remove sample ${index+1}`}>Remove</button>:null}</div><div className="form-grid intake-fields-grid">{type.fields.filter(f=>f.active&&f.type!=='generated').sort((a,b)=>a.order-b.order).map((field,fieldIndex)=><IntakeField key={field.key} field={field} type={type} row={row} config={config.value} autoFocus={index===0&&fieldIndex===0} onChange={(key,value)=>change(row.key,key,value)}/>)}</div></section>)}</div><aside className="intake-context" aria-label="Logbook context"><h3>Logbook context</h3><dl><div><dt>Destination month</dt><dd>{targetMonth}</dd></div><div><dt>Source section</dt><dd>{type.name}</dd></div><div><dt>Number series</dt><dd className="mono">{type.numbering.prefix}-YY-{''.padStart(type.numbering.padding,'0')}</dd></div></dl><p>Analyzed by, read by, release date, status, and remarks remain in the later workflow.</p></aside></div>
   {mode==='batch'?<button type="button" className="button secondary intake-add" onClick={addRow} disabled={busy}><Plus size={16}/> Add blank sample</button>:null}
   <ErrorBox message={error}/><div className="form-footer"><span>{rows.length} {rows.length===1?'sample':'samples'} · tab through fields · Ctrl/⌘ + Enter to review</span><button className="button primary" disabled={busy||!canEdit}>{busy?'Preparing review…':'Review and assign ML numbers'}</button></div>
  </form>:null}
  {type&&stage==='review'?<section className="panel form-panel intake-review" onKeyDown={onFormKeyDown}><div className="intake-review-heading"><div><button className="text-button" type="button" disabled={busy} onClick={()=>void changeType()}>← Change sample type</button><h2 ref={stageHeading} tabIndex={-1}>Review before logging</h2><p>{type.name} · {rows.length} {rows.length===1?'sample':'samples'} · configuration revision {config.revision}</p></div><button className="button secondary" type="button" disabled={busy} onClick={()=>void refreshReview()}>Recalculate numbers</button></div>
   <div className="intake-destination"><strong>Destination</strong><span>{targetMonth} → {type.name}</span><span>Only fields mapped to this logbook section will be written.</span></div>
 {review.map((item,index)=>{const row=rows[index];const current=outcomes.find(result=>result.submissionId===item.submissionId);const state=current?.state||item.state;const stateLabel=state==='complete'?'Logged':state==='ready'?'Ready to log':state==='uncertain'?'Needs reconciliation':'Blocked';return <article className="intake-review-row" key={item.submissionId}><div className="intake-review-identity"><strong>{item.name||row?.fields.name||'Unnamed sample'}</strong><span>{item.batch||row?.fields.batch||'Batch not entered'} · {item.received||row?.fields.received||'Received date not entered'}</span></div><div className="intake-review-ml"><small>Assigned ML number</small><code>{item.ml||'Not assigned'}</code></div><Badge tone={state==='complete'?'green':state==='ready'?'neutral':'red'}>{stateLabel}</Badge>{current?.sample?.id?<Link to={`/samples/${current.sample.id}`}>Open record →</Link>:null}{item.error||current?.error?<p className="intake-review-error">{item.error||current.error}</p>:null}<div className="intake-review-fields">{type.fields.filter((f:any)=>f.active&&f.type!=='generated').map((field:any)=>{const label=type.id==='EM'&&field.key==='context'?'Category (column F)':type.id==='EM'&&field.key==='secondaryCategory'?'Category (column G)':(type.id==='SFG'||type.id==='FG')&&field.key==='secondaryCategory'?'No.':field.label;const options=intakeSuggestions(field,type,config.value);const listId=`review-suggestions-${item.submissionId}-${field.key}`;return <Field key={field.key} label={label} hint={options.length?'Suggestions are optional; you can type another value.':undefined}><input value={row?.fields[field.key]??''} list={options.length?listId:undefined} onChange={e=>row&&change(row.key,field.key,e.target.value)} readOnly={Boolean(current)} aria-readonly={Boolean(current)}/>{options.length?<datalist id={listId}>{options.map((option:string)=><option key={option} value={option}/>)}</datalist>:null}</Field>;})}</div></article>;})}
   <ErrorBox message={error}/><div className="form-footer"><span>Each row keeps its own values and number. No rows are copied automatically.</span><div className="intake-review-actions"><button className="button secondary" type="button" disabled={busy} onClick={()=>void returnToEntry()}>Edit samples</button><button className="button secondary" type="button" disabled={busy} onClick={()=>void refreshReview()}>{reviewChanged?'Recalculate after edits':'Refresh numbers'}</button><button className="button primary" type="button" onClick={()=>void commit(review.filter(r=>r.state==='ready').map(r=>r.submissionId))} disabled={busy||reviewChanged||!review.some(r=>r.state==='ready')}>{busy?'Submitting…':`Log ${review.filter(r=>r.state==='ready').length} ready samples`}</button></div></div>
  </section>:null}
  {type&&stage==='outcome'?<section className="panel form-panel intake-review"><div className="intake-review-heading"><div><h2 ref={stageHeading} tabIndex={-1}>Submission outcomes</h2><p>{outcomes.filter(o=>o.state==='complete').length} logged · {outcomes.filter(o=>o.state!=='complete').length} need attention</p></div></div>{outcomes.map((item,index)=><article className="intake-review-row" key={item.submissionId}><div className="intake-review-identity"><strong>{item.sample?.name||review[index]?.name||`Sample ${index+1}`}</strong><span>{item.sample?.batch||review[index]?.batch||'Batch not entered'}</span></div><div className="intake-review-ml"><small>ML number</small><code>{item.sample?.ml||review.find(r=>r.submissionId===item.submissionId)?.ml||'Not assigned'}</code></div><Badge tone={item.state==='complete'?'green':'red'}>{item.state==='complete'?'Logged':item.state==='uncertain'?'Needs reconciliation':'Not logged'}</Badge>{item.sample?.id?<Link to={`/samples/${item.sample.id}`}>Open record →</Link>:null}{item.error?<p className="intake-review-error">{item.error}</p>:null}</article>)}<ErrorBox message={error}/><div className="form-footer"><span>Completed rows will not be duplicated if this batch is retried.</span><div className="intake-review-actions"><button className="button secondary" type="button" onClick={()=>navigate('/samples')}>View samples</button>{outcomes.some(o=>o.state!=='complete')?<button className="button primary" type="button" disabled={busy} onClick={()=>void retry()}>{busy?'Retrying…':'Retry held rows'}</button>:<button className="button primary" type="button" onClick={()=>void changeType()}>Log another batch</button>}</div></div></section>:null}
 </>;
}
