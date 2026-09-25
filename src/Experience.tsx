import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';

export function AmbientBackdrop(){
  return <div className="ambient-backdrop" aria-hidden="true"><i/><i/><i/><span/></div>;
}

export function CustomCursor(){
  const cursorRef=useRef<HTMLDivElement>(null);
  useEffect(()=>{
    if(!window.matchMedia('(pointer: fine)').matches||window.matchMedia('(prefers-reduced-motion: reduce)').matches)return;
    const root=document.documentElement;
    const cursor=cursorRef.current;
    if(!cursor)return;
    let frame=0;
    let nextX=0;
    let nextY=0;
    let visible=false;
    let action=false;
    const move=(event:PointerEvent)=>{
      nextX=event.clientX;
      nextY=event.clientY;
      if(frame)return;
      frame=requestAnimationFrame(()=>{
        cursor.style.transform=`translate3d(${nextX}px,${nextY}px,0)`;
        if(!visible){
          root.dataset.cursorVisible='true';
          visible=true;
        }
        frame=0;
      });
    };
    const over=(event:PointerEvent)=>{
      const target=event.target as HTMLElement;
      const nextAction=Boolean(target.closest('a,button,input,select,textarea,[role="button"]'));
      if(nextAction===action)return;
      action=nextAction;
      root.dataset.cursorAction=String(action);
    };
    const leave=()=>{
      root.dataset.cursorVisible='false';
      visible=false;
    };
    window.addEventListener('pointermove',move,{passive:true});
    document.addEventListener('pointerover',over,{passive:true});
    document.documentElement.addEventListener('mouseleave',leave);
    return()=>{
      if(frame)cancelAnimationFrame(frame);
      window.removeEventListener('pointermove',move);
      document.removeEventListener('pointerover',over);
      document.documentElement.removeEventListener('mouseleave',leave);
      delete root.dataset.cursorVisible;
      delete root.dataset.cursorAction;
    };
  },[]);
  return <div ref={cursorRef} className="custom-cursor" aria-hidden="true"><span/><i/></div>;
}

export function RouteExperience(){
  const location=useLocation();
  useEffect(()=>{
    window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
    const observed=new WeakSet<Element>();
    const observer=new IntersectionObserver(entries=>entries.forEach(entry=>{
      if(entry.isIntersecting){entry.target.classList.add('is-visible');observer.unobserve(entry.target);}
    }),{rootMargin:'0px 0px -7% 0px',threshold:.08});
    const register=()=>document.querySelectorAll('main .panel, main .page-heading, main .category-card, main .data-table-container, main .rail-section').forEach(node=>{
      if(!observed.has(node)){observed.add(node);node.classList.add('scroll-reveal');observer.observe(node);}
    });
    register();
    const mutations=new MutationObserver(()=>requestAnimationFrame(register));
    const main=document.querySelector('main');
    if(main)mutations.observe(main,{childList:true,subtree:true});
    return()=>{observer.disconnect();mutations.disconnect();};
  },[location.pathname]);
  return null;
}
