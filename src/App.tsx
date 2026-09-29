import FileLibrary from './library';
import {ConfigurationProvider,useConfiguration} from './configuration';
import {Dashboard,SampleSearch,Intake} from './workspace';
import {useState,lazy,Suspense,useEffect,useRef} from 'react';
import {Link,NavLink,Route,Routes,useLocation} from 'react-router-dom';
import {LayoutDashboard,FlaskConical,Plus,Search,FileText,FolderOpen,Settings,ArrowRight,ShieldCheck,LogOut,Menu,X,Bot,PanelLeftClose,PanelLeftOpen,RefreshCw} from 'lucide-react';
import {api} from './api';
import {Session,Notice,useLoad,Loading,ErrorBox} from './ui';
import {SampleDetail} from './pages';
import {Reports,ReportEditor} from './reports';
import SettingsPage from './settings';
import { AssistantPage } from './AssistantPage';
import { FloatingAssistant } from './FloatingAssistant';
import {AmbientBackdrop,RouteExperience} from './Experience';
import {CursorEffects} from './CursorEffects';
const AdminCenter=lazy(()=>import('./admin'));

const navigation=[
  ['/','Dashboard',LayoutDashboard],
  ['/new','Log Sample',Plus],
  ['/samples','Samples',Search],
  ['/reports','Results & Reports',FileText],
  ['/library','File Library',FolderOpen],
  ['/assistant','Smart Assistant',Bot]
] as const;

function DeploymentUpdate(){
  const [update,setUpdate]=useState<string>();
  const currentBuild=useRef<string|undefined>(undefined);
  const announcedBuild=useRef<string|undefined>(undefined);
  useEffect(()=>{
    let active=true;
    const storageKey='ipi:last-deployment-build';
    const rememberedBuild=()=>{try{return window.localStorage.getItem(storageKey)||undefined;}catch{return undefined;}};
    const remember=(id:string)=>{try{window.localStorage.setItem(storageKey,id);}catch{/* Storage is optional for this convenience notice. */}};
    const check=async()=>{
      if(document.visibilityState==='hidden')return;
      try{
        const build=await api<{id:string|null}>('/build');
        if(!active||!build.id)return;
        if(!currentBuild.current){
          currentBuild.current=build.id;
          // A reload may happen after a deployment completed. Remembering the
          // build makes that update visible instead of silently treating it as
          // the first poll of a new session.
          if(rememberedBuild()&&rememberedBuild()!==build.id){announcedBuild.current=build.id;setUpdate(build.id);}
          remember(build.id);
          return;
        }
        if(build.id!==currentBuild.current&&build.id!==announcedBuild.current){announcedBuild.current=build.id;remember(build.id);setUpdate(build.id);}
      }catch{/* Deployment detection must never interrupt laboratory work. */}
    };
    void check();
    const timer=window.setInterval(check,30_000);
    const onVisibility=()=>void check();
    document.addEventListener('visibilitychange',onVisibility);
    return()=>{active=false;window.clearInterval(timer);document.removeEventListener('visibilitychange',onVisibility);};
  },[]);
  if(!update)return null;
  return <aside className="deployment-update" role="status" aria-live="polite" aria-label="Workspace update ready">
    <div className="deployment-signal" aria-hidden="true"><span/><span/><span/></div>
    <div className="deployment-copy"><span className="deployment-kicker">WORKSPACE UPDATE READY</span><strong>A newer version is live.</strong><p>Save any open edits, then reload to use the update.</p></div>
    <div className="deployment-actions"><button className="icon-button deployment-dismiss" onClick={()=>setUpdate(undefined)} aria-label="Dismiss update notice"><X size={16}/></button><button className="button primary deployment-reload" onClick={()=>window.location.reload()}><RefreshCw size={16}/> Reload update</button></div>
  </aside>;
}

