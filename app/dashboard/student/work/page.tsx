import { all } from "@/db/lms";
import { LmsShell, Metric, Notice, Status, activityIcon, formatDate } from "../../components";
import { requireRole } from "../../auth";
import { MathFormField } from "../../MathComposer";
import AssignmentAttachmentField from "./AssignmentAttachmentField";

type Task={id:string;title:string;type:string;instructions:string;due_at:string;points:number;course:string;submission_status:string|null;score:number|null;feedback:string|null};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("student","/dashboard/student/work");
  const id=profile.role==='admin'?'usr_demo_student':profile.id;
  const rows=await all<Task>(`SELECT a.id,a.title,a.type,a.instructions,a.due_at,a.points,c.title course,s.status submission_status,s.score,s.feedback
    FROM activities a JOIN courses c ON c.id=a.course_id JOIN enrollments e ON e.course_id=a.course_id AND e.student_id=?
    LEFT JOIN chapters ch ON ch.id=a.chapter_id LEFT JOIN submissions s ON s.activity_id=a.id AND s.student_id=?
    WHERE a.status='published' AND a.is_unlocked=1 AND c.is_unlocked=1 AND (a.chapter_id IS NULL OR ch.is_unlocked=1)
    ORDER BY CASE WHEN s.id IS NULL THEN 0 ELSE 1 END,a.due_at`,id,id);
  const open=rows.filter(r=>!r.submission_status).length;
  return <LmsShell profile={profile} activeRole="student" activePath="/dashboard/student/work" eyebrow="Learning activities" title="Assignments & assessments" subtitle="All homework, quizzes, class work, assignments and assessments from your tutors.">
    <Notice params={await searchParams}/>
    <div className="metrics-grid"><Metric label="To complete" value={open} note="Work needing attention" tone="coral"/><Metric label="Homework" value={rows.filter(r=>r.type==='homework').length} note="Practice after class" tone="blue"/><Metric label="Quizzes & assessments" value={rows.filter(r=>r.type==='quiz'||r.type==='assessment').length} note="Check your understanding" tone="mint"/><Metric label="Submitted" value={rows.length-open} note="Awaiting or reviewed"/></div>
    <div className="module-page">{rows.map(r=><article className="task-page-card" id={`activity-${r.id}`} key={r.id}><header><div><span className="panel-kicker">{r.type} · {r.course}</span><h2>{activityIcon(r.type)} {r.title}</h2><small>Due {formatDate(r.due_at)} · {r.points} points</small></div>{r.submission_status?<Status>{r.score!==null?`${r.score} points`:r.submission_status}</Status>:<Status tone="amber">To complete</Status>}</header><p>{r.instructions}</p>{r.submission_status?<div className="feedback-box"><strong>{r.feedback?'Tutor feedback':'Submitted for review'}</strong><p>{r.feedback||'Your tutor will review this soon.'}</p></div>:<form action="/api/lms" method="post" encType="multipart/form-data"><input type="hidden" name="action" value="submit-activity"/><input type="hidden" name="activityId" value={r.id}/><MathFormField name="response" label="Your response (optional when attaching files)" multiline placeholder="Write your answer, working, equations, or a link to completed work…"/><AssignmentAttachmentField/><button>Submit to tutor →</button></form>}</article>)}</div>
  </LmsShell>;
}
