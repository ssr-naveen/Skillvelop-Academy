import { all } from "@/db/lms";
import CourseStartForm from "../../../CourseStartForm";
import { LmsShell, Notice } from "../../../components";
import { requireAdminPermission } from "../../../auth";

type User={id:string;name:string};type Curriculum={id:string;name:string;audience:string;category:string};type Subject={id:string;curriculum_id:string;name:string;grades_json:string};
export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireAdminPermission("manage_courses","/dashboard/admin/courses/new");
  const [tutors,students,curricula,subjects]=await Promise.all([
    all<User>("SELECT id,name FROM users WHERE role='tutor' AND status!='suspended' ORDER BY name"),
    all<User>("SELECT id,name FROM users WHERE role='student' AND status!='suspended' ORDER BY name"),
    all<Curriculum>("SELECT id,name,audience,category FROM curricula WHERE status='active' ORDER BY name"),
    all<Subject>("SELECT id,curriculum_id,name,grades_json FROM curriculum_subjects WHERE status='active' ORDER BY name"),
  ]);
  return <LmsShell profile={profile} activeRole="admin" activePath="/dashboard/admin/courses" eyebrow="Guided course builder" title="Create a course" subtitle="Choose curriculum, subject and grade first; then build the classroom chapter by chapter." actions={<a className="module-link secondary" href="/dashboard/admin/courses">← All courses</a>}><Notice params={await searchParams}/><div className="form-page"><section className="form-card"><CourseStartForm mode="admin" curricula={curricula} subjects={subjects} tutors={tutors} students={students}/></section><aside className="help-card"><h3>Simple, governed setup</h3><p>Curriculum names, subjects and grades are managed centrally. Admin-created courses stay protected from tutor edits, even when a tutor is assigned to teach them.</p><a href="/dashboard/admin/curriculum">Manage curricula & subjects →</a></aside></div></LmsShell>;
}