function CommandPalette({open, onClose}: {open: boolean, onClose: () => void}) {
  const [query,setQuery]=useState('');
  const [items,setItems]=useState<any[]>([]);
  const [busy,setBusy]=useState(false);
  useEffect(()=>{
    if(!open||query.trim().length<2){setItems([]);setBusy(false);return;}
    let active=true;setBusy(true);
    const timer=setTimeout(()=>api(`/search?q=${encodeURIComponent(query)}&limit=6`).then(result=>{if(active)setItems(result.items);}).catch(()=>{if(active)setItems([]);}).finally(()=>{if(active)setBusy(false);}),250);
    return()=>{active=false;clearTimeout(timer);};
  },[open,query]);
  useEffect(()=>{if(!open)setQuery('');},[open]);
  if (!open) return null;
  return (
    <div className="cmd-palette-backdrop open" onClick={onClose} role="presentation">
      <div className="cmd-palette" onClick={e => e.stopPropagation()} role="dialog" aria-modal="true" aria-label="Find a sample">
        <div className="cmd-input-row"><Search size={19}/><input autoFocus className="cmd-input" aria-label="Find a sample anywhere" placeholder="ML number, sample, product or batch…" value={query} onChange={event=>setQuery(event.target.value)}/><button className="icon-button" onClick={onClose} aria-label="Close search"><X size={18}/></button></div>
        <div className="cmd-results">
          {query.trim().length<2?<p>Enter at least two characters to search all months.</p>:busy?<p>Searching…</p>:items.length?items.map(sample=><Link key={sample.id} to={`/samples/${sample.id}`} onClick={onClose}><strong>{sample.ml}</strong><span>{sample.name||'Incomplete record'}</span><small>{sample.categoryLabel||sample.category}{sample.batch?` · Batch ${sample.batch}`:''}</small></Link>):<p>No matching samples.</p>}
          {query.trim().length>=2?<Link className="cmd-all-results" to={`/samples?q=${encodeURIComponent(query)}`} onClick={onClose}>View all search results <ArrowRight size={15}/></Link>:null}
        </div>
      </div>
    </div>
  );
}

