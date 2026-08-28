import { getChatGPTUser, hashPassword } from "@/app/chatgpt-auth";
import { canManage, createId, createPublicId, database, ensureProfile, type ManagerPermission } from "@/db/lms";
import { encryptProviderKey } from "@/app/api/ai/provider";
import { NextResponse } from "next/server";
import { env } from "@/lib/platform-env";
import { validTimeZone, zonedLocalToUtc } from "@/db/timezones";
import { sanitizeLessonHtml } from "@/db/lesson-content";
import { loadLearningSequence, type LearningItemType } from "@/db/learning-sequence";

function redirectTo(request: Request, path: string) { return NextResponse.redirect(new URL(path, request.url), 303); }
function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function allowed<T extends string>(input: string, options: readonly T[], fallback: T): T { return options.includes(input as T) ? input as T : fallback; }
function addMonths(value: Date, months: number) { const next = new Date(value); next.setMonth(next.getMonth() + months); return next; }
function clockMinutes(input:string){const match=input.match(/^(\d{2}):(\d{2})$/);if(!match)return -1;const hours=Number(match[1]),minutes=Number(match[2]);return hours<24&&minutes<60?hours*60+minutes:-1;}
async function studentCanOpen(courseId:string,studentId:string,type:LearningItemType,id:string){const sequence=await loadLearningSequence(courseId,studentId);return Boolean(sequence.find(item=>item.type===type&&item.id===id)?.available);}

