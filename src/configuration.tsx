import {useBlocker} from 'react-router-dom';
import {createContext,useContext,useEffect,useState,useRef,useId,type ReactNode} from 'react';
import {api} from './api';
import type {ConfigurationRevision} from '../shared/configuration';
const Context=createContext<{config:ConfigurationRevision;reload:()=>Promise<void>}|null>(null);
const Dirty=createContext<Map<string,boolean>>(new Map());
function NavigationGuard(){const entries=useContext(Dirty);const blocker=useBlocker(({currentLocation,nextLocation})=>[...entries.values()].some(Boolean)&&currentLocation.pathname+currentLocation.search!==nextLocation.pathname+nextLocation.search);useEffect(()=>{if(blocker.state==='blocked'){if(window.confirm('Leave without saving your changes?'))blocker.proceed();else blocker.reset();}},[blocker]);return null;}
export function ConfigurationProvider({children}:{children:ReactNode}){
 const dirty=useRef(new Map<string,boolean>());const [config,setConfig]=useState<ConfigurationRevision>(),[error,setError]=useState('');
 const reload=async()=>{setError('');setConfig(await api('/configuration'));};
 useEffect(()=>{reload().catch(e=>setError(e.message));},[]);
 useEffect(()=>{if(!config)return;const g=config.value.general;const media=window.matchMedia('(prefers-color-scheme: dark)');const apply=()=>{document.documentElement.dataset.theme=g.theme==='system'?(media.matches?'dark':'light'):g.theme;document.documentElement.dataset.density=g.density;document.title=g.appName;};apply();media.addEventListener('change',apply);return()=>media.removeEventListener('change',apply);},[config]);
 if(error)return <div className="login"><div className="error" role="alert">{error}</div><button className="button primary" onClick={()=>reload().catch(e=>setError(e.message))}>Try again</button></div>;if(!config)return <div className="empty" role="status">Loading laboratory settings…</div>;
 return <Context.Provider value={{config,reload}}><Dirty.Provider value={dirty.current}><NavigationGuard/>{children}</Dirty.Provider></Context.Provider>;
}
export function useConfiguration(){const ctx=useContext(Context);if(!ctx)throw new Error('Configuration provider missing');return ctx;}
export function useCatalog(){const {config}=useConfiguration();return {categories:Object.fromEntries(config.value.sampleTypes.map(t=>[t.id,t.name])),testLabels:Object.fromEntries(config.value.tests.filter(t=>t.active).map(t=>[t.id,t.name]))};}
export function useUnsaved(dirty:boolean){
 const entries=useContext(Dirty),id=useId();
 useEffect(()=>{entries.set(id,dirty);return()=>{entries.delete(id);};},[dirty,id,entries]);
 useEffect(()=>{if(!dirty)return;const before=(e:BeforeUnloadEvent)=>{if(entries.get(id)){e.preventDefault();e.returnValue='';}};window.addEventListener('beforeunload',before);return()=>window.removeEventListener('beforeunload',before);},[dirty]);
 return ()=>entries.delete(id);
}