function Workspace({data}:{data:any}){
  const {config}=useConfiguration();
  const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [mobileNav,setMobileNav]=useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [now,setNow]=useState(()=>new Date());
  const location=useLocation();

  const notify=(text:string,error=false)=>{setNotice({text,error});};

  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(null), 5000);
      return () => clearTimeout(timer);
    }
  }, [notice]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setCmdOpen(o => !o);
      }
      if (e.key === 'Escape') setCmdOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer);},[]);

  return (
    <Session.Provider value={data}>
      <Notice.Provider value={notify}>
        <div className="app">
          <AmbientBackdrop/>
          <CursorEffects/>
          <RouteExperience/>
          <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileNav?'mobile-open':''}`}>
            <Link to="/" className="brand" title={config.value.general.appName}>
              <div className="brand-icon"><FlaskConical size={24}/></div>
              <div className="brand-text">
                <b>{config.value.general.appName}</b>
                <span>{config.value.general.department}</span>
              </div>
            </Link>
            <button className="icon-button collapse-btn" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            
            <nav className="main-nav">
              {navigation.map(([url,label,Icon])=>
                <NavLink end={url==='/'} to={url} key={url} title={label} onClick={()=>setMobileNav(false)}>
                  <Icon size={18}/>
                  <span>{label}</span>
                </NavLink>
              )}
            </nav>
            
            <div className="nav-label" style={{marginTop: '32px'}}>SYSTEM</div>
            <nav>
              {data.user.role==='administrator' && (
                <NavLink to="/settings" title="Settings" onClick={()=>setMobileNav(false)}>
                  <Settings size={18}/>
                  <span>Settings</span>
                </NavLink>
              )}
            </nav>

            <div className="sidebar-bottom">
              <div className="user" style={{marginBottom: collapsed ? '0' : '12px'}}>
                <span className="avatar" title={data.user.name}>{data.user.name.slice(0,2).toUpperCase()}</span>
                <div className="user-text">
                  <strong>{data.user.name}</strong>
                  <small>{data.user.role}</small>
                </div>
                {!data.demo && !collapsed && (
                  <button className="icon-button" aria-label="Sign out" onClick={()=>api('/auth/logout','POST').then(()=>window.location.reload())} title="Sign Out" style={{marginLeft: 'auto'}}>
                    <LogOut size={16}/>
                  </button>
                )}
              </div>
            </div>
          </aside>

          <div className={`main-wrapper ${collapsed ? 'collapsed' : ''}`}>
            <header className="topbar">
              <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={()=>setMobileNav(true)}><Menu size={20}/></button>
              <button type="button" className="global-search" onClick={() => setCmdOpen(true)} aria-label="Open global sample search">
                <Search size={16} />
                <span style={{flex: 1, textAlign: 'left'}}>Search a sample, batch, or control number...</span>
                <kbd>⌘K</kbd>
              </button>
              <div className="topbar-right">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px', marginRight: '16px'}}>
                  <span className={`status-dot ${data.demo ? 'pending' : ''}`}/>
                  {data.demo?'Demo workspace':'Live workspace'}
                </div>
                <div className="topbar-divider"></div>
                <div className="topbar-date">
                  <span>{new Intl.DateTimeFormat(config.value.general.dateFormat,{weekday:'short',day:'numeric',month:'short',year:'numeric',timeZone:config.value.general.timezone}).format(now)}</span>
                  <strong>{new Intl.DateTimeFormat(config.value.general.dateFormat,{hour:'2-digit',minute:'2-digit',timeZone:config.value.general.timezone}).format(now)}</strong>
                </div>
                <div className="avatar" title={data.user.name}>{data.user.name.slice(0,2).toUpperCase()}</div>
              </div>
            </header>

            {data.demo && (
              <div style={{background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '8px 24px', fontSize: '11px', textAlign: 'center'}}>
                DEMO MODE — Practice records only. No Google writes enabled.
              </div>
            )}

            <div className="workspace-content">
              <main className="route-stage" key={location.pathname}>
                <Routes>
                  <Route path="/" element={<Dashboard/>}/>
                  <Route path="/new" element={<Intake/>}/>
                  <Route path="/samples" element={<SampleSearch/>}/>
                  <Route path="/samples/:id" element={<SampleDetail/>}/>
                  <Route path="/reports" element={<Reports/>}/>
                  <Route path="/reports/:id" element={<ReportEditor/>}/>
                  <Route path="/library" element={<FileLibrary/>}/>
                  <Route path="/assistant" element={<AssistantPage/>}/>
                  <Route path="/settings" element={data.user.role==='administrator'?<Suspense fallback={<Loading/>}><AdminCenter/></Suspense>:<ErrorBox message="Administrator access required"/>}/>
                  <Route path="*" element={<ErrorBox message="Page not found"/>}/>
                </Routes>
              </main>
            </div>
          </div>

          {mobileNav?<button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>:null}

          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
          <FloatingAssistant />
          <DeploymentUpdate />

          {notice && (
            <div className={`toast ${notice.error?'bad':''}`} role="status">
              <span>{notice.text}</span>
              <button onClick={()=>setNotice(null)} aria-label="Dismiss notification">&times;</button>
            </div>
          )}
        </div>
      </Notice.Provider>
    </Session.Provider>
  );
}

export default function App(){
  const {data,error,reload}=useLoad(()=>api('/me'));
  if(!data){
    if(!error) return <Loading/>;
    const signIn=error==='Sign in to access the workspace'||error.includes('session expired');
    return (
      <div className="login" style={{maxWidth: '400px', margin: '15vh auto', textAlign: 'center'}}>
        <FlaskConical size={48} color="var(--accent)" style={{marginBottom: '24px'}} />
        <h1 style={{marginBottom: '16px'}}>IPI Micro-QC</h1>
        {signIn ? (
          <>
            <p>Sign in with Google. New accounts start with viewer access; an administrator can grant additional permissions.</p>
            <a className="button primary" href="/api/auth/login" style={{marginTop: '24px'}}>Continue with Google</a>
          </>
        ) : (
          <>
            <ErrorBox message={error}/>
            <button className="button primary" onClick={reload} style={{marginTop: '16px'}}>Try again</button>
          </>
        )}
      </div>
    );
  }
  return <ConfigurationProvider><Workspace data={data}/></ConfigurationProvider>;
}
