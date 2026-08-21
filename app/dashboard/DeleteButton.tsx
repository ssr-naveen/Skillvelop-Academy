"use client";

import { Trash2 } from "lucide-react";

export default function DeleteButton({action,id,name,label}:{action:"delete-course"|"delete-curriculum-template";id:string;name:"courseId"|"templateId";label:string}){
  return <form action="/api/lms" method="post" className="delete-form" onSubmit={event=>{if(!window.confirm(`Delete ${label}? This cannot be undone.`))event.preventDefault();}}>
    <input type="hidden" name="action" value={action}/><input type="hidden" name={name} value={id}/>
    <button type="submit" className="danger-button"><Trash2 size={16}/><span>Delete</span></button>
  </form>;
}
