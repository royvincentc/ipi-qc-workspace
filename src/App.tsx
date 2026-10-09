import {ConfigurationProvider,useConfiguration} from './configuration';
import {Dashboard,SampleSearch,Intake} from './workspace';
import {useState,lazy,Suspense,useEffect,useRef} from 'react';
import {Link,NavLink,Route,Routes,useLocation} from 'react-router-dom';
import {Home,Sparkles,FlaskConical,Plus,Search,FileText,FolderOpen,Settings,ArrowRight,ShieldCheck,LogOut,Menu,X,Bot,PanelLeftClose,PanelLeftOpen,RefreshCw,Sun,Table2,ChevronDown,Columns3} from 'lucide-react';
import {api} from './api';
import {Session,Notice,useLoad,Loading,ErrorBox,PageTitle} from './ui';
import { FloatingAssistant } from './FloatingAssistant';
import {RouteExperience,SelectionMotion} from './Experience';
import Dialog from './dialog';
import {isConstrainedDevice} from './motion';
const AdminCenter=lazy(()=>import('./admin'));
const SampleDetailRoute=lazy(()=>import('./pages').then(module=>({default:module.SampleDetail})));
const ReportsRoute=lazy(()=>import('./reports').then(module=>({default:module.Reports})));
const ReportEditorRoute=lazy(()=>import('./reports').then(module=>({default:module.ReportEditor})));
const AssistantRoute=lazy(()=>import('./AssistantPage').then(module=>({default:module.AssistantPage})));
const FileLibraryRoute=lazy(()=>import('./library'));
const WorksheetRoute=lazy(()=>import('./worksheet'));
const SharedToolsRoute=lazy(()=>import('./collaboration'));
const SharedEditorRoute=lazy(()=>import('./collaboration').then(module=>({default:module.SharedEditor})));

const navigation=[
  ['/','Dashboard',Home],
  ['/new','Log Sample',FlaskConical],
  ['/samples','Samples',Search],
  ['/worksheet','Worksheet',Table2],
  ['/reports','Results & Reports',FileText],
  ['/library','File Library',FolderOpen],
  ['/shared','Shared tools',Columns3],
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
  const [error,setError]=useState('');
  useEffect(()=>{
    if(!open||query.trim().length<2){setItems([]);setBusy(false);return;}
    let active=true;setBusy(true);setError('');
    const timer=setTimeout(()=>api(`/search?q=${encodeURIComponent(query)}&limit=6`).then(result=>{if(active)setItems(result.items);}).catch(e=>{if(active){setItems([]);setError(e.message||'Search could not load. Try again.');}}).finally(()=>{if(active)setBusy(false);}),250);
    return()=>{active=false;clearTimeout(timer);};
  },[open,query]);
  useEffect(()=>{if(!open)setQuery('');},[open]);
  if (!open) return null;
  return (
    <Dialog title="Find a sample" onClose={onClose}>
      <div className="cmd-palette" onKeyDown={event=>{if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;const links=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('.cmd-results a'));if(!links.length)return;event.preventDefault();const index=links.indexOf(document.activeElement as HTMLElement);links[(index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length]?.focus();}}>
        <div className="cmd-input-row"><Search size={19}/><input autoFocus className="cmd-input" aria-label="Find a sample anywhere" placeholder="ML number, sample, product or batch…" value={query} onChange={event=>setQuery(event.target.value)}/><button className="icon-button" onClick={onClose} aria-label="Close search"><X size={18}/></button></div>
        <div className="cmd-results">
          {error?<ErrorBox message={error}/>:null}
          {query.trim().length<2?<p>Enter at least two characters to search all months.</p>:busy?<p>Searching…</p>:items.length?items.map(sample=><Link key={sample.id} to={`/samples/${sample.id}`} onClick={onClose}><strong>{sample.ml}</strong><span>{sample.name||'Incomplete record'}</span><small>{sample.categoryLabel||sample.category}{sample.batch?` · Batch ${sample.batch}`:''}</small></Link>):<p>No matching samples.</p>}
          {query.trim().length>=2?<Link className="cmd-all-results" to={`/samples?q=${encodeURIComponent(query)}`} onClick={onClose}>View all search results <ArrowRight size={15}/></Link>:null}
        </div>
      </div>
    </Dialog>
  );
}

