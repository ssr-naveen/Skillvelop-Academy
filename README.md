# Skillvelop Academy

Skillvelop is a role-based learning management platform for live 1:1 online classes. It gives administrators, tutors and students dedicated workspaces while keeping classes, assigned work, submissions, feedback and progress in one system.

## Product surfaces

- Public Skillvelop Academy website and secure LMS entry
- Admin operations centre for users, roles, courses, tutor assignment and learner enrolment
- Tutor teaching studio for live-class scheduling, homework, quizzes, assessments, assignments, classwork, reviews and feedback
- Student learning space for classes, tasks, submissions, scores, tutor feedback and course progress
- Server-enforced role permissions and persistent Cloudflare D1 records

## Local development

Requires Node.js 22.13 or newer.

```bash
npm install
npm run dev
npm run build
npm test
```

The first authenticated account becomes the initial administrator. Administrators can then create invited tutor, student or additional admin records. When invited users sign in with the same email, Skillvelop activates their account and preserves the assigned role.

## Data model

The initial migration in `drizzle/0000_skillvelop_lms.sql` creates users, courses, enrolments, live classes, learning activities, submissions and announcements, plus indexes for the primary dashboard queries.
