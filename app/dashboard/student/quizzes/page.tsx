import { all } from "@/db/lms";
import Image from "next/image";
import { LmsShell, Notice, Status } from "../../components";
import MathText from "../../MathText";
import { MathFormField } from "../../MathComposer";
import { requireRole } from "../../auth";
import MatchingQuestion from "./MatchingQuestion";
import OrderQuestion from "./OrderQuestion";

type Q = { id: string; title: string; description: string; kind: string; attempt_limit: number; course: string; chapter: string | null; attempts: number; best: number | null };
type Question = { id: string; quiz_id: string; type: string; prompt: string; options_json: string; points: number; position: number; image_file_name: string };
export const dynamic = "force-dynamic";

export default async function Page({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const profile = await requireRole("student", "/dashboard/student/quizzes");
  const studentId = profile.role === "admin" ? "usr_demo_student" : profile.id;
  const quizzes = await all<Q>(`SELECT q.id,q.title,q.description,q.kind,q.attempt_limit,c.title course,ch.title chapter,COUNT(qa.id) attempts,MAX(CASE WHEN qa.max_score>0 THEN ROUND(qa.score*100.0/qa.max_score) END) best FROM quizzes q JOIN courses c ON c.id=q.course_id JOIN enrollments e ON e.course_id=q.course_id AND e.student_id=? LEFT JOIN chapters ch ON ch.id=q.chapter_id LEFT JOIN quiz_attempts qa ON qa.quiz_id=q.id AND qa.student_id=? WHERE q.status='published' AND q.is_unlocked=1 AND c.is_unlocked=1 AND (q.chapter_id IS NULL OR ch.is_unlocked=1) GROUP BY q.id`, studentId, studentId);
  const questions = await all<Question>(`SELECT qq.id,qq.quiz_id,qq.type,qq.prompt,qq.options_json,qq.points,qq.position,qq.image_file_name FROM quiz_questions qq JOIN quizzes q ON q.id=qq.quiz_id JOIN courses c ON c.id=q.course_id JOIN enrollments e ON e.course_id=q.course_id AND e.student_id=? LEFT JOIN chapters ch ON ch.id=q.chapter_id WHERE q.is_unlocked=1 AND c.is_unlocked=1 AND (q.chapter_id IS NULL OR ch.is_unlocked=1) ORDER BY qq.quiz_id,qq.position`, studentId);
  return <LmsShell profile={profile} activeRole="student" activePath="/dashboard/student/quizzes" eyebrow="Unlocked challenges" title="Quizzes & assessments" subtitle="Complete interactive checks released by your tutor. Assessment and final assessment scores are permanently recorded.">
    <Notice params={await searchParams} />
    <div className="quiz-student-stack">{quizzes.map(quiz => {
      const locked = (quiz.kind !== "quiz" && quiz.attempts >= 1) || quiz.attempts >= quiz.attempt_limit;
      const quizQuestions = questions.filter(question => question.quiz_id === quiz.id);
      return <article className="quiz-play-card" id={`quiz-${quiz.id}`} key={quiz.id}><header><div><span>{quiz.kind === "quiz" ? "?" : "◆"}</span><div><small>{quiz.kind.replaceAll("_", " ")} · {quiz.course} · {quiz.chapter ?? "Course level"}</small><h2>{quiz.title}</h2><p>{quiz.description}</p></div></div>{quiz.best !== null ? <Status>{quiz.best}% best</Status> : <Status tone="blue">New</Status>}</header>{locked ? <div className="quiz-locked"><strong>Attempt complete</strong><p>Your recorded result is shown above.</p></div> : quizQuestions.length === 0 ? <div className="quiz-locked"><strong>Questions coming soon</strong></div> : <form action="/api/lms" method="post"><input type="hidden" name="action" value="submit-quiz" /><input type="hidden" name="quizId" value={quiz.id} />{quizQuestions.map((question, index) => {
        const options = JSON.parse(question.options_json || "[]") as string[];
        return <section className={`question-card ${question.type}`} key={question.id}><div className="question-heading"><span className="question-index">{index + 1}</span><div><small>{question.points} XP · {question.type.replaceAll("_", " ")}</small><MathText className="question-prompt" text={question.prompt} /></div></div>{question.image_file_name && <Image className="question-media" src={`/api/quiz-media/${question.id}`} alt={`Visual for question ${index + 1}`} width={900} height={500} unoptimized />}{question.type === "mcq" ? <div className="choice-grid">{options.map((option, optionIndex) => <label className="choice" key={`${option}-${optionIndex}`}><input type="radio" name={`answer_${question.id}`} value={option} required /><span><b>{String.fromCharCode(65 + optionIndex)}</b><MathText text={option} /></span></label>)}</div> : question.type === "matching" ? <MatchingQuestion name={`answer_${question.id}`} items={options} /> : question.type === "order" || question.type === "drag_drop" ? <OrderQuestion name={`answer_${question.id}`} items={options} /> : <MathFormField name={`answer_${question.id}`} compact required placeholder={question.type === "fill_blank" ? "Complete the blank with text or maths" : "Type your answer or equation"}/>}</section>;
      })}<button className="quiz-submit">Submit recorded attempt →</button></form>}</article>;
    })}</div>
  </LmsShell>;
}
