import {all} from "@/db/lms";
import {MathFormField} from "../../MathComposer";
import {LmsShell,Notice,Status} from "../../components";
import {requireRole} from "../../auth";
import DeleteButton from "../../DeleteButton";

type Course={id:string;title:string;subject:string;level:string;description:string;cover_image_url:string;is_unlocked:number;students:number;chapters:number;lessons:number;imported:number};
type Student={id:string;name:string};
type Enrollment={course_id:string;student_id:string;student:string;progress:number};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("tutor","/dashboard/tutor/courses"),tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;
  const [courses,students,enrollments]=await Promise.all([
    all<Course>(`SELECT c.id,c.title,c.subject,c.level,c.description,c.cover_image_url,c.is_unlocked,COUNT(DISTINCT e.id) students,COUNT(DISTINCT ch.id) chapters,COUNT(DISTINCT l.id) lessons,CASE WHEN ci.id IS NULL THEN 0 ELSE 1 END imported FROM courses c LEFT JOIN enrollments e ON e.course_id=c.id LEFT JOIN chapters ch ON ch.course_id=c.id LEFT JOIN lessons l ON l.course_id=c.id LEFT JOIN curriculum_imports ci ON ci.course_id=c.id WHERE c.tutor_id=? AND c.status='active' GROUP BY c.id ORDER BY c.created_at DESC`,tutorId),
    all<Student>("SELECT id,name FROM users WHERE role='student' AND status='active' ORDER BY name"),
    all<Enrollment>(`SELECT e.course_id,e.student_id,u.name student,e.progress FROM enrollments e JOIN courses c ON c.id=e.course_id JOIN users u ON u.id=e.student_id WHERE c.tutor_id=? ORDER BY u.name`,tutorId),
  ]);
  return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/courses" eyebrow="Teaching programmes" title="My courses" subtitle="Create courses, assign or revoke individual learners, and control course availability." actions={<a className="module-link" href="/dashboard/tutor/curriculum">Build chapters & lessons →</a>}>
    <Notice params={await searchParams}/>
    <div className="course-management-layout"><section className="tutor-course-grid">{courses.map(course=>{const assigned=enrollments.filter(item=>item.course_id===course.id),available=students.filter(student=>!assigned.some(item=>item.student_id===student.id));return <article className="tutor-course-card" key={course.id}><div className="tutor-course-cover" style={course.cover_image_url?{backgroundImage:`linear-gradient(0deg,rgba(12,31,38,.72),rgba(12,31,38,.05)),url(${course.cover_image_url})`}:undefined}><Status tone={course.is_unlocked?"green":"amber"}>{course.is_unlocked?"Student access on":"Locked"}</Status><span>{course.subject}</span></div><div className="tutor-course-body"><small>{course.level}{course.imported?" · Academy curriculum":""}</small><h2>{course.title}</h2><p>{course.description}</p><div className="course-counts"><span><b>{course.chapters}</b> Chapters</span><span><b>{course.lessons}</b> Lessons</span><span><b>{course.students}</b> Students</span></div>
      <form className="unlock-form" action="/api/lms" method="post"><input type="hidden" name="action" value="set-content-unlock"/><input type="hidden" name="entity" value="course"/><input type="hidden" name="id" value={course.id}/><input type="hidden" name="next" value={course.is_unlocked?"0":"1"}/><input type="hidden" name="returnTo" value="/dashboard/tutor/courses?updated=unlock"/><button>{course.is_unlocked?"Lock course":"Unlock course for students"}</button></form>
      <form className="course-enrol-form" action="/api/lms" method="post"><input type="hidden" name="action" value="enrol-course-student"/><input type="hidden" name="courseId" value={course.id}/><select name="studentId" required disabled={!available.length}><option value="">{available.length?"Choose student…":"All students assigned"}</option>{available.map(student=><option key={student.id} value={student.id}>{student.name}</option>)}</select><button disabled={!available.length}>Assign course</button></form>
      {assigned.length?<section className="course-student-assignments"><h3>Assigned students</h3>{assigned.map(item=><article key={item.student_id}><span><strong>{item.student}</strong><small>{item.progress}% course progress</small></span><form action="/api/lms" method="post"><input type="hidden" name="action" value="revoke-course-student"/><input type="hidden" name="courseId" value={course.id}/><input type="hidden" name="studentId" value={item.student_id}/><button>Revoke</button></form></article>)}</section>:null}
      {course.imported?<p className="protected-content">Imported academy courses are protected from tutor deletion.</p>:<DeleteButton action="delete-course" id={course.id} name="courseId" label={`course “${course.title}”`}/>}</div></article>})}</section>
      <aside className="form-card sticky-builder"><form action="/api/lms" method="post"><input type="hidden" name="action" value="create-tutor-course"/><h2>Create a course</h2><p>Courses begin locked so you can build their chapters before students enter.</p><MathFormField name="title" label="Course title" required compact placeholder="Grade 5 Mathematics"/><div className="form-row"><label>Subject<input name="subject" required placeholder="Mathematics"/></label><label>Level<input name="level" required placeholder="Grade 5"/></label></div><label>Course card image URL<input name="coverImageUrl" type="url" placeholder="https://…/course-cover.jpg"/></label><MathFormField name="description" label="Course description and outcomes" multiline required placeholder="What students will learn and achieve, including equations or symbols…"/><button>Create locked course →</button></form></aside>
    </div>
  </LmsShell>;
}
