import {useCatalog,useUnsaved,useConfiguration} from './configuration';
import {cloneElement,createContext,isValidElement,useContext,useEffect,useState,type ReactNode} from 'react';
import {Link,useLocation} from 'react-router-dom';
import {ArrowUpRight,FlaskConical,Search} from 'lucide-react';
import type {Sample,User} from '../shared/model';

export const Session=createContext<{user:User;demo:boolean}>({user:{email:'',name:'',role:'viewer'},demo:false});
export const Notice=createContext<(message:string,error?:boolean)=>void>(()=>{});
export function useLoad<T>(fetcher:()=>Promise<T>,deps:unknown[]=[]){const [data,setData]=useState<T>(),[error,setError]=useState(''),[version,setVersion]=useState(0);useEffect(()=>{const refresh=()=>setVersion(v=>v+1);window.addEventListener('ipi:sync-complete',refresh);return()=>window.removeEventListener('ipi:sync-complete',refresh);},[]);useEffect(()=>{let active=true;setError('');setData(undefined);fetcher().then(d=>{if(active)setData(d);}).catch(e=>{if(active)setError(e.message);});return()=>{active=false;};},[...deps,version]);return {data,setData,error,reload:()=>setVersion(v=>v+1)};}
const pageMotifs:{match:RegExp;label:string;path:string}[]=[
  {match:/^\/new(?:\/|$)/,label:'Sample intake',path:'M12 4v15m-4-7 4 4 4-4M5 20h14'},
  {match:/^\/samples\/[^/]+/,label:'Sample trace',path:'M5 12h4l3-6 4 12 3-6h4'},
  {match:/^\/samples(?:\/|$)/,label:'Sample lookup',path:'M16 16l4 4M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Z'},
  {match:/^\/reports\/[^/]+/,label:'Report preparation',path:'M7 4h8l4 4v12H7zM15 4v5h5M10 13h6M10 16h6'},
  {match:/^\/reports(?:\/|$)/,label:'Results review',path:'M4 17h4l3-9 4 12 3-8h4'},
  {match:/^\/library(?:\/|$)/,label:'Reference library',path:'M6 4h9l4 4v12H6zM15 4v5h4M9 13h7M9 16h5'},
  {match:/^\/assistant(?:\/|$)/,label:'Assistant',path:'M5 6h14v10H10l-5 4zM8 10h8M8 13h5'},
  {match:/^\/settings(?:\/|$)/,label:'Settings',path:'M5 7h14M5 12h14M5 17h14M9 5v4m6 1v4m-3 1v4'},
];
export function PageTitle({eyebrow,title,description,action}:{eyebrow?:string;title:string;description:string;action?:ReactNode}){
  const {pathname}=useLocation();
  const motif=pageMotifs.find(item=>item.match.test(pathname))||{label:'Workspace',path:'M4 12h5l3-7 4 14 3-7h5'};
  return <div className="page-heading"><div className="page-heading-copy">{eyebrow?<div className="eyebrow">{eyebrow}</div>:null}<h1>{title}</h1><p>{description}</p></div><svg className="page-motion-mark" viewBox="0 0 28 28" aria-hidden="true" focusable="false"><circle className="page-motion-ring" cx="14" cy="14" r="12"/><path className="page-motion-line" pathLength="44" d={motif.path}/><circle className="page-motion-node" cx="14" cy="14" r="1.5"/></svg>{action?<div className="page-heading-action">{action}</div>:null}</div>;
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
