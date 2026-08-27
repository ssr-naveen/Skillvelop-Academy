import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, ensureProfile } from "@/db/lms";
import { env } from "@/lib/platform-env";
import { NextResponse } from "next/server";

type QuestionResource = {
  image_r2_key: string;
  image_file_name: string;
  image_content_type: string;
  resource_type: string;
  tutor_id: string;
  course_id: string | null;
  scope: string;
  status: string;
  quiz_unlocked: number;
  course_unlocked: number | null;
  chapter_unlocked: number | null;
};

function contentDisposition(fileName:string,download:boolean){
  const safe=fileName.replace(/["\r\n]/g,"_");
  return `${download?"attachment":"inline"}; filename="${safe}"; filename*=UTF-8''${encodeURIComponent(fileName)}`;
}

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const profile = await ensureProfile(identity);const { id } = await params;const db = database();
  const resource = await db.prepare(`SELECT qq.image_r2_key,qq.image_file_name,qq.image_content_type,qq.resource_type,q.tutor_id,q.course_id,q.scope,q.status,q.is_unlocked quiz_unlocked,c.is_unlocked course_unlocked,ch.is_unlocked chapter_unlocked
    FROM quiz_questions qq
    JOIN quizzes q ON q.id=qq.quiz_id
    LEFT JOIN courses c ON c.id=q.course_id
    LEFT JOIN chapters ch ON ch.id=q.chapter_id
    WHERE qq.id=?`).bind(id).first<QuestionResource>();
  if (!resource?.image_r2_key) return NextResponse.json({ error: "Question resource not found" }, { status: 404 });

  let authorised = profile.role === "admin" || (profile.role === "tutor" && profile.id === resource.tutor_id);
  if(profile.role === "student" && resource.status === "published" && resource.quiz_unlocked){
    if(resource.scope === "standalone")authorised=Boolean(await db.prepare("SELECT id FROM quiz_assignments WHERE quiz_id=(SELECT quiz_id FROM quiz_questions WHERE id=?) AND status='active' AND (student_id=? OR student_id IS NULL)").bind(id,profile.id).first());
    else if(resource.course_id&&resource.course_unlocked&&(resource.chapter_unlocked===null||resource.chapter_unlocked))authorised=Boolean(await db.prepare("SELECT id FROM enrollments WHERE course_id=? AND student_id=?").bind(resource.course_id,profile.id).first());
  }
  if (!authorised) return NextResponse.json({ error: "Access denied" }, { status: 403 });
  const object = await env.FILES.get(resource.image_r2_key);
  if (!object) return NextResponse.json({ error: "Question resource unavailable" }, { status: 404 });
  const download=new URL(request.url).searchParams.get("download")==="1";
  return new Response(object.body, { headers: {
    "Content-Type": resource.image_content_type || "application/octet-stream",
    "Content-Disposition": contentDisposition(resource.image_file_name,download),
    "Cache-Control": "private, max-age=300",
    "X-Content-Type-Options": "nosniff",
  }});
}
