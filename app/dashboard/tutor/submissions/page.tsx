import { all } from "@/db/lms";
import { LmsShell, Notice, Status } from "../../components";
import { requireRole } from "../../auth";
import { BookOpen, StickyNote } from "lucide-react";
import AttachmentPreview from "./AttachmentPreview";

type Row={id:string;response:string;score:number|null;feedback:string;status:string;student:string;activity:string;course:string;submitted_at:string};
type Attachment={id:string;submission_id:string;file_name:string;content_type:string;size_bytes:number};
type Note={id:string;body:string;updated_at:string;student:string;lesson:string;course:string};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("tutor","/dashboard/tutor/submissions"),tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;
  const [rows,attachments,notes]=await Promise.all([
    all<Row>(`SELECT s.id,s.response,s.score,s.feedback,s.status,s.submitted_at,u.name student,a.title activity,c.title course FROM submissions s JOIN users u ON u.id=s.student_id JOIN activities a ON a.id=s.activity_id JOIN courses c ON c.id=a.course_id WHERE a.tutor_id=? ORDER BY CASE WHEN s.status='submitted' THEN 0 ELSE 1 END,s.submitted_at DESC`,tutorId),
    all<Attachment>(`SELECT sa.id,sa.submission_id,sa.file_name,sa.content_type,sa.size_bytes FROM submission_attachments sa JOIN submissions s ON s.id=sa.submission_id JOIN activities a ON a.id=s.activity_id WHERE a.tutor_id=? ORDER BY sa.created_at`,tutorId),
    all<Note>(`SELECT n.id,n.body,n.updated_at,u.name student,l.title lesson,c.title course FROM lesson_notes n JOIN users u ON u.id=n.student_id JOIN lessons l ON l.id=n.lesson_id JOIN courses c ON c.id=l.course_id WHERE l.tutor_id=? AND n.body!='' ORDER BY n.updated_at DESC`,tutorId),
  ]);
  return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/submissions" eyebrow="Review & feedback" title="Submissions & lesson notes" subtitle="Preview learner files inside Skillvelop, download originals, review private lesson notes and return focused feedback.">
    <Notice params={await searchParams}/>
    <section className="panel tutor-submission-panel"><div className="panel-head"><div><span className="panel-kicker">ASSIGNMENT INBOX</span><h2>Student submissions</h2></div><Status>{rows.length} records</Status></div>{rows.length?rows.map(row=>{const files=attachments.filter(file=>file.submission_id===row.id);return <article className="submission-card" key={row.id}><header><div><small>{row.course} · {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(row.submitted_at))}</small><h3>{row.student} · {row.activity}</h3></div><Status tone={row.status==="reviewed"?"green":"amber"}>{row.status}</Status></header>{row.response?<p>{row.response}</p>:<p className="muted">The student submitted files without a written response.</p>}{files.length?<div className="tutor-attachment-grid">{files.map(file=><AttachmentPreview id={file.id} fileName={file.file_name} contentType={file.content_type} sizeBytes={file.size_bytes} key={file.id}/>)}</div>:null}<form action="/api/lms" method="post"><input type="hidden" name="action" value="review-submission"/><input type="hidden" name="submissionId" value={row.id}/><label>Score<input name="score" type="number" min="0" max="100" defaultValue={row.score??80}/></label><label>Feedback<textarea name="feedback" rows={2} required defaultValue={row.feedback} placeholder="Actionable learner feedback"/></label><button>Return feedback</button></form></article>}):<div className="empty-module"><span>✓</span><h3>All caught up</h3><p>New learner submissions will appear here.</p></div>}</section>
    <section className="panel tutor-note-panel"><div className="panel-head"><div><span className="panel-kicker">PRIVATE LEARNING NOTES</span><h2>Notes shared with you as tutor</h2></div><Status tone="blue">{notes.length} notes</Status></div>{notes.length?<div className="tutor-note-grid">{notes.map(note=><article key={note.id}><header><span><StickyNote size={18}/></span><div><small>{note.course}</small><h3>{note.student} · {note.lesson}</h3></div></header><p>{note.body}</p><footer><BookOpen size={14}/><span>Updated {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(note.updated_at))}</span></footer></article>)}</div>:<div className="empty-module"><StickyNote size={24}/><h3>No lesson notes yet</h3><p>Student notes saved inside lessons will appear here for you.</p></div>}</section>
  </LmsShell>;
}
