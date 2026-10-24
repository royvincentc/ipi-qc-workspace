import {ConfigurationProvider,useConfiguration} from './configuration';
import {Dashboard,SampleSearch,Intake} from './workspace';
import {useState,lazy,Suspense,useEffect,useRef} from 'react';
import {Link,NavLink,Route,Routes,useLocation} from 'react-router-dom';
import {Sparkles,FlaskConical,Plus,Search,ArrowRight,ShieldCheck,LogOut,Menu,X,Sun,Moon,ChevronDown,Columns3,RefreshCw} from './components/LabIcons';
import {api} from './api';
import {Session,Notice,useLoad,Loading,ErrorBox,PageTitle} from './ui';
import { FloatingAssistant } from './FloatingAssistant';
import {RouteExperience,SelectionMotion} from './Experience';
import {WorkflowFilm} from './WorkflowFilm';
import {LabIconHome,LabIconIntake,LabIconSearch,LabIconWorksheet,LabIconReports,LabIconLibrary,LabIconShared,LabIconAssistant,LabIconSync,LabIconSettings} from './components/LabIcons';
import Dialog from './dialog';
import {isConstrainedDevice} from './motion';
import {LoginFilm,LoginConnecting,WorkspaceArrival,hasLoginHandoff,rememberLoginHandoff} from './LoginFilm';
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
  ['/','Dashboard',LabIconHome],
  ['/new','Log Sample',LabIconIntake],
  ['/samples','Samples',LabIconSearch],
  ['/worksheet','Worksheet',LabIconWorksheet],
  ['/reports','Results & Reports',LabIconReports],
  ['/library','File Library',LabIconLibrary],
  ['/shared','Shared tools',LabIconShared],
  ['/assistant','Smart Assistant',LabIconAssistant]
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
  const input=useRef<HTMLInputElement>(null);
  useEffect(()=>{
    if(!open||query.trim().length<2){setItems([]);setBusy(false);setError('');return;}
    let active=true;setBusy(true);setItems([]);setError('');
    const timer=setTimeout(()=>api(`/search?q=${encodeURIComponent(query)}&limit=6`).then(result=>{if(active)setItems(result.items);}).catch(e=>{if(active){setItems([]);setError(e.message||'Search could not load. Try again.');}}).finally(()=>{if(active)setBusy(false);}),250);
    return()=>{active=false;clearTimeout(timer);};
  },[open,query]);
  useEffect(()=>{if(!open)setQuery('');},[open]);
  useEffect(()=>{if(open)input.current?.focus();},[open]);
  if (!open) return null;
  return (
    <Dialog title="Find a sample" onClose={onClose} className="sample-search-dialog">
      <div className="cmd-palette" onKeyDown={event=>{if(event.key!=='ArrowDown'&&event.key!=='ArrowUp')return;const links=Array.from(event.currentTarget.querySelectorAll<HTMLElement>('.cmd-results a'));if(!links.length)return;event.preventDefault();const index=links.indexOf(document.activeElement as HTMLElement);const next=index<0?(event.key==='ArrowDown'?0:links.length-1):(index+(event.key==='ArrowDown'?1:-1)+links.length)%links.length;links[next]?.focus();}}>
        <div className="cmd-input-row"><Search size={21} aria-hidden="true"/><input ref={input} autoFocus className="cmd-input" aria-label="Find a sample anywhere" aria-describedby="sample-search-hint" placeholder="ML number, sample, product or batch…" value={query} onChange={event=>setQuery(event.target.value)}/>{query?<button type="button" className="icon-button" onClick={()=>{setQuery('');input.current?.focus();}} aria-label="Clear search"><X size={18}/></button>:null}</div>
        <div className="cmd-search-meta" id="sample-search-hint"><span>Search across all months</span><span>2 characters minimum</span></div>
        <div className="cmd-results">
          {error?<ErrorBox message={error}/>:null}
          {!busy&&!error&&query.trim().length>=2&&items.length>0?<span className="sr-only" role="status">{items.length} sample matches shown</span>:null}
          {query.trim().length<2?null:busy?<Loading compact label="Searching samples…"/>:error?null:items.length?items.map(sample=><Link key={sample.id} to={`/samples/${sample.id}`} onClick={onClose}><strong>{sample.ml}</strong><span>{sample.name||'Incomplete record'}</span><small>{sample.categoryLabel||sample.category}{sample.batch?` · Batch ${sample.batch}`:''}</small></Link>):<p role="status">No matching samples. Try another ML number, product or batch.</p>}
          {query.trim().length>=2?<Link className="cmd-all-results" to={`/samples?q=${encodeURIComponent(query)}`} onClick={onClose}>View all search results <ArrowRight size={15}/></Link>:null}
        </div>
      </div>
    </Dialog>
  );
}

