import { all } from "@/db/lms";
import { ArrowRight, BookOpen, Layers3, LockKeyhole } from "lucide-react";
import { LmsShell, Notice, Status } from "../../components";
import { requireRole } from "../../auth";
import MathText from "../../MathText";
import CourseCatalogFilter from "../../CourseCatalogFilter";

type Course={id:string;title:string;subject:string;level:string;description:string;cover_image_url:string;is_unlocked:number;progress:number;chapters:number;lessons:number};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("student","/dashboard/student/curriculum"),studentId=profile.role==='admin'?'usr_demo_student':profile.id,params=await searchParams;
  const allCourses=await all<Course>(`SELECT c.id,c.title,c.subject,c.level,c.description,c.cover_image_url,c.is_unlocked,e.progress,COUNT(DISTINCT ch.id) chapters,COUNT(DISTINCT l.id) lessons FROM enrollments e JOIN courses c ON c.id=e.course_id LEFT JOIN chapters ch ON ch.course_id=c.id LEFT JOIN lessons l ON l.course_id=c.id AND l.status='published' WHERE e.student_id=? AND c.status='active' GROUP BY c.id ORDER BY c.title`,studentId);
  const query=(params.q??"").trim(),subject=(params.subject??"").trim(),access=(params.access??"").trim(),needle=query.toLowerCase();
  const courses=allCourses.filter(course=>(!needle||`${course.title} ${course.subject} ${course.level} ${course.description}`.toLowerCase().includes(needle))&&(!subject||course.subject===subject)&&(!access||(access==="open"?Boolean(course.is_unlocked):!course.is_unlocked)));
  const subjects=[...new Set(allCourses.map(course=>course.subject))].sort((a,b)=>a.localeCompare(b));
  return <LmsShell profile={profile} activeRole="student" activePath="/dashboard/student/curriculum" eyebrow="My learning library" title="Choose a course" subtitle="Open a course to explore its chapters, lessons, assignments, quizzes and assessments in one clear learning path.">
    <Notice params={params}/>
    <div className="course-library-summary"><div><span>YOUR ACTIVE COURSES</span><h2>Continue your learning journey</h2><p>Each course opens into a structured chapter pathway with clear progress and tutor-controlled access.</p></div><strong>{allCourses.length}<small>courses</small></strong></div>
    <CourseCatalogFilter action="/dashboard/student/curriculum" query={query} subject={subject} subjects={subjects} filterName="access" filterLabel="Access" filterValue={access} filterOptions={[{value:"open",label:"Open courses"},{value:"locked",label:"Locked courses"}]}/>
    <div className="student-course-catalog clean-course-grid">{courses.map(course=><article className={course.is_unlocked?'student-course-card clean-course-card':'student-course-card clean-course-card locked'} key={course.id}>
      <div className="student-course-cover" style={course.cover_image_url?{backgroundImage:`linear-gradient(0deg,rgba(12,31,38,.9),rgba(12,31,38,.08)),url(${course.cover_image_url})`}:undefined}><div><span>{course.subject} · {course.level}</span><h2><MathText text={course.title}/></h2></div><Status tone={course.is_unlocked?'green':'amber'}>{course.is_unlocked?'Open':'Locked'}</Status></div>
      <div className="student-course-info"><p><MathText text={course.description}/></p><div className="course-structure-stats"><span><Layers3 size={17}/><b>{course.chapters}</b><small>chapters</small></span><span><BookOpen size={17}/><b>{course.lessons}</b><small>lessons</small></span><span><b>{course.progress}%</b><small>completed</small></span></div><div className="catalog-progress" aria-label={`${course.progress}% complete`}><span style={{width:`${course.progress}%`}}/></div><div className="course-card-footer"><small>{course.progress}% course progress</small>{course.is_unlocked?<a className="course-launch" href={`/dashboard/student/curriculum/${course.id}`}>{course.progress?'Continue course':'Start course'} <ArrowRight size={16}/></a>:<div className="catalog-lock-note"><LockKeyhole size={15}/> Tutor unlock required</div>}</div></div>
    </article>)}{!courses.length?<div className="course-filter-empty"><h3>No matching courses</h3><p>Try a different keyword or clear the filters.</p></div>:null}</div>
  </LmsShell>;
}

