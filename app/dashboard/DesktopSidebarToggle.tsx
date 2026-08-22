"use client";

import { Menu } from "lucide-react";
import { useEffect, useState } from "react";

const STORAGE_KEY = "skillvelop-sidebar-collapsed";

export default function DesktopSidebarToggle() {
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    const saved = window.localStorage.getItem(STORAGE_KEY) === "1";
    const app = document.querySelector<HTMLElement>(".lms-app");
    app?.classList.toggle("sidebar-collapsed", saved);
    setCollapsed(saved);
  }, []);

  function toggleSidebar() {
    const next = !collapsed;
    const app = document.querySelector<HTMLElement>(".lms-app");
    app?.classList.toggle("sidebar-collapsed", next);
    window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
    setCollapsed(next);
  }

  return (
    <button
      type="button"
      className="desktop-sidebar-menu"
      onClick={toggleSidebar}
      aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
      aria-pressed={collapsed}
      title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
    >
      <Menu size={20} strokeWidth={2} aria-hidden="true" />
    </button>
  );
}
