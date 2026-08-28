"use client";

import { Pencil, Plus, X } from "lucide-react";
import { ReactNode, useEffect, useId, useRef } from "react";

export default function AuthoringModal({title,description,buttonLabel,children,variant="create",compact=false}:{title:string;description:string;buttonLabel:string;children:ReactNode;variant?:"create"|"edit"|"review";compact?:boolean}){
  const dialog=useRef<HTMLDialogElement>(null),titleId=useId();
  useEffect(()=>{const current=dialog.current;const escape=(event:Event)=>{event.preventDefault();current?.close();};current?.addEventListener("cancel",escape);return()=>current?.removeEventListener("cancel",escape);},[]);
  return <>
    <button type="button" className={`${compact?"builder-icon-action":"builder-launch"} ${variant}`} onClick={()=>dialog.current?.showModal()}>{variant==="create"?<Plus size={compact?15:20}/>:<Pencil size={compact?14:18}/>}<span>{buttonLabel}</span></button>
    <dialog className="authoring-dialog" ref={dialog} aria-labelledby={titleId} onClick={event=>{if(event.target===dialog.current)dialog.current.close();}}>
      <div className="authoring-dialog-shell">
        <header><div><span>{variant==="create"?"CREATE":"COURSE BUILDER"}</span><h2 id={titleId}>{title}</h2><p>{description}</p></div><button type="button" aria-label={`Close ${title}`} onClick={()=>dialog.current?.close()}><X size={20}/></button></header>
        <div className="authoring-dialog-body">{children}</div>
      </div>
    </dialog>
  </>;
}

