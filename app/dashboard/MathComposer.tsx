"use client";

import { useRef, useState } from "react";
import { Braces, Sigma } from "lucide-react";
import MathText from "./MathText";

const groups=[
  {name:"Structures",tools:[["Fraction","\\frac{a}{b}"],["Mixed number","n\\frac{a}{b}"],["Square root","\\sqrt{x}"],["Nth root","\\sqrt[n]{x}"],["Power","x^{n}"],["Subscript","x_{n}"],["Absolute","\\left|x\\right|"],["Brackets","\\left( x \\right)"],["Matrix","\\begin{bmatrix}a&b\\\\c&d\\end{bmatrix}"]]},
  {name:"Algebra",tools:[["Pi","\\pi"],["Infinity","\\infty"],["Sum","\\sum_{i=1}^{n}"],["Product","\\prod_{i=1}^{n}"],["Integral","\\int_{a}^{b}"],["Limit","\\lim_{x\\to a}"],["Log","\\log_{b}(x)"],["Plus/minus","\\pm"],["Approximately","\\approx"]]},
  {name:"Relations",tools:[["Not equal","\\ne"],["Less/equal","\\leq"],["Greater/equal","\\geq"],["Equivalent","\\equiv"],["Proportional","\\propto"],["Therefore","\\therefore"],["Implies","\\Rightarrow"],["Maps to","\\mapsto"]]},
  {name:"Geometry & sets",tools:[["Angle","\\angle ABC"],["Degree","^{\\circ}"],["Parallel","\\parallel"],["Perpendicular","\\perp"],["Triangle","\\triangle"],["In set","\\in"],["Not in","\\notin"],["Union","\\cup"],["Intersection","\\cap"],["Subset","\\subseteq"]]},
  {name:"Calculus & trig",tools:[["Sine","\\sin(x)"],["Cosine","\\cos(x)"],["Tangent","\\tan(x)"],["Derivative","\\frac{dy}{dx}"],["Partial","\\partial"],["Vector","\\vec{v}"],["Nabla","\\nabla"],["Delta","\\Delta"]]},
] as const;

export function MathComposer({value,onChange,label,placeholder="",required=false,multiline=false,compact=false}:{value:string;onChange:(value:string)=>void;label?:string;placeholder?:string;required?:boolean;multiline?:boolean;compact?:boolean}){
  const fieldRef=useRef<HTMLInputElement|HTMLTextAreaElement>(null);const [open,setOpen]=useState(!compact);
  function insert(snippet:string){const field=fieldRef.current;const start=field?.selectionStart??value.length,end=field?.selectionEnd??value.length;const addition=`$${snippet}$`;onChange(`${value.slice(0,start)}${addition}${value.slice(end)}`);requestAnimationFrame(()=>{field?.focus();field?.setSelectionRange(start+addition.length,start+addition.length)});}
  const input=multiline?<textarea ref={fieldRef as React.RefObject<HTMLTextAreaElement>} value={value} onChange={event=>onChange(event.target.value)} rows={compact?2:4} placeholder={placeholder} required={required}/>:<input ref={fieldRef as React.RefObject<HTMLInputElement>} value={value} onChange={event=>onChange(event.target.value)} placeholder={placeholder} required={required}/>;
  return <div className={compact?"math-composer compact":"math-composer"}>{label&&<label>{label}</label>}<div className="math-input-row">{input}<button type="button" className="math-toggle" onClick={()=>setOpen(current=>!current)} aria-expanded={open} title="Open advanced maths editor"><Sigma size={16}/><span>{compact?"Math":"Advanced maths"}</span></button></div>{open&&<div className="math-palette"><header><span><Braces size={16}/> Visual equation editor</span><small>Click a structure, then replace its placeholders.</small></header><div className="math-tool-groups">{groups.map(group=><section key={group.name}><strong>{group.name}</strong><div>{group.tools.map(([title,snippet])=><button type="button" title={title} onClick={()=>insert(snippet)} key={title}><MathText text={`$${snippet}$`}/></button>)}</div></section>)}</div><div className="math-live-preview"><small>LIVE FORMATTED PREVIEW</small>{value?<MathText text={value}/>:<span>Your text and equations will appear here.</span>}</div></div>}</div>;
}

export function MathFormField({name,label,placeholder="",required=false,multiline=false,defaultValue="",compact=false}:{name:string;label?:string;placeholder?:string;required?:boolean;multiline?:boolean;defaultValue?:string;compact?:boolean}){const [value,setValue]=useState(defaultValue);return <><input type="hidden" name={name} value={value}/><MathComposer value={value} onChange={setValue} label={label} placeholder={placeholder} required={required} multiline={multiline} compact={compact}/></>}
