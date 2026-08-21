import { all, first } from "@/db/lms";
import { LmsShell, Metric, Status, initials } from "../../components";
import { requireAdminPermission } from "../../auth";

type Student={id:string;public_id:string;name:string;email:string;status:string;courses:number;avg_progress:number;plan_type:string|null;class_allowance:number|null;expires_at:string|null;classes_used:number};
export const dynamic="force-dynamic";

export default async function Page(){
  const profile=await requireAdminPermission("manage_students","/dashboard/admin/students");
  const students=await all<Student>(`SELECT u.id,u.public_id,u.name,u.email,u.status,COUNT(DISTINCT e.course_id) courses,COALESCE(ROUND(AVG(e.progress)),0) avg_progress,ss.plan_type,ss.class_allowance,ss.expires_at,(SELECT COUNT(*) FROM live_classes lc WHERE lc.student_id=u.id AND lc.status='completed' AND (ss.started_at IS NULL OR lc.starts_at>=ss.started_at)) classes_used FROM users u LEFT JOIN enrollments e ON e.student_id=u.id LEFT JOIN student_subscriptions ss ON ss.student_id=u.id WHERE u.role='student' GROUP BY u.id ORDER BY u.name`);
  const paid=students.filter(s=>s.plan_type==='paid').length; const trials=students.filter(s=>s.plan_type==='trial'||!s.plan_type).length; const expiring=students.filter(s=>s.expires_at&&new Date(s.expires_at).getTime()<Date.now()+7*86400000).length;
  return <LmsShell profile={profile} activeRole="admin" activePath="/dashboard/admin/students" eyebrow="Student operations" title="Students & enrolments" subtitle="Check every learner, course enrolment, plan type, class balance and renewal status.">
    <div className="metrics-grid"><Metric label="Total students" value={students.length} note="All learner accounts"/><Metric label="Paid learners" value={paid} note="Active paid records" tone="mint"/><Metric label="Trial / unset" value={trials} note="Needs conversion follow-up" tone="blue"/><Metric label="Renewal attention" value={expiring} note="Expired or within 7 days" tone="coral"/></div>
    <section className="panel"><div className="student-admin-list"><div className="student-admin-row student-admin-head"><span>Student</span><span>Enrolment</span><span>Plan</span><span>Class balance</span><span/></div>{students.map(s=>{const remaining=Math.max(0,(s.class_allowance??0)-s.classes_used);return <article className="student-admin-row" key={s.id}><span className="person-cell"><i>{initials(s.name)}</i><b>{s.name}<small>{s.email}</small></b></span><span><strong>{s.courses} course{s.courses===1?'':'s'}</strong><small>{s.avg_progress}% avg. progress</small></span><span><Status tone={s.plan_type==='paid'?'green':'amber'}>{s.plan_type??'not set'}</Status>{s.expires_at&&<small>Until {new Date(s.expires_at).toLocaleDateString('en-IN')}</small>}</span><span><strong>{remaining} remaining</strong><small>{s.classes_used} used / {s.class_allowance??0} purchased</small></span><a className="module-link secondary" href={`/dashboard/admin/students/${s.id}`}>View & manage →</a></article>})}</div></section>
  </LmsShell>;
}
