"use client";

import { FileText, Paperclip, UploadCloud, X } from "lucide-react";
import { useId, useRef, useState } from "react";

const accept = ".pdf,.doc,.docx,.odt,.rtf,.txt,.md,.tex,.csv,.xls,.xlsx,.ods,.ppt,.pptx,.odp,image/png,image/jpeg,image/webp,image/gif";

export default function AssignmentAttachmentField() {
  const inputId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [error, setError] = useState("");

  return <section className="assignment-attachment-field">
    <div className="assignment-attachment-copy"><span><Paperclip size={18}/></span><div><strong>Supporting files</strong><small>PDF, images, Word, PowerPoint, spreadsheets and text documents · up to 5 files · 20 MB each</small></div></div>
    <label className="assignment-attach-button" htmlFor={inputId}><UploadCloud size={18}/><span>{files.length ? "Choose different files" : "Attach files"}</span></label>
    <input ref={inputRef} id={inputId} className="assignment-file-input" name="attachments" type="file" accept={accept} multiple onChange={event=>{
      const selected=Array.from(event.currentTarget.files??[]);
      if(selected.length>5){event.currentTarget.value="";setFiles([]);setError("Choose no more than 5 files.");return;}
      if(selected.some(file=>file.size>20*1024*1024)){event.currentTarget.value="";setFiles([]);setError("Each attachment must be 20 MB or smaller.");return;}
      setError("");setFiles(selected);
    }}/>
    {error?<p className="assignment-file-error" role="alert">{error}</p>:null}
    {files.length?<div className="assignment-selected-files" aria-live="polite">{files.map(file=><span key={`${file.name}-${file.lastModified}-${file.size}`}><FileText size={15}/><b>{file.name}</b><small>{file.size<1024*1024?`${Math.max(1,Math.round(file.size/1024))} KB`:`${(file.size/1024/1024).toFixed(1)} MB`}</small></span>)}<button type="button" onClick={()=>{if(inputRef.current)inputRef.current.value="";setFiles([]);setError("");}}><X size={15}/> Clear files</button></div>:null}
  </section>;
}