function Workspace({data}:{data:any}){
  const {config,theme,setTheme}=useConfiguration();
  const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null);
  const [collapsed, setCollapsed] = useState(true);
  const [mobileNav,setMobileNav]=useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);
  const [accountOpen,setAccountOpen]=useState(false);
  const accountMenu=useRef<HTMLDivElement>(null);
  const [lowPerformanceMode]=useState(isConstrainedDevice);
  const [syncing,setSyncing]=useState(false);
  const location=useLocation();
  const platform=(navigator as Navigator & {userAgentData?:{platform?:string}}).userAgentData?.platform||navigator.platform;
  const searchShortcut=/mac|iphone|ipad/i.test(platform)?'⌘K':'Ctrl+K';

  const notify=(text:string,error=false)=>{setNotice({text,error});};

  const syncWithDatabase=async()=>{
    if(syncing)return;
    setSyncing(true);
    try{
      const result=await api<{sources?:{count?:number;message?:string};library?:{count?:number;removed?:number};errors?:string[]}>('/sync-all','POST');
      window.dispatchEvent(new Event('ipi:sync-complete'));
      const summary=result.errors?.length
        ?`Sync finished with issues: ${result.errors.join(' · ')}`
        :result.sources?.message||`Synced ${result.sources?.count||0} sheet records and ${result.library?.count||0} Drive files${result.library?.removed?`; removed ${result.library.removed} no longer in Drive`:''}.`;
      notify(summary,Boolean(result.errors?.length));
    }catch(e:any){notify(e.message,true);}
    finally{setSyncing(false);}
  };

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
      if (e.key === 'Escape') { setCmdOpen(false); setMobileNav(false); setAccountOpen(false); }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);
  useEffect(()=>{
    const outside=(event:PointerEvent)=>{if(!accountMenu.current?.contains(event.target as Node))setAccountOpen(false);};
    document.addEventListener('pointerdown',outside);
    return()=>document.removeEventListener('pointerdown',outside);
  },[]);
  useEffect(()=>{
    const rail=document.querySelector<HTMLElement>('.sidebar');
    if(!rail)return;
    const mobile=matchMedia('(max-width:767px)');
    const apply=()=>{rail.inert=mobile.matches&&!mobileNav;};
    apply();mobile.addEventListener('change',apply);
    const trigger=document.querySelector<HTMLElement>('.mobile-menu-button');
    if(mobileNav)rail.querySelector<HTMLElement>('a')?.focus();
    const trap=(event:KeyboardEvent)=>{
      if(!mobileNav||!mobile.matches||event.key!=='Tab')return;
      const items=Array.from(rail.querySelectorAll<HTMLElement>('a,button:not(:disabled)')).filter(el=>el.getClientRects().length);
      const first=items[0],last=items.at(-1);
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first?.focus();}
    };
    window.addEventListener('keydown',trap);
    return()=>{mobile.removeEventListener('change',apply);window.removeEventListener('keydown',trap);rail.inert=false;if(mobileNav)trigger?.focus();};
  },[mobileNav]);

  return (
    <Session.Provider value={data}>
      <Notice.Provider value={notify}>
        <div className={`app ${lowPerformanceMode?'app-low-performance':''} ${location.pathname==='/'?'app-dashboard':''}`}>
          <RouteExperience/>
          <SelectionMotion/>
          <a className="skip-to-content" href="#workspace-main">Skip to workspace</a>
          <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''} ${mobileNav?'mobile-open':''}`} aria-label="Workspace navigation">
            <Link to="/" className="brand" title={config.value.general.appName}>
              <div className="brand-icon"><Sparkles size={24}/></div>
              <div className="brand-text">
                <b>{config.value.general.appName}</b>
                <span>{config.value.general.department}</span>
              </div>
            </Link>
            <button className="icon-button collapse-btn" aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'} aria-expanded={!collapsed} onClick={() => setCollapsed(!collapsed)} title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
              {collapsed ? <PanelLeftOpen size={16} /> : <PanelLeftClose size={16} />}
            </button>
            
            <div className="nav-label">WORK</div>
            <nav className="main-nav" aria-label="Workspaces">
              {navigation.slice(0,4).map(([url,label,Icon])=>
                <NavLink end={url==='/'} to={url} key={url} title={label} aria-label={label} onClick={()=>setMobileNav(false)}>
                  <Icon size={18}/>
                  <span>{label}</span>
                </NavLink>
              )}
            </nav>
            <div className="nav-label">REFERENCES &amp; SUPPORT</div>
            <nav aria-label="References and support">
              {navigation.slice(4).map(([url,label,Icon])=>
                <NavLink to={url} key={url} title={label} aria-label={label} onClick={()=>setMobileNav(false)}>
                  <Icon size={18}/>
                  <span>{label}</span>
                </NavLink>
              )}
            </nav>
            
            <div className="nav-label">SYSTEM</div>
            <nav aria-label="System navigation">
              <button type="button" className="nav-sync-button" title="Sync with Database" aria-label="Sync with Database" disabled={syncing} onClick={()=>void syncWithDatabase()}>
                <RefreshCw size={18} className={syncing?'syncing-icon':''}/>
                <span>{syncing?'Syncing…':'Sync with Database'}</span>
              </button>
              {data.user.role==='administrator' && (
                <NavLink to="/settings" title="Settings" aria-label="Settings" onClick={()=>setMobileNav(false)}>
                  <Settings size={18}/>
                  <span>Settings</span>
                </NavLink>
              )}
            </nav>

          </aside>

          <div className={`main-wrapper ${collapsed ? 'collapsed' : ''}`}>
            <header className="topbar">
              <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={()=>setMobileNav(true)}><Menu size={20}/></button>
              <Link className="workspace-wordmark" to="/" aria-label={config.value.general.appName}><b>IPI</b><span>QC MICROBIOLOGY</span></Link>
              <nav className="workspace-tabs" aria-label="Main destinations">{[['/','Workspace'],['/new','Log Sample'],['/samples','Samples'],['/worksheet','Worksheet'],['/reports','Reports'],['/library','File Library'],['/assistant','Assistant']].map(([url,label])=><NavLink key={url} to={url} end={url==='/'}>{label}</NavLink>)}</nav>
              <div className="topbar-right">
                <div className="workspace-status" title={data.demo?'Local workspace. External writes are disabled.':'Authenticated live workspace'}>
                  <span className={`status-dot ${data.demo ? 'pending' : ''}`}/>
                  {data.demo?'Demo workspace':'Live workspace'}
                </div>
                {syncing?<div className="sync-progress-inline" role="status" aria-live="polite"><span>Syncing sources</span><div className="sync-progress-track" role="progressbar" aria-label="Database synchronization progress" aria-valuetext="A reliable percentage is not available yet"><span/></div><span className="sr-only">Synchronization is in progress. Percentage is unavailable until completion.</span></div>:null}
                <button type="button" className="global-search" onClick={() => setCmdOpen(true)} aria-label={`Open global sample search (${searchShortcut})`} title={`Find a sample · ${searchShortcut}`}><Search size={22}/><span>Search a sample, batch, or control number...</span><kbd>{searchShortcut}</kbd></button>
                <button className="icon-button topbar-theme" aria-label={`Switch to ${theme==='light'?'dark':'light'} theme`} onClick={()=>setTheme(theme==='light'?'dark':'light')}><Sun size={22}/></button>
                <div className="account-menu-anchor" ref={accountMenu}>
                  <button type="button" className="account-trigger" aria-label={`Account menu for ${data.user.name}`} aria-haspopup="menu" aria-expanded={accountOpen} onClick={()=>setAccountOpen(value=>!value)}><span className="avatar" title={data.user.name}>{data.user.name.slice(0,2).toUpperCase()}</span><ChevronDown size={15}/></button>
                  {accountOpen?<div className="account-menu" role="menu" aria-label="Account">
                    <strong>{data.user.name}</strong><span className="account-role">{data.user.role}</span>
                    {data.demo?<span className="account-demo-note">Local demo · Google writes disabled</span>:<button type="button" role="menuitem" onClick={()=>api('/auth/logout','POST').then(()=>window.location.reload())}><LogOut size={15}/> Sign out</button>}
                  </div>:null}
                </div>
              </div>
            </header>

            {data.demo && (
              <div className="demo-banner" style={{background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '8px 24px', fontSize: '11px', textAlign: 'center'}}>
                LOCAL DEMO — May include imported logbook snapshots. Google writes are disabled.
              </div>
            )}

            <div className="workspace-content">
              <main id="workspace-main" tabIndex={-1} className="route-stage" key={location.pathname}>
                <Suspense fallback={<Loading/>}><Routes>
                  <Route path="/" element={<Dashboard/>}/>
                  <Route path="/new" element={<Intake/>}/>
                  <Route path="/samples" element={<SampleSearch/>}/>
                  <Route path="/worksheet" element={<WorksheetRoute/>}/>
                  <Route path="/samples/:id" element={<SampleDetailRoute/>}/>
                  <Route path="/reports" element={<ReportsRoute/>}/>
                  <Route path="/reports/:id" element={<ReportEditorRoute/>}/>
                  <Route path="/library" element={<FileLibraryRoute/>}/>
                  <Route path="/shared" element={<SharedToolsRoute/>}/>
                  <Route path="/shared/:id" element={<SharedEditorRoute/>}/>
                  <Route path="/assistant" element={<AssistantRoute/>}/>
                  <Route path="/settings" element={data.user.role==='administrator'?<Suspense fallback={<Loading/>}><AdminCenter/></Suspense>:<><PageTitle title="Settings" description="Administrator access is required to manage this workspace."/><ErrorBox message="Administrator access required"/></>}/>
                  <Route path="*" element={<><PageTitle title="Page not found" description="This address does not match a workspace page." action={<Link className="button secondary" to="/">Return to dashboard</Link>}/><ErrorBox message="Page not found"/></>}/>
                </Routes></Suspense>
              </main>
            </div>
          </div>

          {mobileNav?<button className="mobile-nav-backdrop" aria-label="Close navigation" onClick={()=>setMobileNav(false)}/>:null}

          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
          {location.pathname==='/worksheet'?null:<FloatingAssistant />}
          <DeploymentUpdate />

          {notice && (
            <div className={`toast ${notice.error?'bad':''}`} role={notice.error?'alert':'status'}>
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
      <div className="login-screen login-screen-split">
        <aside className="login-story" aria-labelledby="login-story-heading" onPointerMove={event=>{
          if(isConstrainedDevice()||matchMedia('(prefers-reduced-motion:reduce)').matches)return;
          if(event.pointerType!=='mouse'&&event.pointerType!=='pen')return;
          const bounds=event.currentTarget.getBoundingClientRect();
          event.currentTarget.style.setProperty('--petri-pointer-x',`${((event.clientX-bounds.left)/bounds.width-.5)*15}px`);
          event.currentTarget.style.setProperty('--petri-pointer-y',`${((event.clientY-bounds.top)/bounds.height-.5)*10}px`);
        }} onPointerLeave={event=>{
          event.currentTarget.style.setProperty('--petri-pointer-x','0px');
          event.currentTarget.style.setProperty('--petri-pointer-y','0px');
        }}>
          <div className="login-story-brand">
            <span className="login-story-mark" aria-hidden="true"><FlaskConical size={20} strokeWidth={1.7}/></span>
            <span>IPI <b>MICROBIOLOGY</b></span>
          </div>
          <div className="login-story-copy">
            <h2 id="login-story-heading">A workspace for microbiology QC.</h2>
            <p>Sample intake, review, and report preparation in one traceable workspace.</p>
          </div>
          <svg className="login-petri-visual" viewBox="0 0 600 410" aria-hidden="true" focusable="false">
            <ellipse className="petri-shadow" cx="302" cy="219" rx="215" ry="122"/>
            <ellipse className="petri-rim petri-rim-back" cx="302" cy="197" rx="215" ry="122"/>
            <path className="petri-wall" d="M87 197v25c0 67 96 122 215 122s215-55 215-122v-25"/>
            <ellipse className="petri-rim" cx="302" cy="197" rx="215" ry="122"/>
            <ellipse className="petri-inner" cx="302" cy="197" rx="194" ry="103"/>
            <ellipse className="petri-scan-ring" cx="302" cy="197" rx="215" ry="122"/>
            <path className="petri-axis" d="M76 197h452M302 58v280"/>
            <path className="petri-orbit" d="M105 111c51-66 144-91 224-76m134 39c44 26 75 67 91 113M156 332c-41-22-72-55-91-94m432 61c-41 55-105 89-175 98"/>
            <circle className="petri-colony colony-one" cx="205" cy="174" r="12"/><circle className="petri-colony-core" cx="205" cy="174" r="4"/>
            <circle className="petri-colony colony-two" cx="333" cy="227" r="18"/><circle className="petri-colony-core" cx="333" cy="227" r="6"/>
            <circle className="petri-colony colony-three" cx="389" cy="162" r="9"/><circle className="petri-colony-core" cx="389" cy="162" r="3"/>
            <circle className="petri-colony colony-four" cx="257" cy="252" r="7"/><circle className="petri-colony-core" cx="257" cy="252" r="2.5"/>
            <circle className="petri-colony colony-five" cx="279" cy="143" r="5"/>
            <circle className="petri-node" cx="85" cy="197" r="3"/><circle className="petri-node" cx="519" cy="197" r="3"/>
            <circle className="petri-node" cx="302" cy="75" r="3"/><circle className="petri-node" cx="302" cy="319" r="3"/>
            <circle className="petri-signal" cx="302" cy="197" r="3"/>
          </svg>
          <p className="login-story-footer">INTERNATIONAL PHARMACEUTICALS, INC.</p>
        </aside>
        <section className="login-panel" aria-label="Sign in to IPI Micro-QC">
          <main className="login-card" aria-labelledby="login-heading">
            <div className="login-brand-mark" aria-hidden="true"><FlaskConical size={23} strokeWidth={1.8}/></div>
            <h1 id="login-heading">IPI Micro-QC</h1>
            {signIn ? (
              <>
                <p className="login-description">Sign in with your Google account to continue.</p>
                <a className="login-google-button" href="/api/auth/login">
                  <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8V33A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 17.9l6.8-5.2Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>
                  <span>Continue with Google</span>
                  <ArrowRight className="login-button-arrow" size={15} aria-hidden="true" />
                </a>
                <div className="login-access-note">
                  <span className="login-access-indicator" aria-hidden="true" />
                  <p>New accounts start with viewer access. An administrator can grant additional permissions.</p>
                </div>
              </>
            ) : (
              <div className="login-error-state">
                <ErrorBox message={error}/>
                <button className="button primary" onClick={reload}>Try again</button>
              </div>
            )}
            <div className="login-card-footer"><span>AUTHORIZED ACCESS</span><span>GOOGLE SIGN-IN</span></div>
          </main>
        </section>
      </div>
    );
  }
  return <ConfigurationProvider><Workspace data={data}/></ConfigurationProvider>;
}

