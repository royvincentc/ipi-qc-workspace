import {useContext,useEffect,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {Search,Plus,ArrowRight,FileText,FlaskConical,RefreshCw,FolderOpen,Activity} from 'lucide-react';
import {api} from './api';
import {useConfiguration,useUnsaved} from './configuration';
import {PageTitle,Field,ErrorBox,Loading,Badge,Empty,Notice,Session,useLoad,useCanEdit,SampleList} from './ui';
import type {Sample, Draft} from '../shared/model';
import {validateIntake} from '../shared/configuration';

function parseActivityDate(value: unknown) {
  if (!value) return undefined;
  const parsed = new Date(String(value).replace(' ', 'T'));
  return Number.isFinite(parsed.getTime()) ? parsed : undefined;
}

export function GlobalSearch(){const [q,setQ]=useState(''),[items,setItems]=useState<Sample[]>([]);useEffect(()=>{let active=true;const timer=setTimeout(()=>{if(q.trim().length<2){setItems([]);return;}api(`/search?q=${encodeURIComponent(q)}&limit=5`).then(r=>{if(active)setItems(r.items);}).catch(()=>setItems([]));},250);return()=>{active=false;clearTimeout(timer);};},[q]);return <div className="global-search"><Search size={18}/><input aria-label="Find a sample anywhere" placeholder="Find a sample, batch or ML number…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQ('');}}/>{q.length>=2?<div className="search-results">{items.map(s=><Link key={s.id} to={`/samples/${s.id}`} onClick={()=>setQ('')}><strong>{s.ml}</strong><span>{s.name}</span><small>{s.categoryLabel||s.category} · Batch {s.batch}</small></Link>)}{!items.length?<p>No matching samples.</p>:null}<Link to={`/samples?q=${encodeURIComponent(q)}`} onClick={()=>setQ('')}>View all matches →</Link></div>:null}</div>;}
export function Dashboard(){
  const {data,error}=useLoad(()=>api('/work'));
  const {user}=useContext(Session);
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

      <section className="dashboard-overview" aria-label="Current work and quick actions">
        <div className="dashboard-metrics" aria-label="Current work summary">
          <div className="dashboard-metric">
            <span>Received today</span>
            <strong>{data.loggedToday}</strong>
          </div>
          <div className="dashboard-metric">
            <span>Awaiting results</span>
            <strong>{missing.length}</strong>
          </div>
          <div className="dashboard-metric">
            <span>Ready for report</span>
            <strong>{ready.length}</strong>
          </div>
        </div>
        <nav className="dashboard-shortcuts" aria-label="Quick actions">
          <Link to="/new"><Plus size={16}/> Log sample</Link>
          <Link to="/reports"><FlaskConical size={16}/> Enter results</Link>
          <Link to="/reports"><FileText size={16}/> Prepare report</Link>
          <Link to="/library"><FolderOpen size={16}/> File library</Link>
        </nav>
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
            <select aria-label="Filter dashboard by sample type" value={dashboardType} onChange={event=>setDashboardType(event.target.value)}><option value="">All types</option>{categories.map(category=><option key={category}>{category}</option>)}</select>
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
                      <td data-label="Type">{s.category}</td>
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
                      <td data-label="Type">{d.sample.category}</td>
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
    </div>
  );
}
export function SampleSearch(){const {config}=useConfiguration();const [params,setParams]=useSearchParams();const [q,setQ]=useState(params.get('q')||'');const [busy,setBusy]=useState(false);const notify=useContext(Notice);const edit=useCanEdit();const [columns,setColumns]=useState(()=>{try{return JSON.parse(localStorage.getItem('ipi.columns')||'["batch","received","status"]') as string[];}catch{return ['batch','received','status'];}});const request=new URLSearchParams(params);request.set('limit',String(config.value.general.pageSize));const {data,error,reload}=useLoad(()=>api('/search?'+request),[request.toString()]);const set=(key:string,value:string)=>{setParams(p=>{p.set(key,value);if(key!=='page')p.set('page','1');return p;});};useEffect(()=>{const timer=setTimeout(()=>{if(q!==(params.get('q')||''))set('q',q);},250);return()=>clearTimeout(timer);},[q]);useEffect(()=>{try{localStorage.setItem('ipi.columns',JSON.stringify(columns));}catch{}},[columns]);useEffect(()=>setQ(params.get('q')||''),[params.get('q')]);return <><PageTitle title="Samples & history" description="Search every month while keeping each source record separate." action={edit?<button disabled={busy} className="button secondary" onClick={async()=>{setBusy(true);try{const result=await api('/sync','POST');reload();notify(result.skipped?result.message:'Source refresh completed');}catch(e:any){notify(e.message,true);}finally{setBusy(false);}}}><RefreshCw size={17}/> {busy?'Refreshing…':'Refresh sources'}</button>:undefined}/><section className="panel"><div className="filters"><div className="search search-field"><Search size={17}/><input aria-label="Search samples" placeholder="Search by ML number, product, or batch" value={q} onChange={e=>setQ(e.target.value)}/></div><select aria-label="Sample type filter" value={params.get('category')||''} onChange={e=>set('category',e.target.value)}><option value="">All sample types</option>{config.value.sampleTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select aria-label="Source status filter" value={params.get('status')||''} onChange={e=>set('status',e.target.value)}><option value="">All source statuses</option>{data?.statuses.map((s:string)=><option key={s}>{s}</option>)}</select><select aria-label="Sort samples" value={params.get('sort')||'recent'} onChange={e=>set('sort',e.target.value)}><option value="recent">Recently updated</option><option value="ml">ML number ↑</option><option value="name">Sample name ↑</option><option value="received">Received date ↓</option></select></div><div className="filters secondary-filters"><Field label="Received from"><input type="date" value={params.get('from')||''} onChange={e=>set('from',e.target.value)}/></Field><Field label="Received through"><input type="date" value={params.get('to')||''} onChange={e=>set('to',e.target.value)}/></Field><details><summary>Visible columns</summary>{['batch','received','status'].map(c=><label key={c} className="checkbox"><input type="checkbox" checked={columns.includes(c)} onChange={e=>setColumns(cs=>e.target.checked?[...cs,c]:cs.filter(x=>x!==c))}/>{c}</label>)}</details><button className="text-button" onClick={()=>{setQ('');setParams({});}}>Clear filters</button></div><ErrorBox message={error}/>{!data?<Loading/>:data.items.length?<><div className="table-scroll"><table className="data-table"><thead><tr><th>Sample / control number</th><th>Sample type</th>{columns.includes('batch')?<th>Batch / lot</th>:null}{columns.includes('received')?<th>Received</th>:null}{columns.includes('status')?<th>Source status</th>:null}<th><span className="sr-only">Action</span></th></tr></thead><tbody>{data.items.map((s:Sample)=><tr key={s.id}><td><Link to={`/samples/${s.id}`}><strong>{s.name||'Incomplete record'}</strong><br /><small className="mono">{s.ml}</small></Link>{s.duplicate?<Badge tone="red">Duplicate ML — separate source</Badge>:null}</td><td>{config.value.sampleTypes.find(t=>t.id===s.category)?.name||s.category}</td>{columns.includes('batch')?<td>{s.batch||'—'}</td>:null}{columns.includes('received')?<td>{s.received||'Not recorded'}</td>:null}{columns.includes('status')?<td><Badge tone={s.status==='RELEASED'?'green':'neutral'}>{s.status||'Not recorded'}</Badge></td>:null}<td><Link to={`/samples/${s.id}`}>Open →</Link></td></tr>)}</tbody></table></div><div className="pagination"><span>{data.total} matching samples · Page {data.page} of {Math.max(1,Math.ceil(data.total/data.limit))}</span><button className="button secondary small" disabled={data.page===1} onClick={()=>set('page',String(data.page-1))}>Previous</button><button className="button secondary small" disabled={data.page*data.limit>=data.total} onClick={()=>set('page',String(data.page+1))}>Next</button></div></>:<Empty title="No samples match these filters">Try a different product, date range or control number.</Empty>}</section></>;}
export function Intake(){const {config}=useConfiguration();const [params]=useSearchParams();const types=config.value.sampleTypes.filter(t=>t.active&&(!params.get('register')||t.register===params.get('register'))).sort((a,b)=>a.order-b.order);const [category,setCategory]=useState(''),[fields,setFields]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);const [submissionId]=useState(()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;return [...bytes].map((b,i)=>([4,6,8,10].includes(i)?'-':'')+b.toString(16).padStart(2,'0')).join('');});const type=types.find(t=>t.id===category);const {demo}=useContext(Session);const navigate=useNavigate();const notify=useContext(Notice);const canEdit=useCanEdit();const clearUnsaved=useUnsaved(!saved&&Object.values(fields).some(Boolean));const set=(key:string,value:string)=>setFields(f=>({...f,[key]:value}));return <><PageTitle title={params.get('register')==='environmental'?'Log environmental monitoring':'Log a sample'} description="Choose the sample type, confirm its identifiers, then record receipt."/>{!type?<div className="category-grid">{types.map(t=><button key={t.id} className="category-card" onClick={()=>{setCategory(t.id);setFields(Object.fromEntries(t.fields.filter(f=>f.active&&f.type!=='generated').map(f=>[f.key,f.defaultValue])));}}><FlaskConical size={24}/><h2>{t.name}</h2><p>{t.register==='environmental'?'Facility and monitoring details':'Sample receipt and identification'}</p><ArrowRight size={18}/></button>)}</div>:<form className="panel form-panel" onSubmit={async e=>{e.preventDefault();const issues=validateIntake(type,fields,config.value);if(issues.length){setError(issues.join('; '));return;}setBusy(true);setError('');try{const sample=await api('/samples','POST',{submissionId,category,fields});setSaved(true);clearUnsaved();notify(demo?'Demonstration sample logged. No Google records changed.':'Sample successfully logged.');navigate(`/samples/${sample.id}`);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><button className="text-button" type="button" disabled={busy} onClick={()=>{if(!Object.values(fields).some(Boolean)||window.confirm('Change sample type and clear this form?')){setCategory('');setFields({});}}}>← Change sample type</button><h2>{type.name}</h2><p className="info">The control number is assigned when you submit. Only the current laboratory month is used.</p><div className="form-grid">{type.fields.filter(f=>f.active).sort((a,b)=>a.order-b.order).map(f=><Field key={f.key} label={f.label+(f.required?' *':'')} hint={f.help}>{f.type==='generated'?<input disabled value="Assigned by the system"/>:f.type==='longtext'?<textarea required={f.required} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}/>:f.type==='dropdown'?<select required={f.required} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}><option value="">Choose…</option>{(f.lookup?config.value.lookups.find(l=>l.id===f.lookup&&l.active)?.options||[]:f.options).map(o=><option key={o}>{o}</option>)}</select>:f.type==='checkbox'?<select required={f.required} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select>:<><input list={f.key==='name'?'product-options':undefined} required={f.required} type={f.type} min={f.type==='number'?0:undefined} step={f.type==='number'?(f.integer===false?'any':'1'):undefined} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}/>{f.key==='name'?<datalist id="product-options">{config.value.products.filter(p=>p.active&&p.category===type.id).map(p=><option key={p.id} value={p.name}>{p.code}</option>)}</datalist>:null}</>}</Field>)}</div><ErrorBox message={error}/><div className="form-footer"><span>{demo?'Practice entry · de-identified data only':'Check the sample and batch before submitting'}</span><button className="button primary" disabled={busy||!canEdit}>{busy?'Logging…':'Confirm and log sample'}</button></div></form>}</>;}
