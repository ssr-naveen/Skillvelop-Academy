"use client";
import { useState } from "react";
import MathText from "../../MathText";

export default function OrderQuestion({name,items}:{name:string;items:string[]}){
  const [values,setValues]=useState(items);const [dragged,setDragged]=useState<number|null>(null);
  function move(from:number,to:number){const next=[...values];const [item]=next.splice(from,1);next.splice(to,0,item);setValues(next)}
  return <div className="drag-question"><input type="hidden" name={name} value={values.join(' | ')}/><p>Drag the cards into the correct order.</p>{values.map((item,index)=><button type="button" draggable key={`${item}-${index}`} onDragStart={()=>setDragged(index)} onDragOver={event=>event.preventDefault()} onDrop={()=>{if(dragged!==null)move(dragged,index);setDragged(null)}}><span>⠿</span><b>{index+1}</b><MathText text={item}/></button>)}</div>;
}
