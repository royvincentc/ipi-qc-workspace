import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';

export function RouteExperience(){
  const location=useLocation();
  useEffect(()=>{
    const reset=()=>window.scrollTo({top:0,left:0,behavior:'instant'});
    reset();
    const frame=requestAnimationFrame(reset);
    return()=>cancelAnimationFrame(frame);
  },[location.pathname]);
  return null;
}

/** Progressive selection layers; native links/buttons retain all semantics. */
export function SelectionMotion(){
  useEffect(()=>{
    let frame=0;
    const layers=new Map<HTMLElement,HTMLElement>();
    const update=()=>{
      frame=0;
      document.querySelectorAll<HTMLElement>('.workspace-tabs,.tabs,.intake-mode,.worksheet-type-tabs,.assay-selector').forEach(group=>{
        const selected=group.querySelector<HTMLElement>(':scope > .active,:scope > .selected,:scope > [aria-pressed="true"],:scope > [aria-selected="true"]');
        if(!selected)return;
        let layer=layers.get(group);
        if(!layer){layer=document.createElement('span');layer.className='selection-layer';layer.setAttribute('aria-hidden','true');group.prepend(layer);group.classList.add('selection-host');layers.set(group,layer);}
        const target=group.classList.contains('assay-selector')?selected.querySelector<HTMLElement>('.assay-choice-icon')||selected:selected;
        const rect=target.getBoundingClientRect(),bounds=group.getBoundingClientRect();
        layer.style.width=`${rect.width}px`;layer.style.height=`${rect.height}px`;
        layer.style.transform=`translate(${rect.left-bounds.left+group.scrollLeft}px,${rect.top-bounds.top+group.scrollTop}px)`;
      });
      const sidebar=document.querySelector<HTMLElement>('.sidebar');
      const selected=sidebar?.querySelector<HTMLElement>('a.active');
      if(sidebar&&selected){
        let layer=layers.get(sidebar);
        if(!layer){layer=document.createElement('span');layer.className='rail-selection';layer.setAttribute('aria-hidden','true');sidebar.prepend(layer);layers.set(sidebar,layer);}
        const rect=selected.getBoundingClientRect(),bounds=sidebar.getBoundingClientRect();
        layer.style.width=`${rect.width}px`;layer.style.height=`${rect.height}px`;layer.style.transform=`translate(${rect.left-bounds.left-sidebar.clientLeft}px,${rect.top-bounds.top-sidebar.clientTop+sidebar.scrollTop}px)`;
      }
    };
    const schedule=()=>{if(!frame)frame=requestAnimationFrame(update);};
    // Only state attributes are watched. Our layer's style updates cannot feed back.
    const observer=new MutationObserver(schedule);
    observer.observe(document.querySelector('.app')!,{subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-selected','aria-current'],childList:true});
    window.addEventListener('resize',schedule);document.addEventListener('click',schedule);
    const visibility=()=>{document.documentElement.classList.toggle('motion-paused',document.hidden);};
    document.addEventListener('visibilitychange',visibility);visibility();schedule();
    return()=>{cancelAnimationFrame(frame);observer.disconnect();window.removeEventListener('resize',schedule);document.removeEventListener('click',schedule);document.removeEventListener('visibilitychange',visibility);layers.forEach(layer=>layer.remove());};
  },[]);
  return null;
}
