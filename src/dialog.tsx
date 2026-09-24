import {useEffect,useId,useRef,type ReactNode} from 'react';
export default function Dialog({title,onClose,children,wide=false}:{title:string;onClose:()=>void;children:ReactNode;wide?:boolean}){
 const ref=useRef<HTMLDialogElement>(null),id=useId();
 useEffect(()=>{const dialog=ref.current!;dialog.showModal();return()=>dialog.close();},[]);
 return <dialog ref={ref} className={`workspace-dialog ${wide?'wide':''}`} aria-labelledby={id} onCancel={e=>{e.preventDefault();onClose();}}><div className="section-heading"><h2 id={id}>{title}</h2><button className="button secondary small" onClick={onClose}>Close</button></div>{children}</dialog>;
}
