import {useEffect,useRef} from 'react';
import {useLocation} from 'react-router-dom';

export function AmbientBackdrop({landing=false}:{landing?:boolean}){
  const canvasRef=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{
    const canvas=canvasRef.current;
    const context=canvas?.getContext('2d',{alpha:true});
    if(!canvas||!context)return;
    const reduce=window.matchMedia('(prefers-reduced-motion: reduce)');
    const fine=window.matchMedia('(pointer: fine)');
    let width=0,height=0,frame=0,last=0,active=true;
    let pointer={x:-1000,y:-1000,tx:-1000,ty:-1000};
    type Point={x:number;y:number;phase:number;size:number;depth:number};
    let points:Point[]=[];
    const palette=()=>document.documentElement.dataset.theme==='light'&&!landing
      ? {dot:'24, 105, 94',line:'32, 123, 110'}
      : {dot:'139, 223, 200',line:'112, 201, 178'};
    const draw=(time:number)=>{
      if(!active)return;
      frame=reduce.matches||!fine.matches?0:requestAnimationFrame(draw);
      if(time-last<33)return;
      last=time;
      context.clearRect(0,0,width,height);
      const {dot,line}=palette();
      const drifting=!reduce.matches&&fine.matches;
      const responding=!reduce.matches&&(fine.matches||pointer.x>-500);
      if(drifting){pointer.x+=(pointer.tx-pointer.x)*.09;pointer.y+=(pointer.ty-pointer.y)*.09;}
      const locations=points.map(point=>{
        const drift=drifting?time*.00016:0;
        let x=point.x+Math.sin(point.phase+drift)*point.depth*5;
        let y=point.y+Math.cos(point.phase*.7+drift)*point.depth*4;
        const dx=x-pointer.x,dy=y-pointer.y;
        const distance=Math.hypot(dx,dy);
        const influence=responding&&distance<170?(1-distance/170)**2:0;
        if(influence&&distance>1){x+=dx/distance*influence*24*point.depth;y+=dy/distance*influence*24*point.depth;}
        return {x,y,influence,point};
      });
      for(let i=0;i<locations.length;i++){
        const a=locations[i];
        if(a.influence>.035){
          for(let j=i+1;j<locations.length;j++){
            const b=locations[j];
            const distance=Math.hypot(a.x-b.x,a.y-b.y);
            if(distance<100&&b.influence>.035){
              context.strokeStyle=`rgba(${line},${Math.min(a.influence,b.influence)*.21})`;
              context.lineWidth=.7;
              context.beginPath();context.moveTo(a.x,a.y);context.lineTo(b.x,b.y);context.stroke();
            }
          }
        }
        context.fillStyle=`rgba(${dot},${.1+a.point.depth*.15+a.influence*.42})`;
        context.beginPath();context.arc(a.x,a.y,a.point.size+a.influence*.9,0,Math.PI*2);context.fill();
      }
      if(responding&&pointer.x>-100&&pointer.y>-100){
        const glow=context.createRadialGradient(pointer.x,pointer.y,0,pointer.x,pointer.y,210);
        glow.addColorStop(0,`rgba(${line},.065)`);glow.addColorStop(1,`rgba(${line},0)`);
        context.fillStyle=glow;context.fillRect(pointer.x-210,pointer.y-210,420,420);
      }
    };
    const resize=()=>{
      const rect=canvas.getBoundingClientRect();
      width=rect.width;height=rect.height;
      const dpr=Math.min(window.devicePixelRatio||1,2);
      canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
      context.setTransform(dpr,0,0,dpr,0,0);
      const spacing=landing?55:72;
      const columns=Math.ceil(width/spacing),rows=Math.ceil(height/spacing);
      points=Array.from({length:columns*rows},(_,index)=>{
        const column=index%columns,row=Math.floor(index/columns);
        const seed=(index*73.79)%1;
        return {x:(column+.25+seed*.5)*spacing,y:(row+.22+((index*31.17)%1)*.56)*spacing,
          phase:index*2.37,size:index%11===0?1.5:.65,depth:.5+((index*17.13)%1)*.5};
      });
      if(reduce.matches||!fine.matches){last=0;draw(performance.now());}
    };
    const onMove=(event:PointerEvent)=>{
      const rect=canvas.getBoundingClientRect();
      pointer.tx=event.clientX-rect.left;pointer.ty=event.clientY-rect.top;
      if(pointer.x< -500||!fine.matches){pointer.x=pointer.tx;pointer.y=pointer.ty;}
      if(!fine.matches&&!reduce.matches){last=0;draw(performance.now());}
    };
    const onLeave=()=>{pointer.x=-1000;pointer.y=-1000;pointer.tx=-1000;pointer.ty=-1000;if(!fine.matches&&!reduce.matches){last=0;draw(performance.now());}};
    const onVisibility=()=>{active=!document.hidden;if(active)frame=requestAnimationFrame(draw);else cancelAnimationFrame(frame);};
    const observer=new ResizeObserver(resize);
    observer.observe(canvas);
    resize();frame=requestAnimationFrame(draw);
    window.addEventListener('pointermove',onMove,{passive:true});
    window.addEventListener('pointerup',onLeave,{passive:true});
    window.addEventListener('pointercancel',onLeave,{passive:true});
    document.documentElement.addEventListener('pointerleave',onLeave);
    document.addEventListener('visibilitychange',onVisibility);
    const onMotionChange=()=>{cancelAnimationFrame(frame);last=0;frame=requestAnimationFrame(draw);};
    reduce.addEventListener('change',onMotionChange);
    fine.addEventListener('change',onMotionChange);
    const themeObserver=new MutationObserver(()=>{if(reduce.matches||!fine.matches){last=0;draw(performance.now());}});
    themeObserver.observe(document.documentElement,{attributes:true,attributeFilter:['data-theme']});
    return()=>{active=false;cancelAnimationFrame(frame);observer.disconnect();themeObserver.disconnect();reduce.removeEventListener('change',onMotionChange);fine.removeEventListener('change',onMotionChange);window.removeEventListener('pointermove',onMove);window.removeEventListener('pointerup',onLeave);window.removeEventListener('pointercancel',onLeave);document.documentElement.removeEventListener('pointerleave',onLeave);document.removeEventListener('visibilitychange',onVisibility);};
  },[landing]);
  return <div className={`ambient-backdrop${landing?' ambient-backdrop-landing':''}`} aria-hidden="true"><i/><i/><i/><canvas ref={canvasRef}/></div>;
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