function Workspace({data}:{data:any}){
  const {config,theme,setTheme}=useConfiguration();
  const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null);
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
      const summary=result.errors?.length
        ?`Updated ${result.sources?.count||0} sheet records and ${result.library?.count||0} Drive files. Issues: ${result.errors.join(' · ')}`
        :result.sources?.message||`Synced ${result.sources?.count||0} sheet records and ${result.library?.count||0} Drive files${result.library?.removed?`; removed ${result.library.removed} no longer in Drive`:''}.`;
      notify(summary,Boolean(result.errors?.length));
    }catch(e:any){notify(e.message,true);}
    finally{window.dispatchEvent(new Event('ipi:sync-complete'));setSyncing(false);}
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
        <div className={`app app-workspace reception-motion ${lowPerformanceMode?'app-low-performance':''} ${location.pathname==='/'?'app-dashboard':''}`}>
                    <RouteExperience/>
          <SelectionMotion/>
          <a className="skip-to-content" href="#workspace-main">Skip to workspace</a>
          <aside className={`sidebar sidebar-collapsed ${mobileNav?'mobile-open':''}`} aria-label="Workspace navigation">
            <Link to="/" className="brand" title={config.value.general.appName}>
              <div className="brand-icon"><Sparkles size={24}/></div>
              <div className="brand-text">
                <b>{config.value.general.appName}</b>
                <span>{config.value.general.department}</span>
              </div>
            </Link>
            <button className="icon-button mobile-rail-close" aria-label="Close navigation" onClick={()=>setMobileNav(false)}><X size={20}/></button>
            <nav className="utility-nav" aria-label="Workspace utilities">
              <button type="button" title={`Find a sample · ${searchShortcut}`} aria-label={`Open global sample search (${searchShortcut})`} onClick={()=>{setMobileNav(false);setCmdOpen(true);}}><Search size={19}/><span>Search</span></button>
              {data.user.role !== 'viewer' ? <Link to="/new" title="Log a sample" onClick={()=>setMobileNav(false)}><Plus size={20}/><span>Log a sample</span></Link> : null}
              <button type="button" aria-label={`Switch to ${theme==='light'?'dark':'light'} theme`} title="Change theme" onClick={()=>setTheme(theme==='light'?'dark':'light')}>{theme==='light'?<Moon size={19}/>:<Sun size={19}/>}<span>Change theme</span></button>
              <NavLink to="/shared" title="Shared tools" onClick={()=>setMobileNav(false)}><Columns3 size={19}/><span>Shared tools</span></NavLink>
            </nav>
            
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
                {syncing?<LoginFilm/>:<LabIconSync size={18}/>}
                <span>{syncing?'Syncing…':'Sync with Database'}</span>
              </button>
              {data.user.role==='administrator' && (
                <NavLink to="/settings" title="Settings" aria-label="Settings" onClick={()=>setMobileNav(false)}>
                  <LabIconSettings size={18}/>
                  <span>Settings</span>
                </NavLink>
              )}
            </nav>

          </aside>

          <div className="main-wrapper collapsed">
            <header className="topbar">
              <button className="icon-button mobile-menu-button" aria-label="Open navigation" onClick={()=>setMobileNav(true)}><Menu size={20}/></button>
              <Link className="workspace-wordmark" to="/" aria-label={config.value.general.appName}><b>ipi<span>.</span></b><span>Microbiology</span></Link>
              <nav className="workspace-tabs" aria-label="Main destinations">{[['/','Overview'],['/samples','Samples'],['/worksheet','Worksheet'],['/reports','Reports'],['/library','Library'],['/assistant','Assistant']].map(([url,label])=><NavLink key={url} to={url} end={url==='/'}>{label}</NavLink>)}</nav>
              <div className="topbar-right">
                {syncing ? (
                  <Loading compact label="Syncing sources"/>
                ) : null}
                <div className="apple-glass-island" role="toolbar" aria-label="Quick actions and profile">
                  <div className="island-segment island-status" title={data.demo ? 'Local workspace. External writes are disabled.' : 'Authenticated live workspace'}>
                    <span className={`status-dot ${data.demo ? 'pending' : ''}`} />
                    <span className="status-label">{data.demo ? 'Demo' : 'Live'}</span>
                  </div>
                  <div className="island-divider" aria-hidden="true" />
                  <button type="button" className="island-segment island-search" onClick={() => setCmdOpen(true)} aria-label={`Open global sample search (${searchShortcut})`} title={`Find a sample · ${searchShortcut}`}>
                    <Search size={18} />
                    <span className="search-hint">Search…</span>
                    <kbd>{searchShortcut}</kbd>
                  </button>
                  <div className="island-divider" aria-hidden="true" />
                  <button type="button" className="island-segment island-theme" aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} title={`Switch to ${theme === 'light' ? 'dark' : 'light'} theme`} onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}>
                    {theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}
                  </button>
                  <div className="island-divider" aria-hidden="true" />
                  <div className="island-segment island-account account-menu-anchor" ref={accountMenu}>
                    <button type="button" className="account-trigger" aria-label={`Account menu for ${data.user.name}`} aria-haspopup="menu" aria-expanded={accountOpen} onClick={() => setAccountOpen(value => !value)}>
                      <span className="avatar" title={data.user.name}>{data.user.name.slice(0, 2).toUpperCase()}</span>
                      <ChevronDown size={13} className="account-chevron" />
                    </button>
                    {accountOpen ? (
                      <div className="account-menu" role="menu" aria-label="Account">
                        <strong>{data.user.name}</strong><span className="account-role">{data.user.role}</span>
                        {data.demo ? <span className="account-demo-note">Local demo · Google writes disabled</span> : <button type="button" role="menuitem" onClick={() => api('/auth/logout', 'POST').then(() => window.location.reload())}><LogOut size={15} /> Sign out</button>}
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            </header>

            {data.demo && (
              <div className="demo-banner" style={{background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '8px 24px', fontSize: '11px', textAlign: 'center'}}>
                Local preview <span aria-hidden="true">&middot;</span> Imported logbook snapshots may be included. Google writes are disabled.
              </div>
            )}

            <div className="workspace-content">
              <main id="workspace-main" tabIndex={-1} className="route-stage" key={location.pathname}>
                <WorkflowFilm/>
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
  const location = useLocation();
  const {data,error,reload}=useLoad(()=>api('/me'));
  const forceLogin = location.pathname === '/login' || new URLSearchParams(location.search).get('view') === 'login';
  if(!data || forceLogin){
    if(!error && !data && !forceLogin) return hasLoginHandoff()?<LoginConnecting/>:<Loading/>;
    const signIn=(!error&&forceLogin) || error==='Sign in to access the workspace'||error.includes('session expired');
    return (
      <div className="login-screen login-refined">
        <aside className="login-story" aria-label="IPI QC Microbiology">
          <div className="login-story-brand">
            <span className="login-wordmark">ipi<b>.</b></span>
            <span className="login-brand-division">QC Microbiology</span>
          </div>
          <div className="login-story-showcase">
            <h2>Care in every<br/>detail.</h2>
            <p>One workspace for the work behind every sample.</p>
          </div>
          <LoginFilm controls/>
          <div className="login-story-footer">
            <span>International Pharmaceuticals, Inc.</span>
            <span>Quality Control Division</span>
          </div>
        </aside>
        <section className="login-panel" aria-label="Sign in to IPI Micro-QC">
          <main className="login-card" aria-labelledby="login-heading">
            <h1 id="login-heading">{data?.user?'Welcome back.':'Sign in.'}</h1>
            <p className="login-kicker">Your laboratory, in focus.<br/>Continue to sample intake, worksheets, and report preparation.</p>
            {data?.user ? (
              <div className="login-authenticated-badge">
                <p className="login-authenticated-status">Active session</p>
                <div className="login-authenticated-user">
                  <span className="login-user-name">{data.user.name || data.user.email}</span>
                  <span className="login-user-email">{data.user.email}</span>
                </div>
                <Link to="/" onClick={rememberLoginHandoff} className="button primary login-enter-button">Enter laboratory workspace <ArrowRight size={18} aria-hidden="true"/></Link>
              </div>
            ) : signIn ? (
              <>
                <a className="login-google-button" href="/api/auth/login" onClick={rememberLoginHandoff}>
                  <svg className="google-mark" viewBox="0 0 48 48" aria-hidden="true"><path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11a9.4 9.4 0 0 1-4.1 6.2v5.1h6.6c3.9-3.6 6.1-8.9 6.1-15Z"/><path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.6-5.1c-1.8 1.2-4.1 2-6.9 2-5.3 0-9.8-3.6-11.4-8.4H5.8V33A20 20 0 0 0 24 44Z"/><path fill="#FBBC05" d="M12.6 27.7a12 12 0 0 1 0-7.4V15H5.8a20 20 0 0 0 0 17.9l6.8-5.2Z"/><path fill="#EA4335" d="M24 11.9c3 0 5.7 1 7.8 3.1l5.9-5.9C34.1 5.8 29.5 4 24 4A20 20 0 0 0 5.8 15l6.8 5.3c1.6-4.8 6.1-8.4 11.4-8.4Z"/></svg>
                  <span>Sign in with Google</span>
                  <ArrowRight className="login-button-arrow" size={15} aria-hidden="true" />
                </a>
                <div className="login-access-note">
                  <span className="login-access-indicator" aria-hidden="true" />
                  <p>Use your authorized Google account.</p>
                </div>
              </>
            ) : (
              <div className="login-error-state">
                <ErrorBox message={error || 'Unable to connect to laboratory API'}/>
                <div className="login-error-actions">
                  <button type="button" className="button primary" onClick={reload}>Retry connection</button>
                </div>
              </div>
            )}
            <div className="login-card-footer">Access managed by your administrator.</div>
          </main>
        </section>
      </div>
    );
  }
  return <ConfigurationProvider loading={hasLoginHandoff()?<LoginConnecting/>:undefined}><WorkspaceArrival><Workspace data={data}/></WorkspaceArrival></ConfigurationProvider>;
}

