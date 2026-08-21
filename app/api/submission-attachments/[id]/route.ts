import { getChatGPTUser } from "@/app/chatgpt-auth";
import { database, ensureProfile } from "@/db/lms";
import { env } from "@/lib/platform-env";
import { NextResponse } from "next/server";

type Attachment={r2_key:string;file_name:string;content_type:string;student_id:string;tutor_id:string};

export async function GET(request:Request,{params}:{params:Promise<{id:string}>}){
  const identity=await getChatGPTUser();if(!identity)return NextResponse.json({error:"Authentication required"},{status:401});
  const profile=await ensureProfile(identity),{id}=await params,db=database();
  const attachment=await db.prepare(`SELECT sa.r2_key,sa.file_name,sa.content_type,sa.student_id,a.tutor_id FROM submission_attachments sa JOIN submissions s ON s.id=sa.submission_id JOIN activities a ON a.id=s.activity_id WHERE sa.id=?`).bind(id).first<Attachment>();
  if(!attachment)return NextResponse.json({error:"Attachment not found"},{status:404});
  const authorised=profile.role==="admin"||(profile.role==="student"&&profile.id===attachment.student_id)||(profile.role==="tutor"&&profile.id===attachment.tutor_id);
  if(!authorised)return NextResponse.json({error:"Access denied"},{status:403});
  const object=await env.FILES.get(attachment.r2_key);if(!object)return NextResponse.json({error:"File unavailable"},{status:404});
  const safeName=attachment.file_name.replace(/["\r\n]/g,"_"),download=new URL(request.url).searchParams.get("download")==="1";
  const canPreview=/^(image\/|audio\/|video\/|text\/)|application\/pdf$/i.test(attachment.content_type);
  return new Response(object.body,{headers:{"Content-Type":attachment.content_type||"application/octet-stream","Content-Disposition":`${download||!canPreview?"attachment":"inline"}; filename="${safeName}"`,"Cache-Control":"private, max-age=300","X-Content-Type-Options":"nosniff"}});
}
