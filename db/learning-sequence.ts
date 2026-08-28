import { database } from "./lms";

export type LearningItemType = "lesson" | "quiz" | "activity";
export type LearningItem = {
  id: string;
  type: LearningItemType;
  courseId: string;
  chapterId: string | null;
  chapterTitle: string;
  chapterPosition: number;
  title: string;
  summary: string;
  label: string;
  position: number;
  tutorUnlocked: boolean;
  completed: boolean;
  available: boolean;
  passed: boolean | null;
};

type LessonRow = { id:string;course_id:string;chapter_id:string|null;chapter_title:string|null;chapter_position:number|null;chapter_unlocked:number|null;title:string;summary:string;position:number;is_unlocked:number;completed_at:string|null };
type QuizRow = { id:string;course_id:string;chapter_id:string|null;chapter_title:string|null;chapter_position:number|null;chapter_unlocked:number|null;title:string;description:string;kind:string;is_unlocked:number;attempts:number;passing_percentage:number;best:number|null };
type ActivityRow = { id:string;course_id:string;chapter_id:string|null;chapter_title:string|null;chapter_position:number|null;chapter_unlocked:number|null;title:string;instructions:string;type:string;is_unlocked:number;submission_id:string|null };

export async function loadLearningSequence(courseId: string, studentId: string) {
  const db = database();
  const [course, lessonResult, quizResult, activityResult] = await Promise.all([
    db.prepare("SELECT course_mode FROM courses WHERE id=?").bind(courseId).first<{course_mode:string}>(),
    db.prepare(`SELECT l.id,l.course_id,l.chapter_id,ch.title chapter_title,ch.position chapter_position,ch.is_unlocked chapter_unlocked,l.title,l.summary,l.position,l.is_unlocked,lp.completed_at FROM lessons l LEFT JOIN chapters ch ON ch.id=l.chapter_id LEFT JOIN lesson_progress lp ON lp.lesson_id=l.id AND lp.student_id=? WHERE l.course_id=? AND l.status='published'`).bind(studentId,courseId).all<LessonRow>(),
    db.prepare(`SELECT q.id,q.course_id,q.chapter_id,ch.title chapter_title,ch.position chapter_position,ch.is_unlocked chapter_unlocked,q.title,q.description,q.kind,q.is_unlocked,q.passing_percentage,COUNT(qa.id) attempts,MAX(CASE WHEN qa.max_score>0 THEN ROUND(qa.score*100.0/qa.max_score) END) best FROM quizzes q LEFT JOIN chapters ch ON ch.id=q.chapter_id LEFT JOIN quiz_attempts qa ON qa.quiz_id=q.id AND qa.student_id=? WHERE q.course_id=? AND q.status='published' GROUP BY q.id`).bind(studentId,courseId).all<QuizRow>(),
    db.prepare(`SELECT a.id,a.course_id,a.chapter_id,ch.title chapter_title,ch.position chapter_position,ch.is_unlocked chapter_unlocked,a.title,a.instructions,a.type,a.is_unlocked,s.id submission_id FROM activities a LEFT JOIN chapters ch ON ch.id=a.chapter_id LEFT JOIN submissions s ON s.activity_id=a.id AND s.student_id=? WHERE a.course_id=? AND a.status='published'`).bind(studentId,courseId).all<ActivityRow>(),
  ]);
  const items: LearningItem[] = [
    ...lessonResult.results.map(row => ({ id:row.id,type:"lesson" as const,courseId:row.course_id,chapterId:row.chapter_id,chapterTitle:row.chapter_title??"Course introduction",chapterPosition:row.chapter_position??0,title:row.title,summary:row.summary,label:`Lesson ${row.position}`,position:10+row.position,tutorUnlocked:Boolean(row.is_unlocked&&(!row.chapter_id||row.chapter_unlocked)),completed:Boolean(row.completed_at),available:false,passed:null })),
    ...quizResult.results.map(row => {const passed=row.best!==null&&Number(row.best)>=row.passing_percentage,completed=row.kind==="quiz"?row.attempts>0:passed;return { id:row.id,type:"quiz" as const,courseId:row.course_id,chapterId:row.chapter_id,chapterTitle:row.chapter_title??"Course checks",chapterPosition:row.chapter_position??0,title:row.title,summary:row.description,label:row.kind==="quiz"?"Practice quiz":row.kind==="assessment"?"Assessment":"Final assessment",position:row.kind==="quiz"?100:row.kind==="assessment"?400:500,tutorUnlocked:Boolean(row.is_unlocked&&(!row.chapter_id||row.chapter_unlocked)),completed,available:false,passed:row.attempts?passed:null }}),
    ...activityResult.results.map(row => ({ id:row.id,type:"activity" as const,courseId:row.course_id,chapterId:row.chapter_id,chapterTitle:row.chapter_title??"Course work",chapterPosition:row.chapter_position??0,title:row.title,summary:row.instructions,label:row.type.replaceAll("_"," "),position:row.type==="assessment"?300:200,tutorUnlocked:Boolean(row.is_unlocked&&(!row.chapter_id||row.chapter_unlocked)),completed:Boolean(row.submission_id),available:false,passed:null })),
  ].sort((a,b) => a.chapterPosition-b.chapterPosition || a.position-b.position || a.title.localeCompare(b.title));
  if(course?.course_mode!=="self_paced")return items.map(item => ({ ...item, available: item.tutorUnlocked }));
  let prerequisiteComplete=true;
  return items.map(item=>{const available=item.completed||prerequisiteComplete;prerequisiteComplete=prerequisiteComplete&&item.completed;return {...item,available,tutorUnlocked:true};});
}

export function learningItemHref(item: Pick<LearningItem,"courseId"|"type"|"id">) {
  return `/dashboard/student/curriculum/${encodeURIComponent(item.courseId)}/learn/${item.type}/${encodeURIComponent(item.id)}`;
}

