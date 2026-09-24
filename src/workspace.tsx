import {useContext,useEffect,useState} from 'react';
import {Link,useNavigate,useSearchParams} from 'react-router-dom';
import {Search,Plus,ArrowRight,FileText,FlaskConical,RefreshCw,FolderOpen} from 'lucide-react';
import {api} from './api';
import {useConfiguration,useUnsaved} from './configuration';
import {PageTitle,Field,ErrorBox,Loading,Badge,Empty,Notice,Session,useLoad,useCanEdit,SampleList} from './ui';
import type {Sample, Draft} from '../shared/model';
import {validateIntake} from '../shared/configuration';

export function GlobalSearch(){const [q,setQ]=useState(''),[items,setItems]=useState<Sample[]>([]);useEffect(()=>{let active=true;const timer=setTimeout(()=>{if(q.trim().length<2){setItems([]);return;}api(`/search?q=${encodeURIComponent(q)}&limit=5`).then(r=>{if(active)setItems(r.items);}).catch(()=>setItems([]));},250);return()=>{active=false;clearTimeout(timer);};},[q]);return <div className="global-search"><Search size={18}/><input aria-label="Find a sample anywhere" placeholder="Find a sample, batch or ML number…" value={q} onChange={e=>setQ(e.target.value)} onKeyDown={e=>{if(e.key==='Escape')setQ('');}}/>{q.length>=2?<div className="search-results">{items.map(s=><Link key={s.id} to={`/samples/${s.id}`} onClick={()=>setQ('')}><strong>{s.ml}</strong><span>{s.name}</span><small>{s.categoryLabel||s.category} · Batch {s.batch}</small></Link>)}{!items.length?<p>No matching samples.</p>:null}<Link to={`/samples?q=${encodeURIComponent(q)}`} onClick={()=>setQ('')}>View all matches →</Link></div>:null}</div>;}
export function Dashboard(){
  const {data,error}=useLoad(()=>api('/work'));
  const {user}=useContext(Session);
  const edit=useCanEdit();
  const [activeTab, setActiveTab] = useState('active');

  if(!data)return error?<ErrorBox message={error}/>:<Loading/>;
  
  const openDrafts = data.drafts.filter((d:any)=>!d.generated);
  const missing = openDrafts.filter((d:any)=>d.missing);
  const ready = openDrafts.filter((d:any)=>!d.missing);
  
  return (
    <div className="dashboard-layout animate-entrance" style={{display: 'flex', gap: '32px'}}>
      <div style={{flex: 1, minWidth: 0}}>
        {/* Header / Hero */}
        <div className="hero-header stagger-1">
          <div className="hero-header-bg"></div>
          <div className="hero-content">
            <div className="hero-eyebrow">Microbiology Quality Control</div>
            <h1>Good {new Date().getHours() < 12 ? 'morning' : 'afternoon'}, {user.name.split(' ')[0]}</h1>
            <p>Keep today's samples moving.</p>
          </div>
        </div>

        {/* Metrics Strip */}
        <div className="metrics-strip stagger-2">
          <div className="metric-item">
            <span className="metric-value">{data.loggedToday}</span>
            <span className="metric-label">Received today</span>
            <span className="metric-sub">Laboratory timezone</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">{missing.length}</span>
            <span className="metric-label">Awaiting results</span>
            <span className="metric-sub">In progress</span>
          </div>
          <div className="metric-item">
            <span className="metric-value">{ready.length}</span>
            <span className="metric-label">Ready to generate</span>
            <span className="metric-sub">Reports</span>
          </div>
          {edit && (
            <div className="metrics-actions">
              <Link className="button primary" to="/new"><Plus size={16}/> Log sample</Link>
            </div>
          )}
        </div>

        {/* Tabs & Filters */}
        <div className="tabs stagger-3">
          <button className={`tab ${activeTab === 'active' ? 'active' : ''}`} onClick={() => setActiveTab('active')}>
            Active Samples <span className="tab-badge">{data.recent.length}</span>
          </button>
          <button className={`tab ${activeTab === 'reports' ? 'active' : ''}`} onClick={() => setActiveTab('reports')}>
            Ready for Report <span className="tab-badge">{ready.length}</span>
          </button>
        </div>
        
        <div className="filters-bar stagger-3" style={{borderTopLeftRadius: 'var(--radius-lg)', borderTopRightRadius: 'var(--radius-lg)'}}>
          <div className="search" style={{flex: 1, background: 'transparent'}}>
            <Search size={14} style={{position: 'absolute', left: '10px', top: '10px'}}/>
            <input placeholder="Search active samples..." style={{paddingLeft: '32px', background: 'transparent', border: 'none', height: '100%'}}/>
          </div>
          <select style={{background: 'transparent', border: 'none'}}><option>All types</option></select>
          <select style={{background: 'transparent', border: 'none'}}><option>All status</option></select>
        </div>

        {/* Data Table */}
        <div className="data-table-container stagger-3" style={{borderTopLeftRadius: 0, borderTopRightRadius: 0, borderTop: 'none'}}>
          <table className="data-table">
            <thead>
              <tr>
                <th>Control No.</th>
                <th>Sample Name</th>
                <th>Type</th>
                <th>Batch No.</th>
                <th>Status</th>
                <th><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody>
              {activeTab === 'active' ? (
                data.recent.length ? data.recent.slice(0, 8).map((s:any) => (
                  <tr key={s.id}>
                    <td className="td-id mono">{s.ml}</td>
                    <td><Link to={`/samples/${s.id}`}>{s.name || 'Incomplete record'}</Link></td>
                    <td>{s.category}</td>
                    <td className="mono">{s.batch || '—'}</td>
                    <td><Badge tone={s.status==='RELEASED'?'green':'neutral'}>{s.status || 'Not recorded'}</Badge></td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/samples/${s.id}`} className="text-button">View →</Link>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{textAlign: 'center', padding: '32px'}}><Empty title="No active samples">Log a new sample to get started.</Empty></td></tr>
                )
              ) : (
                ready.length ? ready.map((d:any) => (
                  <tr key={d.id}>
                    <td className="td-id mono">{d.sample.ml}</td>
                    <td><Link to={`/reports/${d.id}`}>{d.sample.name}</Link></td>
                    <td>{d.sample.category}</td>
                    <td className="mono">{d.sample.batch || '—'}</td>
                    <td><Badge tone="green">Ready for review</Badge></td>
                    <td>
                      <div className="table-actions">
                        <Link to={`/reports/${d.id}`} className="text-button">Review →</Link>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr><td colSpan={6} style={{textAlign: 'center', padding: '32px'}}><Empty title="No reports ready">Finish result entry for open drafts.</Empty></td></tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Right Intelligence Rail */}
      <div className="right-rail stagger-3" style={{borderLeft: '1px solid var(--border)', paddingLeft: '32px', width: '280px', flexShrink: 0, background: 'transparent'}}>
        
        <div className="rail-section">
          <div className="rail-heading">Quick Actions</div>
          <div className="quick-action-grid">
            <Link to="/new" className="quick-action-btn"><Plus size={16}/> Log Sample</Link>
            <Link to="/reports" className="quick-action-btn"><FlaskConical size={16}/> Enter Results</Link>
            <Link to="/reports" className="quick-action-btn"><FileText size={16}/> Gen. Report</Link>
            <Link to="/library" className="quick-action-btn"><FolderOpen size={16}/> File Library</Link>
          </div>
        </div>

        <div className="rail-section">
          <div className="rail-heading">Recent Activity</div>
          <div className="timeline">
            {data.recent.slice(0,4).map((s:any, i:number) => (
              <div key={`act-${s.id}`} className={`timeline-item ${i===0 ? 'active' : ''}`}>
                <div className="timeline-time">{new Date(s.received || Date.now()).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</div>
                <div className="timeline-content">
                  <div className="timeline-title">Sample logged</div>
                  <div className="timeline-desc mono">{s.ml}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div className="rail-section" style={{marginTop: 'auto'}}>
          <div className="ascii-loader">
            {`> system active\n> db connected\n> sources synced\n_`}
          </div>
        </div>
      </div>
    </div>
  );
}
export function SampleSearch(){const {config}=useConfiguration();const [params,setParams]=useSearchParams();const [q,setQ]=useState(params.get('q')||'');const [busy,setBusy]=useState(false);const notify=useContext(Notice);const edit=useCanEdit();const [columns,setColumns]=useState(()=>{try{return JSON.parse(localStorage.getItem('ipi.columns')||'["batch","received","status"]') as string[];}catch{return ['batch','received','status'];}});const request=new URLSearchParams(params);request.set('limit',String(config.value.general.pageSize));const {data,error,reload}=useLoad(()=>api('/search?'+request),[request.toString()]);const set=(key:string,value:string)=>{setParams(p=>{p.set(key,value);if(key!=='page')p.set('page','1');return p;});};useEffect(()=>{const timer=setTimeout(()=>{if(q!==(params.get('q')||''))set('q',q);},250);return()=>clearTimeout(timer);},[q]);useEffect(()=>{try{localStorage.setItem('ipi.columns',JSON.stringify(columns));}catch{}},[columns]);useEffect(()=>setQ(params.get('q')||''),[params.get('q')]);return <><PageTitle title="Samples & history" description="Search every month while keeping each source record separate." action={edit?<button disabled={busy} className="button secondary" onClick={async()=>{setBusy(true);try{await api('/sync','POST');reload();notify('Source refresh completed');}catch(e:any){notify(e.message,true);}finally{setBusy(false);}}}><RefreshCw size={17}/> {busy?'Refreshing…':'Refresh sources'}</button>:undefined}/><section className="panel"><div className="filters"><div className="search"><Search size={17}/><input aria-label="Search samples" placeholder="ML number, product or batch…" value={q} onChange={e=>setQ(e.target.value)}/></div><select aria-label="Sample type filter" value={params.get('category')||''} onChange={e=>set('category',e.target.value)}><option value="">All sample types</option>{config.value.sampleTypes.map(t=><option key={t.id} value={t.id}>{t.name}</option>)}</select><select aria-label="Source status filter" value={params.get('status')||''} onChange={e=>set('status',e.target.value)}><option value="">All source statuses</option>{data?.statuses.map((s:string)=><option key={s}>{s}</option>)}</select><select aria-label="Sort samples" value={params.get('sort')||'recent'} onChange={e=>set('sort',e.target.value)}><option value="recent">Recently updated</option><option value="ml">ML number ↑</option><option value="name">Sample name ↑</option><option value="received">Received date ↓</option></select></div><div className="filters secondary-filters"><Field label="Received from"><input type="date" value={params.get('from')||''} onChange={e=>set('from',e.target.value)}/></Field><Field label="Received through"><input type="date" value={params.get('to')||''} onChange={e=>set('to',e.target.value)}/></Field><details><summary>Visible columns</summary>{['batch','received','status'].map(c=><label key={c} className="checkbox"><input type="checkbox" checked={columns.includes(c)} onChange={e=>setColumns(cs=>e.target.checked?[...cs,c]:cs.filter(x=>x!==c))}/>{c}</label>)}</details><button className="text-button" onClick={()=>{setQ('');setParams({});}}>Clear filters</button></div><ErrorBox message={error}/>{!data?<Loading/>:data.items.length?<><div className="table-scroll"><table className="records-table"><thead><tr><th>Sample / control number</th><th>Sample type</th>{columns.includes('batch')?<th>Batch / lot</th>:null}{columns.includes('received')?<th>Received</th>:null}{columns.includes('status')?<th>Source status</th>:null}<th><span className="sr-only">Action</span></th></tr></thead><tbody>{data.items.map((s:Sample)=><tr key={s.id}><td><Link to={`/samples/${s.id}`}><strong>{s.name||'Incomplete record'}</strong><small className="mono">{s.ml}</small></Link>{s.duplicate?<Badge tone="red">Duplicate ML — separate source</Badge>:null}</td><td>{config.value.sampleTypes.find(t=>t.id===s.category)?.name||s.category}</td>{columns.includes('batch')?<td>{s.batch||'—'}</td>:null}{columns.includes('received')?<td>{s.received||'Not recorded'}</td>:null}{columns.includes('status')?<td><Badge tone={s.status==='RELEASED'?'green':'neutral'}>{s.status||'Not recorded'}</Badge></td>:null}<td><Link to={`/samples/${s.id}`}>Open →</Link></td></tr>)}</tbody></table></div><div className="pagination"><span>{data.total} matching samples · Page {data.page} of {Math.max(1,Math.ceil(data.total/data.limit))}</span><button className="button secondary small" disabled={data.page===1} onClick={()=>set('page',String(data.page-1))}>Previous</button><button className="button secondary small" disabled={data.page*data.limit>=data.total} onClick={()=>set('page',String(data.page+1))}>Next</button></div></>:<Empty title="No samples match these filters">Try a different product, date range or control number.</Empty>}</section></>;}
export function Intake(){const {config}=useConfiguration();const [params]=useSearchParams();const types=config.value.sampleTypes.filter(t=>t.active&&(!params.get('register')||t.register===params.get('register'))).sort((a,b)=>a.order-b.order);const [category,setCategory]=useState(''),[fields,setFields]=useState<Record<string,string>>({}),[busy,setBusy]=useState(false),[error,setError]=useState(''),[saved,setSaved]=useState(false);const [submissionId]=useState(()=>{const bytes=crypto.getRandomValues(new Uint8Array(16));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;return [...bytes].map((b,i)=>([4,6,8,10].includes(i)?'-':'')+b.toString(16).padStart(2,'0')).join('');});const type=types.find(t=>t.id===category);const {demo}=useContext(Session);const navigate=useNavigate();const notify=useContext(Notice);const canEdit=useCanEdit();const clearUnsaved=useUnsaved(!saved&&Object.values(fields).some(Boolean));const set=(key:string,value:string)=>setFields(f=>({...f,[key]:value}));return <><PageTitle title={params.get('register')==='environmental'?'Log environmental monitoring':'Log a sample'} description="Choose the sample type, confirm its identifiers, then record receipt."/>{!type?<div className="category-grid">{types.map(t=><button key={t.id} className="category-card" onClick={()=>{setCategory(t.id);setFields(Object.fromEntries(t.fields.filter(f=>f.active&&f.type!=='generated').map(f=>[f.key,f.defaultValue])));}}><FlaskConical size={24}/><h2>{t.name}</h2><p>{t.register==='environmental'?'Facility and monitoring details':'Sample receipt and identification'}</p><ArrowRight size={18}/></button>)}</div>:<form className="panel form-panel" onSubmit={async e=>{e.preventDefault();const issues=validateIntake(type,fields,config.value);if(issues.length){setError(issues.join('; '));return;}setBusy(true);setError('');try{const sample=await api('/samples','POST',{submissionId,category,fields});setSaved(true);clearUnsaved();notify(demo?'Demonstration sample logged. No Google records changed.':'Sample successfully logged.');navigate(`/samples/${sample.id}`);}catch(e:any){setError(e.message);}finally{setBusy(false);}}}><button className="text-button" type="button" disabled={busy} onClick={()=>{if(!Object.values(fields).some(Boolean)||window.confirm('Change sample type and clear this form?')){setCategory('');setFields({});}}}>← Change sample type</button><h2>{type.name}</h2><p className="info">The control number is assigned when you submit. Only the current laboratory month is used.</p><div className="form-grid">{type.fields.filter(f=>f.active).sort((a,b)=>a.order-b.order).map(f=><Field key={f.key} label={f.label+(f.required?' *':'')} hint={f.help}>{f.type==='generated'?<input disabled value="Assigned by the system"/>:f.type==='longtext'?<textarea required={f.required} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}/>:f.type==='dropdown'?<select required={f.required} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}><option value="">Choose…</option>{(f.lookup?config.value.lookups.find(l=>l.id===f.lookup&&l.active)?.options||[]:f.options).map(o=><option key={o}>{o}</option>)}</select>:f.type==='checkbox'?<select required={f.required} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}><option value="">Choose…</option><option value="true">Yes</option><option value="false">No</option></select>:<><input list={f.key==='name'?'product-options':undefined} required={f.required} type={f.type} min={f.type==='number'?0:undefined} step={f.type==='number'?(f.integer===false?'any':'1'):undefined} value={fields[f.key]||''} onChange={e=>set(f.key,e.target.value)}/>{f.key==='name'?<datalist id="product-options">{config.value.products.filter(p=>p.active&&p.category===type.id).map(p=><option key={p.id} value={p.name}>{p.code}</option>)}</datalist>:null}</>}</Field>)}</div><ErrorBox message={error}/><div className="form-footer"><span>{demo?'Practice entry · de-identified data only':'Check the sample and batch before submitting'}</span><button className="button primary" disabled={busy||!canEdit}>{busy?'Logging…':'Confirm and log sample'}</button></div></form>}</>;}
