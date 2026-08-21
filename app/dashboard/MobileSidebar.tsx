"use client";

import { useEffect, useState } from "react";
import { Menu, X } from "lucide-react";

export function MobileMenu() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const sidebar = document.querySelector<HTMLElement>(".lms-sidebar");
    if (!sidebar) return;
    sidebar.classList.toggle("mobile-open", open);
    document.body.classList.toggle("lms-mobile-menu-open", open);
    const closeFromLink = (event: Event) => { if ((event.target as HTMLElement).closest("a")) setOpen(false); };
    const closeFromEscape = (event: KeyboardEvent) => { if (event.key === "Escape") setOpen(false); };
    sidebar.addEventListener("click", closeFromLink);
    document.addEventListener("keydown", closeFromEscape);
    return () => {
      sidebar.classList.remove("mobile-open");
      document.body.classList.remove("lms-mobile-menu-open");
      sidebar.removeEventListener("click", closeFromLink);
      document.removeEventListener("keydown", closeFromEscape);
    };
  }, [open]);

  return <>
    <button type="button" className="mobile-menu" aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open} onClick={() => setOpen((value) => !value)}>
      {open ? <X aria-hidden="true" size={24} /> : <Menu aria-hidden="true" size={24} />}
    </button>
    <button type="button" className={`mobile-nav-overlay${open ? " open" : ""}`} aria-label="Close menu" tabIndex={open ? 0 : -1} onClick={() => setOpen(false)} />
  </>;
}
