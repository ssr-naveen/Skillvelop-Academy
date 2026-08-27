import { getChatGPTUser, hashPassword } from "@/app/chatgpt-auth";
import { canManage, createId, createPublicId, database, ensureProfile, type ManagerPermission } from "@/db/lms";
import { encryptProviderKey } from "@/app/api/ai/provider";
import { NextResponse } from "next/server";
import { env } from "@/lib/platform-env";
import { validTimeZone, zonedLocalToUtc } from "@/db/timezones";
import { sanitizeLessonHtml } from "@/db/lesson-content";

function redirectTo(request: Request, path: string) { return NextResponse.redirect(new URL(path, request.url), 303); }
function value(form: FormData, name: string) { return String(form.get(name) ?? "").trim(); }
function allowed<T extends string>(input: string, options: readonly T[], fallback: T): T { return options.includes(input as T) ? input as T : fallback; }
function addMonths(value: Date, months: number) { const next = new Date(value); next.setMonth(next.getMonth() + months); return next; }

const lessonFileExtensions = new Set(["pdf","ppt","pptx","odp","zip","doc","docx","odt","rtf","txt","csv","xls","xlsx","ods","png","jpg","jpeg","webp","gif","mp4","webm","mov","mp3","m4a","wav","ogg"]);
const assignmentFileExtensions = new Set(["pdf","ppt","pptx","odp","doc","docx","odt","rtf","txt","csv","xls","xlsx","ods","png","jpg","jpeg","webp","gif"]);
function extension(file: File) { return file.name.split(".").pop()?.toLowerCase() ?? ""; }
function safeFileName(file: File) { return file.name.replace(/[^a-zA-Z0-9._-]/g,"_").slice(-180); }
function safeContentType(file:File){const types:Record<string,string>={pdf:"application/pdf",ppt:"application/vnd.ms-powerpoint",pptx:"application/vnd.openxmlformats-officedocument.presentationml.presentation",odp:"application/vnd.oasis.opendocument.presentation",zip:"application/zip",doc:"application/msword",docx:"application/vnd.openxmlformats-officedocument.wordprocessingml.document",odt:"application/vnd.oasis.opendocument.text",rtf:"application/rtf",txt:"text/plain",csv:"text/csv",xls:"application/vnd.ms-excel",xlsx:"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",ods:"application/vnd.oasis.opendocument.spreadsheet",png:"image/png",jpg:"image/jpeg",jpeg:"image/jpeg",webp:"image/webp",gif:"image/gif",mp4:"video/mp4",webm:"video/webm",mov:"video/quicktime",mp3:"audio/mpeg",m4a:"audio/mp4",wav:"audio/wav",ogg:"audio/ogg"};return types[extension(file)]??"application/octet-stream";}
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
async function storeLessonFile(lessonId:string,file:File,title:string,preferred?:string) {
  if (!lessonFileExtensions.has(extension(file)) || file.size<=0 || file.size>75*1024*1024) throw new Error("invalid lesson file");
  const db=database(),id=createId("res"),fileName=safeFileName(file),key=`lessons/${lessonId}/${id}-${fileName}`,contentType=safeContentType(file);
  await env.FILES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType}});
  await db.prepare("INSERT INTO lesson_resources (id,lesson_id,title,resource_type,file_name,content_type,r2_key,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?,?)").bind(id,lessonId,title||file.name,lessonResourceType(file,preferred),file.name,contentType,key,file.size,new Date().toISOString()).run();
}
async function updateCourseProgress(courseId:string,studentId:string) {
  const db=database();
  const counts=await db.prepare(`SELECT
    (SELECT COUNT(*) FROM lessons WHERE course_id=? AND status='published')+(SELECT COUNT(*) FROM quizzes WHERE course_id=? AND status='published')+(SELECT COUNT(*) FROM activities WHERE course_id=? AND status='published') total,
    (SELECT COUNT(*) FROM lesson_progress lp JOIN lessons l ON l.id=lp.lesson_id WHERE l.course_id=? AND l.status='published' AND lp.student_id=?)+(SELECT COUNT(DISTINCT qa.quiz_id) FROM quiz_attempts qa JOIN quizzes q ON q.id=qa.quiz_id WHERE q.course_id=? AND q.status='published' AND qa.student_id=?)+(SELECT COUNT(*) FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE a.course_id=? AND a.status='published' AND s.student_id=?) done`).bind(courseId,courseId,courseId,courseId,studentId,courseId,studentId,courseId,studentId).first<{total:number;done:number}>();
  const progress=counts?.total?Math.min(100,Math.round((counts.done/counts.total)*100)):0,now=new Date().toISOString();
  await db.prepare("UPDATE enrollments SET progress=? WHERE course_id=? AND student_id=?").bind(progress,courseId,studentId).run();
  if(progress===100)await db.prepare("INSERT OR IGNORE INTO certificates (id,student_id,course_id,certificate_code,issued_at) VALUES (?,?,?,?,?)").bind(createId("crt"),studentId,courseId,`SKV-${crypto.randomUUID().slice(0,8).toUpperCase()}`,now).run();
}

