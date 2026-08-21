import { redirect } from "next/navigation";

export const dynamic="force-dynamic";

export default async function LegacyLessonRoute({params}:{params:Promise<{courseId:string;lessonId:string}>}){
  const {courseId,lessonId}=await params;
  redirect(`/dashboard/student/curriculum/${encodeURIComponent(courseId)}/learn/lesson/${encodeURIComponent(lessonId)}`);
}
