import "./lms.css";
import "./viyu-admin.css";
import "./mobile-nav.css";
import "./desktop-sidebar.css";
import "./admin/users/user-management.css";
import "katex/dist/katex.min.css";
import DesktopSidebarToggle from "./DesktopSidebarToggle";

export const dynamic = "force-dynamic";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>
    {children}
    <DesktopSidebarToggle />
  </>;
}

