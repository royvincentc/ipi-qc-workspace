import {useCatalog,useUnsaved,useConfiguration} from './configuration';
import {cloneElement,createContext,isValidElement,useContext,useEffect,useState,type ReactNode} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowUpRight,FlaskConical,Search} from 'lucide-react';
import type {Sample,User} from '../shared/model';

export const Session=createContext<{user:User;demo:boolean}>({user:{email:'',name:'',role:'viewer'},demo:false});
export const Notice=createContext<(message:string,error?:boolean)=>void>(()=>{});
export function useLoad<T>(fetcher:()=>Promise<T>,deps:unknown[]=[]){const [data,setData]=useState<T>(),[error,setError]=useState(''),[version,setVersion]=useState(0);useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('ipi:sync-complete',refresh);return()=>window.removeEventListener('ipi:sync-complete',refresh);},[]);useEffect(()=>{let active=true;setError('');setData(undefined);fetcher().then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[...deps,version]);return {data,setData,error,reload:()=>setVersion(v=>v+1)};}
const pageMotifs:{match:RegExp;label:string;path:string}[]=[
  {match:/^\/new(?:\/|$)/,label:'Sample intake',path:'M36 11v21m-8-7 8 8 8-8M25 45h22m-18 5h14'},
  {match:/^\/samples\/[^/]+/,label:'Sample trace',path:'M11 37h14l8-14 9 28 9-14h10'},
  {match:/^\/samples(?:\/|$)/,label:'Sample lookup',path:'M49 48l11 11M42 15a18 18 0 1 1 0 36 18 18 0 0 1 0-36Z'},
  {match:/^\/reports\/[^/]+/,label:'Report preparation',path:'M25 12h17l8 8v34H25zM42 12v10h9M31 32h13M31 39h13M31 46h9'},
  {match:/^\/reports(?:\/|$)/,label:'Results review',path:'M12 47h11l6-20 8 25 8-19 7 14h8'},
  {match:/^\/library(?:\/|$)/,label:'Reference library',path:'M22 15h22l8 7v32H22zM44 15v10h8M29 34h16M29 41h16M29 48h12'},
  {match:/^\/assistant(?:\/|$)/,label:'Assistant',path:'M17 19h38v28H34L20 57l2-10h-5zM25 29h22M25 36h15'},
  {match:/^\/settings(?:\/|$)/,label:'Settings',path:'M17 21h38M17 36h38M17 51h38M27 16v10m18 5v10m-9 5v10'},
];
export function LabMotionMark({path}:{path:string}){return <svg className="page-motion-mark" viewBox="0 0 72 72" aria-hidden="true" focusable="false"><circle className="page-motion-dish" cx="36" cy="36" r="32"/><circle className="page-motion-rim" cx="36" cy="36" r="30.5"/><circle className="page-motion-agar" cx="36" cy="36" r="24.5"/><ellipse className="page-motion-scan" cx="36" cy="36" rx="24.5" ry="9"/><g className="page-motion-colonies"><circle cx="25" cy="26" r="2.3"/><circle cx="46" cy="23" r="1.5"/><circle cx="48" cy="43" r="2.7"/><circle cx="31" cy="48" r="1.7"/><circle cx="20" cy="39" r="1.2"/></g><path className="page-motion-line" pathLength="100" d={path}/><circle className="page-motion-node" cx="36" cy="36" r="2.5"/><circle className="page-motion-signal" cx="58" cy="36" r="2"/></svg>;}
export function PageTitle({eyebrow,title,description,action}:{eyebrow?:string;title:string;description:string;action?:ReactNode}){
  const {pathname}=useLocation();
  const motif=pageMotifs.find(item=>item.match.test(pathname))||{label:'Workspace',path:'M4 12h5l3-7 4 14 3-7h5'};
  return <div className="page-heading"><div className="page-heading-copy">{eyebrow?<div className="eyebrow">{eyebrow}</div>:null}<h1>{title}</h1><p>{description}</p></div><LabMotionMark path={motif.path}/>{action?<div className="page-heading-action">{action}</div>:null}</div>;
}
export function Empty({title,children}:{title:string;children?:ReactNode}){return <div className="empty"><FlaskConical size={32}/><h3>{title}</h3><p>{children}</p></div>;}
export function ErrorBox({message}:{message:string}){return message?<div className="error" role="alert">{message}</div>:null;}
export function Loading(){return <div className="loading-state" role="status" aria-live="polite"><div className="loading-orbit" aria-hidden="true"><FlaskConical/><i/><i/><i/></div><strong>Preparing your workspace</strong><span className="typing-status">Checking samples and records</span></div>;}
export function Badge({children,tone='neutral'}:{children:ReactNode;tone?:string}){return <span className={`badge ${tone}`}>{children}</span>;}
const analystNames=[
  {fullName:'Roy Vincent Codiñera',aliases:['Roy']},
  {fullName:'James Bryle A. Goloran',aliases:['James']},
  {fullName:'Jasmin C. Barangan',aliases:['Jas']},
  {fullName:'Ahrianne B. Canoy',aliases:['Ahrianne','Aryan']},
  {fullName:'Annaleen C. Villaver',aliases:['Annaleen','Anne']},
  {fullName:'Daryl Chris D. Nueva',aliases:['Daryl']},
];
function fullAnalystName(value:string){const normalized=value.trim().toLocaleLowerCase();return analystNames.find(({fullName,aliases})=>[fullName,...aliases].some(name=>name.toLocaleLowerCase()===normalized))?.fullName||value;}
export function Field({label,children,hint}:{label:string;children:ReactNode;hint?:string}){const analystField=label==='Analyst display name'&&isValidElement(children);const control=analystField?cloneElement(children as React.ReactElement<any>,{list:'analyst-name-options',autoComplete:'off',placeholder:'Search by first name or nickname',onChange:(event:React.ChangeEvent<HTMLInputElement>)=>{const value=fullAnalystName(event.target.value);(children.props as any).onChange?.({...event,target:{...event.target,value}});}}):children;return <label className="field"><span>{label}</span>{control}{analystField?<datalist id="analyst-name-options">{analystNames.flatMap(({fullName,aliases})=>[<option key={fullName} value={fullName}>{aliases[0]}</option>,...aliases.map(alias=><option key={`${fullName}-${alias}`} value={alias}>{fullName}</option>)])}</datalist>:null}{hint?<small>{hint}</small>:null}</label>;}
export function SampleList({samples}:{samples:Sample[]}){const {categories,testLabels}=useCatalog();return samples.length?<div className="sample-list">{samples.map(s=><Link className="sample-row" to={`/samples/${s.id}`} key={s.id}><div className="sample-icon"><FlaskConical size={20}/></div><div className="sample-main"><span className="mono muted">{s.ml}</span><strong>{s.name||'Incomplete source record'}</strong><span className="muted">{categories[s.category]} · Batch {s.batch||'not entered'}</span></div><div className="sample-meta"><Badge tone={s.status==='RELEASED'?'green':'amber'}>{s.status||'Not recorded'}</Badge>{s.duplicate?<Badge tone="red">Duplicate ML</Badge>:null}<small>{s.source.sheet}</small></div><ArrowUpRight size={18}/></Link>)}</div>:<Empty title="No samples found">Try another search or connect your logbook in Settings.</Empty>;}
export function SearchInput({value,onChange,placeholder='Search ML number, product or batch…'}:{value:string;onChange:(v:string)=>void;placeholder?:string}){return <div className="search search-field"><Search size={18}/><input aria-label={placeholder} value={value} onChange={e=>onChange(e.target.value)} placeholder={placeholder}/></div>;}
export function useCanEdit(){return useContext(Session).user.role!=='viewer';}
