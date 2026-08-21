"use client";

import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { useEffect, useState } from "react";

export default function DesktopSidebarToggle(){
  const [collapsed,setCollapsed]=useState(false);
  useEffect(()=>{
    const saved=window.localStorage.getItem("skillvelop-sidebar-collapsed")==="1";
    setCollapsed(saved);
    document.documentElement.classList.toggle("sidebar-collapsed",saved);
    return()=>document.documentElement.classList.remove("sidebar-collapsed");
  },[]);
  function toggle(){
    const next=!collapsed;
    setCollapsed(next);
    window.localStorage.setItem("skillvelop-sidebar-collapsed",next?"1":"0");
    document.documentElement.classList.toggle("sidebar-collapsed",next);
  }
  return <button type="button" className="desktop-sidebar-toggle" onClick={toggle} aria-label={collapsed?"Expand sidebar":"Collapse sidebar"} title={collapsed?"Expand sidebar":"Collapse sidebar"}>{collapsed?<PanelLeftOpen size={18}/>:<PanelLeftClose size={18}/>}<span>{collapsed?"Expand":"Collapse"}</span></button>;
}
