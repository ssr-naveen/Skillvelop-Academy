import { database } from "@/db/lms";
import { env } from "@/lib/platform-env";

export async function GET(_:Request,{params}:{params:Promise<{publicId:string}>}){
  const {publicId}=await params;const row=await database().prepare("SELECT p.avatar_r2_key,p.avatar_content_type FROM users u JOIN user_profiles p ON p.user_id=u.id WHERE u.public_id=? AND u.role='tutor' AND u.status='active' AND p.is_public=1 AND p.avatar_r2_key!=''").bind(publicId).first<{avatar_r2_key:string;avatar_content_type:string}>();
  if(!row)return new Response("Not found",{status:404});const object=await env.FILES.get(row.avatar_r2_key);if(!object)return new Response("Not found",{status:404});return new Response(object.body,{headers:{"Content-Type":row.avatar_content_type||"image/jpeg","Cache-Control":"public, max-age=3600, stale-while-revalidate=86400"}});
}
