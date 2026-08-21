import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, ensureProfile } from "@/db/lms";
import { env } from "@/lib/platform-env";
import { NextResponse } from "next/server";

type Resource={r2_key:string;file_name:string;content_type:string;tutor_id:string;course_id:string};

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const identity=await getChatGPTUser();
  if(!identity)return NextResponse.json({error:"Authentication required"},{status:401});
  const profile=await ensureProfile(identity); const {id}=await params; const db=database();
  const resource=await db.prepare(`SELECT r.r2_key,r.file_name,r.content_type,l.tutor_id,l.course_id FROM lesson_resources r JOIN lessons l ON l.id=r.lesson_id WHERE r.id=?`).bind(id).first<Resource>();
  if(!resource)return NextResponse.json({error:"Resource not found"},{status:404});
  let authorised=profile.role==='admin'||(profile.role==='tutor'&&profile.id===resource.tutor_id);
  if(profile.role==='student')authorised=Boolean(await db.prepare("SELECT id FROM enrollments WHERE course_id=? AND student_id=?").bind(resource.course_id,profile.id).first());
  if(!authorised)return NextResponse.json({error:"Access denied"},{status:403});
  const object=await env.FILES.get(resource.r2_key);
  if(!object)return NextResponse.json({error:"File unavailable"},{status:404});
  const safeName=resource.file_name.replace(/["\r\n]/g,"_");
  const download=new URL(request.url).searchParams.get("download")==="1",canPreview=/^(image\/|audio\/|video\/|text\/)|application\/pdf$/i.test(resource.content_type),disposition=download||!canPreview?'attachment':'inline';
  return new Response(object.body,{headers:{"Content-Type":resource.content_type||"application/octet-stream","Content-Disposition":`${disposition}; filename="${safeName}"`,"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
}
