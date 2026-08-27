import type { ReactNode } from "react";
import Image from "next/image";
import type { LucideIcon } from "lucide-react";
import {
  Award,
  BadgeCheck,
  BarChart3,
  Bell,
  BookOpen,
  CalendarDays,
  ChartNoAxesCombined,
  ClipboardCheck,
  FileQuestion,
  GraduationCap,
  LayoutDashboard,
  LibraryBig,
  LogOut,
  MessageCircle,
  NotebookTabs,
  Send,
  Trophy,
  UserCog,
  Users,
  WandSparkles,
} from "lucide-react";
import type { ManagerPermission, UserProfile, UserRole } from "@/db/lms";
import { chatGPTSignOutPath } from "@/app/chatgpt-auth";

type WorkspaceRole = Exclude<UserRole, "manager">;
const roleNav: Record<WorkspaceRole, { href: string; label: string; icon: LucideIcon; permission?: ManagerPermission }[]> = {
  admin: [
    { href: "/dashboard/admin", label: "Dashboard", icon: LayoutDashboard, permission: "view_dashboard" }, { href: "/dashboard/admin/users", label: "People & roles", icon: UserCog, permission: "manage_users" },
    { href: "/dashboard/admin/students", label: "Student plans", icon: GraduationCap, permission: "manage_students" }, { href: "/dashboard/admin/curriculum", label: "Curricula & subjects", icon: LibraryBig, permission: "manage_courses" },
    { href: "/dashboard/admin/courses", label: "Courses", icon: BookOpen, permission: "manage_courses" }, { href: "/dashboard/admin/classes", label: "Class schedule", icon: CalendarDays, permission: "manage_classes" }, { href: "/dashboard/admin/ai", label: "AI settings", icon: WandSparkles },
  ],
  tutor: [
    { href: "/dashboard/tutor", label: "Dashboard", icon: LayoutDashboard }, { href: "/dashboard/tutor/courses", label: "Courses", icon: BookOpen }, { href: "/dashboard/tutor/classes", label: "Class schedule", icon: CalendarDays },
    { href: "/dashboard/tutor/curriculum", label: "Course builder", icon: LibraryBig }, { href: "/dashboard/tutor/work", label: "Assignments & work", icon: NotebookTabs },
    { href: "/dashboard/tutor/quizzes", label: "Quizzes & assessments", icon: FileQuestion }, { href: "/dashboard/tutor/students", label: "Students", icon: Users }, { href: "/dashboard/tutor/messages", label: "Tutor messages", icon: MessageCircle },
    { href: "/dashboard/tutor/reports", label: "Student reports", icon: BarChart3 },
    { href: "/dashboard/tutor/submissions", label: "Review submissions", icon: ClipboardCheck },
    { href: "/dashboard/tutor/ai", label: "AI course studio", icon: WandSparkles }, { href: "/dashboard/profile", label: "My public profile", icon: BadgeCheck },
  ],
  student: [
    { href: "/dashboard/student", label: "Dashboard", icon: LayoutDashboard }, { href: "/dashboard/student/classes", label: "My schedule", icon: CalendarDays },
    { href: "/dashboard/student/curriculum", label: "My courses", icon: BookOpen }, { href: "/dashboard/student/work", label: "Assignments", icon: NotebookTabs },
    { href: "/dashboard/student/quizzes", label: "Quizzes & assessments", icon: FileQuestion }, { href: "/dashboard/student/messages", label: "Messages", icon: MessageCircle },
    { href: "/dashboard/student/reports", label: "Progress reports", icon: ChartNoAxesCombined }, { href: "/dashboard/student/certificates", label: "Certificates", icon: Award }, { href: "/dashboard/student/progress", label: "Achievements", icon: Trophy }, { href: "/dashboard/student/ai", label: "AI doubt assistant", icon: WandSparkles },
  ],
};

export function LmsShell({ profile, activeRole, activePath, eyebrow, title, subtitle, children, actions }: { profile: UserProfile; activeRole: WorkspaceRole; activePath?: string; eyebrow: string; title: string; subtitle: string; children: ReactNode; actions?: ReactNode }) {
  const nav = roleNav[activeRole].filter((item) => profile.role !== "manager" || !item.permission || profile.permissions?.includes(item.permission));
  return <div className="lms-app">
    <aside className={`lms-sidebar lms-sidebar-${activeRole}`}>
      <a className="lms-brand" href="/" aria-label="Skillvelop home"><Image src="/skillvelop-logo.png" alt="Skillvelop" width={210} height={140} priority unoptimized /></a>
      <div className="workspace-label">{profile.role === "manager" ? "manager" : activeRole} workspace</div>
      <nav className="lms-nav" aria-label={`${activeRole} navigation`}>{nav.map((item) => { const Icon = item.icon; return <a className={(activePath ?? `/dashboard/${activeRole}`) === item.href ? "active" : ""} href={item.href} key={item.href}><span><Icon aria-hidden="true" size={18} strokeWidth={1.9} /></span>{item.label}</a>; })}</nav>
      {profile.role === "admin" && <div className="role-preview"><small>SWITCH WORKSPACE</small><a href="/dashboard/tutor">Tutor dashboard <Send aria-hidden="true" size={13} /></a><a href="/dashboard/student">Student dashboard <Send aria-hidden="true" size={13} /></a></div>}
      <div className="sidebar-profile"><span>{initials(profile.name)}</span><a className="profile-link" href="/dashboard/profile"><strong>{profile.name}</strong><small>{profile.role} · profile</small></a><a href={chatGPTSignOutPath("/")} aria-label="Sign out"><LogOut aria-hidden="true" size={17} /></a></div>
    </aside>
    <main className="lms-main">
      <header className="lms-topbar"><div><button className="mobile-menu" aria-label="Open menu">☰</button><span className="crumb">Skillvelop Academy / {activeRole}</span></div><div className="top-actions"><a href="#notifications" aria-label="Notifications"><Bell aria-hidden="true" size={19} strokeWidth={1.8} /><span /></a><div className="online"><i /> Platform online</div></div></header>
      <section className="lms-content">
        <div className="page-heading"><div><span className="page-eyebrow">{eyebrow}</span><h1>{title}</h1><p>{subtitle}</p></div>{actions}</div>
        {children}
      </section>
    </main>
  </div>;
}

