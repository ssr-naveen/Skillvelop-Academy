"use client";

import type { ReactNode } from "react";
import MathText from "./MathText";
import styles from "./ViyuRichText.module.css";

function inline(text:string,keyBase:string):ReactNode[]{
  const tokens=text.split(/(\*\*[^*]+\*\*|__[^_]+__|\*[^*]+\*|_[^_]+_|`[^`]+`)/g).filter(Boolean);
  return tokens.map((token,index)=>{
    const key=`${keyBase}-${index}`;
    if((token.startsWith("**")&&token.endsWith("**"))||(token.startsWith("__")&&token.endsWith("__")))return <strong key={key}><MathText text={token.slice(2,-2)}/></strong>;
    if((token.startsWith("*")&&token.endsWith("*"))||(token.startsWith("_")&&token.endsWith("_")))return <em key={key}><MathText text={token.slice(1,-1)}/></em>;
    if(token.startsWith("`")&&token.endsWith("`"))return <code key={key}>{token.slice(1,-1)}</code>;
    return <MathText key={key} text={token}/>;
  });
}

export default function ViyuRichText({text}:{text:string}){
  const lines=text.replace(/\r\n/g,"\n").split("\n");
  const nodes:ReactNode[]=[];
  let i=0;
  while(i<lines.length){
    const raw=lines[i];const line=raw.trim();
    if(!line){i++;continue;}
    const heading=line.match(/^(#{1,4})\s+(.+)$/);
    if(heading){const level=heading[1].length;const content=inline(heading[2],`h-${i}`);nodes.push(level===1?<h1 key={i}>{content}</h1>:level===2?<h2 key={i}>{content}</h2>:level===3?<h3 key={i}>{content}</h3>:<h4 key={i}>{content}</h4>);i++;continue;}
    if(/^[-*_]{3,}$/.test(line)){nodes.push(<hr key={i}/>);i++;continue;}
    if(line.startsWith(">")){const parts:string[]=[];while(i<lines.length&&lines[i].trim().startsWith(">")){parts.push(lines[i].trim().replace(/^>\s?/,""));i++;}nodes.push(<blockquote key={`q-${i}`}>{inline(parts.join(" "),`q-${i}`)}</blockquote>);continue;}
    if(/^[-*•]\s+/.test(line)){const items:ReactNode[]=[];const start=i;while(i<lines.length&&/^[-*•]\s+/.test(lines[i].trim())){const value=lines[i].trim().replace(/^[-*•]\s+/,"");items.push(<li key={i}>{inline(value,`ul-${i}`)}</li>);i++;}nodes.push(<ul key={`ul-${start}`}>{items}</ul>);continue;}
    if(/^\d+[.)]\s+/.test(line)){const items:ReactNode[]=[];const start=i;while(i<lines.length&&/^\d+[.)]\s+/.test(lines[i].trim())){const value=lines[i].trim().replace(/^\d+[.)]\s+/,"");items.push(<li key={i}>{inline(value,`ol-${i}`)}</li>);i++;}nodes.push(<ol key={`ol-${start}`}>{items}</ol>);continue;}
    const para:string[]=[line];const start=i;i++;
    while(i<lines.length){const next=lines[i].trim();if(!next||/^(#{1,4})\s+/.test(next)||/^[-*•]\s+/.test(next)||/^\d+[.)]\s+/.test(next)||next.startsWith(">")||/^[-*_]{3,}$/.test(next))break;para.push(next);i++;}
    nodes.push(<p key={`p-${start}`}>{inline(para.join(" "),`p-${start}`)}</p>);
  }
  return <div className={styles.root}>{nodes}</div>;
}