export async function POST(request: Request) {
  const identity = await getChatGPTUser();
  if (!identity) return NextResponse.json({ error: "Authentication required" }, { status: 401 });
  const profile = await ensureProfile(identity);
  if (profile.status !== "active") return NextResponse.json({ error: "Account unavailable" }, { status: 403 });
  const form = await request.formData();
  const action = value(form, "action");
  const db = database();

  if (action === "update-profile") {
    const phone=value(form,"phone").slice(0,40),timezone=value(form,"timezone").slice(0,60)||"Asia/Kolkata",bio=value(form,"bio").slice(0,2000),language=value(form,"language").slice(0,80)||"English",headline=value(form,"headline").slice(0,180),qualifications=value(form,"qualifications").slice(0,3000),experienceYears=Math.max(0,Math.min(70,Number(value(form,"experienceYears"))||0)),specialties=value(form,"specialties").slice(0,1200),achievements=value(form,"achievements").slice(0,3000),philosophy=value(form,"teachingPhilosophy").slice(0,3000),location=value(form,"location").slice(0,160),languages=value(form,"languages").slice(0,600);let linkedin=value(form,"linkedinUrl").slice(0,500),website=value(form,"websiteUrl").slice(0,500);if(linkedin&&!/^https?:\/\//i.test(linkedin))linkedin="";if(website&&!/^https?:\/\//i.test(website))website="";const now=new Date().toISOString(),existing=await db.prepare("SELECT avatar_r2_key,avatar_content_type,avatar_file_name FROM user_profiles WHERE user_id=?").bind(profile.id).first<{avatar_r2_key:string;avatar_content_type:string;avatar_file_name:string}>();let avatarKey=existing?.avatar_r2_key??"",avatarType=existing?.avatar_content_type??"",avatarName=existing?.avatar_file_name??"";const avatar=form.get("avatar");if(avatar instanceof File&&avatar.size>0){if(avatar.size>5*1024*1024||!['image/jpeg','image/png','image/webp'].includes(avatar.type))return redirectTo(request,"/dashboard/profile?error=avatar");avatarName=avatar.name.replace(/[^a-zA-Z0-9._-]/g,"_");avatarType=avatar.type;avatarKey=`profiles/${profile.id}/${crypto.randomUUID()}-${avatarName}`;await env.FILES.put(avatarKey,await avatar.arrayBuffer(),{httpMetadata:{contentType:avatarType}});}
    await db.prepare("INSERT INTO user_profiles (id,user_id,phone,timezone,bio,preferred_language,headline,qualifications,experience_years,specialties,achievements,teaching_philosophy,location,languages,linkedin_url,website_url,avatar_r2_key,avatar_content_type,avatar_file_name,is_public,updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,1,?) ON CONFLICT(user_id) DO UPDATE SET phone=excluded.phone,timezone=excluded.timezone,bio=excluded.bio,preferred_language=excluded.preferred_language,headline=excluded.headline,qualifications=excluded.qualifications,experience_years=excluded.experience_years,specialties=excluded.specialties,achievements=excluded.achievements,teaching_philosophy=excluded.teaching_philosophy,location=excluded.location,languages=excluded.languages,linkedin_url=excluded.linkedin_url,website_url=excluded.website_url,avatar_r2_key=excluded.avatar_r2_key,avatar_content_type=excluded.avatar_content_type,avatar_file_name=excluded.avatar_file_name,is_public=excluded.is_public,updated_at=excluded.updated_at").bind(createId("prf"),profile.id,phone,timezone,bio,language,headline,qualifications,experienceYears,specialties,achievements,philosophy,location,languages,linkedin,website,avatarKey,avatarType,avatarName,now).run();
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
    const title = value(form, "title"); const subject = value(form, "subject"); const level = value(form, "level");
    const description = value(form, "description"); const tutorId = value(form, "tutorId"); const studentId = value(form, "studentId") || null;const coverImageUrl=value(form,"coverImageUrl").slice(0,1000);const isUnlocked=form.get("isUnlocked")?1:0;
    const tutor = await db.prepare("SELECT id FROM users WHERE id=? AND role='tutor' AND status!='suspended'").bind(tutorId).first();
    const student = studentId ? await db.prepare("SELECT id FROM users WHERE id=? AND role='student' AND status!='suspended'").bind(studentId).first() : null;
    if (!title || !subject || !level || !description || !tutor || (studentId && !student)) return redirectTo(request, "/dashboard/admin/courses/new?error=invalid-course");
    const courseId = createId("crs"); const now = new Date().toISOString();
    const statements = [db.prepare("INSERT INTO courses (id,title,subject,level,description,cover_image_url,is_unlocked,tutor_id,status,accent,created_at) VALUES (?,?,?,?,?,?,?,?,'active','blue',?)").bind(courseId,title,subject,level,description,coverImageUrl,isUnlocked,tutorId,now)];
    if (studentId) statements.push(db.prepare("INSERT INTO enrollments (id, course_id, student_id, progress, created_at) VALUES (?, ?, ?, 0, ?)").bind(createId("enr"), courseId, studentId, now));
    await db.batch(statements);
    return redirectTo(request, "/dashboard/admin/courses?created=course");
  }

  if(action==="create-tutor-course"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==='admin'?'usr_demo_tutor':profile.id;const title=value(form,"title"),subject=value(form,"subject"),level=value(form,"level"),description=value(form,"description"),cover=value(form,"coverImageUrl").slice(0,1000);if(!title||!subject||!level||!description)return redirectTo(request,"/dashboard/tutor/courses?error=course");await db.prepare("INSERT INTO courses (id,title,subject,level,description,cover_image_url,is_unlocked,tutor_id,status,accent,created_at) VALUES (?,?,?,?,?,?,0,?,'active','blue',?)").bind(createId("crs"),title,subject,level,description,cover,tutorId,new Date().toISOString()).run();return redirectTo(request,"/dashboard/tutor/courses?created=course");
  }

  if(action==="delete-course"){
    const courseId=value(form,"courseId");
    const course=await db.prepare("SELECT id,tutor_id,is_imported FROM courses WHERE id=?").bind(courseId).first<{id:string;tutor_id:string|null;is_imported:number}>();
    if(!course)return NextResponse.json({error:"Course not found"},{status:404});
    if(profile.role==="tutor"){
      if(course.tutor_id!==profile.id||course.is_imported)return NextResponse.json({error:"Tutors can delete only courses they created themselves"},{status:403});
    }else if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Course management access required"},{status:403});
    const blobs=await db.prepare(`SELECT r2_key key FROM lesson_resources WHERE lesson_id IN (SELECT id FROM lessons WHERE course_id=?) UNION ALL SELECT image_r2_key key FROM quiz_questions WHERE quiz_id IN (SELECT id FROM quizzes WHERE course_id=?) AND image_r2_key!='' UNION ALL SELECT r2_key key FROM submission_attachments WHERE submission_id IN (SELECT s.id FROM submissions s JOIN activities a ON a.id=s.activity_id WHERE a.course_id=?)`).bind(courseId,courseId,courseId).all<{key:string}>();
    await Promise.all(blobs.results.map(item=>env.FILES.delete(item.key)));
    await db.batch([
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
      db.prepare("DELETE FROM curriculum_imports WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM chapters WHERE course_id=?").bind(courseId),
      db.prepare("DELETE FROM courses WHERE id=?").bind(courseId),
    ]);
    return redirectTo(request,profile.role==="tutor"?"/dashboard/tutor/courses?deleted=course":"/dashboard/admin/courses?deleted=course");
  }

  if(action==="create-chapter"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==='admin'?'usr_demo_tutor':profile.id,courseId=value(form,"courseId");const course=await db.prepare("SELECT id FROM courses WHERE id=? AND tutor_id=?").bind(courseId,tutorId).first();const title=value(form,"title");if(!course||!title)return redirectTo(request,"/dashboard/tutor/curriculum?error=chapter");await db.prepare("INSERT INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(createId("chp"),courseId,tutorId,title,value(form,"description"),Math.max(1,Number(value(form,"position"))||1),form.get("isUnlocked")?1:0,new Date().toISOString()).run();return redirectTo(request,"/dashboard/tutor/curriculum?created=chapter");
  }

  if(action==="set-content-unlock"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==='admin'?'usr_demo_tutor':profile.id;const entity=allowed(value(form,"entity"),['course','chapter','lesson','quiz','activity']as const,'lesson');const id=value(form,"id"),next=value(form,"next")==='1'?1:0;const config={course:{table:'courses',owner:'tutor_id'},chapter:{table:'chapters',owner:'tutor_id'},lesson:{table:'lessons',owner:'tutor_id'},quiz:{table:'quizzes',owner:'tutor_id'},activity:{table:'activities',owner:'tutor_id'}}[entity];const result=await db.prepare(`UPDATE ${config.table} SET is_unlocked=? WHERE id=? AND ${config.owner}=?`).bind(next,id,tutorId).run();if(!result.meta.changes)return NextResponse.json({error:"Content not found"},{status:404});const returnTo=value(form,"returnTo");return redirectTo(request,returnTo.startsWith('/dashboard/tutor/')?returnTo:'/dashboard/tutor/curriculum?updated=unlock');
  }

  if (action === "create-curriculum-template") {
    if (!(await canManage(profile,"manage_courses"))) return NextResponse.json({error:"Curriculum management access required"},{status:403});
    const title=value(form,"title");const subject=value(form,"subject");const level=value(form,"level");const description=value(form,"description");
    if(!title||!subject||!level||!description) return redirectTo(request,"/dashboard/admin/curriculum?error=invalid-template");
    await db.prepare("INSERT INTO curriculum_templates (id,title,subject,level,description,status,created_by,created_at) VALUES (?,?,?,?,?,'published',?,?)").bind(createId("tpl"),title,subject,level,description,profile.id,new Date().toISOString()).run();
    return redirectTo(request,"/dashboard/admin/curriculum?created=template");
  }

  if(action==="delete-curriculum-template"){
    if(!(await canManage(profile,"manage_courses")))return NextResponse.json({error:"Curriculum management access required"},{status:403});
    const templateId=value(form,"templateId");
    const template=await db.prepare("SELECT id FROM curriculum_templates WHERE id=?").bind(templateId).first();
    if(!template)return NextResponse.json({error:"Curriculum package not found"},{status:404});
    await db.batch([
      db.prepare("DELETE FROM curriculum_imports WHERE template_id=?").bind(templateId),
      db.prepare("DELETE FROM curriculum_template_lessons WHERE template_id=?").bind(templateId),
      db.prepare("DELETE FROM curriculum_templates WHERE id=?").bind(templateId),
    ]);
    return redirectTo(request,"/dashboard/admin/curriculum?deleted=curriculum");
  }

  if (action === "add-template-lesson") {
    if (!(await canManage(profile,"manage_courses"))) return NextResponse.json({error:"Curriculum management access required"},{status:403});
    const templateId=value(form,"templateId");const template=await db.prepare("SELECT id FROM curriculum_templates WHERE id=? AND status!='archived'").bind(templateId).first();const title=value(form,"title");const summary=value(form,"summary");const content=value(form,"content");const position=Math.max(1,Number(value(form,"position"))||1);const duration=Math.max(5,Math.min(240,Number(value(form,"duration"))||30));
    if(!template||!title||!summary||!content) return redirectTo(request,"/dashboard/admin/curriculum?error=invalid-template-lesson");
    await db.prepare("INSERT INTO curriculum_template_lessons (id,template_id,title,summary,content,position,duration_minutes,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(createId("tpll"),templateId,title,summary,content,position,duration,new Date().toISOString()).run();
    return redirectTo(request,"/dashboard/admin/curriculum?updated=template-lesson");
  }

  if (action === "import-curriculum") {
    if(profile.role!=="tutor"&&profile.role!=="admin") return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;const templateId=value(form,"templateId");const template=await db.prepare("SELECT title,subject,level,description FROM curriculum_templates WHERE id=? AND status='published'").bind(templateId).first<{title:string;subject:string;level:string;description:string}>();
    if(!template) return redirectTo(request,"/dashboard/tutor/curriculum?error=curriculum-import");
    const source=await db.prepare("SELECT title,summary,content,position,duration_minutes FROM curriculum_template_lessons WHERE template_id=? ORDER BY position").bind(templateId).all<{title:string;summary:string;content:string;position:number;duration_minutes:number}>();if(!source.results.length)return redirectTo(request,"/dashboard/tutor/curriculum?error=empty-curriculum");
    const courseId=createId("crs"),chapterId=createId("chp");const now=new Date().toISOString();const statements=[db.prepare("INSERT INTO courses (id,title,subject,level,description,cover_image_url,is_unlocked,is_imported,tutor_id,status,accent,created_at) VALUES (?,?,?,?,?,'',0,1,?,'active','blue',?)").bind(courseId,template.title,template.subject,template.level,template.description,tutorId,now),db.prepare("INSERT INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at) VALUES (?,?,?,?,?,1,0,?)").bind(chapterId,courseId,tutorId,'Chapter 1',template.description,now),db.prepare("INSERT INTO curriculum_imports (id,template_id,course_id,tutor_id,imported_at) VALUES (?,?,?,?,?)").bind(createId("imp"),templateId,courseId,tutorId,now),...source.results.map(lesson=>db.prepare("INSERT INTO lessons (id,course_id,chapter_id,tutor_id,title,summary,content,position,duration_minutes,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,0,'published',?)").bind(createId("les"),courseId,chapterId,tutorId,lesson.title,lesson.summary,lesson.content,lesson.position,lesson.duration_minutes,now))];await db.batch(statements);
    return redirectTo(request,"/dashboard/tutor/courses?created=course");
  }

  if(action==="enrol-course-student"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;const courseId=value(form,"courseId"),studentId=value(form,"studentId");const valid=await db.prepare("SELECT c.id FROM courses c JOIN users u ON u.id=? AND u.role='student' WHERE c.id=? AND c.tutor_id=?").bind(studentId,courseId,tutorId).first();if(!valid)return NextResponse.json({error:"Course or student unavailable"},{status:404});await db.prepare("INSERT OR IGNORE INTO enrollments (id,course_id,student_id,progress,created_at) VALUES (?,?,?,0,?)").bind(createId("enr"),courseId,studentId,new Date().toISOString()).run();return redirectTo(request,"/dashboard/tutor/courses?updated=enrolment");
  }

  if(action==="upload-lesson-resource"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id;const lessonId=value(form,"lessonId");const lesson=await db.prepare("SELECT id FROM lessons WHERE id=? AND tutor_id=?").bind(lessonId,tutorId).first();const file=form.get("file");if(!lesson||!(file instanceof File))return redirectTo(request,"/dashboard/tutor/curriculum?error=resource");try{await storeLessonFile(lessonId,file,value(form,"title")||file.name);}catch{return redirectTo(request,"/dashboard/tutor/curriculum?error=resource-type");}return redirectTo(request,"/dashboard/tutor/curriculum?updated=resource");
  }

  if(action==="create-quiz"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,courseId=value(form,"courseId"),chapterId=value(form,"chapterId")||null;const course=await db.prepare("SELECT id FROM courses WHERE id=? AND tutor_id=?").bind(courseId,tutorId).first();const chapter=chapterId?await db.prepare("SELECT id FROM chapters WHERE id=? AND course_id=? AND tutor_id=?").bind(chapterId,courseId,tutorId).first():null;const title=value(form,"title"),description=value(form,"description"),kind=allowed(value(form,"kind"),['quiz','assessment','final_assessment']as const,'quiz');if(!course||!title||!description||(chapterId&&!chapter))return redirectTo(request,"/dashboard/tutor/quizzes?error=quiz");const limit=kind==='quiz'?Math.max(1,Math.min(10,Number(value(form,"attemptLimit"))||3)):1;await db.prepare("INSERT INTO quizzes (id,course_id,chapter_id,tutor_id,title,description,kind,attempt_limit,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,'published',?)").bind(createId("qiz"),courseId,chapterId,tutorId,title,description,kind,limit,form.get('isUnlocked')?1:0,new Date().toISOString()).run();const returnTo=value(form,"returnTo");return redirectTo(request,returnTo.startsWith('/dashboard/tutor/')?returnTo:"/dashboard/tutor/quizzes?created=quiz");
  }

  if(action==="add-quiz-question"){
    if(profile.role!=="tutor"&&profile.role!=="admin")return NextResponse.json({error:"Tutor access required"},{status:403});
    const tutorId=profile.role==="admin"?"usr_demo_tutor":profile.id,quizId=value(form,"quizId");
    const quiz=await db.prepare("SELECT id FROM quizzes WHERE id=? AND tutor_id=?").bind(quizId,tutorId).first();
    const type=allowed(value(form,"type"),['mcq','fill_blank','drag_drop','order','matching','one_word']as const,'mcq'),prompt=value(form,"prompt").slice(0,4000),answer=value(form,"answer").slice(0,4000);
    const options=value(form,"options").split(/\r?\n/).map(x=>x.trim()).filter(Boolean).slice(0,30);
    if(!quiz||!prompt||!answer||((type==='mcq'||type==='matching'||type==='order'||type==='drag_drop')&&options.length<2))return redirectTo(request,"/dashboard/tutor/quizzes?error=question");
    const questionId=createId("qq"),image=form.get("image");let imageKey="",imageName="",imageType="",imageSize=0;
    if(image instanceof File&&image.size>0){const accepted=['image/png','image/jpeg','image/webp','image/gif'];if(image.size>5*1024*1024||!accepted.includes(image.type))return redirectTo(request,"/dashboard/tutor/quizzes?error=question-image");imageName=image.name.replace(/[^a-zA-Z0-9._-]/g,'_');imageType=image.type;imageSize=image.size;imageKey=`quiz-questions/${quizId}/${questionId}-${imageName}`;await env.FILES.put(imageKey,await image.arrayBuffer(),{httpMetadata:{contentType:imageType}});}
    await db.prepare("INSERT INTO quiz_questions (id,quiz_id,type,prompt,options_json,answer_json,points,position,image_r2_key,image_file_name,image_content_type,image_size_bytes) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)").bind(questionId,quizId,type,prompt,JSON.stringify(options),JSON.stringify(answer.trim().toLowerCase()),Math.max(1,Number(value(form,"points"))||10),Math.max(1,Number(value(form,"position"))||1),imageKey,imageName,imageType,imageSize).run();
    return redirectTo(request,"/dashboard/tutor/quizzes?updated=question");
  }

  if(action==="submit-quiz"){
    const accessStudent=profile.role==="admin"?"usr_demo_student":profile.id,accessQuiz=value(form,"quizId");const contentAccess=await db.prepare("SELECT q.id FROM quizzes q JOIN courses c ON c.id=q.course_id JOIN enrollments e ON e.course_id=q.course_id LEFT JOIN chapters ch ON ch.id=q.chapter_id WHERE q.id=? AND e.student_id=? AND q.is_unlocked=1 AND c.is_unlocked=1 AND (q.chapter_id IS NULL OR ch.is_unlocked=1)").bind(accessQuiz,accessStudent).first();if(!contentAccess)return NextResponse.json({error:"Quiz is locked"},{status:403});
    if(profile.role!=="student"&&profile.role!=="admin")return NextResponse.json({error:"Student access required"},{status:403});const studentId=profile.role==="admin"?"usr_demo_student":profile.id,quizId=value(form,"quizId"),returnTo=value(form,"returnTo");const quiz=await db.prepare("SELECT q.id,q.course_id,q.kind,q.attempt_limit FROM quizzes q JOIN enrollments e ON e.course_id=q.course_id WHERE q.id=? AND e.student_id=? AND q.status='published'").bind(quizId,studentId).first<{id:string;course_id:string;kind:string;attempt_limit:number}>();if(!quiz)return NextResponse.json({error:"Quiz unavailable"},{status:404});const attempts=await db.prepare("SELECT COUNT(*) total FROM quiz_attempts WHERE quiz_id=? AND student_id=?").bind(quizId,studentId).first<{total:number}>();if((attempts?.total??0)>=quiz.attempt_limit)return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?returnTo:"/dashboard/student/quizzes?error=attempt-limit");const questions=await db.prepare("SELECT id,answer_json,points FROM quiz_questions WHERE quiz_id=? ORDER BY position").bind(quizId).all<{id:string;answer_json:string;points:number}>();let score=0,max=0;const answers:Record<string,string>={};for(const q of questions.results){const given=value(form,`answer_${q.id}`).toLowerCase().replace(/\s*\|\s*/g,'|').replace(/\s*=\s*/g,'=');const correct=(JSON.parse(q.answer_json)as string).toLowerCase().replace(/\s*\|\s*/g,'|').replace(/\s*=\s*/g,'=');answers[q.id]=given;max+=q.points;if(given===correct)score+=q.points;}const now=new Date().toISOString();await db.batch([db.prepare("INSERT INTO quiz_attempts (id,quiz_id,student_id,answers_json,score,max_score,submitted_at) VALUES (?,?,?,?,?,?,?)").bind(createId("qat"),quizId,studentId,JSON.stringify(answers),score,max,now),db.prepare("INSERT INTO student_gamification (id,student_id,xp,level,streak_days,updated_at) VALUES (?,?,?,1,1,?) ON CONFLICT(student_id) DO UPDATE SET xp=xp+?,level=MAX(level,CAST((xp+?)/100 AS INTEGER)+1),updated_at=excluded.updated_at").bind(createId("gam"),studentId,score,now,score,score)]);await updateCourseProgress(quiz.course_id,studentId);return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?returnTo:`/dashboard/student/quizzes?submitted=quiz&score=${score}&max=${max}`);
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
    const course = await db.prepare("SELECT id FROM courses WHERE id=? AND tutor_id=?").bind(courseId, tutorId).first();
    if (!course) return NextResponse.json({ error: "Course not found" }, { status: 404 });
    const title = value(form, "title"); const startsAt = value(form, "startsAt");const timeZone=validTimeZone(value(form,"timeZone")||"Asia/Kolkata");const startsAtUtc=zonedLocalToUtc(startsAt,timeZone);
    const duration = Math.max(15, Math.min(180, Number(value(form, "duration")) || 60));
    if (!title || !startsAtUtc) return redirectTo(request, "/dashboard/tutor/classes/new?error=invalid-class");
    await db.prepare("INSERT INTO live_classes (id, course_id, tutor_id, student_id, title, starts_at, duration_minutes, meeting_url, status, notes) VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', '')").bind(createId("cls"), courseId, tutorId, studentId, title, startsAtUtc, duration, value(form, "meetingUrl")).run();
    return redirectTo(request, "/dashboard/tutor/classes?created=class");
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
    const tutorId = profile.role === "admin" ? "usr_demo_tutor" : profile.id;
    const courseId = value(form, "courseId"); let chapterId=value(form,"chapterId")||null;
    const course = await db.prepare("SELECT id FROM courses WHERE id=? AND tutor_id=?").bind(courseId, tutorId).first();
    if(course&&!chapterId){const firstChapter=await db.prepare("SELECT id FROM chapters WHERE course_id=? AND tutor_id=? ORDER BY position LIMIT 1").bind(courseId,tutorId).first<{id:string}>();chapterId=firstChapter?.id??null;}
    const chapter=chapterId?await db.prepare("SELECT id FROM chapters WHERE id=? AND course_id=? AND tutor_id=?").bind(chapterId,courseId,tutorId).first():null;
    if (!course||chapterId&&!chapter) return NextResponse.json({ error: "Course or chapter not found" }, { status: 404 });
    const type = allowed(value(form, "type"), ["homework", "quiz", "assessment", "assignment", "classwork"] as const, "homework");
    const title = value(form, "title"); const instructions = value(form, "instructions"); const dueAt = value(form, "dueAt");
    const points = Math.max(1, Math.min(1000, Number(value(form, "points")) || 100));
    if (!title || !instructions || !dueAt) return redirectTo(request, "/dashboard/tutor/work/new?error=invalid-work");
    await db.prepare("INSERT INTO activities (id, course_id, chapter_id, tutor_id, title, type, instructions, due_at, points, is_unlocked, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'published', ?)").bind(createId("act"), courseId, chapterId, tutorId, title, type, instructions, new Date(dueAt).toISOString(), points, form.get("isUnlocked")?1:0, new Date().toISOString()).run();
    const returnTo=value(form,"returnTo");return redirectTo(request,returnTo.startsWith("/dashboard/tutor/")?returnTo:"/dashboard/tutor/work?created=activity");
  }

  if (action === "create-lesson") {
    if (profile.role !== "tutor" && profile.role !== "admin") return NextResponse.json({ error: "Tutor access required" }, { status: 403 });
    const tutorId = profile.role === "admin" ? "usr_demo_tutor" : profile.id; const courseId=value(form,"courseId"),chapterId=value(form,"chapterId")||null;
    const course=await db.prepare("SELECT id FROM courses WHERE id=? AND tutor_id=? AND status='active'").bind(courseId,tutorId).first();
    const title=value(form,"title"),summary=value(form,"summary"),format=allowed(value(form,"contentFormat"),["html","video","scorm","presentation","document","iframe","audio","image"] as const,"html"),content=sanitizeLessonHtml(value(form,"content")),embedUrl=(value(form,"embedUrl")||value(form,"videoUrl")).slice(0,1200),position=Math.max(1,Number(value(form,"position"))||1),duration=Math.max(5,Math.min(240,Number(value(form,"duration"))||30));
    const mediaFiles=form.getAll("mediaFiles").filter((entry):entry is File=>entry instanceof File&&entry.size>0).slice(0,8);
    if(embedUrl&&!/^https?:\/\//i.test(embedUrl))return redirectTo(request,"/dashboard/tutor/curriculum?error=invalid-media-url");
    if(format==="iframe"&&(!embedUrl||!/^https:\/\//i.test(embedUrl)))return redirectTo(request,"/dashboard/tutor/curriculum?error=invalid-embed");
    if(["video","audio"].includes(format)&&!embedUrl&&!mediaFiles.length)return redirectTo(request,"/dashboard/tutor/curriculum?error=missing-media");
    if(["scorm","presentation","document","image"].includes(format)&&!mediaFiles.length)return redirectTo(request,"/dashboard/tutor/curriculum?error=missing-file");
    if(mediaFiles.some(file=>!lessonFileExtensions.has(extension(file))||file.size>75*1024*1024))return redirectTo(request,"/dashboard/tutor/curriculum?error=resource-type");
    const chapter=chapterId?await db.prepare("SELECT id FROM chapters WHERE id=? AND course_id=? AND tutor_id=?").bind(chapterId,courseId,tutorId).first():null;if(!course||!title||!summary||!content||(chapterId&&!chapter)) return redirectTo(request,"/dashboard/tutor/curriculum?error=invalid-lesson");
    const lessonId=createId("les");await db.prepare("INSERT INTO lessons (id,course_id,chapter_id,tutor_id,title,summary,content,content_format,embed_url,video_url,position,duration_minutes,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,'published',?)").bind(lessonId,courseId,chapterId,tutorId,title,summary,content,format,embedUrl,format==="video"?embedUrl:"",position,duration,form.get('isUnlocked')?1:0,new Date().toISOString()).run();
    for(const file of mediaFiles)await storeLessonFile(lessonId,file,file.name,format);
    return redirectTo(request,"/dashboard/tutor/curriculum?created=lesson");
  }

  if (action === "complete-lesson") {
    if (profile.role !== "student" && profile.role !== "admin") return NextResponse.json({ error: "Student access required" }, { status: 403 });
    const studentId=profile.role==="admin"?"usr_demo_student":profile.id; const lessonId=value(form,"lessonId");
    const assigned=await db.prepare("SELECT l.id,l.course_id FROM lessons l JOIN courses c ON c.id=l.course_id JOIN enrollments e ON e.course_id=l.course_id LEFT JOIN chapters ch ON ch.id=l.chapter_id WHERE l.id=? AND e.student_id=? AND l.status='published' AND l.is_unlocked=1 AND c.is_unlocked=1 AND (l.chapter_id IS NULL OR ch.is_unlocked=1)").bind(lessonId,studentId).first<{id:string;course_id:string}>();
    if(!assigned) return NextResponse.json({error:"Lesson not available"},{status:404});
    const existing=await db.prepare("SELECT id FROM lesson_progress WHERE lesson_id=? AND student_id=?").bind(lessonId,studentId).first();const now=new Date().toISOString();if(!existing){await db.prepare("INSERT INTO lesson_progress (id,lesson_id,student_id,completed_at) VALUES (?,?,?,?)").bind(createId("lpr"),lessonId,studentId,now).run();await db.prepare("INSERT INTO student_gamification (id,student_id,xp,level,streak_days,updated_at) VALUES (?,?,50,2,1,?) ON CONFLICT(student_id) DO UPDATE SET xp=xp+50,level=level+1,streak_days=streak_days+1,updated_at=excluded.updated_at").bind(createId("gam"),studentId,now).run();const game=await db.prepare("SELECT xp FROM student_gamification WHERE student_id=?").bind(studentId).first<{xp:number}>();const available=await db.prepare("SELECT id FROM badges WHERE xp_required<=?").bind(game?.xp??0).all<{id:string}>();if(available.results.length)await db.batch(available.results.map(b=>db.prepare("INSERT OR IGNORE INTO student_badges (id,student_id,badge_id,awarded_at) VALUES (?,?,?,?)").bind(createId("sbd"),studentId,b.id,now)));}
    await updateCourseProgress(assigned.course_id,studentId);
    const returnTo=value(form,"returnTo");
    return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")||returnTo==="/dashboard/student/certificates"?returnTo:"/dashboard/student/curriculum?updated=lesson");
  }

  if(action==="save-lesson-note"){
    if(profile.role!=="student"&&profile.role!=="admin")return NextResponse.json({error:"Student access required"},{status:403});
    const studentId=profile.role==="admin"?"usr_demo_student":profile.id,lessonId=value(form,"lessonId"),body=value(form,"body").slice(0,12000),returnTo=value(form,"returnTo");
    const lesson=await db.prepare("SELECT l.id,l.course_id FROM lessons l JOIN courses c ON c.id=l.course_id JOIN enrollments e ON e.course_id=l.course_id AND e.student_id=? LEFT JOIN chapters ch ON ch.id=l.chapter_id WHERE l.id=? AND l.status='published' AND l.is_unlocked=1 AND c.is_unlocked=1 AND (l.chapter_id IS NULL OR ch.is_unlocked=1)").bind(studentId,lessonId).first<{id:string;course_id:string}>();
    if(!lesson)return NextResponse.json({error:"Lesson unavailable"},{status:404});
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
      await db.prepare("INSERT INTO messages (id,course_id,sender_id,recipient_id,body,created_at) VALUES (?,?,?,?,?,?)").bind(createId("msg"),courseId,senderId,recipientId,body,new Date().toISOString()).run();
      return redirectTo(request,`/dashboard/student/messages?course=${encodeURIComponent(courseId)}&sent=1`);
    }
    if(profile.role==="tutor"||(profile.role==="admin"&&persona==="tutor")){
      const senderId=profile.role==="admin"?"usr_demo_tutor":profile.id;
      const valid=await db.prepare("SELECT e.student_id FROM courses c JOIN enrollments e ON e.course_id=c.id WHERE c.id=? AND c.tutor_id=? AND e.student_id=?").bind(courseId,senderId,recipientId).first();
      if(!valid) return NextResponse.json({error:"Conversation not available"},{status:403});
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
    const assigned = await db.prepare("SELECT a.id,a.course_id FROM activities a JOIN courses c ON c.id=a.course_id JOIN enrollments e ON e.course_id=a.course_id LEFT JOIN chapters ch ON ch.id=a.chapter_id WHERE a.id=? AND e.student_id=? AND a.status='published' AND a.is_unlocked=1 AND c.is_unlocked=1 AND (a.chapter_id IS NULL OR ch.is_unlocked=1)").bind(activityId, studentId).first<{id:string;course_id:string}>();
    if (!assigned || (!response&&!files.length)) return NextResponse.json({ error: "Activity not available" }, { status: 404 });
    const now=new Date().toISOString(),newSubmissionId=createId("sub");
    await db.prepare("INSERT INTO submissions (id, activity_id, student_id, response, submitted_at, feedback, status) VALUES (?, ?, ?, ?, ?, '', 'submitted') ON CONFLICT(activity_id,student_id) DO UPDATE SET response=excluded.response, submitted_at=excluded.submitted_at, status='submitted'").bind(newSubmissionId,activityId,studentId,response,now).run();
    const submission=await db.prepare("SELECT id FROM submissions WHERE activity_id=? AND student_id=?").bind(activityId,studentId).first<{id:string}>();
    if(!submission)return NextResponse.json({error:"Submission could not be saved"},{status:500});
    for(const file of files){const id=createId("sat"),fileName=safeFileName(file),key=`submissions/${submission.id}/${id}-${fileName}`,contentType=safeContentType(file);await env.FILES.put(key,await file.arrayBuffer(),{httpMetadata:{contentType}});await db.prepare("INSERT INTO submission_attachments (id,submission_id,student_id,file_name,content_type,r2_key,size_bytes,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(id,submission.id,studentId,file.name,contentType,key,file.size,now).run();}
    await updateCourseProgress(assigned.course_id,studentId);
    return redirectTo(request,returnTo.startsWith("/dashboard/student/curriculum/")?returnTo:"/dashboard/student/work?submitted=1");
  }

  return NextResponse.json({ error: "Unknown LMS action" }, { status: 400 });
}

