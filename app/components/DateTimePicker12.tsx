"use client";

import { CalendarDays, ChevronLeft, ChevronRight, Clock3, X } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

const MONTHS=["January","February","March","April","May","June","July","August","September","October","November","December"];
const WEEKDAYS=["Mon","Tue","Wed","Thu","Fri","Sat","Sun"];
const pad=(value:number)=>String(value).padStart(2,"0");

function parseLocal(value?:string){
  const match=value?.match(/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})/);
  if(!match)return null;
  return {year:Number(match[1]),month:Number(match[2])-1,day:Number(match[3]),hour:Number(match[4]),minute:Number(match[5])};
}

function to12Hour(hour24:number){return {hour:hour24%12||12,period:hour24>=12?"PM":"AM" as "AM"|"PM"};}
function to24Hour(hour12:number,period:"AM"|"PM"){return hour12%12+(period==="PM"?12:0);}

export function DateTimePicker12({name,label,defaultValue="",help,required=false}:{name:string;label:string;defaultValue?:string;help?:string;required?:boolean}){
  const parsed=parseLocal(defaultValue),today=new Date(),id=useId(),root=useRef<HTMLDivElement>(null);
  const [open,setOpen]=useState(false),[year,setYear]=useState(parsed?.year??today.getFullYear()),[month,setMonth]=useState(parsed?.month??today.getMonth()),[day,setDay]=useState<number|null>(parsed?.day??null);
  const initialTime=to12Hour(parsed?.hour??9),[hour,setHour]=useState(initialTime.hour),[minute,setMinute]=useState(parsed?.minute??0),[period,setPeriod]=useState<"AM"|"PM">(initialTime.period);
  useEffect(()=>{const close=(event:MouseEvent)=>{if(root.current&&!root.current.contains(event.target as Node))setOpen(false);};document.addEventListener("mousedown",close);return()=>document.removeEventListener("mousedown",close);},[]);
  const value=day?`${year}-${pad(month+1)}-${pad(day)}T${pad(to24Hour(hour,period))}:${pad(minute)}`:"";
  const display=day?`${pad(day)} ${MONTHS[month].slice(0,3)} ${year} · ${hour}:${pad(minute)} ${period}`:"Choose date and time";
  const cells=useMemo(()=>{const first=(new Date(year,month,1).getDay()+6)%7,total=new Date(year,month+1,0).getDate(),previous=new Date(year,month,0).getDate();return Array.from({length:42},(_,index)=>{const raw=index-first+1;if(raw<1)return {day:previous+raw,offset:-1};if(raw>total)return {day:raw-total,offset:1};return {day:raw,offset:0};});},[year,month]);
  function moveMonth(offset:number){const date=new Date(year,month+offset,1);setYear(date.getFullYear());setMonth(date.getMonth());setDay(null);}
  function choose(cell:{day:number;offset:number}){if(cell.offset){const date=new Date(year,month+cell.offset,cell.day);setYear(date.getFullYear());setMonth(date.getMonth());setDay(date.getDate());}else setDay(cell.day);}
  const todayKey=`${today.getFullYear()}-${today.getMonth()}-${today.getDate()}`;
  return <div className="date-time-field" ref={root}>
    <label id={`${id}-label`}>{label}{required?<span className="required-label"> Required</span>:null}</label>
    <input type="hidden" name={name} value={value}/>
    <button className={day?"date-time-trigger selected":"date-time-trigger"} type="button" aria-labelledby={`${id}-label ${id}-value`} aria-expanded={open} onClick={()=>setOpen(current=>!current)}><span><CalendarDays size={19}/><b id={`${id}-value`}>{display}</b></span><Clock3 size={18}/></button>
    {open?<section className="date-time-popover" role="dialog" aria-modal="false" aria-label={`${label} picker`}>
      <header><div><small>SCHEDULE</small><strong>Select date & time</strong></div><button type="button" aria-label="Close date and time picker" onClick={()=>setOpen(false)}><X size={18}/></button></header>
      <div className="calendar-month"><button type="button" aria-label="Previous month" onClick={()=>moveMonth(-1)}><ChevronLeft size={18}/></button><strong>{MONTHS[month]} {year}</strong><button type="button" aria-label="Next month" onClick={()=>moveMonth(1)}><ChevronRight size={18}/></button></div>
      <div className="calendar-weekdays">{WEEKDAYS.map(item=><span key={item}>{item}</span>)}</div>
      <div className="calendar-days">{cells.map((cell,index)=>{const selected=cell.offset===0&&cell.day===day,isToday=`${year}-${month+cell.offset}-${cell.day}`===todayKey;return <button type="button" className={`${cell.offset?"outside ":""}${selected?"selected ":""}${isToday?"today":""}`} onClick={()=>choose(cell)} key={`${cell.offset}-${cell.day}-${index}`}>{cell.day}</button>;})}</div>
      <div className="time-choice"><span><Clock3 size={17}/> Time</span><div><select aria-label="Hour" value={hour} onChange={event=>setHour(Number(event.target.value))}>{Array.from({length:12},(_,index)=>index+1).map(item=><option value={item} key={item}>{pad(item)}</option>)}</select><b>:</b><select aria-label="Minutes" value={minute} onChange={event=>setMinute(Number(event.target.value))}>{[0,5,10,15,20,25,30,35,40,45,50,55].map(item=><option value={item} key={item}>{pad(item)}</option>)}</select><select aria-label="AM or PM" value={period} onChange={event=>setPeriod(event.target.value as "AM"|"PM")}><option>AM</option><option>PM</option></select></div></div>
      <footer><button type="button" className="calendar-today" onClick={()=>{setYear(today.getFullYear());setMonth(today.getMonth());setDay(today.getDate());}}>Today</button><button type="button" className="calendar-done" disabled={!day} onClick={()=>setOpen(false)}>Use {day?`${hour}:${pad(minute)} ${period}`:"this time"}</button></footer>
    </section>:null}
    {help?<small className="date-time-help">{help}</small>:null}
  </div>;
}

export function TimePicker12({name,label,defaultValue="09:00",required=false}:{name:string;label:string;defaultValue?:string;required?:boolean}){
  const [rawHour,rawMinute]=defaultValue.split(":").map(Number),initial=to12Hour(Number.isFinite(rawHour)?rawHour:9);
  const [hour,setHour]=useState(initial.hour),[minute,setMinute]=useState(Number.isFinite(rawMinute)?rawMinute:0),[period,setPeriod]=useState<"AM"|"PM">(initial.period);
  const value=`${pad(to24Hour(hour,period))}:${pad(minute)}`;
  return <div className="time-field-12"><label>{label}{required?<span className="required-label"> Required</span>:null}</label><input type="hidden" name={name} value={value}/><div><select aria-label={`${label} hour`} value={hour} onChange={event=>setHour(Number(event.target.value))}>{Array.from({length:12},(_,index)=>index+1).map(item=><option value={item} key={item}>{pad(item)}</option>)}</select><b>:</b><select aria-label={`${label} minutes`} value={minute} onChange={event=>setMinute(Number(event.target.value))}>{[0,5,10,15,20,25,30,35,40,45,50,55].map(item=><option value={item} key={item}>{pad(item)}</option>)}</select><select aria-label={`${label} period`} value={period} onChange={event=>setPeriod(event.target.value as "AM"|"PM")}><option>AM</option><option>PM</option></select></div></div>;
}

