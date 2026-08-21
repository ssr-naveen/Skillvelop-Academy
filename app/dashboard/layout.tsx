import "./lms.css";
import "./viyu-admin.css";
import "./mobile-nav.css";
import "./sidebar-collapse.css";
import "katex/dist/katex.min.css";
import { MobileMenu } from "./MobileSidebar";

export const dynamic = "force-dynamic";
export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return <>
    <MobileMenu />
    {children}
  </>;
}
