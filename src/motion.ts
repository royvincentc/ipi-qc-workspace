import {useEffect,useState} from 'react';

/** Reduce general interface effects on constrained devices; workflow motion has its own toggle. */
export function isConstrainedDevice(){
  if(typeof navigator==='undefined')return false;
  const device=navigator as Navigator & {deviceMemory?:number;connection?:{saveData?:boolean}};
  return Boolean(device.connection?.saveData)
    || (device.hardwareConcurrency>0&&device.hardwareConcurrency<=4)
    || (typeof device.deviceMemory==='number'&&device.deviceMemory<=4);
}

const motionKey='ipi.reception.motion';
const motionEvent='ipi:motion-change';
const readMotion=()=>{try{const saved=localStorage.getItem(motionKey);return saved?saved==='on':true;}catch{return true;}};
let currentMotion: boolean|undefined;

/** One preference for the films, chart, and interface transitions, including blocked storage. */
export function useWorkspaceMotion(){
  const [enabled,setEnabled]=useState(()=>currentMotion??readMotion());
  const [reduced,setReduced]=useState(()=>matchMedia('(prefers-reduced-motion: reduce)').matches);
  const [visible,setVisible]=useState(()=>!document.hidden);
  useEffect(()=>{
    const media=matchMedia('(prefers-reduced-motion: reduce)');
    const preference=()=>setReduced(media.matches);
    const visibility=()=>setVisible(!document.hidden);
    const update=()=>setEnabled(currentMotion??readMotion());
    const storage=(event:StorageEvent)=>{if(event.key===motionKey||event.key===null){currentMotion=readMotion();update();}};
    media.addEventListener('change',preference);
    document.addEventListener('visibilitychange',visibility);
    window.addEventListener(motionEvent,update);
    window.addEventListener('storage',storage);
    return()=>{media.removeEventListener('change',preference);document.removeEventListener('visibilitychange',visibility);window.removeEventListener(motionEvent,update);window.removeEventListener('storage',storage);};
  },[]);
  const setMotion=(value:boolean)=>{
    currentMotion=value;
    try{localStorage.setItem(motionKey,value?'on':'off');}catch{/* In-memory preference still applies. */}
    window.dispatchEvent(new Event(motionEvent));
  };
  return {enabled,reduced,visible,animate:enabled&&!reduced,setMotion};
}
