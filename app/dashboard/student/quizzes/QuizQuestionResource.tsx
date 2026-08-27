import { Download, ExternalLink, FileText, Presentation } from "lucide-react";
import Image from "next/image";

export type QuizQuestionResourceData={
  id:string;
  resource_type:string;
  resource_embed_url:string;
  image_file_name:string;
  image_content_type:string;
  image_size_bytes:number;
};

function fileSize(bytes:number){return bytes<1024*1024?`${Math.max(1,Math.round(bytes/1024))} KB`:`${(bytes/1024/1024).toFixed(1)} MB`;}

export default function QuizQuestionResource({question,index}:{question:QuizQuestionResourceData;index:number}){
  const kind=question.resource_type==="none"&&question.image_file_name?"image":question.resource_type;
  const src=`/api/quiz-media/${question.id}`;
  if(kind==="iframe"&&question.resource_embed_url.startsWith("https://"))return <aside className="quiz-question-resource iframe-resource"><header><span>Interactive resource</span><a href={question.resource_embed_url} target="_blank" rel="noreferrer">Open separately <ExternalLink size={14}/></a></header><iframe src={question.resource_embed_url} title={`Interactive resource for question ${index+1}`} loading="lazy" allowFullScreen referrerPolicy="no-referrer" sandbox="allow-forms allow-popups allow-presentation allow-same-origin allow-scripts"/></aside>;
  if(kind==="image"&&question.image_file_name)return <figure className="quiz-question-resource image-resource"><Image src={src} alt={`Question ${index+1} visual: ${question.image_file_name}`} width={1200} height={675} sizes="(max-width: 800px) 100vw, 800px" unoptimized/><figcaption>{question.image_file_name}</figcaption></figure>;
  if(kind==="pdf"&&question.image_file_name)return <aside className="quiz-question-resource pdf-resource"><header><div><FileText size={18}/><span><strong>{question.image_file_name}</strong><small>PDF · {fileSize(question.image_size_bytes)}</small></span></div><a href={`${src}?download=1`}><Download size={15}/> Download</a></header><iframe src={src} title={`PDF for question ${index+1}`}/></aside>;
  if((kind==="document"||kind==="presentation")&&question.image_file_name){const Icon=kind==="presentation"?Presentation:FileText;return <aside className="quiz-question-resource file-resource"><span><Icon size={24}/></span><div><small>{kind==="presentation"?"PRESENTATION":"DOCUMENT"}</small><strong>{question.image_file_name}</strong><p>{fileSize(question.image_size_bytes)} · Opens in your browser or downloads securely.</p></div><a href={`${src}?download=1`}><Download size={16}/> Open file</a></aside>;}
  return null;
}
