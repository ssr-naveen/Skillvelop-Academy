import { all } from "@/db/lms";
import { CheckCircle2, XCircle } from "lucide-react";
import Image from "next/image";
import { LmsShell, Notice, Status } from "../../components";
import MathText from "../../MathText";
import { MathFormField } from "../../MathComposer";
import { requireRole } from "../../auth";
import MatchingQuestion from "./MatchingQuestion";
import OrderQuestion from "./OrderQuestion";

type Quiz={id:string;title:string;description:string;question_count:number;attempts:number;best:number|null};
type Question={id:string;quiz_id:string;type:string;prompt:string;options_json:string;answer_json:string;points:number;position:number;image_file_name:string};
type Attempt={id:string;quiz_id:string;answers_json:string;score:number;max_score:number;submitted_at:string};
export const dynamic="force-dynamic";

function parseAnswer(value:string){try{return String(JSON.parse(value));}catch{return value;}}
function normalized(value:string){return value.toLowerCase().replace(/\s*\|\s*/g,"|").replace(/\s*=\s*/g,"=");}

export default async function Page({searchParams}:{searchParams:Promise<Record<string,string|undefined>>}){
  const profile=await requireRole("student","/dashboard/student/quizzes"),studentId=profile.role==="admin"?"usr_demo_student":profile.id,params=await searchParams,tab=params.tab==="completed"?"completed":"new";
  const [quizzes,questions,attempts]=await Promise.all([
    all<Quiz>(`SELECT q.id,q.title,q.description,q.question_count,COUNT(DISTINCT qa.id) attempts,MAX(CASE WHEN qa.max_score>0 THEN ROUND(qa.score*100.0/qa.max_score) END) best
      FROM quizzes q JOIN quiz_questions qq ON qq.quiz_id=q.id LEFT JOIN quiz_attempts qa ON qa.quiz_id=q.id AND qa.student_id=?
      WHERE q.scope='standalone' AND q.status='published' AND q.is_unlocked=1
        AND EXISTS(SELECT 1 FROM quiz_assignments a WHERE a.quiz_id=q.id AND a.status='active' AND (a.student_id=? OR a.student_id IS NULL))
      GROUP BY q.id HAVING COUNT(DISTINCT qq.id)=q.question_count ORDER BY q.created_at DESC`,studentId,studentId),
    all<Question>(`SELECT qq.id,qq.quiz_id,qq.type,qq.prompt,qq.options_json,qq.answer_json,qq.points,qq.position,qq.image_file_name
      FROM quiz_questions qq JOIN quizzes q ON q.id=qq.quiz_id WHERE q.scope='standalone' AND q.status='published'
        AND EXISTS(SELECT 1 FROM quiz_assignments a WHERE a.quiz_id=q.id AND a.status='active' AND (a.student_id=? OR a.student_id IS NULL))
      ORDER BY qq.quiz_id,qq.position`,studentId),
    all<Attempt>(`SELECT qa.id,qa.quiz_id,qa.answers_json,qa.score,qa.max_score,qa.submitted_at FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id
      WHERE qa.student_id=? AND q.scope='standalone' ORDER BY qa.submitted_at DESC`,studentId),
  ]);
  const latest=new Map<string,Attempt>();for(const attempt of attempts)if(!latest.has(attempt.quiz_id))latest.set(attempt.quiz_id,attempt);
  const visible=quizzes.filter(quiz=>tab==="completed"?latest.has(quiz.id):!latest.has(quiz.id));
  return <LmsShell profile={profile} activeRole="student" activePath="/dashboard/student/quizzes" eyebrow="Independent challenges" title="My quizzes" subtitle="New tutor-assigned quizzes are separate from the passing checks inside your courses.">
    <Notice params={params}/>
    <nav className="quiz-tabs" aria-label="Quiz status"><a className={tab==="new"?"active":""} href="/dashboard/student/quizzes?tab=new">New <span>{quizzes.filter(quiz=>!latest.has(quiz.id)).length}</span></a><a className={tab==="completed"?"active":""} href="/dashboard/student/quizzes?tab=completed">Completed <span>{quizzes.filter(quiz=>latest.has(quiz.id)).length}</span></a></nav>
    <div className="quiz-student-stack">{visible.map(quiz=>{const quizQuestions=questions.filter(question=>question.quiz_id===quiz.id),attempt=latest.get(quiz.id);let submittedAnswers:Record<string,string>={};if(attempt){try{submittedAnswers=JSON.parse(attempt.answers_json) as Record<string,string>;}catch{submittedAnswers={};}}
      return <article className="quiz-play-card" id={`quiz-${quiz.id}`} key={quiz.id}><header><div><span>{attempt?<CheckCircle2 size={21}/>:"?"}</span><div><small>{quiz.question_count} QUESTIONS · STANDALONE QUIZ</small><h2>{quiz.title}</h2><p>{quiz.description}</p></div></div>{attempt?<Status>{attempt.max_score?Math.round(attempt.score*100/attempt.max_score):0}%</Status>:<Status tone="blue">New</Status>}</header>
        {attempt?<section className="quiz-answer-review"><div className="quiz-result-summary"><strong>{attempt.score} of {attempt.max_score} points</strong><span>Completed {new Intl.DateTimeFormat("en-IN",{dateStyle:"medium",timeStyle:"short"}).format(new Date(attempt.submitted_at))}</span></div>{quizQuestions.map((question,index)=>{const given=submittedAnswers[question.id]??"",correct=parseAnswer(question.answer_json),isCorrect=normalized(given)===normalized(correct);return <article className={isCorrect?"answer-review-card correct":"answer-review-card incorrect"} key={question.id}><header><span>{isCorrect?<CheckCircle2 size={18}/>:<XCircle size={18}/>}</span><div><small>QUESTION {index+1}</small><MathText text={question.prompt}/></div><strong>{isCorrect?"Correct":"Incorrect"}</strong></header><div><span>Your answer</span><MathText text={given||"No answer"}/></div>{!isCorrect?<div className="correct-answer"><span>Correct answer</span><MathText text={correct}/></div>:null}</article>})}</section>
        :<form action="/api/lms" method="post"><input type="hidden" name="action" value="submit-quiz"/><input type="hidden" name="quizId" value={quiz.id}/>{quizQuestions.map((question,index)=>{const options=JSON.parse(question.options_json||"[]") as string[];return <section className={`question-card ${question.type}`} key={question.id}><div className="question-heading"><span className="question-index">{index+1}</span><div><small>{question.points} POINTS · {question.type.replaceAll("_"," ")}</small><MathText className="question-prompt" text={question.prompt}/></div></div>{question.image_file_name?<Image className="question-media" src={`/api/quiz-media/${question.id}`} alt={`Visual for question ${index+1}`} width={900} height={500} unoptimized/>:null}{question.type==="mcq"?<div className="choice-grid">{options.map((option,optionIndex)=><label className="choice" key={`${option}-${optionIndex}`}><input type="radio" name={`answer_${question.id}`} value={option} required/><span><b>{String.fromCharCode(65+optionIndex)}</b><MathText text={option}/></span></label>)}</div>:question.type==="matching"?<MatchingQuestion name={`answer_${question.id}`} items={options}/>:question.type==="order"||question.type==="drag_drop"?<OrderQuestion name={`answer_${question.id}`} items={options}/>:<MathFormField name={`answer_${question.id}`} compact required placeholder={question.type==="fill_blank"?"Complete the blank with text or maths":"Type your answer or equation"}/>}</section>})}<button className="quiz-submit">Submit quiz →</button></form>}
      </article>;
    })}{visible.length===0?<section className="panel empty-state"><span>{tab==="new"?"✓":"?"}</span><strong>{tab==="new"?"You are all caught up":"No completed quizzes yet"}</strong><p>{tab==="new"?"New standalone quizzes assigned by your tutor will appear here.":"Your submitted standalone quizzes and answer reviews will appear here."}</p></section>:null}</div>
  </LmsShell>;
}
