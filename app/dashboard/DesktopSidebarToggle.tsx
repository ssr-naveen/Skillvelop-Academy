"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function DesktopSidebarToggle(){
  const [collapsed,setCollapsed]=useState(false);

  function applyState(next:boolean){
    setCollapsed(next);
    window.localStorage.setItem("skillvelop-sidebar-collapsed",next?"1":"0");
    const app=document.querySelector<HTMLElement>(".lms-app");
    app?.classList.toggle("sidebar-collapsed",next);
  }

  useEffect(()=>{
    const saved=window.localStorage.getItem("skillvelop-sidebar-collapsed")==="1";
    const app=document.querySelector<HTMLElement>(".lms-app");
    app?.classList.toggle("sidebar-collapsed",saved);
    setCollapsed(saved);
  },[]);

  return <button type="button" className="desktop-sidebar-toggle" onClick={()=>applyState(!collapsed)} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} title={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}<span>{collapsed?"Expand":"Collapse"}</span></button>;
}
