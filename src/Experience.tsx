import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';
import {useWorkspaceMotion} from './motion';

export function RouteExperience(){
  const location=useLocation();
  const {animate,visible}=useWorkspaceMotion();
  useEffect(()=>{
    document.documentElement.classList.toggle('workspace-motion-paused',!animate||!visible);
    return()=>document.documentElement.classList.remove('workspace-motion-paused');
  },[animate,visible]);
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
  const location=useLocation();
  useEffect(()=>{
    let frame=0;
    const layers=new Map<HTMLElement,HTMLElement>();
    const update=()=>{
      frame=0;
      document.querySelectorAll<HTMLElement>('.workspace-tabs,.tabs,.intake-mode,.worksheet-type-tabs,.assay-selector').forEach(group=>{
        const selected=group.querySelector<HTMLElement>(':scope > .active,:scope > .selected,:scope > [aria-pressed="true"],:scope > [aria-selected="true"]');
        if(!selected){const layer=layers.get(group);if(layer)layer.hidden=true;return;}
        let layer=layers.get(group);
        if(!layer){layer=document.createElement('span');layer.className='selection-layer';layer.setAttribute('aria-hidden','true');group.prepend(layer);group.classList.add('selection-host');layers.set(group,layer);}
        layer.hidden=false;
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
    const observer=new MutationObserver(() => schedule());
    observer.observe(document.querySelector('.app')!,{subtree:true,attributes:true,attributeFilter:['aria-pressed','aria-selected','aria-current'],childList:true});
    const resizeObserver=typeof ResizeObserver!=='undefined'?new ResizeObserver(()=>schedule()):null;
    document.querySelectorAll<HTMLElement>('.app,.topbar,.workspace-tabs,.tabs,.intake-mode,.worksheet-type-tabs,.assay-selector,.sidebar').forEach(el=>resizeObserver?.observe(el));
    void document.fonts?.ready?.then(schedule);
    let tabFrame=0;
    const tabChange=(event:MouseEvent)=>{
      schedule();
      const target=(event.target as HTMLElement).closest<HTMLElement>('.tabs button,.intake-mode button,.worksheet-type-tabs button,.assay-selector button,.settings-nav button');
      if(!target||target.matches(':disabled')||document.documentElement.classList.contains('workspace-motion-paused'))return;
      cancelAnimationFrame(tabFrame);
      tabFrame=requestAnimationFrame(()=>{
        const group=target.closest<HTMLElement>('.tabs,.intake-mode,.worksheet-type-tabs,.assay-selector,.settings-nav');
        const content=group?.nextElementSibling;
        if(content instanceof HTMLElement)content.animate([{opacity:.35,transform:'translateY(14px)'},{opacity:1,transform:'translateY(0)'}],{duration:480,easing:'cubic-bezier(.22,1,.36,1)'});
      });
    };
    window.addEventListener('resize',schedule);document.addEventListener('click',tabChange);
    const visibility=()=>{document.documentElement.classList.toggle('motion-paused',document.hidden);};
    document.addEventListener('visibilitychange',visibility);visibility();schedule();
    return()=>{cancelAnimationFrame(frame);cancelAnimationFrame(tabFrame);observer.disconnect();resizeObserver?.disconnect();window.removeEventListener('resize',schedule);document.removeEventListener('click',tabChange);document.removeEventListener('visibilitychange',visibility);layers.forEach(layer=>layer.remove());};
  },[]);
  useEffect(()=>{
    const frame=requestAnimationFrame(()=>window.dispatchEvent(new Event('resize')));
    return()=>cancelAnimationFrame(frame);
  },[location.pathname]);
  return null;
}
