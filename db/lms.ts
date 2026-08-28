import { env } from "@/lib/platform-env";
import type { ChatGPTUser } from "@/app/chatgpt-auth";

export type UserRole = "admin" | "manager" | "tutor" | "student";
export type ManagerPermission = "view_dashboard" | "manage_users" | "manage_students" | "manage_courses" | "manage_classes";
export type UserProfile = { id: string; auth_user_id: string | null; email: string; name: string; public_id: string | null; role: UserRole; status: string; created_at: string; permissions?: ManagerPermission[] };

const schema = [
  `CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, auth_user_id TEXT UNIQUE, email TEXT NOT NULL UNIQUE, name TEXT NOT NULL, public_id TEXT UNIQUE, role TEXT NOT NULL DEFAULT 'student', status TEXT NOT NULL DEFAULT 'active', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS courses (id TEXT PRIMARY KEY, title TEXT NOT NULL, subject TEXT NOT NULL, level TEXT NOT NULL, description TEXT NOT NULL, cover_image_url TEXT NOT NULL DEFAULT '', is_unlocked INTEGER NOT NULL DEFAULT 1, is_imported INTEGER NOT NULL DEFAULT 0, tutor_id TEXT REFERENCES users(id), status TEXT NOT NULL DEFAULT 'active', accent TEXT NOT NULL DEFAULT 'blue', course_mode TEXT NOT NULL DEFAULT 'guided', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS chapters (id TEXT PRIMARY KEY,course_id TEXT NOT NULL REFERENCES courses(id),tutor_id TEXT NOT NULL REFERENCES users(id),title TEXT NOT NULL,description TEXT NOT NULL DEFAULT '',position INTEGER NOT NULL DEFAULT 1,is_unlocked INTEGER NOT NULL DEFAULT 0,created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS enrollments (id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), student_id TEXT NOT NULL REFERENCES users(id), progress INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL, UNIQUE(course_id, student_id))`,
  `CREATE TABLE IF NOT EXISTS live_classes (id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), tutor_id TEXT NOT NULL REFERENCES users(id), student_id TEXT REFERENCES users(id), title TEXT NOT NULL, starts_at TEXT NOT NULL, duration_minutes INTEGER NOT NULL DEFAULT 60, meeting_url TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'scheduled', notes TEXT NOT NULL DEFAULT '', confirmation_requested_at TEXT, student_confirmed_at TEXT, student_rating INTEGER, student_feedback TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS activities (id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), chapter_id TEXT REFERENCES chapters(id), tutor_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, type TEXT NOT NULL, instructions TEXT NOT NULL, due_at TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 100, is_unlocked INTEGER NOT NULL DEFAULT 1, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS submissions (id TEXT PRIMARY KEY, activity_id TEXT NOT NULL REFERENCES activities(id), student_id TEXT NOT NULL REFERENCES users(id), response TEXT NOT NULL, submitted_at TEXT NOT NULL, score INTEGER, feedback TEXT NOT NULL DEFAULT '', status TEXT NOT NULL DEFAULT 'submitted', UNIQUE(activity_id, student_id))`,
  `CREATE TABLE IF NOT EXISTS announcements (id TEXT PRIMARY KEY, course_id TEXT REFERENCES courses(id), author_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS manager_permissions (id TEXT PRIMARY KEY, manager_id TEXT NOT NULL REFERENCES users(id), permission TEXT NOT NULL, created_at TEXT NOT NULL, UNIQUE(manager_id, permission))`,
  `CREATE TABLE IF NOT EXISTS student_subscriptions (id TEXT PRIMARY KEY, student_id TEXT NOT NULL UNIQUE REFERENCES users(id), plan_type TEXT NOT NULL DEFAULT 'trial', class_allowance INTEGER NOT NULL DEFAULT 1, months_purchased INTEGER NOT NULL DEFAULT 0, started_at TEXT NOT NULL, expires_at TEXT NOT NULL, renewal_count INTEGER NOT NULL DEFAULT 0, notes TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS subscription_renewals (id TEXT PRIMARY KEY, subscription_id TEXT NOT NULL REFERENCES student_subscriptions(id), added_classes INTEGER NOT NULL, added_months INTEGER NOT NULL, previous_expiry TEXT NOT NULL, new_expiry TEXT NOT NULL, created_by TEXT NOT NULL REFERENCES users(id), created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lessons (id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), chapter_id TEXT REFERENCES chapters(id), tutor_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, summary TEXT NOT NULL, content TEXT NOT NULL, content_format TEXT NOT NULL DEFAULT 'html', embed_url TEXT NOT NULL DEFAULT '', video_url TEXT NOT NULL DEFAULT '', position INTEGER NOT NULL DEFAULT 1, duration_minutes INTEGER NOT NULL DEFAULT 30, is_unlocked INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'published', created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lesson_progress (id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id), student_id TEXT NOT NULL REFERENCES users(id), completed_at TEXT NOT NULL, UNIQUE(lesson_id, student_id))`,
  `CREATE TABLE IF NOT EXISTS messages (id TEXT PRIMARY KEY, course_id TEXT NOT NULL REFERENCES courses(id), sender_id TEXT NOT NULL REFERENCES users(id), recipient_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL, created_at TEXT NOT NULL, read_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS user_profiles (id TEXT PRIMARY KEY, user_id TEXT NOT NULL UNIQUE REFERENCES users(id), phone TEXT NOT NULL DEFAULT '', timezone TEXT NOT NULL DEFAULT 'Asia/Kolkata', bio TEXT NOT NULL DEFAULT '', preferred_language TEXT NOT NULL DEFAULT 'English', headline TEXT NOT NULL DEFAULT '', qualifications TEXT NOT NULL DEFAULT '', experience_years INTEGER NOT NULL DEFAULT 0, specialties TEXT NOT NULL DEFAULT '', achievements TEXT NOT NULL DEFAULT '', teaching_philosophy TEXT NOT NULL DEFAULT '', location TEXT NOT NULL DEFAULT '', languages TEXT NOT NULL DEFAULT '', linkedin_url TEXT NOT NULL DEFAULT '', website_url TEXT NOT NULL DEFAULT '', avatar_r2_key TEXT NOT NULL DEFAULT '', avatar_content_type TEXT NOT NULL DEFAULT '', avatar_file_name TEXT NOT NULL DEFAULT '', is_public INTEGER NOT NULL DEFAULT 1, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS curricula (id TEXT PRIMARY KEY,name TEXT NOT NULL UNIQUE,audience TEXT NOT NULL DEFAULT 'school',category TEXT NOT NULL DEFAULT '',description TEXT NOT NULL DEFAULT '',status TEXT NOT NULL DEFAULT 'active',created_by TEXT NOT NULL REFERENCES users(id),created_at TEXT NOT NULL,updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS curriculum_subjects (id TEXT PRIMARY KEY,curriculum_id TEXT NOT NULL REFERENCES curricula(id),name TEXT NOT NULL,grades_json TEXT NOT NULL DEFAULT '[]',status TEXT NOT NULL DEFAULT 'active',created_at TEXT NOT NULL,UNIQUE(curriculum_id,name))`,
  `CREATE TABLE IF NOT EXISTS student_gamification (id TEXT PRIMARY KEY, student_id TEXT NOT NULL UNIQUE REFERENCES users(id), xp INTEGER NOT NULL DEFAULT 0, level INTEGER NOT NULL DEFAULT 1, streak_days INTEGER NOT NULL DEFAULT 0, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS badges (id TEXT PRIMARY KEY, name TEXT NOT NULL, description TEXT NOT NULL, icon TEXT NOT NULL, xp_required INTEGER NOT NULL DEFAULT 0)`,
  `CREATE TABLE IF NOT EXISTS student_badges (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), badge_id TEXT NOT NULL REFERENCES badges(id), awarded_at TEXT NOT NULL, UNIQUE(student_id,badge_id))`,
  `CREATE TABLE IF NOT EXISTS certificates (id TEXT PRIMARY KEY, student_id TEXT NOT NULL REFERENCES users(id), course_id TEXT NOT NULL REFERENCES courses(id), certificate_code TEXT NOT NULL UNIQUE, issued_at TEXT NOT NULL, UNIQUE(student_id,course_id))`,
  `CREATE TABLE IF NOT EXISTS lesson_resources (id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id), title TEXT NOT NULL, resource_type TEXT NOT NULL, file_name TEXT NOT NULL, content_type TEXT NOT NULL, r2_key TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS lesson_notes (id TEXT PRIMARY KEY, lesson_id TEXT NOT NULL REFERENCES lessons(id), student_id TEXT NOT NULL REFERENCES users(id), body TEXT NOT NULL DEFAULT '', updated_at TEXT NOT NULL, UNIQUE(lesson_id,student_id))`,
  `CREATE TABLE IF NOT EXISTS submission_attachments (id TEXT PRIMARY KEY, submission_id TEXT NOT NULL REFERENCES submissions(id), student_id TEXT NOT NULL REFERENCES users(id), file_name TEXT NOT NULL, content_type TEXT NOT NULL, r2_key TEXT NOT NULL, size_bytes INTEGER NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS quizzes (id TEXT PRIMARY KEY, course_id TEXT REFERENCES courses(id), chapter_id TEXT REFERENCES chapters(id), tutor_id TEXT NOT NULL REFERENCES users(id), title TEXT NOT NULL, description TEXT NOT NULL, kind TEXT NOT NULL DEFAULT 'quiz', attempt_limit INTEGER NOT NULL DEFAULT 1, is_unlocked INTEGER NOT NULL DEFAULT 0, status TEXT NOT NULL DEFAULT 'published', scope TEXT NOT NULL DEFAULT 'course', question_count INTEGER NOT NULL DEFAULT 5, passing_percentage INTEGER NOT NULL DEFAULT 60, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS quiz_questions (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL REFERENCES quizzes(id), type TEXT NOT NULL, prompt TEXT NOT NULL, options_json TEXT NOT NULL DEFAULT '[]', answer_json TEXT NOT NULL, points INTEGER NOT NULL DEFAULT 1, position INTEGER NOT NULL DEFAULT 1, image_r2_key TEXT NOT NULL DEFAULT '', image_file_name TEXT NOT NULL DEFAULT '', image_content_type TEXT NOT NULL DEFAULT '', image_size_bytes INTEGER NOT NULL DEFAULT 0, resource_type TEXT NOT NULL DEFAULT 'none', resource_embed_url TEXT NOT NULL DEFAULT '')`,
  `CREATE TABLE IF NOT EXISTS quiz_attempts (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL REFERENCES quizzes(id), student_id TEXT NOT NULL REFERENCES users(id), answers_json TEXT NOT NULL, score INTEGER NOT NULL, max_score INTEGER NOT NULL, submitted_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS quiz_assignments (id TEXT PRIMARY KEY, quiz_id TEXT NOT NULL REFERENCES quizzes(id), student_id TEXT REFERENCES users(id), assigned_by TEXT NOT NULL REFERENCES users(id), status TEXT NOT NULL DEFAULT 'active', assigned_at TEXT NOT NULL, revoked_at TEXT)`,
  `CREATE TABLE IF NOT EXISTS ai_settings (id TEXT PRIMARY KEY, provider TEXT NOT NULL DEFAULT 'openai', model TEXT NOT NULL DEFAULT 'gpt-5-mini', enabled INTEGER NOT NULL DEFAULT 0, system_guidance TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ai_threads (id TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), persona TEXT NOT NULL, course_id TEXT REFERENCES courses(id), title TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ai_messages (id TEXT PRIMARY KEY, thread_id TEXT NOT NULL REFERENCES ai_threads(id), role TEXT NOT NULL, body TEXT NOT NULL, created_at TEXT NOT NULL)`,
  `CREATE TABLE IF NOT EXISTS ai_provider_credentials (provider TEXT PRIMARY KEY, encrypted_key TEXT NOT NULL, iv TEXT NOT NULL, key_hint TEXT NOT NULL DEFAULT '', updated_by TEXT NOT NULL REFERENCES users(id), updated_at TEXT NOT NULL)`,
  `CREATE INDEX IF NOT EXISTS idx_users_role_status ON users(role, status)`,
  `CREATE INDEX IF NOT EXISTS idx_courses_tutor_status ON courses(tutor_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id, course_id)`,
  `CREATE INDEX IF NOT EXISTS idx_classes_tutor_start ON live_classes(tutor_id, starts_at)`,
  `CREATE INDEX IF NOT EXISTS idx_classes_student_start ON live_classes(student_id, starts_at)`,
  `CREATE INDEX IF NOT EXISTS idx_classes_confirmation ON live_classes(student_id,status,starts_at)`,
  `CREATE INDEX IF NOT EXISTS idx_activities_course_due ON activities(course_id, due_at)`,
  `CREATE INDEX IF NOT EXISTS idx_submissions_student_status ON submissions(student_id, status)`,
  `CREATE INDEX IF NOT EXISTS idx_manager_permissions_manager ON manager_permissions(manager_id, permission)`,
  `CREATE INDEX IF NOT EXISTS idx_subscriptions_plan_expiry ON student_subscriptions(plan_type, expires_at)`,
  `CREATE INDEX IF NOT EXISTS idx_renewals_subscription_created ON subscription_renewals(subscription_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_lessons_course_position ON lessons(course_id, position)`,
  `CREATE INDEX IF NOT EXISTS idx_chapters_course_position ON chapters(course_id,position)`,
  `CREATE INDEX IF NOT EXISTS idx_lesson_progress_student ON lesson_progress(student_id, lesson_id)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_participants_created ON messages(sender_id, recipient_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_messages_course_created ON messages(course_id, created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_curricula_status_name ON curricula(status,name)`,
  `CREATE INDEX IF NOT EXISTS idx_curriculum_subjects_curriculum ON curriculum_subjects(curriculum_id,status,name)`,
  `CREATE INDEX IF NOT EXISTS idx_gamification_xp ON student_gamification(xp)`,
  `CREATE INDEX IF NOT EXISTS idx_certificates_student ON certificates(student_id,issued_at)`,
  `CREATE INDEX IF NOT EXISTS idx_resources_lesson ON lesson_resources(lesson_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_lesson_notes_student_lesson ON lesson_notes(student_id,lesson_id)`,
  `CREATE INDEX IF NOT EXISTS idx_lesson_notes_lesson_updated ON lesson_notes(lesson_id,updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_submission_attachments_submission ON submission_attachments(submission_id,created_at)`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_course_status ON quizzes(course_id,status)`,
  `CREATE INDEX IF NOT EXISTS idx_quizzes_tutor_scope_status ON quizzes(tutor_id,scope,status)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_questions_quiz_position ON quiz_questions(quiz_id,position)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_assignments_student_status ON quiz_assignments(student_id,status,assigned_at)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_assignments_assigned_by ON quiz_assignments(assigned_by)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_threads_user_updated ON ai_threads(user_id,updated_at)`,
  `CREATE INDEX IF NOT EXISTS idx_ai_messages_thread_created ON ai_messages(thread_id,created_at)`,
  `CREATE UNIQUE INDEX IF NOT EXISTS idx_users_public_id ON users(public_id)`,
  `CREATE INDEX IF NOT EXISTS idx_quiz_attempts_student ON quiz_attempts(student_id,submitted_at)`,
];

export function database() {
  if (!env.DB) throw new Error("Skillvelop database is not configured.");
  return env.DB;
}

export async function initialiseLms() {
  // Production schema changes are applied through versioned Supabase migrations.
  // Keeping this function allows existing call sites to remain lightweight.
  void schema;
}

export function createId(prefix: string) {
  return `${prefix}_${crypto.randomUUID().replaceAll("-", "").slice(0, 18)}`;
}

export function createPublicId(role: UserRole) {
  const marker=role==="tutor"?"TUT":role==="student"?"STU":role==="manager"?"MGR":"ADM";
  return `SKV-${marker}-${crypto.randomUUID().replaceAll("-","").slice(0,8).toUpperCase()}`;
}

export async function ensureProfile(user: ChatGPTUser): Promise<UserProfile> {
  await initialiseLms();
  const db = database();
  let profile = await db.prepare("SELECT * FROM users WHERE auth_user_id = ? OR lower(email) = lower(?) LIMIT 1").bind(user.userId, user.email).first<UserProfile>();
  if (profile) {
    if (!profile.auth_user_id || profile.name !== user.displayName) {
      await db.prepare("UPDATE users SET auth_user_id = ?, name = ?, status = 'active' WHERE id = ?").bind(user.userId, user.displayName, profile.id).run();
      profile = { ...profile, auth_user_id: user.userId, name: user.displayName, status: "active" };
    }
    if(!profile.public_id){const publicId=createPublicId(profile.role);await db.prepare("UPDATE users SET public_id=? WHERE id=?").bind(publicId,profile.id).run();profile={...profile,public_id:publicId};}
  } else {
    const count = await db.prepare("SELECT COUNT(*) AS total FROM users WHERE auth_user_id IS NOT NULL").first<{ total: number }>();
    const role: UserRole = Number(count?.total ?? 0) === 0 ? "admin" : "student";
    profile = { id: createId("usr"), auth_user_id: user.userId, email: user.email, name: user.displayName, public_id:createPublicId(role), role, status: "active", created_at: new Date().toISOString() };
    await db.prepare("INSERT INTO users (id, auth_user_id, email, name, public_id, role, status, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(profile.id, profile.auth_user_id, profile.email, profile.name, profile.public_id, profile.role, profile.status, profile.created_at).run();
  }
  // Schema and demo-content setup belongs in versioned migrations. Keeping
  // authenticated requests read-light avoids timeouts across every LMS page.
  return profile;
}

async function seedGamification(){const db=database();await db.batch([db.prepare("INSERT OR IGNORE INTO badges (id,name,description,icon,xp_required) VALUES ('bdg_first_step','First Step','Completed the first learning activity','★',25)"),db.prepare("INSERT OR IGNORE INTO badges (id,name,description,icon,xp_required) VALUES ('bdg_rising_star','Rising Star','Earned 100 XP','✦',100)"),db.prepare("INSERT OR IGNORE INTO badges (id,name,description,icon,xp_required) VALUES ('bdg_knowledge','Knowledge Seeker','Earned 250 XP','◆',250)"),db.prepare("INSERT OR IGNORE INTO badges (id,name,description,icon,xp_required) VALUES ('bdg_champion','Learning Champion','Earned 500 XP','♛',500)")]);}

async function ensureCourseStructure(){const db=database();const missing=await db.prepare("SELECT c.id,c.tutor_id,c.description FROM courses c WHERE NOT EXISTS(SELECT 1 FROM chapters ch WHERE ch.course_id=c.id)").all<{id:string;tutor_id:string;description:string}>();for(const course of missing.results){const chapterId=createId("chp"),now=new Date().toISOString();await db.batch([db.prepare("INSERT INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at) VALUES (?,?,?,?,?,1,1,?)").bind(chapterId,course.id,course.tutor_id,"Chapter 1: Foundations",course.description,now),db.prepare("UPDATE lessons SET chapter_id=?,is_unlocked=1 WHERE course_id=? AND chapter_id IS NULL").bind(chapterId,course.id),db.prepare("UPDATE quizzes SET chapter_id=?,is_unlocked=1 WHERE course_id=? AND chapter_id IS NULL").bind(chapterId,course.id)]);}}

async function seedCompleteMathCourse(){
  const db=database(),now=new Date().toISOString(),courseId="crs_math_mastery",tutorId="usr_demo_tutor",studentId="usr_demo_student";
  const demoCourse=await db.prepare("SELECT id FROM courses WHERE id=?").bind(courseId).first();if(!demoCourse)return;
  const cover="https://images.unsplash.com/photo-1761546571631-a4d61b55cd2f?auto=format&fit=crop&w=1400&q=82";
  await db.prepare("UPDATE courses SET cover_image_url=?,description='A complete Grade 8 pathway through algebra, equations, geometry, data and probability with guided 1:1 practice.' WHERE id=?").bind(cover,courseId).run();
  await db.prepare("UPDATE courses SET cover_image_url=? WHERE id='crs_english_confidence'").bind("https://images.unsplash.com/photo-1769794371055-54436b54577e?auto=format&fit=crop&w=1400&q=82").run();
  const ready=await db.prepare("SELECT id FROM submissions WHERE id='sub_demo_math_1'").first();if(ready)return;
  let chapter1=await db.prepare("SELECT id FROM chapters WHERE course_id=? ORDER BY position LIMIT 1").bind(courseId).first<{id:string}>();
  if(!chapter1){chapter1={id:"chp_math_algebra"};await db.prepare("INSERT INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at) VALUES (?,?,?,?,?,1,1,?)").bind(chapter1.id,courseId,tutorId,"Algebra Foundations","Build confidence with variables, equality and step-by-step equation solving.",now).run();}
  else await db.prepare("UPDATE chapters SET title='Algebra Foundations',description='Build confidence with variables, equality and step-by-step equation solving.',position=1,is_unlocked=1 WHERE id=?").bind(chapter1.id).run();
  const chapters=[
    ["chp_math_expressions","Expressions & Inequalities","Simplify expressions, factorise confidently and solve inequalities on a number line.",2],
    ["chp_math_geometry","Geometry in Action","Explore angles, triangles, area, surface area and volume through visual problems.",3],
    ["chp_math_data","Data, Probability & Mastery","Interpret data, calculate probability and bring every skill together in the final challenge.",4],
  ] as const;
  await db.batch(chapters.map(ch=>db.prepare("INSERT OR IGNORE INTO chapters (id,course_id,tutor_id,title,description,position,is_unlocked,created_at) VALUES (?,?,?,?,?,?,1,?)").bind(ch[0],courseId,tutorId,ch[1],ch[2],ch[3],now)));
  await db.batch([
    db.prepare("UPDATE lessons SET chapter_id=?,is_unlocked=1 WHERE course_id=? AND chapter_id IS NULL").bind(chapter1.id,courseId),
    db.prepare("UPDATE quizzes SET chapter_id=?,is_unlocked=1 WHERE course_id=? AND chapter_id IS NULL").bind(chapter1.id,courseId),
    db.prepare("UPDATE activities SET chapter_id=? WHERE course_id=? AND chapter_id IS NULL").bind(chapter1.id,courseId),
    db.prepare("UPDATE lessons SET chapter_id=?,is_unlocked=1 WHERE id IN ('les_demo_equations','les_demo_solving')").bind(chapter1.id),
    ...[
      ["les_math_expressions","chp_math_expressions","Simplifying algebraic expressions","Combine like terms and apply the distributive property accurately.","Identify terms and coefficients, remove brackets using multiplication, then combine only terms with the same variable and power.",1,30],
      ["les_math_inequalities","chp_math_expressions","Solving and graphing inequalities","Solve inequalities and represent their solution sets on a number line.","Use inverse operations as with equations. Reverse the inequality sign whenever multiplying or dividing by a negative number.",2,35],
      ["les_math_angles","chp_math_geometry","Angles and triangles","Use angle facts to solve missing-angle problems.","Apply angles on a line, vertically opposite angles and the angle sum of a triangle. Label every known fact before calculating.",1,30],
      ["les_math_measure","chp_math_geometry","Area, surface area and volume","Choose and apply measurement formulae in practical contexts.","Break compound shapes into familiar parts, keep units consistent, and distinguish square units for area from cubic units for volume.",2,40],
      ["les_math_data","chp_math_data","Reading and representing data","Interpret tables, charts and averages with confidence.","Compare mean, median, mode and range, then choose the chart that communicates the data most clearly.",1,30],
      ["les_math_probability","chp_math_data","Probability and expected outcomes","Describe likelihood and calculate simple probabilities.","Write probability as favourable outcomes divided by total equally likely outcomes, then test predictions against experimental results.",2,35],
    ].map(l=>db.prepare("INSERT OR IGNORE INTO lessons (id,course_id,chapter_id,tutor_id,title,summary,content,position,duration_minutes,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,?,1,'published',?)").bind(l[0],courseId,l[1],tutorId,l[2],l[3],l[4],l[5],l[6],now)),
  ]);
  const quizzes=[
    ["qiz_math_c1_practice",chapter1.id,"Algebra Foundations Practice","A friendly practice check on variables and one-step equations.","quiz",3,"Which value solves x + 7 = 12?","5",'["3","5","7","19"]'],
    ["qiz_math_c1_final",chapter1.id,"Algebra Foundations Assessment","Demonstrate secure understanding of algebra foundations.","final_assessment",1,"Solve 3x = 21.","7",'["6","7","8","18"]'],
    ["qiz_math_c2_practice","chp_math_expressions","Expressions Practice Quiz","Practise simplifying and interpreting inequalities.","quiz",3,"Simplify 3x + 2x.","5x",'["5","5x","6x","x5"]'],
    ["qiz_math_c2_final","chp_math_expressions","Expressions & Inequalities Assessment","A one-attempt chapter mastery assessment.","final_assessment",1,"Solve x - 4 > 3.","x > 7",'["x > 7","x < 7","x > 1","x < 1"]'],
    ["qiz_math_c3_practice","chp_math_geometry","Geometry Practice Quiz","Check key angle and measurement facts.","quiz",3,"What is the angle sum of a triangle?","180",'["90","180","270","360"]'],
    ["qiz_math_c3_final","chp_math_geometry","Geometry Chapter Assessment","Apply geometry skills to multi-step problems.","final_assessment",1,"Find the area of a 6 cm by 4 cm rectangle.","24",'["10","20","24","48"]'],
    ["qiz_math_c4_practice","chp_math_data","Data & Probability Practice Quiz","Practise averages, charts and probability.","quiz",3,"What is the mean of 2, 4 and 6?","4",'["2","3","4","6"]'],
    ["qiz_math_c4_final","chp_math_data","Mathematics Mastery Final Assessment","A one-attempt assessment across the complete course.","final_assessment",1,"A fair die is rolled. What is the probability of rolling a 6?","1/6",'["1/2","1/3","1/6","6"]'],
  ] as const;
  await db.batch(quizzes.flatMap((q,index)=>[
    db.prepare("INSERT OR IGNORE INTO quizzes (id,course_id,chapter_id,tutor_id,title,description,kind,attempt_limit,is_unlocked,status,created_at) VALUES (?,?,?,?,?,?,?,?,1,'published',?)").bind(q[0],courseId,q[1],tutorId,q[2],q[3],q[4],q[5],now),
    db.prepare("INSERT OR IGNORE INTO quiz_questions (id,quiz_id,type,prompt,options_json,answer_json,points,position) VALUES (?,?, 'mcq',?,?,?,?,1)").bind(`qq_math_${index+1}`,q[0],q[6],q[8],JSON.stringify(q[7].toLowerCase()),10),
  ]));
  const due=new Date(Date.now()+7*86400000).toISOString();const activities=[
    ["act_math_c1_assignment",chapter1.id,"Algebra Skills Assignment","assignment","Complete the guided equation set and show every balancing step."],
    ["act_math_c1_assessment",chapter1.id,"Algebra Reasoning Assessment","assessment","Explain how you know an equation remains balanced after each operation."],
    ["act_math_c2_assignment","chp_math_expressions","Expressions Practice Portfolio","assignment","Simplify and annotate twelve expressions, including four with brackets."],
    ["act_math_c2_assessment","chp_math_expressions","Inequalities Performance Task","assessment","Solve and graph six inequalities, then explain one real-life example."],
    ["act_math_c3_assignment","chp_math_geometry","Design a Learning Space","assignment","Create a scale floor plan and calculate its perimeter and area."],
    ["act_math_c3_assessment","chp_math_geometry","Geometry Skills Assessment","assessment","Solve the angle, area and volume challenge set with units."],
    ["act_math_c4_assignment","chp_math_data","Mini Data Investigation","assignment","Collect a small dataset, calculate averages and present one suitable chart."],
    ["act_math_c4_assessment","chp_math_data","Course Readiness Assessment","assessment","Complete the mixed data and probability task before the final assessment."],
  ] as const;
  await db.batch(activities.map(a=>db.prepare("INSERT OR IGNORE INTO activities (id,course_id,chapter_id,tutor_id,title,type,instructions,due_at,points,status,created_at) VALUES (?,?,?,?,?,?,?,?,100,'published',?)").bind(a[0],courseId,a[1],tutorId,a[2],a[3],a[4],due,now)));
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO lesson_progress (id,lesson_id,student_id,completed_at) VALUES ('lpr_demo_math_1','les_demo_equations',?,?)").bind(studentId,now),
    db.prepare("INSERT OR IGNORE INTO lesson_progress (id,lesson_id,student_id,completed_at) VALUES ('lpr_demo_math_2','les_demo_solving',?,?)").bind(studentId,now),
    db.prepare("INSERT OR IGNORE INTO quiz_attempts (id,quiz_id,student_id,answers_json,score,max_score,submitted_at) VALUES ('qat_demo_math_1','qiz_math_c1_practice',?,'{}',10,10,?)").bind(studentId,now),
    db.prepare("INSERT OR IGNORE INTO submissions (id,activity_id,student_id,response,submitted_at,score,feedback,status) VALUES ('sub_demo_math_1','act_math_c1_assignment',?,'Completed workbook link',?,92,'Excellent step-by-step working.','reviewed')").bind(studentId,now),
  ]);
}

async function seedLearningContent() {
  const db = database(); const now = new Date().toISOString();
  const math = await db.prepare("SELECT id FROM courses WHERE id='crs_math_mastery'").first();
  if (!math) return;
  const english = await db.prepare("SELECT id FROM courses WHERE id='crs_english_confidence'").first();
  const statements = [
    db.prepare("INSERT OR IGNORE INTO lessons (id,course_id,tutor_id,title,summary,content,position,duration_minutes,status,created_at) VALUES ('les_demo_equations','crs_math_mastery','usr_demo_tutor','Understanding linear equations','Learn how variables, constants and equality work together.','A linear equation balances two expressions. Start by identifying the variable, then use inverse operations to isolate it while keeping both sides equal. Work through the examples and write each transformation on a new line.',1,25,'published',?)").bind(now),
    db.prepare("INSERT OR IGNORE INTO lessons (id,course_id,tutor_id,title,summary,content,position,duration_minutes,status,created_at) VALUES ('les_demo_solving','crs_math_mastery','usr_demo_tutor','Solving equations step by step','Use inverse operations confidently and check your answers.','Simplify both sides first, collect like terms, move variable terms to one side and constants to the other. Divide by the coefficient, then substitute your answer back into the original equation to verify it.',2,35,'published',?)").bind(now),
    db.prepare("INSERT OR IGNORE INTO messages (id,course_id,sender_id,recipient_id,body,created_at) VALUES ('msg_demo_welcome','crs_math_mastery','usr_demo_tutor','usr_demo_student','Welcome, Arjun. Message me here whenever you need help before our next class.',?)").bind(now),
  ];
  if (english) {
    statements.push(db.prepare("INSERT OR IGNORE INTO lessons (id,course_id,tutor_id,title,summary,content,position,duration_minutes,status,created_at) VALUES ('les_demo_conversation','crs_english_confidence','usr_demo_tutor','Confident introductions','Structure a clear introduction for real conversations.','Open with your name and context, add one meaningful detail, and close with a question that invites the other person to speak. Practise aloud twice and focus on pace rather than speed.',1,20,'published',?)").bind(now));
  }
  await db.batch(statements);
}

async function seedDemoData() {
  const db = database();
  const existing = await db.prepare("SELECT COUNT(*) AS total FROM courses").first<{ total: number }>();
  if (Number(existing?.total ?? 0) > 0) return;
  const now = new Date();
  const tutorId = "usr_demo_tutor"; const studentId = "usr_demo_student";
  const courseA = "crs_math_mastery"; const courseB = "crs_english_confidence";
  const tomorrow = new Date(now.getTime() + 86400000); tomorrow.setHours(17, 0, 0, 0);
  const later = new Date(now.getTime() + 3 * 86400000); later.setHours(16, 30, 0, 0);
  await db.batch([
    db.prepare("INSERT OR IGNORE INTO users (id, email, name, role, status, created_at) VALUES (?, ?, ?, 'tutor', 'active', ?)").bind(tutorId, "maya@skillvelop.com", "Maya Rao", now.toISOString()),
    db.prepare("INSERT OR IGNORE INTO users (id, email, name, role, status, created_at) VALUES (?, ?, ?, 'student', 'active', ?)").bind(studentId, "arjun@example.com", "Arjun Mehta", now.toISOString()),
    db.prepare("INSERT INTO courses (id, title, subject, level, description, tutor_id, status, accent, created_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)").bind(courseA, "Mathematics Mastery", "Mathematics", "Grade 8", "Personal 1:1 coaching in algebra, geometry and problem solving.", tutorId, "blue", now.toISOString()),
    db.prepare("INSERT INTO courses (id, title, subject, level, description, tutor_id, status, accent, created_at) VALUES (?, ?, ?, ?, ?, ?, 'active', ?, ?)").bind(courseB, "English Confidence", "English", "Intermediate", "Speaking, writing and comprehension through practical weekly goals.", tutorId, "coral", now.toISOString()),
    db.prepare("INSERT INTO enrollments (id, course_id, student_id, progress, created_at) VALUES (?, ?, ?, 64, ?)").bind("enr_demo_math", courseA, studentId, now.toISOString()),
    db.prepare("INSERT INTO enrollments (id, course_id, student_id, progress, created_at) VALUES (?, ?, ?, 38, ?)").bind("enr_demo_english", courseB, studentId, now.toISOString()),
    db.prepare("INSERT INTO live_classes (id, course_id, tutor_id, student_id, title, starts_at, duration_minutes, meeting_url, status, notes) VALUES (?, ?, ?, ?, ?, ?, 60, ?, 'scheduled', ?)").bind("cls_demo_algebra", courseA, tutorId, studentId, "Algebra: Linear equations", tomorrow.toISOString(), "https://meet.google.com/skillvelop-demo", "Bring your last practice sheet."),
    db.prepare("INSERT INTO live_classes (id, course_id, tutor_id, student_id, title, starts_at, duration_minutes, meeting_url, status, notes) VALUES (?, ?, ?, ?, ?, ?, 45, ?, 'scheduled', ?)").bind("cls_demo_english", courseB, tutorId, studentId, "Confident conversations", later.toISOString(), "https://meet.google.com/skillvelop-demo", "Prepare a two-minute introduction."),
    db.prepare("INSERT INTO activities (id, course_id, tutor_id, title, type, instructions, due_at, points, status, created_at) VALUES (?, ?, ?, ?, 'homework', ?, ?, 50, 'published', ?)").bind("act_demo_homework", courseA, tutorId, "Linear equations practice", "Complete questions 1–12 and show each working step.", later.toISOString(), now.toISOString()),
    db.prepare("INSERT INTO activities (id, course_id, tutor_id, title, type, instructions, due_at, points, status, created_at) VALUES (?, ?, ?, ?, 'quiz', ?, ?, 20, 'published', ?)").bind("act_demo_quiz", courseB, tutorId, "Grammar checkpoint", "Answer the ten sentence correction questions in your own words.", later.toISOString(), now.toISOString()),
    db.prepare("INSERT INTO announcements (id, course_id, author_id, title, body, created_at) VALUES (?, ?, ?, ?, ?, ?)").bind("ann_demo_welcome", courseA, tutorId, "Welcome to your learning space", "Your lessons, live classes and feedback now live together in Skillvelop.", now.toISOString()),
  ]);
}

async function enrollStudent(studentId: string) {
  const db = database();
  const courses = await db.prepare("SELECT id FROM courses WHERE status = 'active'").all<{ id: string }>();
  for (const course of courses.results) {
    await db.prepare("INSERT OR IGNORE INTO enrollments (id, course_id, student_id, progress, created_at) VALUES (?, ?, ?, 0, ?)").bind(createId("enr"), course.id, studentId, new Date().toISOString()).run();
  }
}

export async function all<T>(sql: string, ...bindings: unknown[]): Promise<T[]> {
  const result = await database().prepare(sql).bind(...bindings).all<T>();
  return result.results;
}

export async function first<T>(sql: string, ...bindings: unknown[]): Promise<T | null> {
  return (await database().prepare(sql).bind(...bindings).first<T>()) ?? null;
}

export async function managerPermissions(userId: string): Promise<ManagerPermission[]> {
  const rows = await all<{ permission: ManagerPermission }>("SELECT permission FROM manager_permissions WHERE manager_id=? ORDER BY permission", userId);
  return rows.map((row) => row.permission);
}

export async function canManage(profile: UserProfile, permission: ManagerPermission): Promise<boolean> {
  if (profile.role === "admin") return true;
  if (profile.role !== "manager") return false;
  return Boolean(await first("SELECT 1 ok FROM manager_permissions WHERE manager_id=? AND permission=?", profile.id, permission));
}


