import FileLibrary from './library';
import {ConfigurationProvider,useConfiguration} from './configuration';
import {GlobalSearch,Dashboard,SampleSearch,Intake} from './workspace';
import {useState,lazy,Suspense,useEffect} from 'react';
import {Link,NavLink,Route,Routes} from 'react-router-dom';
import {LayoutDashboard,FlaskConical,Plus,Search,FileText,FolderOpen,Settings,ArrowRight,ShieldCheck,LogOut,Menu} from 'lucide-react';
import {api} from './api';
import {Session,Notice,useLoad,Loading,ErrorBox} from './ui';
import {SampleDetail} from './pages';
import {Reports,ReportEditor} from './reports';
import SettingsPage from './settings';
const AdminCenter=lazy(()=>import('./admin'));

const navigation=[
  ['/','Dashboard',LayoutDashboard],
  ['/new','Log Sample',Plus],
  ['/samples','Samples',Search],
  ['/reports','Results & Reports',FileText],
  ['/library','File Library',FolderOpen],
  ['/settings','Settings',Settings]
] as const;

function CommandPalette({open, onClose}: {open: boolean, onClose: () => void}) {
  if (!open) return null;
  return (
    <div className="cmd-palette-backdrop open" onClick={onClose}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <input autoFocus className="cmd-input" placeholder="Search a sample, batch, or control number..." />
        {/* Placeholder for real command palette items */}
        <div style={{padding: '16px', color: 'var(--text-secondary)'}}>
          <small>Type to search...</small>
        </div>
      </div>
    </div>
  );
}

function Workspace({data}:{data:any}){
  const {config}=useConfiguration();
  const [notice,setNotice]=useState<{text:string;error:boolean}|null>(null);
  const [collapsed, setCollapsed] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  const notify=(text:string,error=false)=>{setNotice({text,error});};

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

  return (
    <Session.Provider value={data}>
      <Notice.Provider value={notify}>
        <div className="app">
          <aside className={`sidebar ${collapsed ? 'sidebar-collapsed' : ''}`}>
            <Link to="/" className="brand" title={config.value.general.appName}>
              <div className="brand-icon"><FlaskConical size={20}/></div>
              <div>
                <b>{config.value.general.appName}</b>
                <span style={{display: 'block', fontSize: '10px', color: 'var(--text-tertiary)'}}>{config.value.general.department}</span>
              </div>
            </Link>
            
            <div className="nav-label">Workspace</div>
            <nav>
              {navigation.filter(([url])=>url!=='/settings'||data.user.role==='administrator').map(([url,label,Icon])=>
                <NavLink end={url==='/'} to={url} key={url} title={label}>
                  <Icon size={18}/>
                  <span>{label}</span>
                </NavLink>
              )}
            </nav>
            
            <div className="sidebar-bottom">
              <div className="user" style={{marginBottom: collapsed ? '0' : '12px'}}>
                <span className="avatar" title={data.user.name}>{data.user.name.slice(0,2).toUpperCase()}</span>
                <div>
                  <strong>{data.user.name}</strong>
                  <small>{data.user.role}</small>
                </div>
              </div>
              <div style={{display: 'flex', gap: '8px', padding: '0 8px'}}>
                <button className="icon-button" aria-label="Toggle Sidebar" onClick={() => setCollapsed(!collapsed)} title="Toggle Sidebar">
                  <Menu size={16} />
                </button>
                {!data.demo && !collapsed && (
                  <button className="icon-button" aria-label="Sign out" onClick={()=>api('/auth/logout','POST').then(()=>location.reload())} title="Sign Out" style={{marginLeft: 'auto'}}>
                    <LogOut size={16}/>
                  </button>
                )}
              </div>
            </div>
          </aside>

          <div className={`main-wrapper ${collapsed ? 'collapsed' : ''}`}>
            <header className="topbar">
              <div className="global-search" onClick={() => setCmdOpen(true)}>
                <Search size={16} />
                <span>Search...</span>
                <kbd>⌘K</kbd>
              </div>
              <div className="topbar-right">
                <div style={{display: 'flex', alignItems: 'center', gap: '8px'}}>
                  <span className={`status-dot ${data.demo ? 'pending' : ''}`}/>
                  {data.demo?'Dev Workspace':'Connected'}
                </div>
                <div style={{opacity: 0.5}}>|</div>
                <div>
                  {new Intl.DateTimeFormat(config.value.general.dateFormat,{day:'numeric',month:'short',year:'numeric',timeZone:config.value.general.timezone}).format(new Date())}
                </div>
              </div>
            </header>

            {data.demo && (
              <div style={{background: 'var(--color-warning-bg)', color: 'var(--color-warning)', padding: '8px 24px', fontSize: '11px', textAlign: 'center'}}>
                DEMO MODE — Practice records only. No Google writes enabled.
              </div>
            )}

            <div className="workspace-content animate-entrance">
              <main>
                <Routes>
                  <Route path="/" element={<Dashboard/>}/>
                  <Route path="/new" element={<Intake/>}/>
                  <Route path="/samples" element={<SampleSearch/>}/>
                  <Route path="/samples/:id" element={<SampleDetail/>}/>
                  <Route path="/reports" element={<Reports/>}/>
                  <Route path="/reports/:id" element={<ReportEditor/>}/>
                  <Route path="/library" element={<FileLibrary/>}/>
                  <Route path="/settings" element={data.user.role==='administrator'?<Suspense fallback={<Loading/>}><AdminCenter/></Suspense>:<ErrorBox message="Administrator access required"/>}/>
                  <Route path="*" element={<ErrorBox message="Page not found"/>}/>
                </Routes>
              </main>
            </div>
          </div>

          <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />

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
            <p>Sign in to your private laboratory workspace.</p>
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