export function Notice({ params }: { params?: { created?: string; updated?: string; submitted?: string; sent?: string; deleted?: string; error?: string; score?: string; max?: string } }) {
  if (!params) return null;
  const success = params.created === "user" ? "User created with a permanent Skillvelop ID." : params.created === "manager" ? "Manager created with customized permissions." : params.created === "course" ? "Course created in locked mode. Add chapters before releasing it." : params.created === "chapter" ? "Chapter added to the course structure." : params.created === "quiz" ? "Knowledge check created. Add its interactive questions." : params.created === "class" ? "Live class scheduled in the selected timezone." : params.created === "activity" ? "Learning activity published." : params.created === "lesson" ? "Course lesson published." : params.created === "curriculum" ? "Curriculum added. You can now add subjects and grades." : params.updated === "subject" ? "Curriculum subject and grades saved." : params.updated === "curriculum-archived" ? "Curriculum archived. Existing courses remain unchanged." : params.updated === "credential" ? "The VIYU API credential was encrypted and connected." : params.updated === "ai" ? "VIYU configuration saved." : params.updated === "feedback" ? "Feedback returned to the learner." : params.updated === "subscription" ? "Student plan and class entitlement updated." : params.updated === "renewal" ? "Subscription renewed successfully." : params.updated === "lesson" ? "Lesson completed — 50 XP added." : params.updated === "profile" ? "Profile and public tutor page updated." : params.updated === "enrolment" ? "Student enrolled in the course." : params.updated === "resource" ? "Learning resource uploaded to the lesson." : params.updated === "question" ? "Interactive question added." : params.updated === "unlock" ? "Student access setting updated." : params.updated === "availability" ? "Weekly tutor availability updated." : params.updated === "demo-confirmed" ? "Demo request confirmed and added to the academy schedule." : params.updated === "staff-assigned" ? "Professional-development course assigned to the tutor." : params.updated === "staff-completed" ? "Tutor training marked complete and a staff certificate issued." : params.updated === "reset-requested" ? "Assessment reattempt request sent for review." : params.updated === "assessment-reset" ? "Assessment attempt reset. The learner can now try again." : params.updated === "confirmation-requested" ? "Confirmation request sent to the student." : params.updated === "class-confirmed" ? "Class confirmed and tutor rating recorded." : params.deleted === "course" ? "Course and its learning records were deleted." : params.sent ? "Message sent." : params.submitted === "quiz" ? `Quiz submitted. Score: ${params.score ?? "0"}/${params.max ?? "0"}.` : params.submitted ? "Your work was submitted to your tutor." : "";
  const error = params.error === "contact-blocked" ? "For learner safety, personal phone numbers, email addresses and external contact handles cannot be shared in chat. The message was blocked and the safeguarding team was notified." : params.error === "final-assessment-required" ? "Add a complete final assessment before releasing this course to learners." : params.error === "quiz-incomplete" ? "Add the selected number of questions before unlocking this quiz." : params.error ? "Please check the required fields and try again." : "";
  if (!success && !error) return null;
  return <div className={`notice ${error ? "error" : "success"}`} role="status"><strong>{error ? "Action not completed" : "Done"}</strong><span>{error || success}</span></div>;
}

export function Metric({ label, value, note, tone = "plain" }: { label: string; value: string | number; note: string; tone?: string }) {
  const Icon=tone==="blue"?BookOpen:tone==="mint"?Trophy:tone==="coral"?Award:BarChart3;
  return <article className={`metric-card ${tone}`}><i className="metric-icon"><Icon aria-hidden="true" size={20}/></i><span>{label}</span><strong>{value}</strong><small>{note}</small></article>;
}

export function Status({ children, tone = "green" }: { children: ReactNode; tone?: string }) { return <span className={`status ${tone}`}><i />{children}</span>; }
export function initials(name: string) { return name.split(/\s+/).map((word) => word[0]).join("").slice(0, 2).toUpperCase(); }
export function formatDate(value: string, timeZone = "Asia/Kolkata") { try{return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year:"numeric",hour: "numeric", minute: "2-digit", timeZone, timeZoneName:"short" }).format(new Date(value));}catch{return new Intl.DateTimeFormat("en-IN", { day: "numeric", month: "short", year:"numeric",hour: "numeric", minute: "2-digit", timeZone:"UTC",timeZoneName:"short" }).format(new Date(value));} }
export function activityIcon(type: string) { return ({ homework: "⌂", quiz: "?", assessment: "◎", assignment: "▤", classwork: "✦" } as Record<string, string>)[type] ?? "✓"; }
