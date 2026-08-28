import { all } from "@/db/lms";
import { LmsShell, Notice, Status } from "../../components";
import { requireAdminPermission } from "../../auth";
import DeleteButton from "../../DeleteButton";
import CourseCatalogFilter from "../../CourseCatalogFilter";

type Row={id:string;title:string;subject:string;level:string;description:string;status:string;tutor:string|null;students:number;course_audience:string;staff:number;completion_points:number};
type Tutor={id:string;name:string};
type StaffEnrollment={id:string;course_id:string;tutor_id:string;tutor:string;progress:number;status:string;certificate_code:string|null};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireAdminPermission("manage_courses","/dashboard/admin/courses"),params=await searchParams;
  const [courses,tutors,staff]=await Promise.all([
    all<Row>("SELECT c.id,c.title,c.subject,c.level,c.description,c.status,c.course_audience,c.completion_points,u.name tutor,COUNT(DISTINCT e.id) students,COUNT(DISTINCT se.id) staff FROM courses c LEFT JOIN users u ON u.id=c.tutor_id LEFT JOIN enrollments e ON e.course_id=c.id LEFT JOIN staff_course_enrollments se ON se.course_id=c.id GROUP BY c.id,u.name ORDER BY c.created_at DESC"),
    all<Tutor>("SELECT id,name FROM users WHERE role='tutor' AND status='active' ORDER BY name"),
    all<StaffEnrollment>("SELECT se.id,se.course_id,se.tutor_id,u.name tutor,se.progress,se.status,sc.certificate_code FROM staff_course_enrollments se JOIN users u ON u.id=se.tutor_id LEFT JOIN staff_certificates sc ON sc.course_id=se.course_id AND sc.tutor_id=se.tutor_id ORDER BY u.name"),
  ]);
  const query=(params.q??"").trim(),subject=(params.subject??"").trim(),audience=(params.audience??"").trim(),needle=query.toLowerCase();
  const visibleCourses=courses.filter(course=>(!needle||`${course.title} ${course.subject} ${course.level} ${course.description} ${course.tutor??""}`.toLowerCase().includes(needle))&&(!subject||course.subject===subject)&&(!audience||course.course_audience===audience));
  const subjects=[...new Set(courses.map(course=>course.subject))].sort((a,b)=>a.localeCompare(b));
  return <LmsShell profile={profile} activeRole="admin" activePath="/dashboard/admin/courses" eyebrow="Learning programmes" title="Courses" subtitle="Govern student programmes and tutor professional-development courses from one portfolio." actions={<a className="module-link" href="/dashboard/admin/courses/new">+ Create course</a>}>
    <Notice params={params}/>
    <CourseCatalogFilter action="/dashboard/admin/courses" query={query} subject={subject} subjects={subjects} filterName="audience" filterLabel="Audience" filterValue={audience} filterOptions={[{value:"student",label:"Student courses"},{value:"tutor",label:"Tutor development"}]}/>
    <div className="record-grid">{visibleCourses.map(course=>{const assigned=staff.filter(item=>item.course_id===course.id),available=tutors.filter(tutor=>!assigned.some(item=>item.tutor_id===tutor.id));return <article className="record-card admin-course-record" key={course.id}><div className="course-record-status"><Status>{course.status}</Status><span>{course.course_audience==="tutor"?"Tutor development":"Student course"}</span></div><h3>{course.title}</h3><p>{course.description}</p><small>{course.subject} · {course.level} · {course.completion_points} points</small><footer><span>{course.tutor??"Tutor needed"}</span><strong>{course.course_audience==="tutor"?course.staff+" tutor"+(course.staff===1?"":"s")+" assigned":course.students+" learner"+(course.students===1?"":"s")}</strong></footer>{course.course_audience==="tutor"?<section className="staff-course-admin"><form action="/api/lms" method="post"><input type="hidden" name="action" value="assign-staff-course"/><input type="hidden" name="courseId" value={course.id}/><select name="tutorId" required disabled={!available.length}><option value="">{available.length?"Assign tutor…":"All tutors assigned"}</option>{available.map(tutor=><option value={tutor.id} key={tutor.id}>{tutor.name}</option>)}</select><button disabled={!available.length}>Assign training</button></form>{assigned.map(item=><article key={item.id}><span><strong>{item.tutor}</strong><small>{item.status==="completed"?"Certified · "+item.certificate_code:item.progress+"% complete"}</small></span>{item.status!=="completed"?<form action="/api/lms" method="post"><input type="hidden" name="action" value="complete-staff-course"/><input type="hidden" name="enrollmentId" value={item.id}/><button>Mark complete</button></form>:<Status tone="green">Completed</Status>}</article>)}</section>:null}<DeleteButton action="delete-course" id={course.id} name="courseId" label={"course “"+course.title+"”"}/></article>})}{!visibleCourses.length?<div className="course-filter-empty"><h3>No matching courses</h3><p>Try a different keyword or clear the filters.</p></div>:null}</div>
  </LmsShell>;
}

