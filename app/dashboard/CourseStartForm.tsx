"use client";

import { useState } from "react";
import { BookOpenCheck, ChevronRight, Layers3 } from "lucide-react";

type Curriculum={id:string;name:string;audience:string;category:string};
type Subject={id:string;curriculum_id:string;name:string;grades_json:string};
type Person={id:string;name:string};

export default function CourseStartForm({mode,curricula,subjects,tutors=[],students=[]}:{mode:"admin"|"tutor";curricula:Curriculum[];subjects:Subject[];tutors?:Person[];students?:Person[]}){
  const [curriculumId,setCurriculumId]=useState("");const [subjectId,setSubjectId]=useState("");const [grade,setGrade]=useState("");
  const curriculumSubjects=subjects.filter(item=>item.curriculum_id===curriculumId);
  const grades=Array.from(new Set(curriculumSubjects.flatMap(item=>{try{return JSON.parse(item.grades_json)as string[];}catch{return [];}})));
  const availableSubjects=curriculumSubjects.filter(item=>{try{return (JSON.parse(item.grades_json)as string[]).includes(grade);}catch{return false;}}),selected=availableSubjects.find(item=>item.id===subjectId);
  const ready=Boolean(curriculumId&&subjectId&&grade);
  return <form action="/api/lms" method="post" className="guided-course-form">
    <input type="hidden" name="action" value={mode==="admin"?"create-course":"create-tutor-course"}/>
    <header><span><Layers3 size={20}/></span><div><small>GUIDED COURSE SETUP</small><h2>Start with the learning structure</h2><p>Select the curriculum, grade and subject. Chapters and classroom materials come next.</p></div></header>
    <ol className="course-setup-steps"><li className={curriculumId?"complete":"active"}><span>1</span> Curriculum</li><li className={grade?"complete":curriculumId?"active":""}><ChevronRight size={14}/> <span>2</span> Grade</li><li className={subjectId?"complete":grade?"active":""}><ChevronRight size={14}/> <span>3</span> Subject</li></ol>
    <label>Curriculum<select name="curriculumId" value={curriculumId} onChange={event=>{setCurriculumId(event.target.value);setSubjectId("");setGrade("");}} required><option value="">Choose curriculum</option>{curricula.map(item=><option value={item.id} key={item.id}>{item.name} · {item.category}</option>)}</select></label>
    <label>Grade / level<select name="grade" value={grade} onChange={event=>{setGrade(event.target.value);setSubjectId("");}} required disabled={!curriculumId}><option value="">{curriculumId?"Choose grade or level":"Select curriculum first"}</option>{grades.map(item=><option value={item} key={item}>{item}</option>)}</select></label>
    <label>Subject<select name="subjectId" value={subjectId} onChange={event=>setSubjectId(event.target.value)} required disabled={!grade}><option value="">{grade?"Choose subject":"Select grade first"}</option>{availableSubjects.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label>
    <label>Course name <small>Optional; a clear name is generated when left blank.</small><input name="title" placeholder={ready?`${selected?.name} · ${grade}`:"e.g. Mathematics Mastery"}/></label>
    <label>Course outcomes<textarea name="description" required rows={4} placeholder="What will learners understand, practise and demonstrate by the end?"/></label>
    <div className="form-row"><label>Completion points<input name="completionPoints" type="number" min="0" max="100000" defaultValue="500"/></label><label>Course card image URL<input name="coverImageUrl" type="url" placeholder="https://…"/></label></div>
    {mode==="admin"?<><label>Assigned tutor<select name="tutorId" required><option value="">Choose tutor</option>{tutors.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select><small>The tutor can teach this course but cannot edit an admin-created source.</small></label><label>Enrol learner <small>Optional</small><select name="studentId"><option value="">Assign later</option>{students.map(item=><option value={item.id} key={item.id}>{item.name}</option>)}</select></label><div className="form-row"><label>Course audience<select name="courseAudience"><option value="student">Students</option><option value="tutor">Tutor professional development</option></select></label><label className="check-row"><input type="checkbox" name="isCatalog"/> Allow tutor import</label></div></>:null}
    <button disabled={!ready}><BookOpenCheck size={17}/> Create locked course</button>
    {!curricula.length?<p className="course-form-warning">An administrator must add at least one curriculum and subject before courses can be created.</p>:null}
  </form>;
}
