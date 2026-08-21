import assert from "node:assert/strict";
import { access, readFile } from "node:fs/promises";
import test from "node:test";

async function render(path = "/") {
  const workerUrl = new URL("../dist/server/index.js", import.meta.url);
  workerUrl.searchParams.set("test", `${process.pid}-${Date.now()}`);
  const { default: worker } = await import(workerUrl.href);
  return worker.fetch(new Request(`http://localhost${path}`, { headers: { accept: "text/html" } }), { ASSETS: { fetch: async () => new Response("Not found", { status: 404 }) } }, { waitUntil() {}, passThroughOnException() {} });
}

test("server-renders the Skillvelop Academy product site", async () => {
  const response = await render();
  assert.equal(response.status, 200);
  const html = await response.text();
  assert.match(html, /Skillvelop Academy/);
  assert.match(html, /Don.t just learn/);
  assert.match(html, /LMS login/);
  assert.match(html, /\/login/);
  assert.doesNotMatch(html, /KnowMerit|codex-preview|react-loading-skeleton/i);
});

test("includes every role workspace and protected LMS action surface", async () => {
  const root = new URL("../", import.meta.url);
  await Promise.all([
    access(new URL("app/dashboard/admin/page.tsx", root)),
    access(new URL("app/dashboard/tutor/page.tsx", root)),
    access(new URL("app/dashboard/student/page.tsx", root)),
    access(new URL("app/dashboard/admin/students/page.tsx", root)),
    access(new URL("app/dashboard/admin/students/[id]/page.tsx", root)),
    access(new URL("app/dashboard/student/curriculum/page.tsx", root)),
    access(new URL("app/dashboard/student/curriculum/[courseId]/page.tsx", root)),
    access(new URL("app/dashboard/student/curriculum/[courseId]/[lessonId]/page.tsx", root)),
    access(new URL("app/dashboard/student/curriculum/[courseId]/learn/[itemType]/[itemId]/page.tsx", root)),
    access(new URL("app/dashboard/student/messages/page.tsx", root)),
    access(new URL("app/dashboard/tutor/curriculum/page.tsx", root)),
    access(new URL("app/dashboard/tutor/messages/page.tsx", root)),
    access(new URL("app/dashboard/tutor/courses/page.tsx", root)),
    access(new URL("app/dashboard/tutor/quizzes/page.tsx", root)),
    access(new URL("app/dashboard/tutor/reports/page.tsx", root)),
    access(new URL("app/dashboard/student/quizzes/page.tsx", root)),
    access(new URL("app/dashboard/student/reports/page.tsx", root)),
    access(new URL("app/dashboard/student/certificates/page.tsx", root)),
    access(new URL("app/api/resources/[id]/route.ts", root)),
    access(new URL("app/api/submission-attachments/[id]/route.ts", root)),
    access(new URL("app/dashboard/profile/page.tsx", root)),
    access(new URL("app/dashboard/admin/curriculum/page.tsx", root)),
    access(new URL("app/api/lms/route.ts", root)),
    access(new URL("drizzle/0000_skillvelop_lms.sql", root)),
    access(new URL("drizzle/0001_manager_subscriptions.sql", root)),
    access(new URL("drizzle/0002_curriculum_messages.sql", root)),
    access(new URL("drizzle/0003_profiles_curriculum_library.sql", root)),
    access(new URL("drizzle/0004_gamification_quizzes_resources.sql", root)),
    access(new URL("drizzle/0005_course_chapters_unlocks.sql", root)),
    access(new URL("drizzle/0007_chapter_activities.sql", root)),
    access(new URL("drizzle/0012_learning_player_notes_attachments.sql", root)),
  ]);
  const [api, schema, lms, courseLibrary, courseOverview] = await Promise.all([
    readFile(new URL("app/api/lms/route.ts", root), "utf8"),
    readFile(new URL("db/schema.ts", root), "utf8"),
    readFile(new URL("db/lms.ts", root), "utf8"),
    readFile(new URL("app/dashboard/student/curriculum/page.tsx", root), "utf8"),
    readFile(new URL("app/dashboard/student/curriculum/[courseId]/page.tsx", root), "utf8"),
  ]);
  for (const action of ["create-user", "create-course", "create-tutor-course", "create-chapter", "set-content-unlock", "schedule-class", "create-activity", "review-submission", "submit-activity", "save-lesson-note", "update-subscription", "renew-subscription", "create-lesson", "complete-lesson", "send-message", "update-profile", "create-curriculum-template", "add-template-lesson", "import-curriculum", "enrol-course-student", "upload-lesson-resource", "create-quiz", "add-quiz-question", "submit-quiz"]) assert.match(api, new RegExp(action));
  for (const entity of ["users", "courses", "chapters", "liveClasses", "activities", "submissions", "submissionAttachments", "managerPermissions", "studentSubscriptions", "subscriptionRenewals", "lessons", "lessonProgress", "lessonNotes", "messages", "userProfiles", "curriculumTemplates", "curriculumTemplateLessons", "curriculumImports", "studentGamification", "badges", "studentBadges", "certificates", "lessonResources", "quizzes", "quizQuestions", "quizAttempts"]) assert.match(schema, new RegExp(entity));
  for (const chapter of ["Algebra Foundations", "Expressions & Inequalities", "Geometry in Action", "Data, Probability & Mastery"]) assert.match(lms, new RegExp(chapter.replace(/[&]/g, "&")));
  assert.match(courseLibrary, /clean-course-card/);
  assert.match(courseOverview, /chapter-progress-ring/);
});
