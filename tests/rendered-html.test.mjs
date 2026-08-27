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
    access(new URL("app/dashboard/student/curriculum/[courseId]/learn/[itemType]/[itemId]/page.tsx", root)),
    access(new URL("app/dashboard/student/quizzes/page.tsx", root)),
    access(new URL("app/api/quiz-media/[id]/route.ts", root)),
    access(new URL("supabase/migrations/202608270004_quiz_question_resources.sql", root)),
    access(new URL("supabase/migrations/202608280001_course_builder_foundation.sql", root)),
  ]);
  const [api, builder, curricula, migration] = await Promise.all([
    source("app/api/lms/route.ts"),
    source("app/dashboard/tutor/curriculum/page.tsx"),
    source("app/dashboard/admin/curriculum/page.tsx"),
    source("supabase/migrations/202608280001_course_builder_foundation.sql"),
  ]);
  for (const action of [
    "create-course", "create-tutor-course", "import-course", "create-chapter", "create-lesson",
    "create-quiz", "add-quiz-question", "submit-quiz", "request-assessment-reset",
    "approve-assessment-reset", "save-availability-slot", "confirm-demo-booking", "send-message",
  ]) assert.match(api, new RegExp(action));
  for (const capability of ["releaseMode", "final_assessment", "QuizQuestionBuilder", "LessonAuthoringForm"]) assert.match(builder, new RegExp(capability));
  assert.match(curricula, /Curricula & subjects/);
  assert.doesNotMatch(curricula, /Curriculum Library/i);
  for (const table of ["curricula", "curriculum_subjects", "assessment_reset_requests", "tutor_availability_slots", "demo_bookings", "chat_moderation_alerts"]) assert.match(migration, new RegExp(table));
});
