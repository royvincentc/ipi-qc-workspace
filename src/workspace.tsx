import {useContext,useEffect,useRef,useState} from 'react';
import type {KeyboardEvent} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {Search,Plus,ArrowRight,FileText,FlaskConical,RefreshCw,FolderOpen,Activity} from 'lucide-react';
import {api} from './api';
import {useCatalog,useConfiguration,useUnsaved} from './configuration';
import {PageTitle,Field,ErrorBox,Loading,Badge,Empty,Notice,Session,useLoad,useCanEdit,SampleList} from './ui';
import type {Sample, Draft} from '../shared/model';
import {environmentalCategoryOptions,validateIntake} from '../shared/configuration';

function parseActivityDate(value: unknown) {
  if (!value) return undefined;
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

export function GlobalSearch(){const {categories}=useCatalog();const [q,setQ]=useState(''),[items,setItems]=useState<Sample[]>([]);useEffect(()=>{let active=true;const timer=setTimeout(()=>{if(q.trim().length<2){setItems([]);return;}api(`/search?q=${encodeURIComponent(q)}&limit=5`).then(r=>{if(active)setItems(r.items);}).catch(()=>setItems([]));},250);return()=>{active=false;clearTimeout(timer);};},[q]);return <div className="global-search"><Search size={18}/><input aria-label="Find a sample anywhere" placeholder="Find a sample, batch or ML number…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQ('');}}/>{q.length>=2?<div className="search-results">{items.map(s=><Link key={s.id} to={`/samples/${s.id}`} onClick={()=>setQ('')}><strong>{s.ml}</strong><span>{s.name}</span><small>{s.categoryLabel||categories[s.category]||s.category} · Batch {s.batch}</small></Link>)}{!items.length?<p>No matching samples.</p>:null}<Link to={`/samples?q=${encodeURIComponent(q)}`} onClick={()=>setQ('')}>View all matches →</Link></div>:null}</div>;}
export function Dashboard(){
  const {data,error}=useLoad(()=>api('/work'));
  const {user}=useContext(Session);
  const {config}=useConfiguration();
  const edit=useCanEdit();
  const [activeTab, setActiveTab] = useState('active');
  const [dashboardQuery,setDashboardQuery]=useState('');
  const [dashboardType,setDashboardType]=useState('');
  const [dashboardStatus,setDashboardStatus]=useState('');

  if(!data)return error?<ErrorBox message={error}/>:<Loading/>;
  
  const openDrafts = data.drafts.filter((d:any)=>!d.generated);
  const missing = openDrafts.filter((d:any)=>d.missing);
  const ready = openDrafts.filter((d:any)=>!d.missing);
  const categories=[...new Set(data.recent.map((sample:any)=>sample.category).filter(Boolean))] as string[];
  const categoryName=(id:string)=>config.value.sampleTypes.find(type=>type.id===id)?.name||id;
  const statuses=[...new Set(data.recent.map((sample:any)=>sample.status||'Not recorded'))] as string[];
  const matchesDashboardFilters=(sample:any)=>{
    const haystack=`${sample.ml||''} ${sample.name||''} ${sample.batch||''}`.toLowerCase();
    return (!dashboardQuery||haystack.includes(dashboardQuery.toLowerCase()))&&(!dashboardType||sample.category===dashboardType)&&(!dashboardStatus||(sample.status||'Not recorded')===dashboardStatus);
  };
  const visibleSamples=data.recent.filter(matchesDashboardFilters);
  const visibleReady=ready.filter((draft:any)=>matchesDashboardFilters(draft.sample||{}));
  const hasDashboardFilters=Boolean(dashboardQuery||dashboardType||dashboardStatus);
  
  return (
    <div className="dashboard-layout dashboard-redesign">
      <section className="dashboard-hero" aria-labelledby="dashboard-welcome-heading">
        <div className="dashboard-hero-copy">
          <h1 id="dashboard-welcome-heading">Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user.name.split(' ')[0]}</h1>
          <p>Sample intake, review and report preparation — in one traceable workspace.</p>
          <div className="dashboard-hero-actions">
            {edit ? <Link className="button primary" to="/new"><Plus size={17}/> Log a sample</Link> : null}
            <Link className="dashboard-quiet-link" to="/reports">Open results &amp; reports <ArrowRight size={15}/></Link>
          </div>
        </div>
        <div className="dashboard-lab-visual" aria-hidden="true">
          <svg viewBox="0 0 360 220" role="presentation">
            <ellipse className="lab-dish-outer" cx="188" cy="116" rx="116" ry="67"/>
            <ellipse className="lab-dish-inner" cx="188" cy="116" rx="91" ry="49"/>
            <path className="lab-trace" d="M72 116h38c18 0 22-32 43-32h38c20 0 25 49 47 49h50"/>
            <path className="lab-trace lab-trace-secondary" d="M95 150h46c18 0 22-22 40-22h22"/>
            <circle className="lab-node" cx="110" cy="116" r="4"/>
            <circle className="lab-node" cx="191" cy="84" r="4"/>
            <circle className="lab-node lab-node-muted" cx="238" cy="133" r="4"/>
            <circle className="lab-orbit-point" cx="188" cy="49" r="3"/>
            <path className="lab-measure" d="M188 30v18m-7-9h14M188 184v10m-5-5h10"/>
          </svg>
        </div>
      </section>

      <div className="dashboard-workspace">
        <section className="dashboard-queue" aria-labelledby="dashboard-queue-heading">
          <div className="dashboard-queue-heading">
            <div>
              <h2 id="dashboard-queue-heading">Your workbench</h2>
              <p>Recent samples and reports ready for review.</p>
            </div>
            <Link className="dashboard-queue-all" to={activeTab === 'active' ? '/samples' : '/reports'}>View all <ArrowRight size={14}/></Link>
          </div>

          <div className="tabs dashboard-tabs" aria-label="Workbench records">
            <button type="button" aria-pressed={activeTab === 'active'} className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
              Active samples <span className="tab-badge">{data.recent.length}</span>
            </button>
            <button type="button" aria-pressed={activeTab === 'reports'} className={`tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
              Ready for report <span className="tab-badge">{ready.length}</span>
            </button>
          </div>

          <div className="filters-bar dashboard-filters">
            <div className="search dashboard-search">
              <Search size={15}/>
              <input aria-label="Search workbench records" placeholder="Search samples…" value={dashboardQuery} onChange={event=>setDashboardQuery(event.target.value)}/>
            </div>
            <select aria-label="Filter dashboard by sample type" value={dashboardType} onChange={event=>setDashboardType(event.target.value)}><option value="">All types</option>{categories.map(category=><option key={category} value={category}>{categoryName(category)}</option>)}</select>
            <select aria-label="Filter dashboard by status" value={dashboardStatus} onChange={event=>setDashboardStatus(event.target.value)}><option value="">All statuses</option>{statuses.map(status=><option key={status}>{status}</option>)}</select>
            {hasDashboardFilters?<button type="button" className="text-button dashboard-clear-filters" onClick={()=>{setDashboardQuery('');setDashboardType('');setDashboardStatus('');}}>Clear filters</button>:null}
          </div>

          <div className="data-table-container dashboard-table">
            <table className="data-table">
              <thead>
                <tr><th>Control No.</th><th>Sample name</th><th>Type</th><th>Batch No.</th><th>Status</th><th><span className="sr-only">Actions</span></th></tr>
              </thead>
              <tbody>
                {activeTab === 'active' ? (
                  visibleSamples.length ? visibleSamples.slice(0, 8).map((s:any, i:number) => (
                    <tr key={s.id ?? `${s.ml || 'sample'}-${i}`}>
                      <td className="td-id mono" data-label="Control No.">{s.ml}</td>
                      <td data-label="Sample name"><Link to={`/samples/${s.id}`}>{s.name || 'Incomplete record'}</Link></td>
                      <td data-label="Type">{categoryName(s.category)}</td>
                      <td className="mono" data-label="Batch No.">{s.batch || '—'}</td>
                      <td data-label="Status"><Badge tone={s.status==='RELEASED'?'green':'neutral'}>{s.status || 'Not recorded'}</Badge></td>
                      <td data-label="Action"><Link to={`/samples/${s.id}`} className="text-button" aria-label={`View sample ${s.ml}`}>View</Link></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{textAlign: 'center', padding: '32px'}}><Empty title={hasDashboardFilters?"No samples match these filters":"No active samples"}>{hasDashboardFilters?"Clear the filters to see all recent samples.":"Log a new sample to get started."}</Empty></td></tr>
                  )
                ) : (
                  visibleReady.length ? visibleReady.map((d:any, i:number) => (
                    <tr key={d.id ?? `${d.sample?.ml || 'draft'}-${i}`}>
                      <td className="td-id mono" data-label="Control No.">{d.sample.ml}</td>
                      <td data-label="Sample name"><Link to={`/reports/${d.id}`}>{d.sample.name}</Link></td>
                      <td data-label="Type">{categoryName(d.sample.category)}</td>
                      <td className="mono" data-label="Batch No.">{d.sample.batch || '—'}</td>
                      <td data-label="Status"><Badge tone="green">Ready for review</Badge></td>
                      <td data-label="Action"><Link to={`/reports/${d.id}`} className="text-button" aria-label={`Review report for ${d.sample.ml}`}>Review</Link></td>
                    </tr>
                  )) : (
                    <tr><td colSpan={6} style={{textAlign: 'center', padding: '32px'}}><Empty title={hasDashboardFilters?"No reports match these filters":"No reports ready"}>{hasDashboardFilters?"Clear the filters to see all reports ready for review.":"Finish result entry for open drafts."}</Empty></td></tr>
                  )
                )}
              </tbody>
            </table>
          </div>
        </section>

        <aside className="right-rail dashboard-activity" aria-label="Recent activity">
          <div className="rail-section">
            <div className="dashboard-activity-heading"><h2>Recent activity</h2><Activity size={16} aria-hidden="true"/></div>
            {data.recent.length ? <div className="timeline">
              {data.recent.slice(0,4).map((s:any, i:number) => (
                <div key={`act-${s.id ?? `${s.ml || 'sample'}-${i}`}`} className={`timeline-item ${i===0 ? 'active' : ''}`}>
                  <div className="timeline-time">{(parseActivityDate(s.received) || parseActivityDate(s.source?.observedAt))?.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'}) || '—'}</div>
                  <div className="timeline-content">
                    <div className="timeline-title">Sample logged</div>
                    <Link className="timeline-desc mono" to={`/samples/${s.id}`}>{s.ml}</Link>
                  </div>
                </div>
              ))}
            </div> : <Empty title="No recent activity">New sample entries will appear here.</Empty>}
          </div>
          <Link className="dashboard-activity-all" to="/samples">Browse sample history <ArrowRight size={14}/></Link>
        </aside>
      </div>

      <section className="dashboard-overview" aria-label="Current work and quick actions">
        <div className="dashboard-metrics" aria-label="Current work summary">
          <div className="dashboard-metric"><span>Received today</span><strong>{data.loggedToday}</strong></div>
          <div className="dashboard-metric"><span>Awaiting results</span><strong>{missing.length}</strong></div>
          <div className="dashboard-metric"><span>Ready for report</span><strong>{ready.length}</strong></div>
        </div>
        <nav className="dashboard-shortcuts" aria-label="Quick actions">
          <Link to="/new"><Plus size={16}/> Log sample</Link>
          <Link to="/reports"><FlaskConical size={16}/> Enter results</Link>
          <Link to="/reports"><FileText size={16}/> Prepare report</Link>
          <Link to="/library"><FolderOpen size={16}/> File library</Link>
        </nav>
      </section>
    </div>
  );
}
export function SampleSearch(){const {config}=useConfiguration();const [params,setParams]=useSearchParams();const [q,setQ]=useState(params.get('q')||'');const [busy,setBusy]=useState(false);const notify=useContext(Notice);const edit=useCanEdit();const [columns,setColumns]=useState(()=>{try{return JSON.parse(localStorage.getItem('ipi.columns')||'["batch","received","status"]') as string[];}catch{return ['batch','received','status'];}});const request=new URLSearchParams(params);request.set('limit',String(config.value.general.pageSize));const {data,error,reload}=useLoad(()=>api('/search?'+request),[request.toString()]);const set=(key:string,value:string)=>{setParams(p=>{p.set(key,value);if(key!=='page')p.set('page','1');return p;});};useEffect(()=>{const timer=setTimeout(()=>{if(q!==(params.get('q')||''))set('q',q);},250);return()=>clearTimeout(timer);},[q]);useEffect(()=>{try{localStorage.setItem('ipi.columns',JSON.stringify(columns));}catch{}},[columns]);useEffect(()=>setQ(params.get('q')||''),[params.get('q')]);return <><PageTitle title="Samples & history" description="Search every month while keeping each source record separate." action={edit?<button disabled={busy} className="button secondary" onClick={async()=>{setBusy(true);try{const result=await api('/sync','POST');reload();notify(result.skipped?result.message:'Source refresh completed');}catch(e:any){notify(e.message,true);}finally{setBusy(false);}}}><RefreshCw size={17}/> {busy?'Refreshing…':'Refresh sources'}</button>:undefined}/><section className="panel"><div className="filters"><div className="search search-field"><Search size={17}/><input aria-label="Search samples" placeholder="Search by ML number, product, or batch" value={q} onChange={e=>setQ(e.target.value)}/></div><select aria-label="Sample type filter" value={params.get('category')||''} onChange={e=>set('category',e.target.value)}><option value="">All sample types</option>{config.value.sampleTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select aria-label="Source status filter" value={params.get('status')||''} onChange={e=>set('status',e.target.value)}><option value="">All source statuses</option>{data?.statuses.map((s:string)=><option key={s}>{s}</option>)}</select><select aria-label="Sort samples" value={params.get('sort')||'recent'} onChange={e=>set('sort',e.target.value)}><option value="recent">Recently updated</option><option value="ml">ML number ↑</option><option value="name">Sample name ↑</option><option value="received">Received date ↓</option></select></div><div className="filters secondary-filters"><Field label="Received from"><input type="date" value={params.get('from')||''} onChange={e=>set('from',e.target.value)}/></Field><Field label="Received through"><input type="date" value={params.get('to')||''} onChange={e=>set('to',e.target.value)}/></Field><details><summary>Visible columns</summary>{['batch','received','status'].map(c=><label key={c} className="checkbox"><input type="checkbox" checked={columns.includes(c)} onChange={e=>setColumns(cs=>e.target.checked?[...cs,c]:cs.filter(x=>x!==c))}/>{c}</label>)}</details><button className="text-button" onClick={()=>{setQ('');setParams({});}}>Clear filters</button></div><ErrorBox message={error}/>{!data?<Loading/>:data.items.length?<><div className="table-scroll"><table className="data-table"><thead><tr><th>Sample / control number</th><th>Sample type</th>{columns.includes('batch')?<th>Batch / lot</th>:null}{columns.includes('received')?<th>Received</th>:null}{columns.includes('status')?<th>Source status</th>:null}<th><span className="sr-only">Action</span></th></tr></thead><tbody>{data.items.map((s:Sample)=><tr key={s.id}><td><Link to={`/samples/${s.id}`}><strong>{s.name||'Incomplete record'}</strong><br /><small className="mono">{s.ml}</small></Link>{s.duplicate?<Badge tone="red">Duplicate ML — separate source</Badge>:null}</td><td>{config.value.sampleTypes.find(t=>t.id===s.category)?.name||s.category}</td>{columns.includes('batch')?<td>{s.batch||'—'}</td>:null}{columns.includes('received')?<td>{s.received||'Not recorded'}</td>:null}{columns.includes('status')?<td><Badge tone={s.status==='RELEASED'?'green':'neutral'}>{s.status||'Not recorded'}</Badge></td>:null}<td><Link to={`/samples/${s.id}`}>Open →</Link></td></tr>)}</tbody></table></div><div className="pagination"><span>{data.total} matching samples · Page {data.page} of {Math.max(1,Math.ceil(data.total/data.limit))}</span><button className="button secondary small" disabled={data.page===1} onClick={()=>set('page',String(data.page-1))}>Previous</button><button className="button secondary small" disabled={data.page*data.limit>=data.total} onClick={()=>set('page',String(data.page+1))}>Next</button></div></>:<Empty title="No samples match these filters">Try a different product, date range or control number.</Empty>}</section></>;}
type IntakeDraftRow={key:string;submissionId:string;fields:Record<string,string>};
const emptyIntakeRow=(type:any):IntakeDraftRow=>({key:crypto.randomUUID(),submissionId:crypto.randomUUID(),fields:Object.fromEntries(type.fields.filter((f:any)=>f.active&&f.type!=='generated').map((f:any)=>[f.key,f.defaultValue||'']))});
function IntakeField({field,type,row,config,onChange,autoFocus=false}:{field:any;type:any;row:IntakeDraftRow;config:any;onChange:(key:string,value:string)=>void;autoFocus?:boolean}){
 const value=row.fields[field.key]??'';const listId=field.key==='name'?`products-${type.id}-${row.key}`:undefined;
 const categoryOptions=type.id==='EM'?environmentalCategoryOptions[field.key]:undefined;
 const label=type.id==='EM'&&field.key==='context'?'Category (column F)':type.id==='EM'&&field.key==='secondaryCategory'?'Category (column G)':(type.id==='SFG'||type.id==='FG')&&field.key==='secondaryCategory'?'No.':field.label;
 const fieldHelp=type.id==='EM'&&field.key==='context'?'Choose the source Category value from column F.':type.id==='EM'&&field.key==='secondaryCategory'?'Choose the Category value from column G.':field.help;
 if(categoryOptions)return <div className="field intake-toggle-field"><span>{label} *</span><div className="intake-toggle-options" role="radiogroup" aria-label={label}>{categoryOptions.map((option,index)=><label className="intake-toggle" key={option}><input type="radio" name={`${row.key}-${field.key}`} value={option} checked={value===option} required={index===0} onChange={()=>onChange(field.key,option)}/><span>{option}</span></label>)}</div>{fieldHelp?<small>{fieldHelp}</small>:null}</div>;
 return <Field label={`${label}${field.required?' *':''}`} hint={fieldHelp}>{field.type==='generated'?<input disabled value="Assigned by the system"/>:field.type==='longtext'?<textarea autoFocus={autoFocus} required={field.required} value={value} onChange={e=>onChange(field.key,e.target.value)}/>:field.type==='dropdown'?<select autoFocus={autoFocus} required={field.required} value={value} onChange={e=>onChange(field.key,e.target.value)}><option value="">Choose…</option>{(field.lookup?config.lookups.find((l:any)=>l.id===field.lookup&&l.active)?.options||[]:field.options).map((option:string)=><option key={option} value={option}>{option}</option>)}</select>:field.type==='checkbox'?<select autoFocus={autoFocus} required={field.required} value={value} onChange={e=>onChange(field.key,e.target.value)}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select>:<><input autoFocus={autoFocus} list={listId} required={field.required} type={field.type} min={field.type==='number'?0:undefined} step={field.type==='number'?(field.integer===false?'any':'1'):undefined} value={value} onChange={e=>onChange(field.key,e.target.value)}/>{listId?<datalist id={listId}>{config.products.filter((p:any)=>p.active&&p.category===type.id).map((p:any)=><option key={p.id} value={p.name}>{p.code}</option>)}</datalist>:null}</>}</Field>;
}
export function Intake(){
 const {config}=useConfiguration();const [params]=useSearchParams();const types=config.value.sampleTypes.filter(t=>t.active&&(!params.get('register')||t.register===params.get('register'))).sort((a,b)=>a.order-b.order);
 const [category,setCategory]=useState(''),[mode,setMode]=useState<'single'|'batch'>('single'),[stage,setStage]=useState<'choose'|'edit'|'review'|'outcome'>('choose'),[rows,setRows]=useState<IntakeDraftRow[]>([]),[batchId,setBatchId]=useState(''),[review,setReview]=useState<any[]>([]),[outcomes,setOutcomes]=useState<any[]>([]),[reviewChanged,setReviewChanged]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const type=types.find(t=>t.id===category),{demo}=useContext(Session),navigate=useNavigate(),notify=useContext(Notice),canEdit=useCanEdit();
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
 const changeType=async()=>{if(stage==='review'&&batchId){setBusy(true);try{await api('/submissions/cancel','POST',{batchId});}catch(e:any){setError(e.message);setBusy(false);return;}setBusy(false);}setCategory('');setRows([]);setReview([]);setOutcomes([]);setBatchId('');setStage('choose');};
 const onFormKeyDown=(event:KeyboardEvent)=>{if((event.ctrlKey||event.metaKey)&&event.key==='Enter'){event.preventDefault();if(stage==='edit')void prepare();else if(stage==='review'&&!reviewChanged)void commit(review.filter(r=>r.state==='ready').map(r=>r.submissionId));}};
 return <>
  <PageTitle title={params.get('register')==='environmental'?'Log environmental monitoring':'Log samples'} description="Enter one sample or a batch, review every assigned ML number, then submit."/>
  {stage==='choose'?<>
   <div className="intake-mode" role="group" aria-label="Entry mode"><button type="button" className={mode==='single'?'selected':''} aria-pressed={mode==='single'} onClick={()=>setMode('single')}>One sample</button><button type="button" className={mode==='batch'?'selected':''} aria-pressed={mode==='batch'} onClick={()=>setMode('batch')}>Batch entry</button></div>
   <div className="category-grid">{types.map(t=><button key={t.id} className="category-card" onClick={()=>start(t.id)}><FlaskConical size={24}/><h2>{t.name}</h2><p>{t.register==='environmental'?'Facility and monitoring details':'Sample receipt and identification'}</p><ArrowRight size={18}/></button>)}</div>
  </>:null}
  {type&&stage==='edit'?<form className="panel form-panel intake-form" onSubmit={e=>{e.preventDefault();void prepare();}} onKeyDown={onFormKeyDown}>
   <div className="intake-topline"><button className="text-button" type="button" disabled={busy} onClick={()=>void changeType()}>← Change sample type</button><span>{type.name}</span></div>
   {demo?<p className="info">Practice entry · de-identified data only. Numbers are assigned for this demonstration and no Google records change.</p>:<p className="info">Numbers are assigned by the server during review. Logbook writes remain subject to administrator reconciliation and enablement.</p>}
   {rows.map((row,index)=><section className="intake-row" key={row.key} aria-labelledby={`intake-row-title-${row.key}`}><div className="intake-row-heading"><div><small>Sample {String(index+1).padStart(2,'0')}</small><h2 id={`intake-row-title-${row.key}`}>{row.fields.name?.trim()||'New sample'}</h2></div>{mode==='batch'&&rows.length>1?<button type="button" className="text-button" onClick={()=>removeRow(row.key)} aria-label={`Remove sample ${index+1}`}>Remove</button>:null}</div><div className="form-grid">{type.fields.filter(f=>f.active).sort((a,b)=>a.order-b.order).map((field,fieldIndex)=><IntakeField key={field.key} field={field} type={type} row={row} config={config.value} autoFocus={index===0&&fieldIndex===0} onChange={(key,value)=>change(row.key,key,value)}/>)}</div></section>)}
   {mode==='batch'?<button type="button" className="button secondary intake-add" onClick={addRow} disabled={busy}><Plus size={16}/> Add blank sample</button>:null}
   <ErrorBox message={error}/><div className="form-footer"><span>{rows.length} {rows.length===1?'sample':'samples'} · tab through fields · Ctrl/⌘ + Enter to review</span><button className="button primary" disabled={busy||!canEdit}>{busy?'Preparing review…':'Review and assign ML numbers'}</button></div>
  </form>:null}
  {type&&stage==='review'?<section className="panel form-panel intake-review" onKeyDown={onFormKeyDown}><div className="intake-review-heading"><div><button className="text-button" type="button" disabled={busy} onClick={()=>void changeType()}>← Change sample type</button><h2 ref={stageHeading} tabIndex={-1}>Review before logging</h2><p>{type.name} · {rows.length} {rows.length===1?'sample':'samples'} · configuration revision {config.revision}</p></div><button className="button secondary" type="button" disabled={busy} onClick={()=>void refreshReview()}>Recalculate numbers</button></div>
 {review.map((item,index)=>{const row=rows[index];const current=outcomes.find(result=>result.submissionId===item.submissionId);const state=current?.state||item.state;const stateLabel=state==='complete'?'Logged':state==='ready'?'Ready to log':state==='uncertain'?'Needs reconciliation':'Blocked';return <article className="intake-review-row" key={item.submissionId}><div className="intake-review-identity"><strong>{item.name||row?.fields.name||'Unnamed sample'}</strong><span>{item.batch||row?.fields.batch||'Batch not entered'} · {item.received||row?.fields.received||'Received date not entered'}</span></div><div className="intake-review-ml"><small>Assigned ML number</small><code>{item.ml||'Not assigned'}</code></div><Badge tone={state==='complete'?'green':state==='ready'?'neutral':'red'}>{stateLabel}</Badge>{current?.sample?.id?<Link to={`/samples/${current.sample.id}`}>Open record →</Link>:null}{item.error||current?.error?<p className="intake-review-error">{item.error||current.error}</p>:null}<div className="intake-review-fields">{type.fields.filter((f:any)=>f.active&&f.type!=='generated').map((field:any)=>{const label=type.id==='EM'&&field.key==='context'?'Category (column F)':type.id==='EM'&&field.key==='secondaryCategory'?'Category (column G)':(type.id==='SFG'||type.id==='FG')&&field.key==='secondaryCategory'?'No.':field.label;const options=type.id==='EM'?environmentalCategoryOptions[field.key]:undefined;if(options)return <div className="field intake-toggle-field" key={field.key}><span>{label}</span><div className="intake-toggle-options" role="radiogroup" aria-label={label}>{options.map((option:string,optionIndex:number)=><label className="intake-toggle" key={option}><input type="radio" name={`review-${item.submissionId}-${field.key}`} value={option} checked={row?.fields[field.key]===option} disabled={Boolean(current)} onChange={()=>row&&change(row.key,field.key,option)}/><span>{option}</span></label>)}</div></div>;return <Field key={field.key} label={label}><input value={row?.fields[field.key]??''} onChange={e=>row&&change(row.key,field.key,e.target.value)} readOnly={Boolean(current)} aria-readonly={Boolean(current)}/></Field>;})}</div></article>;})}
   <ErrorBox message={error}/><div className="form-footer"><span>Each row keeps its own values and number. No rows are copied automatically.</span><div className="intake-review-actions"><button className="button secondary" type="button" disabled={busy} onClick={()=>void refreshReview()}>{reviewChanged?'Recalculate after edits':'Refresh numbers'}</button><button className="button primary" type="button" onClick={()=>void commit(review.filter(r=>r.state==='ready').map(r=>r.submissionId))} disabled={busy||reviewChanged||!review.some(r=>r.state==='ready')}>{busy?'Submitting…':'Commit ready samples'}</button></div></div>
  </section>:null}
  {type&&stage==='outcome'?<section className="panel form-panel intake-review"><div className="intake-review-heading"><div><h2 ref={stageHeading} tabIndex={-1}>Submission outcomes</h2><p>{outcomes.filter(o=>o.state==='complete').length} logged · {outcomes.filter(o=>o.state!=='complete').length} need attention</p></div></div>{outcomes.map((item,index)=><article className="intake-review-row" key={item.submissionId}><div className="intake-review-identity"><strong>{item.sample?.name||review[index]?.name||`Sample ${index+1}`}</strong><span>{item.sample?.batch||review[index]?.batch||'Batch not entered'}</span></div><div className="intake-review-ml"><small>ML number</small><code>{item.sample?.ml||review.find(r=>r.submissionId===item.submissionId)?.ml||'Not assigned'}</code></div><Badge tone={item.state==='complete'?'green':'red'}>{item.state==='complete'?'Logged':item.state==='uncertain'?'Needs reconciliation':'Not logged'}</Badge>{item.sample?.id?<Link to={`/samples/${item.sample.id}`}>Open record →</Link>:null}{item.error?<p className="intake-review-error">{item.error}</p>:null}</article>)}<ErrorBox message={error}/><div className="form-footer"><span>Completed rows will not be duplicated if this batch is retried.</span><div className="intake-review-actions"><button className="button secondary" type="button" onClick={()=>navigate('/samples')}>View samples</button>{outcomes.some(o=>o.state!=='complete')?<button className="button primary" type="button" disabled={busy} onClick={()=>void retry()}>{busy?'Retrying…':'Retry held rows'}</button>:<button className="button primary" type="button" onClick={()=>void changeType()}>Log another batch</button>}</div></div></section>:null}
 </>;
}
