import { all, first } from "@/db/lms";
import { supportedTimeZones } from "@/db/timezones";
import { LmsShell, Notice, Status, formatDate } from "../../components";
import { requireRole } from "../../auth";
import { DeleteClassButton } from "./DeleteClassButton";
import { TimePicker12 } from "@/app/components/DateTimePicker12";

type Row={id:string;title:string;starts_at:string;duration_minutes:number;meeting_url:string;course:string;student:string|null;student_id:string|null;status:string;student_rating:number|null;student_feedback:string};
type Slot={id:string;weekday:number;start_minutes:number;end_minutes:number;timezone:string};
const days=["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
function clock(minutes:number){return `${String(Math.floor(minutes/60)).padStart(2,"0")}:${String(minutes%60).padStart(2,"0")}`;}
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("tutor","/dashboard/tutor/classes"),tutorId=profile.role==='admin'?'usr_demo_tutor':profile.id;
  const timezone=(await first<{timezone:string}>("SELECT timezone FROM user_profiles WHERE user_id=?",tutorId))?.timezone??"Asia/Kolkata";
  const [rows,slots]=await Promise.all([
    all<Row>(`SELECT l.id,l.title,l.starts_at,l.duration_minutes,l.meeting_url,l.status,l.student_id,l.student_rating,l.student_feedback,c.title course,s.name student FROM live_classes l JOIN courses c ON c.id=l.course_id LEFT JOIN users s ON s.id=l.student_id WHERE l.tutor_id=? ORDER BY l.starts_at DESC`,tutorId),
    all<Slot>("SELECT id,weekday,start_minutes,end_minutes,timezone FROM tutor_availability_slots WHERE tutor_id=? AND is_open=1 ORDER BY weekday,start_minutes",tutorId),
  ]);
  const now=new Date().toISOString();

  return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/classes" eyebrow="Live teaching" title="My classes" subtitle={`Every class is shown in ${timezone}. A session counts as delivered only after the student confirms it.`} actions={<a className="module-link" href="/dashboard/tutor/classes/new">+ Schedule class</a>}>
    <Notice params={await searchParams}/>
    <div className="availability-layout">
      <section className="panel tutor-availability weekly-hours-panel">
        <div className="panel-head"><div><span className="panel-kicker">WEEKLY AVAILABILITY</span><h2>Set open hours for every day</h2><p>Switch on the days you teach and set the recurring opening hours used for demo scheduling.</p></div><Status>{slots.length} open</Status></div>
        <form action="/api/lms" method="post" className="weekly-hours-form">
          <input type="hidden" name="action" value="replace-weekly-availability"/>
          <div className="weekly-day-grid">{days.map((day,weekday)=>{const slot=slots.find(item=>item.weekday===weekday);return <div className="weekly-day-row" key={day}>
            <label className="open-day-control"><input type="checkbox" name={`open_${weekday}`} value="1" defaultChecked={Boolean(slot)}/><span><strong>{day}</strong><small>{slot?"Open":"Closed"}</small></span></label>
            <TimePicker12 name={`start_${weekday}`} label="From" defaultValue={slot?clock(slot.start_minutes):"09:00"}/>
            <TimePicker12 name={`end_${weekday}`} label="Until" defaultValue={slot?clock(slot.end_minutes):"17:00"}/>
          </div>})}</div>
          <label className="weekly-timezone">Availability timezone<select name="timeZone" defaultValue={slots[0]?.timezone??timezone} required>{supportedTimeZones().map(zone=><option value={zone} key={zone}>{zone.replaceAll("_"," ")}</option>)}</select><small>All seven days are interpreted in this timezone.</small></label>
          <button>Save weekly hours</button>
        </form>
      </section>
      <aside className="panel availability-windows-panel">
        <div className="panel-head"><div><span className="panel-kicker">OPEN WINDOWS</span><h2>Day-wise slots</h2></div></div>
        <div className="availability-slot-list">{slots.map(slot=><article key={slot.id}><div><strong>{days[slot.weekday]}</strong><span>{clock(slot.start_minutes)}–{clock(slot.end_minutes)} · {slot.timezone.replaceAll("_"," ")}</span></div><form action="/api/lms" method="post"><input type="hidden" name="action" value="delete-availability-slot"/><input type="hidden" name="slotId" value={slot.id}/><button>Close</button></form></article>)}{!slots.length?<p className="availability-empty">No days are open yet.</p>:null}</div>
        <details className="extra-slot-editor"><summary>+ Add another window</summary><form action="/api/lms" method="post"><input type="hidden" name="action" value="save-availability-slot"/><label>Day<select name="weekday">{days.map((day,index)=><option value={index} key={day}>{day}</option>)}</select></label><div className="form-row"><TimePicker12 name="startTime" label="From" required/><TimePicker12 name="endTime" label="Until" defaultValue="17:00" required/></div><label>Timezone<select name="timeZone" defaultValue={timezone}>{supportedTimeZones().map(zone=><option value={zone} key={zone}>{zone.replaceAll("_"," ")}</option>)}</select></label><button>Open extra slot</button></form></details>
      </aside>
    </div>
    <section className="panel"><div className="panel-head"><div><span className="panel-kicker">CLASS SCHEDULE</span><h2>Scheduled and completed lessons</h2></div></div><div className="class-list">{rows.map(r=><article className="class-row" key={r.id}><div className="class-time"><strong>{new Intl.DateTimeFormat('en-IN',{timeZone:timezone,hour:'numeric',minute:'2-digit'}).format(new Date(r.starts_at))}</strong><span>{new Intl.DateTimeFormat('en-IN',{timeZone:timezone,day:'numeric',month:'short'}).format(new Date(r.starts_at))}</span></div><div className="class-accent"/><div className="class-detail"><span>{r.course}</span><h3>{r.title}</h3><p>{r.student??'Course learners'} · {formatDate(r.starts_at,timezone)} · {r.duration_minutes} min</p>{r.status==='completed'&&<small>Student confirmed · {r.student_rating??0}/5 stars{r.student_feedback?` · ${r.student_feedback}`:''}</small>}</div><div className="class-actions">
      <Status tone={r.status==='completed'?'green':r.status==='awaiting_confirmation'?'amber':'blue'}>{r.status.replaceAll('_',' ')}</Status>
      {r.status==='scheduled'&&r.starts_at<=now&&r.student_id?<form action="/api/lms" method="post"><input type="hidden" name="action" value="request-class-confirmation"/><input type="hidden" name="classId" value={r.id}/><button>Request confirmation</button></form>:null}
      {r.status==='scheduled'?<a className="module-link secondary" href={`/dashboard/tutor/classes/${r.id}/edit`}>Edit</a>:null}
      {r.status==='scheduled'?<form action="/api/lms" method="post"><input type="hidden" name="action" value="delete-class"/><input type="hidden" name="classId" value={r.id}/><DeleteClassButton classTitle={r.title}/></form>:null}
      {r.meeting_url&&r.status==='scheduled'?<a className="join-button" href={r.meeting_url} target="_blank" rel="noreferrer">Open room ↗</a>:null}
    </div></article>)}{!rows.length?<div className="empty-module"><h3>No classes scheduled</h3><p>Create a class when you are ready to meet a learner.</p></div>:null}</div></section>
  </LmsShell>;
}

