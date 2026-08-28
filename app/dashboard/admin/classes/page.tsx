import { all, first } from "@/db/lms";
import { LmsShell, Notice, Status, formatDate } from "../../components";
import { requireAdminPermission } from "../../auth";

type Row={id:string;title:string;starts_at:string;duration_minutes:number;course:string;tutor:string;student:string|null;status:string;student_rating:number|null};
type Tutor={id:string;name:string};
type Course={id:string;title:string};
type Slot={id:string;tutor_id:string;tutor:string;weekday:number;start_minutes:number;end_minutes:number;timezone:string};
type Demo={id:string;public_code:string;student_name:string;guardian_name:string;email:string;phone:string;timezone:string;grade_level:string;tutor_id:string|null;tutor:string|null;starts_at:string;notes:string;curriculum:string|null;subject:string|null};
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const clock=(minutes:number)=>`${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;

export const dynamic="force-dynamic";
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireAdminPermission("manage_classes","/dashboard/admin/classes"),params=await searchParams;
  const timezone=(await first<{timezone:string}>("SELECT timezone FROM user_profiles WHERE user_id=?",profile.id))?.timezone??"Asia/Kolkata";
  const [rows,tutors,courses,slots,demos]=await Promise.all([
    all<Row>(`SELECT l.id,l.title,l.starts_at,l.duration_minutes,l.status,l.student_rating,c.title course,t.name tutor,s.name student FROM live_classes l JOIN courses c ON c.id=l.course_id JOIN users t ON t.id=l.tutor_id LEFT JOIN users s ON s.id=l.student_id ORDER BY l.starts_at DESC`),
    all<Tutor>("SELECT id,name FROM users WHERE role='tutor' AND status='active' ORDER BY name"),
    all<Course>("SELECT id,title FROM courses WHERE status='active' AND course_audience='student' ORDER BY title"),
    all<Slot>(`SELECT a.id,a.tutor_id,u.name tutor,a.weekday,a.start_minutes,a.end_minutes,a.timezone FROM tutor_availability_slots a JOIN users u ON u.id=a.tutor_id WHERE a.is_open=1 ORDER BY u.name,a.weekday,a.start_minutes`),
    all<Demo>(`SELECT d.id,d.public_code,d.student_name,d.guardian_name,d.email,d.phone,d.timezone,d.grade_level,d.tutor_id,d.starts_at,d.notes,t.name tutor,c.name curriculum,s.name subject FROM demo_bookings d LEFT JOIN users t ON t.id=d.tutor_id LEFT JOIN curricula c ON c.id=d.curriculum_id LEFT JOIN curriculum_subjects s ON s.id=d.subject_id WHERE d.status='requested' ORDER BY d.starts_at`),
  ]);
  return <LmsShell profile={profile} activeRole="admin" activePath="/dashboard/admin/classes" eyebrow="Live teaching" title="Class operations" subtitle={`Review public demo requests, tutor availability and academy classes in ${timezone}.`}>
    <Notice params={params}/>
    <div className="admin-class-operations">
      <section className="panel demo-request-panel"><div className="panel-head"><div><span className="panel-kicker">DEMO REQUESTS</span><h2>Map learner and tutor</h2><p>Confirm each public request against a live course and add the secure classroom link.</p></div><Status tone={demos.length?"amber":"green"}>{demos.length} requested</Status></div><div className="demo-request-list">{demos.map(demo=><article key={demo.id}><header><div><small>{demo.public_code} · {demo.curriculum??"Curriculum"} / {demo.subject??"Subject"} / {demo.grade_level}</small><h3>{demo.student_name}</h3><p>{demo.guardian_name?`${demo.guardian_name} · `:""}{demo.email}{demo.phone?` · ${demo.phone}`:""}</p></div><Status tone="blue">{formatDate(demo.starts_at,demo.timezone)}</Status></header>{demo.notes?<blockquote>{demo.notes}</blockquote>:null}<form action="/api/lms" method="post"><input type="hidden" name="action" value="confirm-demo-booking"/><input type="hidden" name="bookingId" value={demo.id}/><label>Tutor<select name="tutorId" defaultValue={demo.tutor_id??""} required><option value="">Choose tutor</option>{tutors.map(tutor=><option value={tutor.id} key={tutor.id}>{tutor.name}</option>)}</select></label><label>Demo course<select name="courseId" required><option value="">Choose course</option>{courses.map(course=><option value={course.id} key={course.id}>{course.title}</option>)}</select></label><label>Classroom link <span className="required-label">Required</span><input name="meetingUrl" type="url" inputMode="url" required placeholder="https://meet.google.com/..."/></label><button>Confirm & schedule demo</button></form></article>)}{!demos.length?<div className="empty-module"><h3>No demo requests waiting</h3><p>New requests from the public booking page appear here automatically.</p></div>:null}</div></section>
      <section className="panel admin-availability"><div className="panel-head"><div><span className="panel-kicker">TUTOR COVERAGE</span><h2>Weekly availability</h2></div><Status>{slots.length} open slots</Status></div><div className="admin-slot-list">{slots.map(slot=><article key={slot.id}><div><strong>{slot.tutor}</strong><span>{days[slot.weekday]} · {clock(slot.start_minutes)}–{clock(slot.end_minutes)}</span><small>{slot.timezone.replaceAll("_"," ")}</small></div></article>)}{!slots.length?<div className="empty-module"><h3>No tutor availability yet</h3><p>Tutors can open weekly windows from their Classes page.</p></div>:null}</div></section>
    </div>
    <section className="panel"><div className="panel-head"><div><span className="panel-kicker">ACADEMY SCHEDULE</span><h2>All classes</h2></div><Status>{rows.length} classes</Status></div><div className="class-list">{rows.map(r=><article className="class-row" key={r.id}><div className="class-time"><strong>{new Intl.DateTimeFormat("en-IN",{timeZone:timezone,hour:"numeric",minute:"2-digit"}).format(new Date(r.starts_at))}</strong><span>{new Intl.DateTimeFormat("en-IN",{timeZone:timezone,day:"numeric",month:"short"}).format(new Date(r.starts_at))}</span></div><div className="class-accent"/><div className="class-detail"><span>{r.course}</span><h3>{r.title}</h3><p>{r.tutor} with {r.student??"demo learner / course learners"} · {formatDate(r.starts_at,timezone)} · {r.duration_minutes} min</p></div><Status tone={r.status==="completed"?"green":r.status==="awaiting_confirmation"?"amber":"blue"}>{r.status.replaceAll("_"," ")}{r.student_rating?` · ${r.student_rating}/5`:""}</Status></article>)}</div></section>
  </LmsShell>;
}

