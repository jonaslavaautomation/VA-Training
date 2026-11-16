# LAVA Automation Applicant Portal (Phase 7A)

The member dashboard offers two paths:

1. **I Want to Apply to LAVA Automation** → `/lava-portal` (built in this phase)
2. **I Want to Explore Different Niches** → `/explore-niches` (a "coming soon" placeholder for a later phase)

## Member journey

| Step | Page | What happens |
|---|---|---|
| 1 | About LAVA (`/lava-portal`) | Company sections the admin has **published**, plus the 45-day notice |
| 2 | Careers (`/lava-portal/careers`) | Open positions ("Now hiring") and closed ones ("Not currently hiring"). Salary shows only if an admin entered it; otherwise "To be announced" |
| 3 | Agreement (`/lava-portal/agreement`) | Three required questions. The member must answer **Yes** to all three to unlock the courses. A **No** shows a polite explanation and keeps them locked; they can change their answers later |
| 4 | Preparation (`/lava-portal/courses`) | Six courses in order, each with lessons (mark complete) and a quiz. Progress bars per course and overall |
| 5 | Assessments (`/lava-portal/assessments`) | Course quizzes, graded on the server. The pass mark is set per quiz (70% by default) |
| 6 | Simulator (`/lava-portal/simulator`) | **Request Simulator Access** sends a request with status Pending. After an admin approves it, three simulated agency-desk activities open. If the request is rejected, the member sees the admin's note and can request again |

The 45-day disclosure ("…work onsite for their first 45 days for training purposes. After completing the 45-day onsite training period, Virtual Assistants will transition to a work-from-home arrangement.") appears on the About, Careers and Agreement pages. It's built into the code, so it can't be removed by mistake.

Agreeing is **not** an offer or a hiring decision. It doesn't change the member's role or status.

## Admin: Admin → LAVA Applicants (`/admin/lava`)

| Tab | What you can do |
|---|---|
| Overview | Applicant counts, pending requests, draft warnings. Pending requests also show on the main admin dashboard |
| Simulator requests | Member name, email, request date, status, lessons done, assessments passed. Approve, reject or revoke access, with an optional note the member sees |
| Applicants | Each member's three answers (read-only), agreement date, course progress and simulator status |
| Company content | Edit the 6 company sections, the working-arrangement text and the agreement introduction. Each can be Draft or Published. A warning appears if you try to publish text that still has [placeholders] |
| Positions | Add, edit, publish (hiring), close, archive or delete positions. Fields: title, niche, description, responsibilities, skills, qualifications, compensation, working arrangement |
| Courses | Add, edit, reorder or delete courses and lessons. A lesson can attach a video or PDF already uploaded in **Upload Materials** (the existing storage is reused, not duplicated) |
| Assessments | Quizzes and simulator activities: questions, options, correct answer, explanation, and the simulator "screen" (email, record, form or note) |

Lesson text formatting: a blank line starts a new paragraph, `## ` makes a heading, `- ` a bullet, `1. ` a numbered item, `> ` a highlighted tip, and `**bold**` bold text.

## Content honesty

- No verified company information was available in the project, so the six **company sections are drafts** with `[placeholders]` and a review note. They stay hidden from members until you publish them.
- **No positions, salaries or vacancies were created.**
- The courses and quizzes are original educational content (US property & casualty insurance context). The ACORD course states that completing it doesn't license anyone to perform regulated insurance activities. The navigation-tools course states that applicants won't get access to third-party software (Applied Epic, AMS360, EZLynx, HubSpot, InsuredMine) unless the administrator provides it.
- All names and numbers in the simulator activities are fictional.

## Data model (migration `20261122100000_lava_portal.sql`)

| Table | Holds | Members can… | Admins can… |
|---|---|---|---|
| `lava_content` | company sections | read **published** | everything |
| `lava_positions` | positions | read **open/closed** | everything |
| `lava_agreements` | one row per member: 3 answers, `agreed`, `answered_at`, `agreed_at` | read **own**; write only via `lava_submit_agreement()` | read all (no edits) |
| `lava_courses` | courses | read published | everything |
| `lava_lessons` | lessons (+ optional `resource_id` → `training_resources`) | read **only after agreeing** | everything |
| `lava_lesson_progress` | lesson completions | read/add/remove **own**, after agreeing | read all |
| `lava_assessments` | quizzes + simulator activities | read published titles | everything |
| `lava_questions` | questions **with answers** | **no access** (questions arrive without answers via `lava_get_assessment()`) | everything |
| `lava_attempts` | graded attempts | read **own**; created only by `lava_submit_attempt()` | read all |
| `lava_simulator_requests` | one request per member | read **own**; create via `lava_request_simulator_access()` | read all; decide via `lava_decide_simulator_request()` |

Functions (SECURITY DEFINER, fixed `search_path`, no anon access):

- `lava_submit_agreement(q1, q2, q3)`: saves the caller's own answers with server timestamps.
- `lava_get_assessment(id)`: returns questions without answers. Requires an agreement; simulator activities also require approval.
- `lava_submit_attempt(id, answers)`: grades on the server and records the attempt. Returns right/wrong and explanations, not the answer key.
- `lava_request_simulator_access()`: requires an agreement; re-opens a rejected request.
- `lava_decide_simulator_request(id, status, note)`: admins only, never on their own request. Writes the audit log.

Audit log (Activity Logs): content edits, position creation, status changes and deletion, and simulator approvals and rejections.

Inactive (deactivated) members lose all LAVA access, like the rest of the portal.

## Changing the starter content

The starter content lives in `supabase/content/lava/`:
- `course-*.json`: the six courses
- `portal.mjs`: company drafts and simulator activities

`npm run build:lava-seed` regenerates the migration `20261122100100_lava_seed_content.sql`. The seed only inserts what's missing, so once the portal is live, make changes in the admin screens instead. If you change the seed, also regenerate `supabase/setup/2_lava_portal.sql` (migrations 011 + 012 joined, with the prerequisite check at the top).

## Tests

- `npm run test:db` → `supabase/tests/lava.test.mjs`: 79 database checks covering RLS, the functions, the approval workflow and inactive accounts.
- `npm run test:lava`: the full member and admin journey in Chrome (38 checks). The LAVA data runs the **real migrations** in a temporary database, so the permission checks hit the actual rules.
- A simulated backend is still not your real Supabase project. After running the setup script on the live project, do the live check in `PRODUCTION_CHECKLIST.md`.