const lessonFileExtensions = new Set(["pdf","ppt","pptx","odp","zip","doc","docx","odt","rtf","txt","csv","xls","xlsx","ods","png","jpg","jpeg","webp","gif","mp4","webm","mov","mp3","m4a","wav","ogg"]);
const assignmentFileExtensions = new Set(["pdf","ppt","pptx","odp","doc","docx","odt","rtf","txt","md","tex","csv","xls","xlsx","ods","png","jpg","jpeg","webp","gif"]);
type QuizResourceType = "none" | "image" | "pdf" | "document" | "presentation" | "iframe";
const quizResourceExtensions: Record<Exclude<QuizResourceType,"none"|"iframe">,Set<string>> = {
  image: new Set(["png","jpg","jpeg","webp","gif"]),
  pdf: new Set(["pdf"]),
  document: new Set(["doc","docx","odt","rtf"]),
  presentation: new Set(["ppt","pptx","odp"]),
};
function extension(file: File) { return file.name.split(".").pop()?.toLowerCase() ?? ""; }
function safeFileName(file: File) { return file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-180); }
function safeContentType(file:File){const types:Record<string,string>={pdf:"application/pdf",ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",odp:"application/vnd.oasis.opendocument.presentation",zip:"application/zip",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",odt:"application/vnd.oasis.opendocument.text",rtf:"application/rtf",txt:"text/plain",md:"text/markdown",tex:"text/plain",csv:"text/csv",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",ods:"application/vnd.oasis.opendocument.spreadsheet",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",mp3:"audio/mpeg",m4a:"audio/mp4",wav:"audio/wav",ogg:"audio/ogg"};return types[extension(file)]??"application/octet-stream";}
function lessonResourceType(file: File, preferred?: string) {
  if (preferred && preferred !== "html") return preferred;
  const ext=extension(file);
  if (["png","jpg","jpeg","webp","gif"].includes(ext)) return "image";
  if (["mp4","webm","mov"].includes(ext)) return "video";
  if (["mp3","m4a","wav","ogg"].includes(ext)) return "audio";
  if (ext === "zip") return "scorm";
  if (["ppt","pptx","odp"].includes(ext)) return "presentation";
  if (ext === "pdf") return "pdf";
  return "document";
}
function safeHttpsUrl(input:string){
  if(!input||input.length>2000)return "";
  try{
    const parsed=new URL(input);const host=parsed.hostname.toLowerCase().replace(/^\[|\]$/g,"");
    if(parsed.protocol!=="https:"||parsed.username||parsed.password||host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local"))return "";
    if(/^(0|10|127|169\.254|192\.168)\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host)||host==="::1"||(host.includes(":")&&(host.startsWith("fe80:")||host.startsWith("fc")||host.startsWith("fd"))))return "";
    return parsed.toString();
  }catch{return "";}
}
function contactSharingRisks(input:string){const risks:string[]=[];if(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i.test(input))risks.push("email");if(/(?:\+?\d[\d\s().-]{6,}\d)/.test(input))risks.push("phone");if(/\b(?:whats?app|telegram|instagram|snapchat)\b|(?:^|\s)@[a-z0-9._]{3,}/i.test(input))risks.push("external-contact");return [...new Set(risks)];}
async function validQuizResourceFile(file:File,type:Exclude<QuizResourceType,"none"|"iframe">){
  if(file.size<=0||file.size>4*1024*1024||!quizResourceExtensions[type].has(extension(file)))return false;
  const bytes=new Uint8Array(await file.slice(0,16).arrayBuffer());const ascii=new TextDecoder().decode(bytes);
  const zip=bytes[0]===0x50&&bytes[1]===0x4b,ole=bytes[0]===0xd0&&bytes[1]===0xcf&&bytes[2]===0x11&&bytes[3]===0xe0;
  if(type==="pdf")return ascii.startsWith("%PDF-");
  if(type==="image")return (bytes[0]===0x89&&ascii.slice(1,4)==="PNG")||(bytes[0]===0xff&&bytes[1]===0xd8&&bytes[2]===0xff)||ascii.startsWith("GIF87a")||ascii.startsWith("GIF89a")||(ascii.startsWith("RIFF")&&ascii.slice(8,12)==="WEBP");
  if(extension(file)==="rtf")return ascii.startsWith("{\\rtf");
  return ["doc","ppt"].includes(extension(file))?ole:zip;
}
async function storeLessonFile(lessonId:string,file:File,title:string,preferred?:string) {
  if (!lessonFileExtensions.has(extension(file)) || file.size<=0 || file.size>4*1024*1024) throw new Error("invalid lesson file");
  const db=database(),id=createId("res"),fileName=safeFileName(file),key=`lessons/${lessonId}/${id}-${fileName}`,contentType=safeContentType(file);
  await env.FILES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType}});
  await db.prepare("INSERT INTO lesson_resources (id,lesson_id,title,resource_type,file_name,content_type,r2_key,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,lessonId,title||file.name,lessonResourceType(file,preferred),file.name,contentType,key,file.size,new Date().toISOString()).run();
}
async function cloneCatalogCourse(sourceCourseId:string,tutorId:string){
  const db=database(),source=await db.prepare("SELECT * FROM courses WHERE id=? AND creator_role='admin' AND is_catalog=1 AND status='active'").bind(sourceCourseId).first<Record<string,unknown>>();if(!source)return null;
  const [chapters,lessons,resources,quizzes,questions,activities]=await Promise.all([
    db.prepare("SELECT * FROM chapters WHERE course_id=? ORDER BY position").bind(sourceCourseId).all<Record<string,unknown>>(),
    db.prepare("SELECT * FROM lessons WHERE course_id=? ORDER BY position").bind(sourceCourseId).all<Record<string,unknown>>(),
    db.prepare("SELECT r.* FROM lesson_resources r JOIN lessons l ON l.id=r.lesson_id WHERE l.course_id=? ORDER BY r.created_at").bind(sourceCourseId).all<Record<string,unknown>>(),
    db.prepare("SELECT * FROM quizzes WHERE course_id=? ORDER BY created_at").bind(sourceCourseId).all<Record<string,unknown>>(),
    db.prepare("SELECT qq.* FROM quiz_questions qq JOIN quizzes q ON q.id=qq.quiz_id WHERE q.course_id=? ORDER BY qq.position").bind(sourceCourseId).all<Record<string,unknown>>(),
    db.prepare("SELECT * FROM activities WHERE course_id=? ORDER BY created_at").bind(sourceCourseId).all<Record<string,unknown>>(),
  ]);
  const courseId=createId("crs"),now=new Date().toISOString(),chapterIds=new Map<string,string>(),lessonIds=new Map<string,string>(),quizIds=new Map<string,string>(),statements:D1PreparedStatement[]=[];
  statements.push(db.prepare("INSERT INTO courses (id,title,subject,level,description,cover_image_url,is_unlocked,is_imported,tutor_id,status,accent,created_at,curriculum_id,grade_level,creator_id,creator_role,source_course_id,is_catalog,course_audience,completion_points,course_mode) VALUES (?,?,?,?,?,?,0,1,?,'active',?,?,?,?,?, 'tutor',?,0,?,?,?)").bind(courseId,String(source.title),String(source.subject),String(source.level),String(source.description),String(source.cover_image_url??""),tutorId,String(source.accent??"blue"),now,source.curriculum_id??null,String(source.grade_level??source.level??""),tutorId,sourceCourseId,String(source.course_audience??"student"),Number(source.completion_points??500),String(source.course_mode??"guided")));
  for(const chapter of chapters.results){const id=createId("chp");chapterIds.set(String(chapter.id),id);statements.push(db.prepare("INSERT INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at,release_mode,drip_days) VALUES (?,?,?,?,?,?,0,?,?,?)").bind(id,courseId,tutorId,String(chapter.title),String(chapter.description??""),Number(chapter.position??1),now,String(chapter.release_mode??"free"),Number(chapter.drip_days??0)));}
  for(const lesson of lessons.results){const id=createId("les");lessonIds.set(String(lesson.id),id);statements.push(db.prepare("INSERT INTO lessons (id,course_id,chapter_id,tutor_id,title,summary,content,content_format,embed_url,video_url,position,duration_minutes,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,0,'published',?)").bind(id,courseId,chapterIds.get(String(lesson.chapter_id))??null,tutorId,String(lesson.title),String(lesson.summary),String(lesson.content),String(lesson.content_format??"html"),String(lesson.embed_url??""),String(lesson.video_url??""),Number(lesson.position??1),Number(lesson.duration_minutes??30),now));}
  for(const resource of resources.results){const lessonId=lessonIds.get(String(resource.lesson_id));if(!lessonId)continue;const id=createId("res"),fileName=String(resource.file_name),oldKey=String(resource.r2_key),newKey=`lessons/${lessonId}/${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g,"_")}`;const object=await env.FILES.get(oldKey);if(object)await env.FILES.put(newKey,object.body.buffer.slice(object.body.byteOffset,object.body.byteOffset+object.body.byteLength),{httpMetadata:{contentType:String(resource.content_type)}});statements.push(db.prepare("INSERT INTO lesson_resources (id,lesson_id,title,resource_type,file_name,content_type,r2_key,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,lessonId,String(resource.title),String(resource.resource_type),fileName,String(resource.content_type),newKey,Number(resource.size_bytes??0),now));}
  for(const quiz of quizzes.results){const id=createId("qiz");quizIds.set(String(quiz.id),id);statements.push(db.prepare("INSERT INTO quizzes (id,course_id,chapter_id,tutor_id,title,description,kind,attempt_limit,is_unlocked,status,scope,question_count,passing_percentage,created_at) VALUES (?,?,?,?,?,?,?,?,0,'published','course',?,?,?)").bind(id,courseId,chapterIds.get(String(quiz.chapter_id))??null,tutorId,String(quiz.title),String(quiz.description),String(quiz.kind??"quiz"),Number(quiz.attempt_limit??1),Number(quiz.question_count??5),Number(quiz.passing_percentage??60),now));}
  for(const question of questions.results){const quizId=quizIds.get(String(question.quiz_id));if(!quizId)continue;const id=createId("qq"),fileName=String(question.image_file_name??""),oldKey=String(question.image_r2_key??""),newKey=oldKey?`quiz-questions/${quizId}/${id}-${fileName.replace(/[^a-zA-Z0-9._-]/g,"_")}`:"";if(oldKey){const object=await env.FILES.get(oldKey);if(object)await env.FILES.put(newKey,object.body.buffer.slice(object.body.byteOffset,object.body.byteOffset+object.body.byteLength),{httpMetadata:{contentType:String(question.image_content_type)}});}statements.push(db.prepare("INSERT INTO quiz_questions (id,quiz_id,type,prompt,options_json,answer_json,points,position,image_r2_key,image_file_name,image_content_type,image_size_bytes,resource_type,resource_embed_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(id,quizId,String(question.type),String(question.prompt),String(question.options_json),String(question.answer_json),Number(question.points??1),Number(question.position??1),newKey,fileName,String(question.image_content_type??""),Number(question.image_size_bytes??0),String(question.resource_type??(oldKey?"image":"none")),String(question.resource_embed_url??"")));}
  for(const activity of activities.results)statements.push(db.prepare("INSERT INTO activities (id,course_id,chapter_id,tutor_id,title,type,instructions,due_at,points,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,0,'published',?)").bind(createId("act"),courseId,chapterIds.get(String(activity.chapter_id))??null,tutorId,String(activity.title),String(activity.type),String(activity.instructions),String(activity.due_at),Number(activity.points??100),now));
  await db.batch(statements);return courseId;
}
async function updateCourseProgress(courseId:string,studentId:string) {
  const db=database();
  const counts=await db.prepare(`SELECT
    (SELECT COUNT(*) FROM lessons WHERE course_id=? AND status='published')+(SELECT COUNT(*) FROM quizzes WHERE course_id=? AND status='published')+(SELECT COUNT(*) FROM activities WHERE course_id=? AND status='published') total,
    (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id WHERE l.course_id=? AND l.status='published' AND lp.student_id=?)+(SELECT COUNT(DISTINCT CASE WHEN q.kind='quiz' OR (qa.max_score>0 AND qa.score*100.0/qa.max_score>=q.passing_percentage) THEN qa.quiz_id END) FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id WHERE q.course_id=? AND q.status='published' AND qa.student_id=?)+(SELECT COUNT(*) FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE a.course_id=? AND a.status='published' AND s.student_id=?) done`).bind(courseId,courseId,courseId,courseId,studentId,courseId,studentId,courseId,studentId).first<{total:number;done:number}>();
  const total=Number(counts?.total??0),done=Number(counts?.done??0);
  const progress=total?Math.min(100,Math.round((done/total)*100)):0,now=new Date().toISOString();
  await db.prepare("UPDATE enrollments SET progress=? WHERE course_id=? AND student_id=?").bind(progress,courseId,studentId).run();
  if(progress===100){
    const certificate=await db.prepare("SELECT id FROM certificates WHERE student_id=? AND course_id=?").bind(studentId,courseId).first();
    if(!certificate){
      const course=await db.prepare("SELECT completion_points FROM courses WHERE id=?").bind(courseId).first<{completion_points:number}>(),points=Math.max(0,Number(course?.completion_points??0));
      await db.batch([
        db.prepare("INSERT INTO certificates (id,student_id,course_id,certificate_code,issued_at) VALUES (?,?,?,?,?)").bind(createId("crt"),studentId,courseId,`SKV-${crypto.randomUUID().slice(0,8).toUpperCase()}`,now),
        db.prepare("INSERT INTO student_gamification (id,student_id,xp,level,streak_days,updated_at) VALUES (?,?,?,1,1,?) ON CONFLICT(student_id) DO UPDATE SET xp=xp+?,level=MAX(level,CAST((xp+?)/100 AS INTEGER)+1),updated_at=excluded.updated_at").bind(createId("gam"),studentId,points,now,points,points),
      ]);
    }
  }
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const profile = await ensureProfile(identity);
  if (profile.status !== "active") return NextResponse.json({ error: "Account unavailable" }, { status: 403 });
  const form = await request.formData();
  const action = value(form, "action");
  const db = database();
  const editableCourse=async(courseId:string)=>profile.role==="admin"?db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND status='active'").bind(courseId).first<{id:string;tutor_id:string;course_mode:string}>():profile.role==="tutor"?db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND tutor_id=? AND creator_role='tutor' AND creator_id=? AND status='active'").bind(courseId,profile.id,profile.id).first<{id:string;tutor_id:string;course_mode:string}>():null;

  if (action === "update-profile") {
    const phone=value(form,"phone").slice(0,40),requestedZone=value(form,"timezone").slice(0,60),timezone=validTimeZone(requestedZone)===requestedZone?requestedZone:"Asia/Kolkata",bio=value(form,"bio").slice(0,2000),language=value(form,"language").slice(0,80)||"English",headline=value(form,"headline").slice(0,180),qualifications=value(form,"qualifications").slice(0,3000),experienceYears=Math.max(0,Math.min(70,Number(value(form,"experienceYears"))||0)),specialties=value(form,"specialties").slice(0,1200),achievements=value(form,"achievements").slice(0,3000),philosophy=value(form,"teachingPhilosophy").slice(0,3000),location=value(form,"location").slice(0,160),languages=value(form,"languages").slice(0,600),subjectAreas=value(form,"subjectAreas").slice(0,1200),gradeLevels=value(form,"gradeLevels").slice(0,1000),certifications=value(form,"certifications").slice(0,3000);let linkedin=value(form,"linkedinUrl").slice(0,500),website=value(form,"websiteUrl").slice(0,500),introVideo=value(form,"introVideoUrl").slice(0,1000);if(linkedin&&!/^https?:\/\//i.test(linkedin))linkedin="";if(website&&!/^https?:\/\//i.test(website))website="";if(introVideo&&!/^https:\/\//i.test(introVideo))introVideo="";const now=new Date().toISOString(),existing=await db.prepare("SELECT avatar_r2_key,avatar_content_type,avatar_file_name FROM user_profiles WHERE user_id=?").bind(profile.id).first<{avatar_r2_key:string;avatar_content_type:string;avatar_file_name:string}>();let avatarKey=existing?.avatar_r2_key??"",avatarType=existing?.avatar_content_type??"",avatarName=existing?.avatar_file_name??"";const avatar=form.get("avatar");if(avatar instanceof File&&avatar.size>0){if(avatar.size>4*1024*1024||!['image/jpeg','image/png','image/webp'].includes(avatar.type))return redirectTo(request,"/dashboard/profile?error=avatar");avatarName=avatar.name.replace(/[^a-zA-Z0-9._-]/g,"_");avatarType=avatar.type;avatarKey=`profiles/${profile.id}/${crypto.randomUUID()}-${avatarName}`;await env.FILES.put(avatarKey,await avatar.arrayBuffer(),{httpMetadata:{contentType:avatarType}});}
    await db.prepare("INSERT INTO user_profiles (id,user_id,phone,timezone,bio,preferred_language,headline,qualifications,experience_years,specialties,achievements,teaching_philosophy,location,languages,linkedin_url,website_url,avatar_r2_key,avatar_content_type,avatar_file_name,intro_video_url,subject_areas,grade_levels,certifications,is_public,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,timezone=excluded.timezone,bio=excluded.bio,preferred_language=excluded.preferred_language,headline=excluded.headline,qualifications=excluded.qualifications,experience_years=excluded.experience_years,specialties=excluded.specialties,achievements=excluded.achievements,teaching_philosophy=excluded.teaching_philosophy,location=excluded.location,languages=excluded.languages,linkedin_url=excluded.linkedin_url,website_url=excluded.website_url,avatar_r2_key=excluded.avatar_r2_key,avatar_content_type=excluded.avatar_content_type,avatar_file_name=excluded.avatar_file_name,intro_video_url=excluded.intro_video_url,subject_areas=excluded.subject_areas,grade_levels=excluded.grade_levels,certifications=excluded.certifications,is_public=excluded.is_public,updated_at=excluded.updated_at").bind(createId("prf"),profile.id,phone,timezone,bio,language,headline,qualifications,experienceYears,specialties,achievements,philosophy,location,languages,linkedin,website,avatarKey,avatarType,avatarName,introVideo,subjectAreas,gradeLevels,certifications,now).run();
    return redirectTo(request,"/dashboard/profile?updated=profile");
  }

  if(action==="save-ai-credential"){
    if(profile.role!=="admin")return NextResponse.json({error:"Super admin access required"},{status:403});
    const provider=allowed(value(form,"provider"),["openai","anthropic"] as const,"openai"),apiKey=value(form,"apiKey");if(apiKey.length<20)return redirectTo(request,"/dashboard/admin/ai?error=credential");
    try{const encrypted=await encryptProviderKey(apiKey);await db.prepare("INSERT INTO ai_provider_credentials (provider,encrypted_key,iv,key_hint,updated_by,updated_at) VALUES (?,?,?,?,?,?) ON CONFLICT(provider) DO UPDATE SET encrypted_key=excluded.encrypted_key,iv=excluded.iv,key_hint=excluded.key_hint,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(provider,encrypted.encryptedKey,encrypted.iv,encrypted.hint,profile.id,new Date().toISOString()).run();return redirectTo(request,"/dashboard/admin/ai?updated=credential");}catch{return redirectTo(request,"/dashboard/admin/ai?error=vault");}
  }

  if(action==="save-ai-settings"){
    if(profile.role!=="admin")return NextResponse.json({error:"Super admin access required"},{status:403});
    const provider=allowed(value(form,"provider"),["openai","anthropic"] as const,"openai");
    const defaultModel=provider==="anthropic"?"claude-sonnet-4-5":"gpt-5-mini";const model=(value(form,"model")||defaultModel).slice(0,120);const enabled=form.get("enabled")?1:0;const guidance=value(form,"systemGuidance").slice(0,4000);const now=new Date().toISOString();
    await db.prepare("INSERT INTO ai_settings (id,provider,model,enabled,system_guidance,updated_by,updated_at) VALUES ('platform',?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET provider=excluded.provider,model=excluded.model,enabled=excluded.enabled,system_guidance=excluded.system_guidance,updated_by=excluded.updated_by,updated_at=excluded.updated_at").bind(provider,model,enabled,guidance,profile.id,now).run();
    return redirectTo(request,"/dashboard/admin/ai?updated=ai");
  }

  if (action === "create-user") {
    if (!(await canManage(profile, "manage_users"))) return NextResponse.json({ error: "User management access required" }, { status: 403 });
    const name = value(form, "name"); const email = value(form, "email").toLowerCase();
    const username = value(form, "username").toLowerCase().replace(/[^a-z0-9._-]/g, "").slice(0, 60);
    const temporaryPassword = value(form, "temporaryPassword");
    const role = allowed(value(form, "role"), ["admin", "manager", "tutor", "student"] as const, "student");
    if ((role === "admin" || role === "manager") && profile.role !== "admin") return NextResponse.json({ error: "Only a full administrator can create managers" }, { status: 403 });
    if (!name || !email.includes("@") || username.length < 4 || temporaryPassword.length < 8) return redirectTo(request, "/dashboard/admin/users/new?error=invalid-user");
    const userId = createId("usr"); const now = new Date().toISOString();
    await db.prepare("INSERT INTO users (id, auth_user_id, username, password_hash, email, name, public_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?) ON CONFLICT(email) DO UPDATE SET username=excluded.username,password_hash=excluded.password_hash,name=excluded.name,role=excluded.role,status='active',public_id=COALESCE(users.public_id,excluded.public_id)").bind(userId, userId, username, hashPassword(temporaryPassword), email, name, createPublicId(role), role, now).run();
    const saved = await db.prepare("SELECT id FROM users WHERE lower(email)=lower(?)").bind(email).first<{id:string}>();
    if (role === "manager" && saved) {
      const valid = new Set<ManagerPermission>(["view_dashboard","manage_users","manage_students","manage_courses","manage_classes"]);
      const permissions = form.getAll("permissions").map(String).filter((item): item is ManagerPermission => valid.has(item as ManagerPermission));
      await db.prepare("DELETE FROM manager_permissions WHERE manager_id=?").bind(saved.id).run();
      if (permissions.length) await db.batch(permissions.map(permission => db.prepare("INSERT INTO manager_permissions (id,manager_id,permission,created_at) VALUES (?,?,?,?)").bind(createId("prm"),saved.id,permission,now)));
    }
    return redirectTo(request, `/dashboard/admin/users?created=${role === "manager" ? "manager" : "user"}`);
  }

  if (action === "create-course") {
    if (!(await canManage(profile, "manage_courses"))) return NextResponse.json({ error: "Course management access required" }, { status: 403 });
    const curriculumId=value(form,"curriculumId"),subjectId=value(form,"subjectId"),grade=value(form,"grade").slice(0,100),description=value(form,"description").slice(0,3000),tutorId=value(form,"tutorId"),studentId=value(form,"studentId")||null,coverImageUrl=value(form,"coverImageUrl").slice(0,1000),courseMode=allowed(value(form,"courseMode"),["guided","self_paced"]as const,"guided"),isUnlocked=courseMode==="self_paced"?1:form.get("isUnlocked")?1:0,completionPoints=Math.max(0,Math.min(100000,Number(value(form,"completionPoints"))||500));
    const selection=await db.prepare("SELECT cs.name subject,cs.grades_json,c.name curriculum FROM curriculum_subjects cs JOIN curricula c ON c.id=cs.curriculum_id WHERE cs.id=? AND cs.curriculum_id=? AND cs.status='active' AND c.status='active'").bind(subjectId,curriculumId).first<{subject:string;grades_json:string;curriculum:string}>();
    let grades:string[]=[];try{grades=JSON.parse(selection?.grades_json??"[]")as string[];}catch{grades=[];}const title=(value(form,"title")||`${selection?.subject??"Course"} · ${grade}`).slice(0,180);
    const tutor = await db.prepare("SELECT id FROM users WHERE id=? AND role='tutor' AND status!='suspended'").bind(tutorId).first();
    const student = studentId ? await db.prepare("SELECT id FROM users WHERE id=? AND role='student' AND status!='suspended'").bind(studentId).first() : null;
    if (!selection||!grades.includes(grade)||!title||!description||!tutor||(studentId&&!student)) return redirectTo(request, "/dashboard/admin/courses/new?error=invalid-course");
    const courseId = createId("crs"); const now = new Date().toISOString();
    const statements = [db.prepare("INSERT INTO courses (id,title,subject,level,description,cover_image_url,is_unlocked,tutor_id,status,accent,created_at,curriculum_id,grade_level,creator_id,creator_role,is_catalog,course_audience,completion_points,course_mode) VALUES (?,?,?,?,?,?,?,?,'active','blue',?,?,?,?, 'admin',?,?,?,?)").bind(courseId,title,selection.subject,grade,description,coverImageUrl,isUnlocked,tutorId,now,curriculumId,grade,profile.id,form.get("isCatalog")?1:0,allowed(value(form,"courseAudience"),["student","tutor"]as const,"student"),completionPoints,courseMode)];
    if (studentId) statements.push(db.prepare("INSERT INTO enrollments (id, course_id, student_id, progress, created_at) VALUES (?, ?, ?, 0, ?)").bind(createId("enr"), courseId, studentId, now));
    await db.batch(statements);
    return redirectTo(request, "/dashboard/admin/courses?created=course");
  }

  if(action==="create-tutor-course"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==='admin'?'usr_demo_tutor':profile.id,curriculumId=value(form,"curriculumId"),subjectId=value(form,"subjectId"),grade=value(form,"grade").slice(0,100),description=value(form,"description").slice(0,3000),cover=value(form,"coverImageUrl").slice(0,1000),courseMode=allowed(value(form,"courseMode"),["guided","self_paced"]as const,"guided"),completionPoints=Math.max(0,Math.min(100000,Number(value(form,"completionPoints"))||500));const selection=await db.prepare("SELECT cs.name subject,cs.grades_json FROM curriculum_subjects cs JOIN curricula c ON c.id=cs.curriculum_id WHERE cs.id=? AND cs.curriculum_id=? AND cs.status='active' AND c.status='active'").bind(subjectId,curriculumId).first<{subject:string;grades_json:string}>();let grades:string[]=[];try{grades=JSON.parse(selection?.grades_json??"[]")as string[];}catch{grades=[];}const title=(value(form,"title")||`${selection?.subject??"Course"} · ${grade}`).slice(0,180);if(!selection||!grades.includes(grade)||!title||!description)return redirectTo(request,"/dashboard/tutor/courses?error=course");const now=new Date().toISOString();await db.prepare("INSERT INTO courses (id,title,subject,level,description,cover_image_url,is_unlocked,tutor_id,status,accent,created_at,curriculum_id,grade_level,creator_id,creator_role,is_catalog,course_audience,completion_points,course_mode) VALUES (?,?,?,?,?,?,?,?,'active','blue',?,?,?,?, 'tutor',0,'student',?,?)").bind(createId("crs"),title,selection.subject,grade,description,cover,courseMode==="self_paced"?1:0,tutorId,now,curriculumId,grade,profile.id,completionPoints,courseMode).run();return redirectTo(request,"/dashboard/tutor/courses?created=course");
  }

  if(action==="delete-course"){
    const courseId=value(form,"courseId");
    const course=await db.prepare("SELECT id,tutor_id,creator_id,creator_role FROM courses WHERE id=?").bind(courseId).first<{id:string;tutor_id:string|null;creator_id:string|null;creator_role:string}>();
    if(!course)return NextResponse.json({error:"Course not found"},{status:404});
    if(profile.role==="tutor"){
      if(course.tutor_id!==profile.id||course.creator_role!=="tutor"||course.creator_id!==profile.id)return NextResponse.json({error:"Tutors can delete only courses they created themselves"},{status:403});
    }else if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Course management access required"},{status:403});
    const blobs=await db.prepare(`SELECT r2_key key FROM lesson_resources WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=?) UNION ALL SELECT image_r2_key key FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE course_id=?) AND image_r2_key!='' UNION ALL SELECT r2_key key FROM submission_attachments WHERE submission_id IN (SELECT s.id FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE a.course_id=?)`).bind(courseId,courseId,courseId).all<{key:string}>();
    await Promise.all(blobs.results.map(item=>env.FILES.delete(item.key)));
    await db.batch([
      db.prepare("DELETE FROM assessment_reset_requests WHERE quiz_id IN (SELECT id FROM quizzes WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM quiz_assignments WHERE quiz_id IN (SELECT id FROM quizzes WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM quiz_attempts WHERE quiz_id IN (SELECT id FROM quizzes WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM quizzes WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM submission_attachments WHERE submission_id IN (SELECT s.id FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE a.course_id=?)").bind(courseId),
      db.prepare("DELETE FROM submissions WHERE activity_id IN (SELECT id FROM activities WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM activities WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM lesson_resources WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM lesson_notes WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM lessons WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM ai_messages WHERE thread_id IN (SELECT id FROM ai_threads WHERE course_id=?)").bind(courseId),
      db.prepare("DELETE FROM ai_threads WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM messages WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM announcements WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM certificates WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM live_classes WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM enrollments WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM chapters WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM courses WHERE id=?").bind(courseId),
    ]);
    return redirectTo(request,profile.role==="tutor"?"/dashboard/tutor/courses?deleted=course":"/dashboard/admin/courses?deleted=course");
  }

  if(action==="create-chapter"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const courseId=value(form,"courseId");const course=profile.role==="admin"?await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=?").bind(courseId).first<{id:string;tutor_id:string;course_mode:string}>():await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND tutor_id=? AND creator_role='tutor' AND creator_id=?").bind(courseId,profile.id,profile.id).first<{id:string;tutor_id:string;course_mode:string}>();const title=value(form,"title").slice(0,180),requestedRelease=allowed(value(form,"releaseMode"),["free","drip"]as const,"free"),releaseMode=course?.course_mode==="self_paced"?"free":requestedRelease,dripDays=releaseMode==="drip"?Math.max(1,Math.min(3650,Number(value(form,"dripDays"))||1)):0;if(!course||!title)return redirectTo(request,"/dashboard/tutor/curriculum?error=chapter");await db.prepare("INSERT INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at,release_mode,drip_days) VALUES (?,?,?,?,?,?,?,?,?,?)").bind(createId("chp"),courseId,course.tutor_id,title,value(form,"description"),Math.max(1,Number(value(form,"position"))||1),course.course_mode==="self_paced"?1:form.get("isUnlocked")?1:0,new Date().toISOString(),releaseMode,dripDays).run();return redirectTo(request,"/dashboard/tutor/curriculum?created=chapter");
  }

  if(action==="update-course"){
    const courseId=value(form,"courseId"),course=await editableCourse(courseId);if(!course)return NextResponse.json({error:"Course is protected or unavailable"},{status:403});
    const title=value(form,"title").slice(0,180),description=value(form,"description").slice(0,3000),courseMode=allowed(value(form,"courseMode"),["guided","self_paced"]as const,"guided"),points=Math.max(0,Math.min(100000,Number(value(form,"completionPoints"))||500));if(!title||!description)return redirectTo(request,"/dashboard/tutor/curriculum?error=course-update");
    const statements:D1PreparedStatement[]=[db.prepare("UPDATE courses SET title=?,description=?,course_mode=?,completion_points=?,is_unlocked=CASE WHEN ?='self_paced' THEN 1 ELSE is_unlocked END WHERE id=?").bind(title,description,courseMode,points,courseMode,courseId)];
    if(courseMode==="self_paced")statements.push(db.prepare("UPDATE chapters SET release_mode='free',drip_days=0,is_unlocked=1 WHERE course_id=?").bind(courseId),db.prepare("UPDATE lessons SET is_unlocked=1 WHERE course_id=?").bind(courseId),db.prepare("UPDATE quizzes SET is_unlocked=1 WHERE course_id=? AND scope='course'").bind(courseId),db.prepare("UPDATE activities SET is_unlocked=1 WHERE course_id=?").bind(courseId));
    await db.batch(statements);return redirectTo(request,"/dashboard/tutor/curriculum?updated=course");
  }

  if(action==="update-chapter"){
    const chapterId=value(form,"chapterId"),chapter=await db.prepare("SELECT id,course_id FROM chapters WHERE id=?").bind(chapterId).first<{id:string;course_id:string}>(),course=chapter?await editableCourse(chapter.course_id):null;if(!chapter||!course)return NextResponse.json({error:"Chapter is protected or unavailable"},{status:403});
    const title=value(form,"title").slice(0,180),description=value(form,"description").slice(0,2000),position=Math.max(1,Number(value(form,"position"))||1),requested=allowed(value(form,"releaseMode"),["free","drip"]as const,"free"),releaseMode=course.course_mode==="self_paced"?"free":requested,dripDays=releaseMode==="drip"?Math.max(1,Math.min(3650,Number(value(form,"dripDays"))||1)):0;if(!title)return redirectTo(request,"/dashboard/tutor/curriculum?error=chapter-update");
    await db.prepare("UPDATE chapters SET title=?,description=?,position=?,release_mode=?,drip_days=?,is_unlocked=CASE WHEN ?='self_paced' THEN 1 ELSE is_unlocked END WHERE id=?").bind(title,description,position,releaseMode,dripDays,course.course_mode,chapterId).run();return redirectTo(request,"/dashboard/tutor/curriculum?updated=chapter");
  }

  if(action==="update-lesson"){
    const lessonId=value(form,"lessonId"),lesson=await db.prepare("SELECT id,course_id FROM lessons WHERE id=?").bind(lessonId).first<{id:string;course_id:string}>(),course=lesson?await editableCourse(lesson.course_id):null;if(!lesson||!course)return NextResponse.json({error:"Lesson is protected or unavailable"},{status:403});
    const title=value(form,"title").slice(0,180),summary=value(form,"summary").slice(0,2000),content=sanitizeLessonHtml(value(form,"content")),position=Math.max(1,Number(value(form,"position"))||1),duration=Math.max(5,Math.min(240,Number(value(form,"duration"))||30));if(!title||!summary||!content)return redirectTo(request,"/dashboard/tutor/curriculum?error=lesson-update");
    await db.prepare("UPDATE lessons SET title=?,summary=?,content=?,position=?,duration_minutes=?,is_unlocked=CASE WHEN ?='self_paced' THEN 1 ELSE is_unlocked END WHERE id=?").bind(title,summary,content,position,duration,course.course_mode,lessonId).run();return redirectTo(request,"/dashboard/tutor/curriculum?updated=lesson");
  }

  if(action==="update-quiz"){
    const quizId=value(form,"quizId"),quiz=await db.prepare("SELECT id,course_id FROM quizzes WHERE id=? AND scope='course'").bind(quizId).first<{id:string;course_id:string}>(),course=quiz?await editableCourse(quiz.course_id):null;if(!quiz||!course)return NextResponse.json({error:"Quiz is protected or unavailable"},{status:403});
    const title=value(form,"title").slice(0,180),description=value(form,"description").slice(0,3000),kind=allowed(value(form,"kind"),["quiz","assessment","final_assessment"]as const,"quiz"),passing=Math.max(0,Math.min(100,Number(value(form,"passingPercentage"))||60)),attempts=kind==="quiz"||course.course_mode==="self_paced"?Math.max(1,Math.min(10,Number(value(form,"attemptLimit"))||3)):1;if(!title||!description)return redirectTo(request,"/dashboard/tutor/curriculum?error=quiz-update");
    await db.prepare("UPDATE quizzes SET title=?,description=?,kind=?,passing_percentage=?,attempt_limit=?,is_unlocked=CASE WHEN ?='self_paced' THEN 1 ELSE is_unlocked END WHERE id=?").bind(title,description,kind,passing,attempts,course.course_mode,quizId).run();return redirectTo(request,"/dashboard/tutor/curriculum?updated=quiz");
  }

  if(action==="update-activity"){
    const activityId=value(form,"activityId"),activity=await db.prepare("SELECT id,course_id FROM activities WHERE id=?").bind(activityId).first<{id:string;course_id:string}>(),course=activity?await editableCourse(activity.course_id):null;if(!activity||!course)return NextResponse.json({error:"Activity is protected or unavailable"},{status:403});
    const type=allowed(value(form,"type"),["homework","quiz","assessment","assignment","classwork"]as const,"assignment"),title=value(form,"title").slice(0,180),instructions=value(form,"instructions").slice(0,5000),dueAt=value(form,"dueAt"),points=Math.max(1,Math.min(1000,Number(value(form,"points"))||100));if(!title||!instructions||!dueAt)return redirectTo(request,"/dashboard/tutor/curriculum?error=activity-update");
    await db.prepare("UPDATE activities SET title=?,type=?,instructions=?,due_at=?,points=?,is_unlocked=CASE WHEN ?='self_paced' THEN 1 ELSE is_unlocked END WHERE id=?").bind(title,type,instructions,new Date(dueAt).toISOString(),points,course.course_mode,activityId).run();return redirectTo(request,"/dashboard/tutor/curriculum?updated=activity");
  }

  if(action==="delete-lesson"){
    const lessonId=value(form,"lessonId"),lesson=await db.prepare("SELECT id,course_id FROM lessons WHERE id=?").bind(lessonId).first<{id:string;course_id:string}>(),course=lesson?await editableCourse(lesson.course_id):null;if(!lesson||!course)return NextResponse.json({error:"Lesson is protected or unavailable"},{status:403});const blobs=await db.prepare("SELECT r2_key key FROM lesson_resources WHERE lesson_id=?").bind(lessonId).all<{key:string}>();await Promise.all(blobs.results.map(item=>env.FILES.delete(item.key)));await db.batch([db.prepare("DELETE FROM lesson_resources WHERE lesson_id=?").bind(lessonId),db.prepare("DELETE FROM lesson_notes WHERE lesson_id=?").bind(lessonId),db.prepare("DELETE FROM lesson_progress WHERE lesson_id=?").bind(lessonId),db.prepare("DELETE FROM lessons WHERE id=?").bind(lessonId)]);return redirectTo(request,"/dashboard/tutor/curriculum?deleted=lesson");
  }

  if(action==="delete-activity"){
    const activityId=value(form,"activityId"),activity=await db.prepare("SELECT id,course_id FROM activities WHERE id=?").bind(activityId).first<{id:string;course_id:string}>(),course=activity?await editableCourse(activity.course_id):null;if(!activity||!course)return NextResponse.json({error:"Activity is protected or unavailable"},{status:403});const blobs=await db.prepare("SELECT r2_key key FROM submission_attachments WHERE submission_id IN (SELECT id FROM submissions WHERE activity_id=?)").bind(activityId).all<{key:string}>();await Promise.all(blobs.results.map(item=>env.FILES.delete(item.key)));await db.batch([db.prepare("DELETE FROM submission_attachments WHERE submission_id IN (SELECT id FROM submissions WHERE activity_id=?)").bind(activityId),db.prepare("DELETE FROM submissions WHERE activity_id=?").bind(activityId),db.prepare("DELETE FROM activities WHERE id=?").bind(activityId)]);return redirectTo(request,"/dashboard/tutor/curriculum?deleted=activity");
  }

  if(action==="delete-chapter"){
    const chapterId=value(form,"chapterId"),chapter=await db.prepare("SELECT id,course_id FROM chapters WHERE id=?").bind(chapterId).first<{id:string;course_id:string}>(),course=chapter?await editableCourse(chapter.course_id):null;if(!chapter||!course)return NextResponse.json({error:"Chapter is protected or unavailable"},{status:403});
    const blobs=await db.prepare("SELECT r2_key key FROM lesson_resources WHERE lesson_id IN (SELECT id FROM lessons WHERE chapter_id=?) UNION ALL SELECT image_r2_key key FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE chapter_id=?) AND image_r2_key!='' UNION ALL SELECT r2_key key FROM submission_attachments WHERE submission_id IN (SELECT s.id FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE a.chapter_id=?)").bind(chapterId,chapterId,chapterId).all<{key:string}>();await Promise.all(blobs.results.map(item=>env.FILES.delete(item.key)));
    await db.batch([db.prepare("DELETE FROM assessment_reset_requests WHERE quiz_id IN (SELECT id FROM quizzes WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM quiz_assignments WHERE quiz_id IN (SELECT id FROM quizzes WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM quiz_attempts WHERE quiz_id IN (SELECT id FROM quizzes WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM quizzes WHERE chapter_id=?").bind(chapterId),db.prepare("DELETE FROM submission_attachments WHERE submission_id IN (SELECT s.id FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE a.chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM submissions WHERE activity_id IN (SELECT id FROM activities WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM activities WHERE chapter_id=?").bind(chapterId),db.prepare("DELETE FROM lesson_resources WHERE lesson_id IN (SELECT id FROM lessons WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM lesson_notes WHERE lesson_id IN (SELECT id FROM lessons WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM lesson_progress WHERE lesson_id IN (SELECT id FROM lessons WHERE chapter_id=?)").bind(chapterId),db.prepare("DELETE FROM lessons WHERE chapter_id=?").bind(chapterId),db.prepare("DELETE FROM chapters WHERE id=?").bind(chapterId)]);return redirectTo(request,"/dashboard/tutor/curriculum?deleted=chapter");
  }

  if(action==="set-content-unlock"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const entity=allowed(value(form,"entity"),['course','chapter','lesson','quiz','activity']as const,'lesson');const id=value(form,"id"),next=value(form,"next")==='1'?1:0;const returnTo=value(form,"returnTo");
    if(entity==="course"&&next===1){const finalAssessment=profile.role==="admin"?await db.prepare("SELECT id FROM quizzes WHERE course_id=? AND scope='course' AND kind='final_assessment' AND status='published'").bind(id).first():await db.prepare("SELECT q.id FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE q.course_id=? AND q.scope='course' AND q.kind='final_assessment' AND q.status='published' AND c.creator_role='tutor' AND c.creator_id=?").bind(id,profile.id).first();if(!finalAssessment)return redirectTo(request,`${returnTo.startsWith('/dashboard/tutor/')?returnTo:'/dashboard/tutor/curriculum'}${returnTo.includes('?')?'&':'?'}error=final-assessment-required`);}
    if(entity==="quiz"&&next===1){const readiness=profile.role==="admin"?await db.prepare("SELECT q.question_count,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) questions FROM quizzes q WHERE q.id=?").bind(id).first<{question_count:number;questions:number}>():await db.prepare("SELECT q.question_count,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) questions FROM quizzes q JOIN courses c ON c.id=q.course_id WHERE q.id=? AND q.tutor_id=? AND c.creator_role='tutor' AND c.creator_id=?").bind(id,profile.id,profile.id).first<{question_count:number;questions:number}>();if(!readiness||Number(readiness.questions)!==Number(readiness.question_count))return redirectTo(request,`${returnTo.startsWith('/dashboard/tutor/')?returnTo:'/dashboard/tutor/curriculum'}${returnTo.includes('?')?'&':'?'}error=quiz-incomplete`);}
    const config={course:{table:'courses',courseColumn:'id'},chapter:{table:'chapters',courseColumn:'course_id'},lesson:{table:'lessons',courseColumn:'course_id'},quiz:{table:'quizzes',courseColumn:'course_id'},activity:{table:'activities',courseColumn:'course_id'}}[entity];const result=profile.role==="admin"?await db.prepare(`UPDATE ${config.table} SET is_unlocked=? WHERE id=?`).bind(next,id).run():await db.prepare(`UPDATE ${config.table} SET is_unlocked=? WHERE id=? AND EXISTS(SELECT 1 FROM courses c WHERE c.id=${config.table}.${config.courseColumn} AND c.tutor_id=? AND c.creator_role='tutor' AND c.creator_id=?)`).bind(next,id,profile.id,profile.id).run();if(!result.meta.changes)return NextResponse.json({error:"Content not found or protected"},{status:404});return redirectTo(request,returnTo.startsWith('/dashboard/tutor/')?returnTo:'/dashboard/tutor/curriculum?updated=unlock');
  }

  if(action==="create-curriculum"){
    if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Curriculum management access required"},{status:403});
    const name=value(form,"name").slice(0,180),audience=allowed(value(form,"audience"),["school","professional","upskilling","global"]as const,"school"),category=value(form,"category").slice(0,120),description=value(form,"description").slice(0,2000),now=new Date().toISOString();
    if(!name||!category||!description)return redirectTo(request,"/dashboard/admin/curriculum?error=invalid-curriculum");
    await db.prepare("INSERT INTO curricula (id,name,audience,category,description,status,created_by,created_at,updated_at) VALUES (?,?,?,?,?,'active',?,?,?) ON CONFLICT(name) DO UPDATE SET audience=excluded.audience,category=excluded.category,description=excluded.description,status='active',updated_at=excluded.updated_at").bind(createId("cur"),name,audience,category,description,profile.id,now,now).run();
    return redirectTo(request,"/dashboard/admin/curriculum?created=curriculum");
  }

  if(action==="add-curriculum-subject"){
    if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Curriculum management access required"},{status:403});
    const curriculumId=value(form,"curriculumId"),name=value(form,"name").slice(0,140),grades=value(form,"grades").split(/[,\n]/).map(item=>item.trim()).filter(Boolean).slice(0,40),curriculum=await db.prepare("SELECT id FROM curricula WHERE id=? AND status='active'").bind(curriculumId).first();
    if(!curriculum||!name||!grades.length)return redirectTo(request,"/dashboard/admin/curriculum?error=invalid-subject");
    await db.prepare("INSERT INTO curriculum_subjects (id,curriculum_id,name,grades_json,status,created_at) VALUES (?,?,?,?,'active',?) ON CONFLICT(curriculum_id,name) DO UPDATE SET grades_json=excluded.grades_json,status='active'").bind(createId("subj"),curriculumId,name,JSON.stringify(grades),new Date().toISOString()).run();
    return redirectTo(request,"/dashboard/admin/curriculum?updated=subject");
  }

  if(action==="archive-curriculum"){
    if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Curriculum management access required"},{status:403});
    await db.prepare("UPDATE curricula SET status='archived',updated_at=? WHERE id=?").bind(new Date().toISOString(),value(form,"curriculumId")).run();
    return redirectTo(request,"/dashboard/admin/curriculum?updated=curriculum-archived");
  }

  if(action==="import-course"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,courseId=value(form,"courseId"),existing=await db.prepare("SELECT id FROM courses WHERE source_course_id=? AND tutor_id=? AND status='active'").bind(courseId,tutorId).first();
    if(existing)return redirectTo(request,"/dashboard/tutor/courses?error=course-already-imported");
    const copy=await cloneCatalogCourse(courseId,tutorId);if(!copy)return redirectTo(request,"/dashboard/tutor/courses?error=course-import");
    return redirectTo(request,"/dashboard/tutor/courses?created=course");
  }

  if(action==="enrol-course-student"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;const courseId=value(form,"courseId"),studentId=value(form,"studentId");const valid=await db.prepare("SELECT c.id FROM courses c JOIN users u ON u.id=? AND u.role='student' WHERE c.id=? AND c.tutor_id=?").bind(studentId,courseId,tutorId).first();if(!valid)return NextResponse.json({error:"Course or student unavailable"},{status:404});await db.prepare("INSERT OR IGNORE INTO enrollments (id,course_id,student_id,progress,created_at) VALUES (?,?,?,0,?)").bind(createId("enr"),courseId,studentId,new Date().toISOString()).run();return redirectTo(request,"/dashboard/tutor/courses?updated=enrolment");
  }

  if(action==="revoke-course-student"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,courseId=value(form,"courseId"),studentId=value(form,"studentId");
    const result=await db.prepare("DELETE FROM enrollments WHERE course_id=? AND student_id=? AND EXISTS(SELECT 1 FROM courses c WHERE c.id=? AND c.tutor_id=?)").bind(courseId,studentId,courseId,tutorId).run();
    if(!result.meta.changes)return NextResponse.json({error:"Course assignment not found"},{status:404});
    return redirectTo(request,"/dashboard/tutor/courses?updated=revoked");
  }

  if(action==="assign-staff-course"){
    if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Course management access required"},{status:403});
    const courseId=value(form,"courseId"),tutorId=value(form,"tutorId"),course=await db.prepare("SELECT id FROM courses WHERE id=? AND course_audience='tutor' AND status='active'").bind(courseId).first(),tutor=await db.prepare("SELECT id FROM users WHERE id=? AND role='tutor' AND status='active'").bind(tutorId).first();
    if(!course||!tutor)return redirectTo(request,"/dashboard/admin/courses?error=staff-course");
    await db.prepare("INSERT INTO staff_course_enrollments (id,course_id,tutor_id,assigned_by,progress,status,assigned_at) VALUES (?,?,?,?,0,'active',?) ON CONFLICT(course_id,tutor_id) DO UPDATE SET status='active',assigned_by=excluded.assigned_by,assigned_at=excluded.assigned_at").bind(createId("sen"),courseId,tutorId,profile.id,new Date().toISOString()).run();
    return redirectTo(request,"/dashboard/admin/courses?updated=staff-assigned");
  }

  if(action==="complete-staff-course"){
    if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Course management access required"},{status:403});
    const enrollmentId=value(form,"enrollmentId"),enrollment=await db.prepare("SELECT id,course_id,tutor_id FROM staff_course_enrollments WHERE id=? AND status='active'").bind(enrollmentId).first<{id:string;course_id:string;tutor_id:string}>();if(!enrollment)return redirectTo(request,"/dashboard/admin/courses?error=staff-course");const now=new Date().toISOString(),existing=await db.prepare("SELECT id FROM staff_certificates WHERE course_id=? AND tutor_id=?").bind(enrollment.course_id,enrollment.tutor_id).first();const statements:D1PreparedStatement[]=[db.prepare("UPDATE staff_course_enrollments SET progress=100,status='completed',completed_at=? WHERE id=?").bind(now,enrollment.id)];if(!existing)statements.push(db.prepare("INSERT INTO staff_certificates (id,course_id,tutor_id,certificate_code,issued_at) VALUES (?,?,?,?,?)").bind(createId("sct"),enrollment.course_id,enrollment.tutor_id,`SKV-STAFF-${crypto.randomUUID().slice(0,8).toUpperCase()}`,now));await db.batch(statements);
    return redirectTo(request,"/dashboard/admin/courses?updated=staff-completed");
  }

  if(action==="upload-lesson-resource"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const lessonId=value(form,"lessonId");const lesson=profile.role==="admin"?await db.prepare("SELECT id FROM lessons WHERE id=?").bind(lessonId).first():await db.prepare("SELECT l.id FROM lessons l JOIN courses c ON c.id=l.course_id WHERE l.id=? AND l.tutor_id=? AND c.creator_role='tutor' AND c.creator_id=?").bind(lessonId,profile.id,profile.id).first();const file=form.get("file");if(!lesson||!(file instanceof File))return redirectTo(request,"/dashboard/tutor/curriculum?error=resource");try{await storeLessonFile(lessonId,file,value(form,"title")||file.name);}catch{return redirectTo(request,"/dashboard/tutor/curriculum?error=resource-type");}return redirectTo(request,"/dashboard/tutor/curriculum?updated=resource");
  }

  if(action==="create-quiz"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const scope=allowed(value(form,"scope"),["course","standalone"] as const,"course"),courseId=scope==="course"?value(form,"courseId"):null,chapterId=scope==="course"?(value(form,"chapterId")||null):null;
    const course=courseId?(profile.role==="admin"?await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND status='active'").bind(courseId).first<{id:string;tutor_id:string;course_mode:string}>():await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND tutor_id=? AND creator_role='tutor' AND creator_id=?").bind(courseId,profile.id,profile.id).first<{id:string;tutor_id:string;course_mode:string}>()):null,tutorId=course?.tutor_id??(profile.role==="admin"?"usr_demo_tutor":profile.id);
    const chapter=chapterId&&courseId?(profile.role==="admin"?await db.prepare("SELECT id FROM chapters WHERE id=? AND course_id=?").bind(chapterId,courseId).first():await db.prepare("SELECT id FROM chapters WHERE id=? AND course_id=? AND tutor_id=?").bind(chapterId,courseId,tutorId).first()):null;
    const title=value(form,"title").slice(0,180),description=value(form,"description").slice(0,3000),kind=scope==="standalone"?"quiz":allowed(value(form,"kind"),['quiz','assessment','final_assessment']as const,'quiz');
    const requestedCount=Number(value(form,"questionCount")),questionCount=[5,10,15,20,25].includes(requestedCount)?requestedCount:5;
    const passingPercentage=Math.max(0,Math.min(100,Number(value(form,"passingPercentage"))||60));
    if(!title||!description||(scope==="course"&&(!course||(chapterId&&!chapter))))return redirectTo(request,scope==="standalone"?"/dashboard/tutor/quizzes?error=quiz":"/dashboard/tutor/curriculum?error=quiz");
    const limit=scope==="standalone"?1:kind==='quiz'||course?.course_mode==="self_paced"?Math.max(1,Math.min(10,Number(value(form,"attemptLimit"))||3)):1;
    await db.prepare("INSERT INTO quizzes (id,course_id,chapter_id,tutor_id,title,description,kind,attempt_limit,is_unlocked,status,scope,question_count,passing_percentage,created_at) VALUES (?,?,?,?,?,?,?,?,?,'published',?,?,?,?)").bind(createId("qiz"),courseId,chapterId,tutorId,title,description,kind,limit,course?.course_mode==="self_paced"?1:0,scope,questionCount,passingPercentage,new Date().toISOString()).run();
    const returnTo=value(form,"returnTo");return redirectTo(request,returnTo.startsWith('/dashboard/tutor/')?returnTo:"/dashboard/tutor/quizzes?created=quiz");
  }

  if(action==="add-quiz-question"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const quizId=value(form,"quizId"),returnTo=value(form,"returnTo"),quiz=profile.role==="admin"?await db.prepare("SELECT q.id,q.scope,q.question_count,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) questions FROM quizzes q WHERE q.id=?").bind(quizId).first<{id:string;scope:string;question_count:number;questions:number}>():await db.prepare("SELECT q.id,q.scope,q.question_count,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) questions FROM quizzes q LEFT JOIN courses c ON c.id=q.course_id WHERE q.id=? AND q.tutor_id=? AND (q.scope='standalone' OR (c.creator_role='tutor' AND c.creator_id=?))").bind(quizId,profile.id,profile.id).first<{id:string;scope:string;question_count:number;questions:number}>();
    const type=allowed(value(form,"type"),['mcq','fill_blank','drag_drop','order','matching','one_word']as const,'mcq'),prompt=value(form,"prompt").slice(0,4000),answer=value(form,"answer").slice(0,4000);
    const options=value(form,"options").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,30);
    const questionReturn=returnTo.startsWith('/dashboard/tutor/')?returnTo:"/dashboard/tutor/quizzes";
    const questionsAdded=Number(quiz?.questions??0),requiredQuestions=Number(quiz?.question_count??0);
    if(!quiz||questionsAdded>=requiredQuestions||!prompt||!answer||((type==='mcq'||type==='matching'||type==='order'||type==='drag_drop')&&options.length<2))return redirectTo(request,`${questionReturn}${questionReturn.includes('?')?'&':'?'}error=${quiz&&questionsAdded>=requiredQuestions?'question-limit':'question'}`);
    const questionId=createId("qq"),legacyImage=form.get("image"),resourceFile=form.get("resourceFile")??legacyImage;
    let resourceType=allowed(value(form,"resourceType"),["none","image","pdf","document","presentation","iframe"] as const,"none") as QuizResourceType;
    let imageKey="",imageName="",imageType="",imageSize=0,resourceEmbedUrl="";
    if(resourceType==="iframe"){
      resourceEmbedUrl=safeHttpsUrl(value(form,"embedUrl"));
      if(!resourceEmbedUrl)return redirectTo(request,`${questionReturn}${questionReturn.includes('?')?'&':'?'}error=question-embed`);
    }else if(resourceFile instanceof File&&resourceFile.size>0){
      if(resourceType==="none"&&legacyImage instanceof File)resourceType="image";
      if(resourceType==="none"||!await validQuizResourceFile(resourceFile,resourceType))return redirectTo(request,`${questionReturn}${questionReturn.includes('?')?'&':'?'}error=question-resource`);
      imageName=safeFileName(resourceFile);imageType=safeContentType(resourceFile);imageSize=resourceFile.size;imageKey=`quiz-questions/${quizId}/${questionId}-${imageName}`;
      await env.FILES.put(imageKey,await resourceFile.arrayBuffer(),{httpMetadata:{contentType:imageType}});
    }else if(resourceType!=="none")return redirectTo(request,`${questionReturn}${questionReturn.includes('?')?'&':'?'}error=question-resource`);
    try{
      await db.prepare("INSERT INTO quiz_questions (id,quiz_id,type,prompt,options_json,answer_json,points,position,image_r2_key,image_file_name,image_content_type,image_size_bytes,resource_type,resource_embed_url) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(questionId,quizId,type,prompt,JSON.stringify(options),JSON.stringify(answer.trim()),Math.max(1,Number(value(form,"points"))||10),questionsAdded+1,imageKey,imageName,imageType,imageSize,resourceType,resourceEmbedUrl).run();
    }catch(error){if(imageKey)await env.FILES.delete(imageKey);throw error;}
    if(quiz.scope==="standalone"&&questionsAdded+1===requiredQuestions)await db.prepare("UPDATE quizzes SET is_unlocked=1 WHERE id=?").bind(quizId).run();
    return redirectTo(request,`${questionReturn}${questionReturn.includes('?')?'&':'?'}updated=question`);
  }

  if(action==="assign-quiz"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,quizId=value(form,"quizId"),target=allowed(value(form,"target"),["all","student"] as const,"student"),studentId=target==="student"?value(form,"studentId"):null;
    const quiz=await db.prepare("SELECT q.id,q.question_count,(SELECT COUNT(*) FROM quiz_questions qq WHERE qq.quiz_id=q.id) questions FROM quizzes q WHERE q.id=? AND q.tutor_id=? AND q.scope='standalone' AND q.status='published'").bind(quizId,tutorId).first<{id:string;question_count:number;questions:number}>();
    const student=studentId?await db.prepare("SELECT id FROM users WHERE id=? AND role='student' AND status='active'").bind(studentId).first():null;
    const questionsAdded=Number(quiz?.questions??0),requiredQuestions=Number(quiz?.question_count??0);
    if(!quiz||questionsAdded!==requiredQuestions||(target==="student"&&!student))return redirectTo(request,`/dashboard/tutor/quizzes?error=${quiz&&questionsAdded!==requiredQuestions?'quiz-incomplete':'assignment'}`);
    const existing=studentId?await db.prepare("SELECT id FROM quiz_assignments WHERE quiz_id=? AND student_id=? AND status='active'").bind(quizId,studentId).first():await db.prepare("SELECT id FROM quiz_assignments WHERE quiz_id=? AND student_id IS NULL AND status='active'").bind(quizId).first();
    if(!existing)await db.prepare("INSERT INTO quiz_assignments (id,quiz_id,student_id,assigned_by,status,assigned_at,revoked_at) VALUES (?,?,?,?,'active',?,NULL)").bind(createId("qia"),quizId,studentId,tutorId,new Date().toISOString()).run();
    await db.prepare("UPDATE quizzes SET is_unlocked=1 WHERE id=? AND tutor_id=?").bind(quizId,tutorId).run();
    return redirectTo(request,"/dashboard/tutor/quizzes?updated=assigned");
  }

  if(action==="revoke-quiz"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,assignmentId=value(form,"assignmentId"),now=new Date().toISOString();
    const result=await db.prepare("UPDATE quiz_assignments SET status='revoked',revoked_at=? WHERE id=? AND status='active' AND EXISTS(SELECT 1 FROM quizzes q WHERE q.id=quiz_assignments.quiz_id AND q.tutor_id=? AND q.scope='standalone')").bind(now,assignmentId,tutorId).run();
    if(!result.meta.changes)return NextResponse.json({error:"Quiz assignment not found"},{status:404});
    return redirectTo(request,"/dashboard/tutor/quizzes?updated=revoked");
  }

  if(action==="delete-quiz"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const quizId=value(form,"quizId"),quiz=profile.role==="admin"?await db.prepare("SELECT id,scope FROM quizzes WHERE id=?").bind(quizId).first<{id:string;scope:string}>():await db.prepare("SELECT q.id,q.scope FROM quizzes q LEFT JOIN courses c ON c.id=q.course_id WHERE q.id=? AND q.tutor_id=? AND (q.scope='standalone' OR (c.creator_role='tutor' AND c.creator_id=?))").bind(quizId,profile.id,profile.id).first<{id:string;scope:string}>();
    if(!quiz)return NextResponse.json({error:"Tutors can delete only quizzes they created"},{status:403});
    const blobs=await db.prepare("SELECT image_r2_key key FROM quiz_questions WHERE quiz_id=? AND image_r2_key!=''").bind(quizId).all<{key:string}>();
    await Promise.all(blobs.results.map(item=>env.FILES.delete(item.key)));
    await db.batch([db.prepare("DELETE FROM assessment_reset_requests WHERE quiz_id=?").bind(quizId),db.prepare("DELETE FROM quiz_assignments WHERE quiz_id=?").bind(quizId),db.prepare("DELETE FROM quiz_attempts WHERE quiz_id=?").bind(quizId),db.prepare("DELETE FROM quiz_questions WHERE quiz_id=?").bind(quizId),db.prepare("DELETE FROM quizzes WHERE id=?").bind(quizId)]);
    return redirectTo(request,quiz.scope==="standalone"?"/dashboard/tutor/quizzes?deleted=quiz":"/dashboard/tutor/curriculum?deleted=quiz");
  }

  if(action==="request-assessment-reset"){
    if(profile.role!=="student"&&profile.role!=="admin")return NextResponse.json({error:"Student access required"},{status:403});const learnerId=profile.role==="admin"?"usr_demo_student":profile.id,quizId=value(form,"quizId"),reason=value(form,"reason").slice(0,1000);const eligible=await db.prepare("SELECT q.id FROM quizzes q JOIN quiz_attempts qa ON qa.quiz_id=q.id AND qa.student_id=? WHERE q.id=? AND q.kind='final_assessment' GROUP BY q.id HAVING COUNT(qa.id)>=MAX(q.attempt_limit)").bind(learnerId,quizId).first();if(!eligible)return redirectTo(request,"/dashboard/student/curriculum?error=reset-not-available");const existing=await db.prepare("SELECT id FROM assessment_reset_requests WHERE quiz_id=? AND learner_id=? AND status='pending'").bind(quizId,learnerId).first();if(!existing)await db.prepare("INSERT INTO assessment_reset_requests (id,quiz_id,learner_id,requested_by,reason,status,requested_at) VALUES (?,?,?,?,?,'pending',?)").bind(createId("rst"),quizId,learnerId,learnerId,reason,new Date().toISOString()).run();const returnTo=value(form,"returnTo");return redirectTo(request,returnTo.startsWith("/dashboard/student/")?returnTo:"/dashboard/student/curriculum?updated=reset-requested");
  }

  if(action==="approve-assessment-reset"||action==="reset-assessment-attempt"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const quizId=value(form,"quizId"),learnerId=value(form,"learnerId"),requestId=value(form,"requestId");const quiz=profile.role==="admin"?await db.prepare("SELECT id FROM quizzes WHERE id=? AND kind='final_assessment'").bind(quizId).first():await db.prepare("SELECT q.id FROM quizzes q WHERE q.id=? AND q.kind='final_assessment' AND q.tutor_id=?").bind(quizId,profile.id).first();if(!quiz)return NextResponse.json({error:"Assessment reset is not permitted"},{status:403});await db.batch([db.prepare("DELETE FROM quiz_attempts WHERE quiz_id=? AND student_id=?").bind(quizId,learnerId),db.prepare("UPDATE assessment_reset_requests SET status='approved',reviewer_id=?,reviewed_at=? WHERE id=? AND quiz_id=? AND learner_id=?").bind(profile.id,new Date().toISOString(),requestId||"__manual__",quizId,learnerId)]);return redirectTo(request,"/dashboard/tutor/quizzes?updated=assessment-reset");
  }

  if(action==="submit-quiz"){
    if(profile.role!=="student"&&profile.role!=="admin")return NextResponse.json({error:"Student access required"},{status:403});
    const studentId=profile.role==="admin"?"usr_demo_student":profile.id,quizId=value(form,"quizId"),returnTo=value(form,"returnTo");
    const quiz=await db.prepare(`SELECT q.id,q.course_id,q.scope,q.kind,q.attempt_limit,q.question_count
      FROM quizzes q
      WHERE q.id=? AND q.status='published' AND (
        (q.scope='course' AND EXISTS(SELECT 1 FROM courses c JOIN enrollments e ON e.course_id=c.id LEFT JOIN chapters ch ON ch.id=q.chapter_id WHERE c.id=q.course_id AND e.student_id=? AND c.is_unlocked=1 AND (c.course_mode='self_paced' OR (q.is_unlocked=1 AND (q.chapter_id IS NULL OR ch.is_unlocked=1)))))
        OR (q.scope='standalone' AND q.is_unlocked=1 AND EXISTS(SELECT 1 FROM quiz_assignments a WHERE a.quiz_id=q.id AND a.status='active' AND (a.student_id=? OR a.student_id IS NULL)))
      )`).bind(quizId,studentId,studentId).first<{id:string;course_id:string|null;scope:string;kind:string;attempt_limit:number;question_count:number}>();
    if(!quiz||quiz.course_id&&!await studentCanOpen(quiz.course_id,studentId,"quiz",quiz.id))return NextResponse.json({error:"Quiz unavailable"},{status:404});
    const attempts=await db.prepare("SELECT COUNT(*) total FROM quiz_attempts WHERE quiz_id=? AND student_id=?").bind(quizId,studentId).first<{total:number}>();
    if((attempts?.total??0)>=quiz.attempt_limit)return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?returnTo:"/dashboard/student/quizzes?tab=completed&error=attempt-limit");
    const questions=await db.prepare("SELECT id,answer_json,points FROM quiz_questions WHERE quiz_id=? ORDER BY position").bind(quizId).all<{id:string;answer_json:string;points:number}>();
    if(questions.results.length!==quiz.question_count)return NextResponse.json({error:"Quiz questions are incomplete"},{status:409});
    let score=0,max=0;const answers:Record<string,string>={};for(const q of questions.results){const rawGiven=value(form,`answer_${q.id}`),given=rawGiven.toLowerCase().replace(/\s*\|\s*/g,'|').replace(/\s*=\s*/g,'='),correct=(JSON.parse(q.answer_json)as string).toLowerCase().replace(/\s*\|\s*/g,'|').replace(/\s*=\s*/g,'=');answers[q.id]=rawGiven;max+=q.points;if(given===correct)score+=q.points;}
    const now=new Date().toISOString();await db.batch([db.prepare("INSERT INTO quiz_attempts (id,quiz_id,student_id,answers_json,score,max_score,submitted_at) VALUES (?,?,?,?,?,?,?)").bind(createId("qat"),quizId,studentId,JSON.stringify(answers),score,max,now),db.prepare("INSERT INTO student_gamification (id,student_id,xp,level,streak_days,updated_at) VALUES (?,?,?,1,1,?) ON CONFLICT(student_id) DO UPDATE SET xp=xp+?,level=MAX(level,CAST((xp+?)/100 AS INTEGER)+1),updated_at=excluded.updated_at").bind(createId("gam"),studentId,score,now,score,score)]);
    if(quiz.course_id)await updateCourseProgress(quiz.course_id,studentId);
    return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?returnTo:`/dashboard/student/quizzes?tab=completed&submitted=quiz&score=${score}&max=${max}#quiz-${quizId}`);
  }

  if (action === "update-subscription") {
    if (!(await canManage(profile, "manage_students"))) return NextResponse.json({ error: "Student management access required" }, { status: 403 });
    const studentId = value(form, "studentId"); const student = await db.prepare("SELECT id FROM users WHERE id=? AND role='student'").bind(studentId).first();
    if (!student) return NextResponse.json({ error: "Student not found" }, { status: 404 });
    const plan = allowed(value(form, "planType"), ["trial","paid"] as const, "trial");
    const classes = Math.max(1, Math.min(1000, Number(value(form,"classAllowance")) || (plan === "trial" ? 1 : 8)));
    const months = Math.max(0, Math.min(60, Number(value(form,"months")) || (plan === "paid" ? 1 : 0)));
    const now = new Date(); const expires = plan === "paid" ? addMonths(now, months || 1) : new Date(now.getTime() + 7 * 86400000);
    await db.prepare(`INSERT INTO student_subscriptions (id,student_id,plan_type,class_allowance,months_purchased,started_at,expires_at,renewal_count,notes,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?) ON CONFLICT(student_id) DO UPDATE SET plan_type=excluded.plan_type,class_allowance=excluded.class_allowance,months_purchased=excluded.months_purchased,started_at=excluded.started_at,expires_at=excluded.expires_at,notes=excluded.notes,updated_at=excluded.updated_at`).bind(createId("subp"),studentId,plan,classes,months,now.toISOString(),expires.toISOString(),value(form,"notes"),now.toISOString()).run();
    return redirectTo(request, `/dashboard/admin/students/${encodeURIComponent(studentId)}?updated=subscription`);
  }

  if (action === "renew-subscription") {
    if (!(await canManage(profile, "manage_students"))) return NextResponse.json({ error: "Student management access required" }, { status: 403 });
    const studentId = value(form,"studentId"); const subscription = await db.prepare("SELECT * FROM student_subscriptions WHERE student_id=?").bind(studentId).first<{id:string;class_allowance:number;months_purchased:number;expires_at:string}>();
    if (!subscription) return redirectTo(request, `/dashboard/admin/students/${encodeURIComponent(studentId)}?error=no-subscription`);
    const addedClasses = Math.max(1,Math.min(1000,Number(value(form,"addedClasses"))||8)); const addedMonths = Math.max(1,Math.min(60,Number(value(form,"addedMonths"))||1));
    const base = new Date(subscription.expires_at) > new Date() ? new Date(subscription.expires_at) : new Date(); const nextExpiry = addMonths(base,addedMonths); const now = new Date().toISOString();
    await db.batch([db.prepare("UPDATE student_subscriptions SET plan_type='paid',class_allowance=class_allowance+?,months_purchased=months_purchased+?,expires_at=?,renewal_count=renewal_count+1,updated_at=? WHERE id=?").bind(addedClasses,addedMonths,nextExpiry.toISOString(),now,subscription.id),db.prepare("INSERT INTO subscription_renewals (id,subscription_id,added_classes,added_months,previous_expiry,new_expiry,created_by,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(createId("ren"),subscription.id,addedClasses,addedMonths,subscription.expires_at,nextExpiry.toISOString(),profile.id,now)]);
    return redirectTo(request, `/dashboard/admin/students/${encodeURIComponent(studentId)}?updated=renewal`);
  }

  if (action === "schedule-class") {
    if (profile.role !== "tutor" && profile.role !== "admin") return NextResponse.json({ error: "Tutor access required" }, { status: 403 });
    const tutorId = profile.role === "admin" ? "usr_demo_tutor" : profile.id;
    const courseId = value(form, "courseId"); const studentId = value(form, "studentId") || null;
    const course = await db.prepare("SELECT id,course_mode FROM courses WHERE id=? AND tutor_id=?").bind(courseId, tutorId).first<{id:string;course_mode:string}>();
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    const title = value(form, "title"); const startsAt = value(form, "startsAt");const timeZone=validTimeZone(value(form,"timeZone")||"Asia/Kolkata");const startsAtUtc=zonedLocalToUtc(startsAt,timeZone);
    const duration = Math.max(15, Math.min(180, Number(value(form, "duration")) || 60)),meetingUrl=safeHttpsUrl(value(form,"meetingUrl"));
    const enrolled=studentId?await db.prepare("SELECT id FROM enrollments WHERE course_id=? AND student_id=?").bind(courseId,studentId).first():null;
    if (!title || !startsAtUtc || !meetingUrl || (studentId&&!enrolled)) return redirectTo(request, "/dashboard/tutor/classes/new?error=invalid-class");
    await db.prepare("INSERT INTO live_classes (id, course_id, tutor_id, student_id, title, starts_at, duration_minutes, meeting_url, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', '')").bind(createId("cls"), courseId, tutorId, studentId, title, startsAtUtc, duration, meetingUrl).run();
    return redirectTo(request, "/dashboard/tutor/classes?created=class");
  }

  if(action==="update-class"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,classId=value(form,"classId"),courseId=value(form,"courseId"),studentId=value(form,"studentId")||null,title=value(form,"title").slice(0,180),timeZone=validTimeZone(value(form,"timeZone")||"Asia/Kolkata"),startsAtUtc=zonedLocalToUtc(value(form,"startsAt"),timeZone),duration=Math.max(15,Math.min(180,Number(value(form,"duration"))||60)),meetingUrl=safeHttpsUrl(value(form,"meetingUrl"));
    const [scheduledClass,course,enrolled]=await Promise.all([
      db.prepare("SELECT id FROM live_classes WHERE id=? AND tutor_id=? AND status='scheduled'").bind(classId,tutorId).first(),
      db.prepare("SELECT id FROM courses WHERE id=? AND tutor_id=? AND status='active'").bind(courseId,tutorId).first(),
      studentId?db.prepare("SELECT id FROM enrollments WHERE course_id=? AND student_id=?").bind(courseId,studentId).first():Promise.resolve(null),
    ]);
    if(!scheduledClass||!course||!title||!startsAtUtc||!meetingUrl||(studentId&&!enrolled))return redirectTo(request,`/dashboard/tutor/classes/${encodeURIComponent(classId)}/edit?error=invalid-class`);
    await db.prepare("UPDATE live_classes SET course_id=?,student_id=?,title=?,starts_at=?,duration_minutes=?,meeting_url=? WHERE id=? AND tutor_id=? AND status='scheduled'").bind(courseId,studentId,title,startsAtUtc,duration,meetingUrl,classId,tutorId).run();
    return redirectTo(request,"/dashboard/tutor/classes?updated=class");
  }

  if(action==="delete-class"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,classId=value(form,"classId");
    const result=await db.prepare("DELETE FROM live_classes WHERE id=? AND tutor_id=? AND status='scheduled'").bind(classId,tutorId).run();
    if(!result.meta.changes)return NextResponse.json({error:"Scheduled class not found"},{status:404});
    return redirectTo(request,"/dashboard/tutor/classes?deleted=class");
  }

  if(action==="replace-weekly-availability"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?(value(form,"tutorId")||"usr_demo_tutor"):profile.id,timezone=value(form,"timeZone");
    if(validTimeZone(timezone)!==timezone)return redirectTo(request,"/dashboard/tutor/classes?error=availability");
    const now=new Date().toISOString(),slots:Array<{weekday:number;start:number;end:number}>=[];
    for(let weekday=0;weekday<7;weekday+=1){
      if(value(form,`open_${weekday}`)!=="1")continue;
      const start=clockMinutes(value(form,`start_${weekday}`)),end=clockMinutes(value(form,`end_${weekday}`));
      if(start<0||end<=start)return redirectTo(request,"/dashboard/tutor/classes?error=availability");
      slots.push({weekday,start,end});
    }
    const tutor=await db.prepare("SELECT id FROM users WHERE id=? AND role='tutor' AND status='active'").bind(tutorId).first();
    if(!tutor)return redirectTo(request,"/dashboard/tutor/classes?error=availability-tutor");
    await db.batch([
      db.prepare("DELETE FROM tutor_availability_slots WHERE tutor_id=?").bind(tutorId),
      ...slots.map(slot=>db.prepare("INSERT INTO tutor_availability_slots (id,tutor_id,weekday,start_minutes,end_minutes,timezone,is_open,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)").bind(createId("slt"),tutorId,slot.weekday,slot.start,slot.end,timezone,now,now)),
    ]);
    return redirectTo(request,"/dashboard/tutor/classes?updated=availability");
  }

  if(action==="save-availability-slot"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==="admin"?(value(form,"tutorId")||"usr_demo_tutor"):profile.id,weekday=Math.max(0,Math.min(6,Number(value(form,"weekday")))),start=clockMinutes(value(form,"startTime")),end=clockMinutes(value(form,"endTime")),timezone=value(form,"timeZone");if(start<0||end<=start||validTimeZone(timezone)!==timezone)return redirectTo(request,"/dashboard/tutor/classes?error=availability");const tutor=await db.prepare("SELECT id FROM users WHERE id=? AND role='tutor' AND status='active'").bind(tutorId).first(),overlap=await db.prepare("SELECT id FROM tutor_availability_slots WHERE tutor_id=? AND weekday=? AND is_open=1 AND start_minutes<? AND end_minutes>?").bind(tutorId,weekday,end,start).first();if(!tutor)return redirectTo(request,"/dashboard/tutor/classes?error=availability-tutor");if(overlap)return redirectTo(request,"/dashboard/tutor/classes?error=availability-overlap");const now=new Date().toISOString();await db.prepare("INSERT INTO tutor_availability_slots (id,tutor_id,weekday,start_minutes,end_minutes,timezone,is_open,created_at,updated_at) VALUES (?,?,?,?,?,?,1,?,?)").bind(createId("slt"),tutorId,weekday,start,end,timezone,now,now).run();return redirectTo(request,"/dashboard/tutor/classes?updated=availability");
  }

  if(action==="delete-availability-slot"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const slotId=value(form,"slotId");const result=profile.role==="admin"?await db.prepare("DELETE FROM tutor_availability_slots WHERE id=?").bind(slotId).run():await db.prepare("DELETE FROM tutor_availability_slots WHERE id=? AND tutor_id=?").bind(slotId,profile.id).run();if(!result.meta.changes)return NextResponse.json({error:"Availability slot not found"},{status:404});return redirectTo(request,"/dashboard/tutor/classes?updated=availability");
  }

  if(action==="confirm-demo-booking"){
    if(!(await canManage(profile,"manage_classes")))return NextResponse.json({error:"Class management access required"},{status:403});
    const bookingId=value(form,"bookingId"),courseId=value(form,"courseId"),tutorId=value(form,"tutorId"),meetingUrl=safeHttpsUrl(value(form,"meetingUrl"));
    const booking=await db.prepare("SELECT id,student_name,starts_at,duration_minutes,notes FROM demo_bookings WHERE id=? AND status='requested'").bind(bookingId).first<{id:string;student_name:string;starts_at:string;duration_minutes:number;notes:string}>(),course=await db.prepare("SELECT id FROM courses WHERE id=? AND status='active'").bind(courseId).first(),tutor=await db.prepare("SELECT id FROM users WHERE id=? AND role='tutor' AND status='active'").bind(tutorId).first();
    if(!booking||!course||!tutor||!meetingUrl)return redirectTo(request,"/dashboard/admin/classes?error=demo-confirmation");
    await db.batch([
      db.prepare("UPDATE demo_bookings SET tutor_id=?,status='confirmed' WHERE id=? AND status='requested'").bind(tutorId,bookingId),
      db.prepare("INSERT INTO live_classes (id,course_id,tutor_id,student_id,title,starts_at,duration_minutes,meeting_url,status,notes) VALUES (?,?,?,NULL,?,?,?,?, 'scheduled',?)").bind(createId("cls"),courseId,tutorId,`Demo class · ${booking.student_name}`.slice(0,180),booking.starts_at,Number(booking.duration_minutes??30),meetingUrl,booking.notes),
    ]);
    return redirectTo(request,"/dashboard/admin/classes?updated=demo-confirmed");
  }

  if(action==="request-class-confirmation"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,classId=value(form,"classId");
    const result=await db.prepare("UPDATE live_classes SET status='awaiting_confirmation',confirmation_requested_at=? WHERE id=? AND tutor_id=? AND student_id IS NOT NULL AND status='scheduled' AND starts_at<=?").bind(new Date().toISOString(),classId,tutorId,new Date().toISOString()).run();
    if(!result.meta.changes)return NextResponse.json({error:"This class cannot be sent for confirmation"},{status:409});
    return redirectTo(request,"/dashboard/tutor/classes?updated=confirmation-requested");
  }

  if(action==="confirm-class"){
    if(profile.role!=="student"&&profile.role!=="admin")return NextResponse.json({error:"Student access required"},{status:403});
    const studentId=profile.role==="admin"?"usr_demo_student":profile.id,classId=value(form,"classId"),rawRating=Number(value(form,"rating")),rating=Math.max(1,Math.min(5,rawRating)),feedback=value(form,"feedback").slice(0,1200);
    if(!Number.isInteger(rawRating)||rawRating<1||rawRating>5)return redirectTo(request,"/dashboard/student/classes?error=rating-required");
    const result=await db.prepare("UPDATE live_classes SET status='completed',student_confirmed_at=?,student_rating=?,student_feedback=? WHERE id=? AND student_id=? AND status='awaiting_confirmation' AND starts_at<=?").bind(new Date().toISOString(),rating,feedback,classId,studentId,new Date().toISOString()).run();
    if(!result.meta.changes)return NextResponse.json({error:"Class confirmation is not available"},{status:409});
    return redirectTo(request,"/dashboard/student/classes?updated=class-confirmed");
  }

  if (action === "create-activity") {
    if (profile.role !== "tutor" && profile.role !== "admin") return NextResponse.json({ error: "Tutor access required" }, { status: 403 });
    const courseId = value(form, "courseId"); let chapterId=value(form,"chapterId")||null;
    const course=profile.role==="admin"?await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND status='active'").bind(courseId).first<{id:string;tutor_id:string;course_mode:string}>():await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND tutor_id=? AND creator_role='tutor' AND creator_id=?").bind(courseId,profile.id,profile.id).first<{id:string;tutor_id:string;course_mode:string}>(),tutorId=course?.tutor_id??profile.id;
    if(course&&!chapterId){const firstChapter=await db.prepare("SELECT id FROM chapters WHERE course_id=? AND tutor_id=? ORDER BY position LIMIT 1").bind(courseId,tutorId).first<{id:string}>();chapterId=firstChapter?.id??null;}
    const chapter=chapterId?await db.prepare("SELECT id FROM chapters WHERE id=? AND course_id=? AND tutor_id=?").bind(chapterId,courseId,tutorId).first():null;
    if (!course||chapterId&&!chapter) return NextResponse.json({ error: "Course or chapter not found" }, { status: 404 });
    const type = allowed(value(form, "type"), ["homework", "quiz", "assessment", "assignment", "classwork"] as const, "homework");
    const title = value(form, "title"); const instructions = value(form, "instructions"); const dueAt = value(form, "dueAt");
    const points = Math.max(1, Math.min(1000, Number(value(form, "points")) || 100));
    if (!title || !instructions || !dueAt) return redirectTo(request, "/dashboard/tutor/work/new?error=invalid-work");
    await db.prepare("INSERT INTO activities (id, course_id, chapter_id, tutor_id, title, type, instructions, due_at, points, is_unlocked, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)").bind(createId("act"), courseId, chapterId, tutorId, title, type, instructions, new Date(dueAt).toISOString(), points, course.course_mode==="self_paced"?1:form.get("isUnlocked")?1:0, new Date().toISOString()).run();
    const returnTo=value(form,"returnTo");return redirectTo(request,returnTo.startsWith("/dashboard/tutor/")?returnTo:"/dashboard/tutor/work?created=activity");
  }

  if (action === "create-lesson") {
    if (profile.role !== "tutor" && profile.role !== "admin") return NextResponse.json({ error: "Tutor access required" }, { status: 403 });
    const courseId=value(form,"courseId"),chapterId=value(form,"chapterId")||null;const course=profile.role==="admin"?await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND status='active'").bind(courseId).first<{id:string;tutor_id:string;course_mode:string}>():await db.prepare("SELECT id,tutor_id,course_mode FROM courses WHERE id=? AND tutor_id=? AND creator_role='tutor' AND creator_id=? AND status='active'").bind(courseId,profile.id,profile.id).first<{id:string;tutor_id:string;course_mode:string}>();const tutorId=course?.tutor_id??profile.id;
    const title=value(form,"title"),summary=value(form,"summary"),format=allowed(value(form,"contentFormat"),["html","video","scorm","presentation","document","iframe","game","audio","image"] as const,"html"),content=sanitizeLessonHtml(value(form,"content")),rawEmbed=(value(form,"embedUrl")||value(form,"videoUrl")).slice(0,1200),embedUrl=["iframe","game"].includes(format)?safeHttpsUrl(rawEmbed):rawEmbed,position=Math.max(1,Number(value(form,"position"))||1),duration=Math.max(5,Math.min(240,Number(value(form,"duration"))||30));
    const mediaFiles=form.getAll("mediaFiles").filter((entry):entry is File=>entry instanceof File&&entry.size>0).slice(0,8);
    if(embedUrl&&!/^https?:\/\//i.test(embedUrl))return redirectTo(request,"/dashboard/tutor/curriculum?error=invalid-media-url");
    if(["iframe","game"].includes(format)&&!embedUrl)return redirectTo(request,"/dashboard/tutor/curriculum?error=invalid-embed");
    if(["video","audio"].includes(format)&&!embedUrl&&!mediaFiles.length)return redirectTo(request,"/dashboard/tutor/curriculum?error=missing-media");
    if(["scorm","presentation","document","image"].includes(format)&&!mediaFiles.length)return redirectTo(request,"/dashboard/tutor/curriculum?error=missing-file");
    if(mediaFiles.some(file=>!lessonFileExtensions.has(extension(file))||file.size>4*1024*1024))return redirectTo(request,"/dashboard/tutor/curriculum?error=resource-type");
    const chapter=chapterId?await db.prepare("SELECT id FROM chapters WHERE id=? AND course_id=?").bind(chapterId,courseId).first():null;if(!course||!title||!summary||!content||(chapterId&&!chapter)) return redirectTo(request,"/dashboard/tutor/curriculum?error=invalid-lesson");
    const lessonId=createId("les");await db.prepare("INSERT INTO lessons (id,course_id,chapter_id,tutor_id,title,summary,content,content_format,embed_url,video_url,position,duration_minutes,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'published',?)").bind(lessonId,courseId,chapterId,tutorId,title,summary,content,format,embedUrl,format==="video"?embedUrl:"",position,duration,course.course_mode==="self_paced"?1:form.get('isUnlocked')?1:0,new Date().toISOString()).run();
    for(const file of mediaFiles)await storeLessonFile(lessonId,file,file.name,format);
    return redirectTo(request,"/dashboard/tutor/curriculum?created=lesson");
  }

  if (action === "complete-lesson") {
    if (profile.role !== "student" && profile.role !== "admin") return NextResponse.json({ error: "Student access required" }, { status: 403 });
    const studentId=profile.role==="admin"?"usr_demo_student":profile.id; const lessonId=value(form,"lessonId");
    const assigned=await db.prepare("SELECT l.id,l.course_id FROM lessons l JOIN courses c ON c.id=l.course_id JOIN enrollments e ON e.course_id=l.course_id LEFT JOIN chapters ch ON ch.id=l.chapter_id WHERE l.id=? AND e.student_id=? AND l.status='published' AND c.is_unlocked=1 AND (c.course_mode='self_paced' OR (l.is_unlocked=1 AND (l.chapter_id IS NULL OR ch.is_unlocked=1)))").bind(lessonId,studentId).first<{id:string;course_id:string}>();
    if(!assigned||!await studentCanOpen(assigned.course_id,studentId,"lesson",lessonId)) return NextResponse.json({error:"Lesson not available"},{status:404});
    const existing=await db.prepare("SELECT id FROM lesson_progress WHERE lesson_id=? AND student_id=?").bind(lessonId,studentId).first();const now=new Date().toISOString();if(!existing){await db.prepare("INSERT INTO lesson_progress (id,lesson_id,student_id,completed_at) VALUES (?,?,?,?)").bind(createId("lpr"),lessonId,studentId,now).run();await db.prepare("INSERT INTO student_gamification (id,student_id,xp,level,streak_days,updated_at) VALUES (?,?,50,2,1,?) ON CONFLICT(student_id) DO UPDATE SET xp=xp+50,level=level+1,streak_days=streak_days+1,updated_at=excluded.updated_at").bind(createId("gam"),studentId,now).run();const game=await db.prepare("SELECT xp FROM student_gamification WHERE student_id=?").bind(studentId).first<{xp:number}>();const available=await db.prepare("SELECT id FROM badges WHERE xp_required<=?").bind(game?.xp??0).all<{id:string}>();if(available.results.length)await db.batch(available.results.map(b=>db.prepare("INSERT OR IGNORE INTO student_badges (id,student_id,badge_id,awarded_at) VALUES (?,?,?,?)").bind(createId("sbd"),studentId,b.id,now)));}
    await updateCourseProgress(assigned.course_id,studentId);
    const returnTo=value(form,"returnTo");
    return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")||returnTo==="/dashboard/student/certificates"?returnTo:"/dashboard/student/curriculum?updated=lesson");
  }

  if(action==="save-lesson-note"){
    if(profile.role!=="student"&&profile.role!=="admin")return NextResponse.json({error:"Student access required"},{status:403});
    const studentId=profile.role==="admin"?"usr_demo_student":profile.id,lessonId=value(form,"lessonId"),body=value(form,"body").slice(0,12000),returnTo=value(form,"returnTo");
    const lesson=await db.prepare("SELECT l.id,l.course_id FROM lessons l JOIN courses c ON c.id=l.course_id JOIN enrollments e ON e.course_id=l.course_id AND e.student_id=? LEFT JOIN chapters ch ON ch.id=l.chapter_id WHERE l.id=? AND l.status='published' AND c.is_unlocked=1 AND (c.course_mode='self_paced' OR (l.is_unlocked=1 AND (l.chapter_id IS NULL OR ch.is_unlocked=1)))").bind(studentId,lessonId).first<{id:string;course_id:string}>();
    if(!lesson||!await studentCanOpen(lesson.course_id,studentId,"lesson",lessonId))return NextResponse.json({error:"Lesson unavailable"},{status:404});
    await db.prepare("INSERT INTO lesson_notes (id,lesson_id,student_id,body,updated_at) VALUES (?,?,?,?,?) ON CONFLICT(lesson_id,student_id) DO UPDATE SET body=excluded.body,updated_at=excluded.updated_at").bind(createId("lnt"),lessonId,studentId,body,new Date().toISOString()).run();
    return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?`${returnTo}${returnTo.includes("?")?"&":"?"}saved=note`:"/dashboard/student/curriculum?updated=note");
  }

  if (action === "send-message") {
    const body=value(form,"body"); const courseId=value(form,"courseId"); const recipientId=value(form,"recipientId"); const persona=value(form,"persona");
    if(!body||body.length>4000) return NextResponse.json({error:"Message is required"},{status:400});
    if(profile.role==="student"||(profile.role==="admin"&&persona==="student")){
      const senderId=profile.role==="admin"?"usr_demo_student":profile.id;
      const valid=await db.prepare("SELECT c.tutor_id FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE c.id=? AND e.student_id=? AND c.tutor_id=?").bind(courseId,senderId,recipientId).first();
      if(!valid) return NextResponse.json({error:"Conversation not available"},{status:403});
      const risks=contactSharingRisks(body);if(risks.length){await db.prepare("INSERT INTO chat_moderation_alerts (id,sender_id,recipient_id,course_id,blocked_body,reasons_json,status,created_at) VALUES (?,?,?,?,?,?,'open',?)").bind(createId("alt"),senderId,recipientId,courseId,body,JSON.stringify(risks),new Date().toISOString()).run();return redirectTo(request,`/dashboard/student/messages?course=${encodeURIComponent(courseId)}&error=contact-blocked`);}
      await db.prepare("INSERT INTO messages (id,course_id,sender_id,recipient_id,body,created_at) VALUES (?,?,?,?,?,?)").bind(createId("msg"),courseId,senderId,recipientId,body,new Date().toISOString()).run();
      return redirectTo(request,`/dashboard/student/messages?course=${encodeURIComponent(courseId)}&sent=1`);
    }
    if(profile.role==="tutor"||(profile.role==="admin"&&persona==="tutor")){
      const senderId=profile.role==="admin"?"usr_demo_tutor":profile.id;
      const valid=await db.prepare("SELECT e.student_id FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE c.id=? AND c.tutor_id=? AND e.student_id=?").bind(courseId,senderId,recipientId).first();
      if(!valid) return NextResponse.json({error:"Conversation not available"},{status:403});
      const risks=contactSharingRisks(body);if(risks.length){await db.prepare("INSERT INTO chat_moderation_alerts (id,sender_id,recipient_id,course_id,blocked_body,reasons_json,status,created_at) VALUES (?,?,?,?,?,?,'open',?)").bind(createId("alt"),senderId,recipientId,courseId,body,JSON.stringify(risks),new Date().toISOString()).run();return redirectTo(request,`/dashboard/tutor/messages?student=${encodeURIComponent(recipientId)}&course=${encodeURIComponent(courseId)}&error=contact-blocked`);}
      await db.prepare("INSERT INTO messages (id,course_id,sender_id,recipient_id,body,created_at) VALUES (?,?,?,?,?,?)").bind(createId("msg"),courseId,senderId,recipientId,body,new Date().toISOString()).run();
      return redirectTo(request,`/dashboard/tutor/messages?student=${encodeURIComponent(recipientId)}&course=${encodeURIComponent(courseId)}&sent=1`);
    }
    return NextResponse.json({error:"Messaging access required"},{status:403});
  }

  if (action === "review-submission") {
    if (profile.role !== "tutor" && profile.role !== "admin") return NextResponse.json({ error: "Tutor access required" }, { status: 403 });
    const tutorId = profile.role === "admin" ? "usr_demo_tutor" : profile.id;
    const submissionId = value(form, "submissionId"); const score = Math.max(0, Math.min(100, Number(value(form, "score")) || 0));
    const owned = await db.prepare("SELECT s.id FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE s.id=? AND a.tutor_id=?").bind(submissionId, tutorId).first();
    if (!owned) return NextResponse.json({ error: "Submission not found" }, { status: 404 });
    await db.prepare("UPDATE submissions SET score=?, feedback=?, status='reviewed' WHERE id=?").bind(score, value(form, "feedback"), submissionId).run();
    return redirectTo(request, "/dashboard/tutor/submissions?updated=feedback");
  }

  if (action === "submit-activity") {
    if (profile.role !== "student" && profile.role !== "admin") return NextResponse.json({ error: "Student access required" }, { status: 403 });
    const studentId = profile.role === "admin" ? "usr_demo_student" : profile.id;
    const activityId = value(form, "activityId"),response=value(form,"response").slice(0,20000),returnTo=value(form,"returnTo");
    const files=form.getAll("attachments").filter((entry):entry is File=>entry instanceof File&&entry.size>0);
    if(files.length>5||files.some(file=>!assignmentFileExtensions.has(extension(file))||file.size>20*1024*1024))return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?`${returnTo}?error=attachment`:"/dashboard/student/work?error=attachment");
    const assigned = await db.prepare("SELECT a.id,a.course_id FROM activities a JOIN courses c ON c.id=a.course_id JOIN enrollments e ON e.course_id=a.course_id LEFT JOIN chapters ch ON ch.id=a.chapter_id WHERE a.id=? AND e.student_id=? AND a.status='published' AND c.is_unlocked=1 AND (c.course_mode='self_paced' OR (a.is_unlocked=1 AND (a.chapter_id IS NULL OR ch.is_unlocked=1)))").bind(activityId, studentId).first<{id:string;course_id:string}>();
    if (!assigned || !await studentCanOpen(assigned.course_id,studentId,"activity",activityId) || (!response&&!files.length)) return NextResponse.json({ error: "Activity not available" }, { status: 404 });
    const now=new Date().toISOString(),newSubmissionId=createId("sub");
    const submission=await db.prepare("INSERT INTO submissions (id, activity_id, student_id, response, submitted_at, feedback, status) VALUES (?, ?, ?, ?, ?, '', 'submitted') ON CONFLICT(activity_id,student_id) DO UPDATE SET response=excluded.response, submitted_at=excluded.submitted_at, status='submitted' RETURNING id").bind(newSubmissionId,activityId,studentId,response,now).first<{id:string}>();
    if(!submission)return NextResponse.json({error:"Submission could not be saved"},{status:500});
    for(const file of files){const id=createId("sat"),fileName=safeFileName(file),key=`submissions/${submission.id}/${id}-${fileName}`,contentType=safeContentType(file);await env.FILES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType}});await db.prepare("INSERT INTO submission_attachments (id,submission_id,student_id,file_name,content_type,r2_key,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id,submission.id,studentId,file.name,contentType,key,file.size,now).run();}
    await updateCourseProgress(assigned.course_id,studentId);
    return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?returnTo:"/dashboard/student/work?submitted=1");
  }

  return NextResponse.json({ error: "Unknown LMS action" }, { status: 400 });
}


