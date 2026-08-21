"use client";

import { useEffect, useState, type ReactNode } from "react";
import { Menu, X } from "lucide-react";

export function MobileSidebar({ children }: { children: ReactNode }) {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
    };
  }, [open]);

  return <>
    <button
      type="button"
      className="mobile-menu"
      aria-label={open ? "Close menu" : "Open menu"}
      aria-expanded={open}
      aria-controls="mobile-dashboard-navigation"
      onClick={() => setOpen((value) => !value)}
    >
      {open ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
    </button>
    <div
      className={`mobile-nav-overlay${open ? " open" : ""}`}
      aria-hidden={!open}
      onClick={() => setOpen(false)}
    />
    <div
      id="mobile-dashboard-navigation"
      className={`mobile-nav-drawer${open ? " open" : ""}`}
      aria-hidden={!open}
      onClick={(event) => {
        if ((event.target as HTMLElement).closest("a")) setOpen(false);
      }}
    >
      {children}
    </div>
  </>;
}
