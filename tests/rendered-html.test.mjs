import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

const root = new URL("../", import.meta.url);
const source = (path) => readFile(new URL(path, root), "utf8");

test("includes the public product, tutor and demo-booking surfaces", async () => {
  await Promise.all([
    access(new URL("app/page.tsx", root)),
    access(new URL("app/login/page.tsx", root)),
    access(new URL("app/book-demo/page.tsx", root)),
    access(new URL("app/book-demo/PublicDemoForm.tsx", root)),
    access(new URL("app/tutors/[publicId]/page.tsx", root)),
    access(new URL("app/api/demo-bookings/route.ts", root)),
  ]);
  const [home, demo, tutor] = await Promise.all([
    source("app/page.tsx"),
    source("app/book-demo/page.tsx"),
    source("app/tutors/[publicId]/page.tsx"),
  ]);
  assert.match(home, /redirect\("\/login"\)/);
  assert.match(demo, /Schedule a focused demo class/);
  assert.match(demo, /supportedTimeZones/);
  assert.match(tutor, /tutor-intro-video/);
});

test("includes every role workspace and the protected LMS action surface", async () => {
  await Promise.all([
    access(new URL("app/dashboard/admin/page.tsx", root)),
    access(new URL("app/dashboard/admin/classes/page.tsx", root)),
    access(new URL("app/dashboard/admin/curriculum/page.tsx", root)),
    access(new URL("app/dashboard/admin/courses/new/page.tsx", root)),
    access(new URL("app/dashboard/tutor/curriculum/page.tsx", root)),
    access(new URL("app/dashboard/tutor/quizzes/page.tsx", root)),
    access(new URL("app/dashboard/tutor/classes/page.tsx", root)),
    access(new URL("app/dashboard/tutor/classes/[classId]/edit/page.tsx", root)),
    access(new URL("app/dashboard/student/curriculum/[courseId]/learn/[itemType]/[itemId]/page.tsx", root)),
    access(new URL("app/dashboard/student/quizzes/page.tsx", root)),
    access(new URL("app/api/quiz-media/[id]/route.ts", root)),
    access(new URL("supabase/migrations/202608270004_quiz_question_resources.sql", root)),
    access(new URL("supabase/migrations/202608280001_course_builder_foundation.sql", root)),
  ]);
  const [api, builder, curricula, migration, schedule, editClass, classList] = await Promise.all([
    source("app/api/lms/route.ts"),
    source("app/dashboard/tutor/curriculum/page.tsx"),
    source("app/dashboard/admin/curriculum/page.tsx"),
    source("supabase/migrations/202608280001_course_builder_foundation.sql"),
    source("app/dashboard/tutor/classes/new/page.tsx"),
    source("app/dashboard/tutor/classes/[classId]/edit/page.tsx"),
    source("app/dashboard/tutor/classes/page.tsx"),
  ]);
  for (const action of [
    "create-course", "create-tutor-course", "import-course", "create-chapter", "create-lesson",
    "create-quiz", "add-quiz-question", "submit-quiz", "request-assessment-reset",
    "approve-assessment-reset", "save-availability-slot", "replace-weekly-availability", "update-class", "delete-class", "confirm-demo-booking", "send-message",
  ]) assert.match(api, new RegExp(action));
  for (const capability of ["releaseMode", "final_assessment", "QuizQuestionBuilder", "LessonAuthoringForm"]) assert.match(builder, new RegExp(capability));
  assert.match(curricula, /Curricula & subjects/);
  assert.doesNotMatch(curricula, /Curriculum Library/i);
  assert.match(schedule, /name="meetingUrl"[^>]*required/);
  assert.match(editClass, /name="action" value="update-class"/);
  assert.match(classList, /name="action" value="replace-weekly-availability"/);
  assert.match(api, /DELETE FROM live_classes WHERE id=\? AND tutor_id=\? AND status='scheduled'/);
  assert.match(api, /meetingUrl=safeHttpsUrl\(value\(form,"meetingUrl"\)\)/);
  for (const table of ["curricula", "curriculum_subjects", "assessment_reset_requests", "tutor_availability_slots", "demo_bookings", "chat_moderation_alerts"]) assert.match(migration, new RegExp(table));
});

test("keeps the mobile dashboard shell singular and request-time profile loading lightweight", async () => {
  const [layout, mobileNav, lms] = await Promise.all([
    source("app/dashboard/layout.tsx"),
    source("app/dashboard/mobile-nav.css"),
    source("db/lms.ts"),
  ]);

  assert.doesNotMatch(layout, /MobileSidebar|<MobileMenu/);
  assert.match(mobileNav, /body>\.mobile-menu/);

  const ensureProfile = lms.match(/export async function ensureProfile[\s\S]*?\n}\n/)?.[0] ?? "";
  assert.ok(ensureProfile, "ensureProfile should be present");
  for (const requestTimeBootstrap of [
    "seedDemoData",
    "seedLearningContent",
    "ensureCourseStructure",
    "seedCompleteMathCourse",
    "seedGamification",
    "enrollStudent",
  ]) assert.doesNotMatch(ensureProfile, new RegExp(`${requestTimeBootstrap}\\(`));
});

test("bounds database work and keeps tutor aggregate queries non-multiplicative", async () => {
  const [database, courses, quizzes, work, migration] = await Promise.all([
    source("lib/platform-env.ts"),
    source("app/dashboard/tutor/courses/page.tsx"),
    source("app/dashboard/tutor/quizzes/page.tsx"),
    source("app/dashboard/tutor/work/page.tsx"),
    source("supabase/migrations/202608280003_tutor_query_performance.sql"),
  ]);

  for (const safeguard of ["queryTimeoutMs", "statement_timeout", "max_lifetime", "idle_timeout", "retrying timed-out read"]) {
    assert.match(database, new RegExp(safeguard));
  }
  assert.match(courses, /SELECT COUNT\(\*\) FROM enrollments e WHERE e\.course_id=c\.id/);
  assert.match(courses, /SELECT COUNT\(\*\) FROM chapters ch WHERE ch\.course_id=c\.id/);
  assert.match(quizzes, /SELECT COUNT\(\*\) FROM quiz_attempts qa WHERE qa\.quiz_id=q\.id/);
  assert.match(work, /SELECT COUNT\(\*\) FROM submissions s WHERE s\.activity_id=a\.id/);
  for (const index of [
    "idx_enrollments_course_student",
    "idx_activities_tutor_due",
    "idx_submissions_activity_status_submitted",
    "idx_quiz_attempts_quiz_student_submitted",
  ]) assert.match(migration, new RegExp(index));
});

