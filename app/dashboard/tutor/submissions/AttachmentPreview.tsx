"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated R2 previews cannot be fetched by the image optimizer. */

import { useState } from "react";
import { Download, Eye, FileText, X } from "lucide-react";

export default function AttachmentPreview({id,fileName,contentType,sizeBytes}:{id:string;fileName:string;contentType:string;sizeBytes:number}){
  const [open,setOpen]=useState(false),url=`/api/submission-attachments/${id}`,previewable=/^(image\/|text\/)|application\/pdf$/i.test(contentType),size=sizeBytes<1024*1024?`${Math.max(1,Math.round(sizeBytes/1024))} KB`:`${(sizeBytes/1024/1024).toFixed(1)} MB`;
  return <><button type="button" className="attachment-preview-trigger" onClick={()=>setOpen(true)}><Eye size={16}/><span><strong>{fileName}</strong><small>{size} · Preview</small></span></button>{open?<dialog className="attachment-dialog" open aria-labelledby={`attachment-${id}`}><button className="attachment-dialog-close" type="button" onClick={()=>setOpen(false)} aria-label="Close attachment preview"><X size={20}/></button><header><span><FileText size={20}/></span><div><h2 id={`attachment-${id}`}>{fileName}</h2><small>{contentType||"Document"} · {size}</small></div><a href={`${url}?download=1`}><Download size={16}/> Download</a></header><div className="attachment-dialog-body">{contentType.startsWith("image/")?<img src={url} alt={fileName}/>:previewable?<iframe src={url} title={fileName}/>:<div className="document-preview-fallback"><FileText size={52}/><strong>Secure document ready</strong><p>This file type opens in its native application. Download it to review the complete formatting.</p><a href={`${url}?download=1`}><Download size={17}/> Download {fileName}</a></div>}</div></dialog>:null}</>;
}
