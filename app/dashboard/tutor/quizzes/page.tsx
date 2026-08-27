import { all } from "@/db/lms";
import { LmsShell, Notice, Status } from "../../components";
import DeleteButton from "../../DeleteButton";
import { requireRole } from "../../auth";
import QuizQuestionBuilder from "./QuizQuestionBuilder";

type Student={id:string;name:string};
type Quiz={id:string;title:string;description:string;question_count:number;questions:number;attempts:number;assignments:number;is_unlocked:number};
type Assignment={id:string;quiz_id:string;student_id:string|null;student:string|null;assigned_at:string};
export const dynamic="force-dynamic";

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("tutor","/dashboard/tutor/quizzes"),tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;
  const [students,quizzes,assignments]=await Promise.all([
    all<Student>("SELECT id,name FROM users WHERE role='student' AND status='active' ORDER BY name"),
    all<Quiz>(`SELECT q.id,q.title,q.description,q.question_count,q.is_unlocked,COUNT(DISTINCT qq.id) questions,COUNT(DISTINCT qa.id) attempts,COUNT(DISTINCT qas.id) assignments
      FROM quizzes q LEFT JOIN quiz_questions qq ON qq.quiz_id=q.id LEFT JOIN quiz_attempts qa ON qa.quiz_id=q.id
      LEFT JOIN quiz_assignments qas ON qas.quiz_id=q.id AND qas.status='active'
      WHERE q.tutor_id=? AND q.scope='standalone' AND q.status='published'
      GROUP BY q.id ORDER BY q.created_at DESC`,tutorId),
    all<Assignment>(`SELECT a.id,a.quiz_id,a.student_id,u.name student,a.assigned_at FROM quiz_assignments a JOIN quizzes q ON q.id=a.quiz_id LEFT JOIN users u ON u.id=a.student_id WHERE q.tutor_id=? AND q.scope='standalone' AND a.status='active' ORDER BY a.assigned_at DESC`,tutorId),
  ]);
  return <LmsShell profile={profile} activeRole="tutor" activePath="/dashboard/tutor/quizzes" eyebrow="Independent learner checks" title="Standalone quizzes" subtitle="Create named quizzes outside courses, choose an exact question count, and assign each quiz to one learner or everyone.">
    <Notice params={await searchParams}/>
    <div className="quiz-maker-intro"><div><span>STANDALONE QUIZ WORKFLOW</span><h2>Build, complete, then assign</h2><p>Course quizzes stay inside the course builder. Only independent quizzes appear here.</p></div><ol><li><b>1</b>Name the quiz</li><li><b>2</b>Add the exact question count</li><li><b>3</b>Assign to a student or everyone</li></ol></div>
    <div className="quiz-builder-grid">
      <section className="panel quiz-structure-panel"><div className="panel-head"><div><span className="panel-kicker">YOUR STANDALONE QUIZZES</span><h2>Quiz assignments</h2></div><Status>{quizzes.length} quizzes</Status></div>
        {quizzes.length?quizzes.map(quiz=>{const complete=quiz.questions===quiz.question_count,quizAssignments=assignments.filter(item=>item.quiz_id===quiz.id);return <details className="quiz-admin-card" id={`quiz-${quiz.id}`} key={quiz.id}><summary><div><small>INDEPENDENT QUIZ</small><h3>{quiz.title}</h3><p>{quiz.description}</p><div className="quiz-summary-stats"><span>{quiz.questions} / {quiz.question_count} questions</span><span>{quiz.attempts} completed</span><span>{quiz.assignments} active assignments</span></div></div><Status tone={complete?"green":"amber"}>{complete?"Ready to assign":"Building"}</Status></summary>
          <section className="standalone-quiz-controls"><header><div><small>QUESTION PROGRESS</small><strong>{quiz.questions} of {quiz.question_count} complete</strong></div><progress max={quiz.question_count} value={quiz.questions}/></header>
            {complete?<div className="quiz-assignment-tools"><div><h4>Assign this quiz</h4><p>Every assignment is independent of course enrolments.</p></div><form action="/api/lms" method="post"><input type="hidden" name="action" value="assign-quiz"/><input type="hidden" name="quizId" value={quiz.id}/><input type="hidden" name="target" value="all"/><button>Assign to all students</button></form><form action="/api/lms" method="post"><input type="hidden" name="action" value="assign-quiz"/><input type="hidden" name="quizId" value={quiz.id}/><input type="hidden" name="target" value="student"/><select name="studentId" required><option value="">Choose one student…</option>{students.map(student=><option value={student.id} key={student.id}>{student.name}</option>)}</select><button>Assign student</button></form></div>:<QuizQuestionBuilder quizId={quiz.id} nextPosition={quiz.questions+1} targetCount={quiz.question_count}/>}
            {quizAssignments.length?<div className="active-quiz-assignments"><h4>Active assignments</h4>{quizAssignments.map(item=><article key={item.id}><span><strong>{item.student_id?item.student:"All students"}</strong><small>Assigned {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium"}).format(new Date(item.assigned_at))}</small></span><form action="/api/lms" method="post"><input type="hidden" name="action" value="revoke-quiz"/><input type="hidden" name="assignmentId" value={item.id}/><button>Revoke</button></form></article>)}</div>:null}
            <DeleteButton action="delete-quiz" id={quiz.id} name="quizId" label={`quiz “${quiz.title}”`}/>
          </section>
        </details>}):<div className="empty-module"><h3>No standalone quizzes yet</h3><p>Create the first independent learner quiz using the setup panel.</p></div>}
      </section>
      <aside className="form-card sticky-builder quiz-setup-card"><form action="/api/lms" method="post"><input type="hidden" name="action" value="create-quiz"/><input type="hidden" name="scope" value="standalone"/><span className="panel-kicker">NEW STANDALONE QUIZ</span><h2>Create a named quiz</h2><p>It remains unassigned until every required question has been added.</p><label>Quiz name<input name="title" required maxLength={180} placeholder="Fractions speed check"/></label><label>Student instructions<textarea name="description" rows={4} required placeholder="Explain what this quiz checks and how to complete it."/></label><label>Number of questions<select name="questionCount" defaultValue="5"><option value="5">5 questions</option><option value="10">10 questions</option><option value="15">15 questions</option><option value="20">20 questions</option><option value="25">25 questions</option></select></label><button>Create quiz & add questions →</button></form></aside>
    </div>
  </LmsShell>;
}
