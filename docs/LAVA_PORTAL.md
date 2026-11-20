# LAVA Automation Applicant Portal (Phase 7A)

**Branding:** the LAVA portal and the LAVA admin screens use LAVA Automation's branding from lavaautomation.com: the official white logo on charcoal **#22212A**, brand red **#E52724** (hover **#BF211E**) for buttons, active tabs and accents, white, and the **Poppins** typeface (bundled with the app, so no external requests). Green is kept only for "completed / passed". The same red/charcoal/white palette and Poppins now apply to the whole app (member portal and admin console): the color tokens in `src/index.css` map the app's `navy` scale to LAVA charcoal, and primary buttons, progress bars, the sidebar's active-item marker and accents use `lava` red. The logo is `src/assets/lava/lava-logo-white.png`.

The member dashboard offers two paths:

1. **I Want to Apply to LAVA Automation** → `/lava-portal` (built in this phase)
2. **I Want to Explore Different Niches** → `/explore-niches` (a "coming soon" placeholder for a later phase)

## Member journey

| Step | Page | What happens |
|---|---|---|
| 1 | About LAVA (`/lava-portal`) | Company sections the admin has **published**, plus the 45-day notice |
| 2 | Careers (`/lava-portal/careers`) | Open positions ("Now hiring") and closed ones ("Not currently hiring"). Salary shows only if an admin entered it; otherwise "To be announced" |
| 3 | Agreement (`/lava-portal/agreement`) | Three required questions. The member must answer **Yes** to all three to unlock the courses. A **No** shows a polite explanation and keeps them locked; they can change their answers later |
| 4 | Preparation (`/lava-portal/courses`) | Six courses in order, each with lessons (mark complete) and a quiz. Lessons show their videos (inline player) and PDFs (built-in viewer, with a download option). Progress bars per course and overall |
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
| Courses | Add, edit, reorder or delete courses and lessons. Each lesson has a **Videos & PDFs** button: upload several videos (MP4/WebM) and PDFs at once, set their titles, reorder or remove them, or attach a file already in the Training Library. Uploads use the same resumable upload and private storage as Upload Materials. LAVA files are marked as LAVA material: they are hidden from the general Training Library and listed in Manage Resources with a LAVA badge |
| Assessments | Quizzes and simulator activities: questions, options, correct answer, explanation, and the simulator "screen" (email, record, form or note) |

**Text editor.** Company sections, lessons and job descriptions use a formatting editor with a toolbar (heading, subheading, **bold**, *italic*, underline, link, bulleted and numbered lists, highlighted tip, divider line), keyboard shortcuts (⌘/Ctrl + B, I, U, K), and Write / Split / Preview views with a word count. The text is stored as plain formatted text: `## ` heading, `### ` subheading, `**bold**`, `*italic*`, `++underline++`, `[text](https://…)` link, `- ` bullet, `1. ` numbered item, `> ` tip, `---` divider. Pasted `https://` addresses become links automatically.

**Photos (Company content and lessons).** Copy a photo (e.g. right-click it on lavaautomation.com → **Copy Image**) and press ⌘V / Ctrl+V in the editor, or drag a photo in. No file picker: the photo is shrunk in the browser (max 1600 px) and saved automatically to the `lava-images` storage bucket, then inserted as `![Photo](…)` on its own line. Photos on consecutive lines show as a gallery; replace *Photo* with a caption. Only photos saved this way are displayed. The `lava-images` bucket is **public** (company marketing photos, served by plain URL; only admins can add or delete). Don't paste private documents. Run `supabase/setup/4_lava_company_photos.sql` once to enable it. It is displayed safely: HTML typed into it shows as text, and only `http(s)` and `mailto` links are created; they open in a new tab.

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
| `lava_lessons` | lessons | read **only after agreeing** | everything |
| `lava_lesson_materials` | videos/PDFs per lesson → `training_resources` (migration 013) | read **only after agreeing** | everything |
| `training_resources.audience` | `library` (default) or `lava` | LAVA files (row **and** file) readable **only after agreeing**; hidden from the library | everything |
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

- `npm run test:db` → `supabase/tests/lava.test.mjs`: 91 database checks covering RLS, the functions, the approval workflow and inactive accounts.
- `npm run test:lava`: the full member and admin journey in Chrome (44 checks, including lesson video/PDF upload and playback, and the LAVA branding). The LAVA data runs the **real migrations** in a temporary database, so the permission checks hit the actual rules.
- A simulated backend is still not your real Supabase project. After running the setup script on the live project, do the live check in `PRODUCTION_CHECKLIST.md`.
