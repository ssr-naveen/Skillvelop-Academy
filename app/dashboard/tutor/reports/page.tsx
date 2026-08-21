import { all } from "@/db/lms";
import { LmsShell, Metric, Status } from "../../components";
import { requireRole } from "../../auth";

type Report={id:string;name:string;email:string;courses:number;progress:number;lessons:number;classes:number;quizzes:number;quiz_score:number|null;submissions:number};
type ClassBalance={id:string;name:string;email:string;plan_type:string|null;class_allowance:number|null;classes_taken:number;upcoming:number;last_class:string|null};
export const dynamic="force-dynamic";

export default async function Page(){
  const profile=await requireRole("tutor","/dashboard/tutor/reports");
  const tutorId=profile.role==='admin'?'usr_demo_tutor':profile.id;
  const now=new Date().toISOString(),month=now.slice(0,7);
  const reports=await all<Report>(`SELECT u.id,u.name,u.email,COUNT(DISTINCT e.course_id) courses,ROUND(AVG(e.progress)) progress,
    (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id WHERE lp.student_id=u.id AND l.tutor_id=? AND substr(lp.completed_at,1,7)=?) lessons,
    (SELECT COUNT(DISTINCT lc.id) FROM live_classes lc WHERE lc.tutor_id=? AND (lc.student_id=u.id OR (lc.student_id IS NULL AND lc.course_id IN (SELECT course_id FROM enrollments WHERE student_id=u.id))) AND lc.status='completed' AND substr(lc.starts_at,1,7)=?) classes,
    (SELECT COUNT(*) FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id WHERE qa.student_id=u.id AND q.tutor_id=? AND substr(qa.submitted_at,1,7)=?) quizzes,
    (SELECT ROUND(AVG(CASE WHEN qa.max_score>0 THEN qa.score*100.0/qa.max_score END)) FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id WHERE qa.student_id=u.id AND q.tutor_id=? AND substr(qa.submitted_at,1,7)=?) quiz_score,
    (SELECT COUNT(*) FROM submissions s JOIN activities a ON a.id=s.activity_id JOIN courses c2 ON c2.id=a.course_id WHERE s.student_id=u.id AND c2.tutor_id=? AND substr(s.submitted_at,1,7)=?) submissions
    FROM users u JOIN enrollments e ON e.student_id=u.id JOIN courses c ON c.id=e.course_id AND c.tutor_id=? GROUP BY u.id ORDER BY u.name`,tutorId,month,tutorId,month,tutorId,month,tutorId,month,tutorId,month,tutorId);
  const balances=await all<ClassBalance>(`SELECT u.id,u.name,u.email,ss.plan_type,ss.class_allowance,
    (SELECT COUNT(DISTINCT lc.id) FROM live_classes lc WHERE lc.tutor_id=? AND (lc.student_id=u.id OR (lc.student_id IS NULL AND lc.course_id IN (SELECT course_id FROM enrollments WHERE student_id=u.id))) AND lc.status='completed') classes_taken,
    (SELECT COUNT(DISTINCT lc.id) FROM live_classes lc WHERE lc.tutor_id=? AND (lc.student_id=u.id OR (lc.student_id IS NULL AND lc.course_id IN (SELECT course_id FROM enrollments WHERE student_id=u.id))) AND lc.status='scheduled' AND lc.starts_at>?) upcoming,
    (SELECT MAX(lc.starts_at) FROM live_classes lc WHERE lc.tutor_id=? AND (lc.student_id=u.id OR (lc.student_id IS NULL AND lc.course_id IN (SELECT course_id FROM enrollments WHERE student_id=u.id))) AND lc.status='completed') last_class
    FROM users u JOIN enrollments e ON e.student_id=u.id JOIN courses c ON c.id=e.course_id AND c.tutor_id=? LEFT JOIN student_subscriptions ss ON ss.student_id=u.id GROUP BY u.id ORDER BY u.name`,tutorId,tutorId,now,tutorId,tutorId);
  const totalTaken=balances.reduce((sum,row)=>sum+row.classes_taken,0),totalRemaining=balances.reduce((sum,row)=>sum+Math.max(0,(row.class_allowance??0)-row.classes_taken),0),totalUpcoming=balances.reduce((sum,row)=>sum+row.upcoming,0);
  return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/reports" eyebrow="Student outcomes" title="Student reports & class balances" subtitle={`Track plan entitlement, class delivery and learning performance for ${new Date().toLocaleDateString('en-IN',{month:'long',year:'numeric'})}.`}>
    <div className="metrics-grid"><Metric label="Students" value={balances.length} note="Learners assigned to you"/><Metric label="Classes taken" value={totalTaken} note="Student-confirmed sessions" tone="blue"/><Metric label="Classes remaining" value={totalRemaining} note="Across active entitlements" tone="mint"/><Metric label="Upcoming" value={totalUpcoming} note="Scheduled sessions" tone="coral"/></div>
    <section className="panel"><div className="panel-head"><div><span className="panel-kicker">CLASS ENTITLEMENT</span><h2>Student-wise class report</h2></div><Status>{balances.length} students</Status></div><div className="report-table"><div className="class-report-row report-head"><span>Student</span><span>Plan</span><span>Purchased</span><span>Taken</span><span>Remaining</span><span>Upcoming</span><span>Last class</span></div>{balances.map(row=>{const remaining=Math.max(0,(row.class_allowance??0)-row.classes_taken);return <article className="class-report-row" key={row.id}><strong>{row.name}<small>{row.email}</small></strong><Status tone={row.plan_type==='paid'?'green':'amber'}>{row.plan_type??'Not set'}</Status><span>{row.class_allowance??0}</span><span>{row.classes_taken}</span><strong className="balance-value">{remaining}</strong><span>{row.upcoming}</span><span>{row.last_class?new Date(row.last_class).toLocaleDateString('en-IN'):'—'}</span></article>})}</div></section>
    <section className="panel"><div className="panel-head"><div><span className="panel-kicker">LEARNER OUTCOMES</span><h2>Monthly performance</h2></div><Status>{reports.length} students</Status></div><div className="report-table"><div className="report-row report-head"><span>Student</span><span>Progress</span><span>Lessons</span><span>Classes</span><span>Quizzes</span><span>Quiz score</span><span>Work</span></div>{reports.map(r=><article className="report-row" key={r.id}><strong>{r.name}<small>{r.email} · {r.courses} courses</small></strong><span>{r.progress??0}%</span><span>{r.lessons}</span><span>{r.classes}</span><span>{r.quizzes}</span><span>{r.quiz_score===null?'—':`${r.quiz_score}%`}</span><span>{r.submissions}</span></article>)}</div></section>
  </LmsShell>;
}
