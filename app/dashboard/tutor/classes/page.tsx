import { all, first } from "@/db/lms";
import { LmsShell, Notice, Status, formatDate } from "../../components";
import { requireRole } from "../../auth";
type Row={id:string;title:string;starts_at:string;duration_minutes:number;meeting_url:string;course:string;student:string|null;student_id:string|null;status:string;student_rating:number|null;student_feedback:string};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("tutor","/dashboard/tutor/classes"),tutorId=profile.role==='admin'?'usr_demo_tutor':profile.id;
  const timezone=(await first<{timezone:string}>("SELECT timezone FROM user_profiles WHERE user_id=?",tutorId))?.timezone??"Asia/Kolkata";
  const rows=await all<Row>(`SELECT l.id,l.title,l.starts_at,l.duration_minutes,l.meeting_url,l.status,l.student_id,l.student_rating,l.student_feedback,c.title course,s.name student FROM live_classes l JOIN courses c ON c.id=l.course_id LEFT JOIN users s ON s.id=l.student_id WHERE l.tutor_id=? ORDER BY l.starts_at DESC`,tutorId);
  const now=new Date().toISOString();
  return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/classes" eyebrow="Live teaching" title="My classes" subtitle={`Every class is shown in ${timezone}. A session counts as delivered only after the student confirms it.`} actions={<a className="module-link" href="/dashboard/tutor/classes/new">+ Schedule class</a>}>
    <Notice params={await searchParams}/><section className="panel"><div className="class-list">{rows.map(r=><article className="class-row" key={r.id}><div className="class-time"><strong>{new Intl.DateTimeFormat('en-IN',{timeZone:timezone,hour:'numeric',minute:'2-digit'}).format(new Date(r.starts_at))}</strong><span>{new Intl.DateTimeFormat('en-IN',{timeZone:timezone,day:'numeric',month:'short'}).format(new Date(r.starts_at))}</span></div><div className="class-accent"/><div className="class-detail"><span>{r.course}</span><h3>{r.title}</h3><p>{r.student??'Course learners'} · {formatDate(r.starts_at,timezone)} · {r.duration_minutes} min</p>{r.status==='completed'&&<small>Student confirmed · {r.student_rating??0}/5 stars{r.student_feedback?` · ${r.student_feedback}`:''}</small>}</div><div className="class-actions">{r.status==='scheduled'&&r.starts_at<=now&&r.student_id?<form action="/api/lms" method="post"><input type="hidden" name="action" value="request-class-confirmation"/><input type="hidden" name="classId" value={r.id}/><button>Request confirmation</button></form>:<Status tone={r.status==='completed'?'green':r.status==='awaiting_confirmation'?'amber':'blue'}>{r.status.replaceAll('_',' ')}</Status>}{r.meeting_url&&r.status==='scheduled'&&<a className="join-button" href={r.meeting_url}>Open room ↗</a>}</div></article>)}</div></section>
  </LmsShell>;
}
