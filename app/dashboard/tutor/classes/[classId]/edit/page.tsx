import { first } from "@/db/lms";
import { supportedTimeZones, validTimeZone } from "@/db/timezones";
import { notFound } from "next/navigation";
import { LmsShell, Notice } from "../../../../components";
import { requireRole } from "../../../../auth";
import { DateTimePicker12 } from "@/app/components/DateTimePicker12";

type ScheduledClass={id:string;course_id:string;student_id:string|null;title:string;starts_at:string;duration_minutes:number;meeting_url:string;course:string;student:string|null};

function localDateTimeInput(value:string,timeZone:string){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:validTimeZone(timeZone),year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value));
  const part=(type:string)=>parts.find(item=>item.type===type)?.value??"";
  return `${part("year")}-${part("month")}-${part("day")}T${part("hour")}:${part("minute")}`;
}

export const dynamic="force-dynamic";
export default async function Page({params,searchParams}:{params:Promise<{classId:string}>;searchParams:Promise<Record<string,string|undefined>>}){
  const {classId}=await params,profile=await requireRole("tutor",`/dashboard/tutor/classes/${classId}/edit`),tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;
  const [scheduledClass,profileRow]=await Promise.all([
    first<ScheduledClass>(`SELECT l.id,l.course_id,l.student_id,l.title,l.starts_at,l.duration_minutes,l.meeting_url,c.title course,s.name student FROM live_classes l JOIN courses c ON c.id=l.course_id LEFT JOIN users s ON s.id=l.student_id WHERE l.id=? AND l.tutor_id=? AND l.status='scheduled'`,classId,tutorId),
    first<{timezone:string}>("SELECT timezone FROM user_profiles WHERE user_id=?",tutorId),
  ]);
  if(!scheduledClass)notFound();
  const timezone=profileRow?.timezone??"Asia/Kolkata";

  return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/classes" eyebrow="Live teaching" title="Edit scheduled class" subtitle={`Update the time, duration, title or secure meeting room before the class is completed.`} actions={<a className="module-link secondary" href="/dashboard/tutor/classes">← My classes</a>}>
    <Notice params={await searchParams}/>
    <div className="form-page"><section className="form-card"><form action="/api/lms" method="post">
      <input type="hidden" name="action" value="update-class"/>
      <input type="hidden" name="classId" value={scheduledClass.id}/>
      <input type="hidden" name="courseId" value={scheduledClass.course_id}/>
      <input type="hidden" name="studentId" value={scheduledClass.student_id??""}/>
      <div className="class-edit-context"><span>COURSE</span><strong>{scheduledClass.course}</strong><small>{scheduledClass.student?`Learner · ${scheduledClass.student}`:"Demo learner or course group"}</small></div>
      <label>Class title<input name="title" required maxLength={180} defaultValue={scheduledClass.title}/></label>
      <div className="form-row schedule-row"><DateTimePicker12 name="startsAt" label="Starts at" required defaultValue={localDateTimeInput(scheduledClass.starts_at,timezone)}/><label>Minutes<input name="duration" type="number" min="15" max="180" required defaultValue={scheduledClass.duration_minutes}/></label></div>
      <label>Schedule timezone<select name="timeZone" defaultValue={timezone} required>{supportedTimeZones().map(zone=><option value={zone} key={zone}>{zone.replaceAll("_"," ")}</option>)}</select><small>The learner calendar is updated to the same moment in their timezone.</small></label>
      <label>Meeting link <span className="required-label">Required</span><input name="meetingUrl" type="url" inputMode="url" required placeholder="https://meet.google.com/..." defaultValue={scheduledClass.meeting_url}/><small>Use a secure HTTPS link from Google Meet, Zoom, Microsoft Teams or your approved classroom provider.</small></label>
      <button>Save class changes →</button>
    </form></section><aside className="help-card"><h3>Safe schedule changes</h3><p>Only you can edit this scheduled class. Completed classes and sessions waiting for student confirmation remain locked to protect attendance records.</p></aside></div>
  </LmsShell>;
}

