import {useEffect} from 'react';
import {useLocation} from 'react-router-dom';

export function AmbientBackdrop(){
  return <div className="ambient-backdrop" aria-hidden="true"><i/><i/><i/><span/></div>;
}

export function RouteExperience({lowPerformanceMode=false}:{lowPerformanceMode?:boolean}){
  const location=useLocation();
  useEffect(()=>{
    window.scrollTo({top:0,behavior:lowPerformanceMode||window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    if(lowPerformanceMode)return;
    const observed=new WeakSet<Element>();
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{rootMargin:'0px 0px -7% 0px',threshold:.08});
    const register=()=>document.querySelectorAll('main .panel, main .page-heading, main .category-card, main .data-table-container, main .rail-section').forEach(node=>{
      if(!observed.has(node)){observed.add(node);node.classList.add('scroll-reveal');observer.observe(node);}
    });
    register();
    let registerFrame=0;
    const scheduleRegister=()=>{
      if(registerFrame) return;
      registerFrame=requestAnimationFrame(()=>{registerFrame=0;register();});
    };
    const mutations=new MutationObserver(scheduleRegister);
    const main=document.querySelector('main');
    if(main)mutations.observe(main,{childList:true,subtree:true});
    return()=>{observer.disconnect();mutations.disconnect();if(registerFrame)cancelAnimationFrame(registerFrame);};
  },[location.pathname,lowPerformanceMode]);
  return null;
}
