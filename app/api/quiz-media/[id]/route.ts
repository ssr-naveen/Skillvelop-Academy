import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, ensureProfile } from "@/db/lms";
import { env } from "@/lib/platform-env";
import { NextResponse } from "next/server";

type QuestionMedia = { image_r2_key: string; image_file_name: string; image_content_type: string; tutor_id: string; course_id: string; quiz_unlocked: number; course_unlocked: number; chapter_unlocked: number | null };

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const profile = await ensureProfile(identity); const { id } = await params; const db = database();
  const media = await db.prepare(`SELECT qq.image_r2_key,qq.image_file_name,qq.image_content_type,q.tutor_id,q.course_id,q.is_unlocked quiz_unlocked,c.is_unlocked course_unlocked,ch.is_unlocked chapter_unlocked FROM quiz_questions qq JOIN quizzes q ON q.id=qq.quiz_id JOIN courses c ON c.id=q.course_id LEFT JOIN chapters ch ON ch.id=q.chapter_id WHERE qq.id=?`).bind(id).first<QuestionMedia>();
  if (!media?.image_r2_key) return NextResponse.json({ error: "Image not found" }, { status: 404 });
  let authorised = profile.role === "admin" || (profile.role === "tutor" && profile.id === media.tutor_id);
  if (profile.role === "student" && media.quiz_unlocked && media.course_unlocked && (media.chapter_unlocked === null || media.chapter_unlocked)) authorised = Boolean(await db.prepare("SELECT id FROM enrollments WHERE course_id=? AND student_id=?").bind(media.course_id, profile.id).first());
  if (!authorised) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const object = await env.FILES.get(media.image_r2_key);
  if (!object) return NextResponse.json({ error: "Image unavailable" }, { status: 404 });
  return new Response(object.body, { headers: { "Content-Type": media.image_content_type || "application/octet-stream", "Content-Disposition": `inline; filename="${media.image_file_name.replace(/["\r\n]/g, "_")}"`, "Cache-Control": "private, max-age=300" } });
}
