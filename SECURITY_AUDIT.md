# Security Audit — VA Training Academy

**Scope:**
- the React app (`src/`);
- the Supabase migrations: tables, Row Level Security (RLS), storage policies, functions and triggers;
- the `admin-members` Edge Function;
- environment and configuration (`.env.example`, `vercel.json`, `supabase/config.toml`);
- dependencies.

**Method:** code review plus automated tests.
- 158 database/storage policy checks run on real Postgres (PGlite) with a Supabase-like `auth` and `storage` setup.
- 45 functional checks on the Edge Function.
- 170+ browser tests on the real app against a simulated Supabase API.
- A production-build acceptance test served with the real `vercel.json` headers and rewrite.

**Not covered (honest limits):**
- Nothing was run against **your** hosted Supabase project, real email delivery or Vercel. Those tests need your accounts; see [TEST_RESULTS.md](TEST_RESULTS.md).
- The database tests emulate Supabase's `auth` and `storage` schemas; they are not the hosted service.
- Repeat the manual and API checks in [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) on the live project.

Severity scale: **Critical** (exploitable data breach), **High**, **Medium**, **Low**, **Info**.

---

## 1. Findings

| # | Issue | Severity | Affected file / component | Recommended fix | Status |
|---|---|---|---|---|---|
| F1 | A production deploy missing the Supabase env vars fell back to **Preview mode**: a public "Admin view / Member view" interface on sample data. No real data was exposed, but it looked like an open portal | Medium | `src/lib/supabase.js`, `src/main.jsx` | Preview mode only in local dev (or an explicit `VITE_ENABLE_PREVIEW`); production shows a neutral "not available" page | **Resolved (Phase 6)**. Verified: a production build without env shows the config page on every route, with no preview controls |
| F2 | **Missing security headers / Content-Security-Policy on Vercel.** `vercel.json` only set 4 basic headers; no CSP, HSTS, Permissions-Policy or COOP | Medium | `vercel.json` | Add CSP, HSTS, X-Frame-Options, nosniff, Referrer-Policy, Permissions-Policy, COOP, X-Robots-Tag | **Resolved (Phase 6)**. Verified in the production acceptance test, with a negative control: CSP blocked an injected inline script and an outside image |
| F3 | A member can set their own `avatar_url` to any external URL through the API (there's no avatar feature in the UI). Admins viewing them would load that image (a tracking-pixel / IP leak, not script execution) | Low | `profiles.avatar_url` | CSP `img-src` allows only this site and Supabase, so outside images are blocked | **Mitigated (Phase 6)** by F2. Optional: lock the column in `protect_profile_fields` if avatars are never added |
| F4 | Audit-log triggers built changed-field lists with `text[] || 'literal'`, which Postgres rejects, so every resource/category edit would have errored once deployed | High (availability) | `20261117100000_admin_management.sql` | Use `array_append` | **Resolved (Phase 5)**, caught by the DB test suite before any deploy |
| F5 | A member could re-point their own progress row at a resource they can't see (e.g. a draft id) | Low | `learning_progress` UPDATE policy | WITH CHECK requires a visible resource | **Resolved (Phase 4)** |
| F6 | Activity log: browser sessions could previously write any allowed type for themselves, so admin-action entries could have been forged once those types existed | Medium | `activity_logs` INSERT policy | Browsers may insert only member learning types, with no target or details; admin entries come only from triggers / the Edge Function | **Resolved (Phase 5)** |
| C1 | **Public sign-up is enabled by owner decision** ("Create account"). With **email confirmation off** (also owner decision), anyone who finds the site can register **instantly, with any email address, even one they don't own**, and view all published training | Medium (accepted risk) | Supabase Auth settings | Turn **Confirm email** on if fake or mistyped emails become a problem; enable CAPTCHA if bots appear; switch to approval mode (`portal_settings.new_account_status = 'inactive'`) to vet each person; deactivate unwanted accounts in Admin → Members | **Accepted by owner.** Safeguards built in and tested: self-registered accounts are always `member` (a role in sign-up data is ignored); approval mode; fail-closed if the setting is missing; settings unreadable from the browser; the admin is emailed on every member's first sign-in |
| C2 | Supabase's server-side password minimum defaults to 6 characters; the app's forms require 8 plus letter and digit, but a direct API call could set a weaker one | Medium (config) | Supabase Auth settings | Password requirements: minimum 8, letters + digits. Consider "leaked password protection" on paid plans | **Action required by you** |
| C3 | Edge Function CORS allows any origin when `ALLOWED_ORIGINS` is unset. CORS isn't authorization (a valid admin token is still required), but restricting it adds a layer | Low (config) | `supabase/functions/_shared/cors.ts` | Set `ALLOWED_ORIGINS` (and `SITE_URL`) to the live domain | **Action required by you** (DG §4) |
| C4 | The built-in Supabase email sender is rate-limited and only sends to team addresses, so invites/resets may not arrive | Medium (availability) | Supabase Auth → SMTP | Configure custom SMTP | **Action required by you** |
| C5 | A Supabase custom domain would be blocked by the CSP | Info | `vercel.json` | Add the domain to `img-src`, `media-src`, `connect-src` | Documented (DG §8) |
| A1 | Session tokens live in the browser's localStorage (standard for Supabase SPAs). Any successful XSS could read them | Low | `src/lib/supabase.js` | Keep XSS surface minimal: no raw HTML rendering, plus strict CSP | **Accepted**. The scan found no `dangerouslySetInnerHTML`/`innerHTML`/`eval`; CSP forbids inline and outside scripts |
| A2 | Signed file URLs stay valid until expiry after a deactivation or unpublish: video ≤ 1 h, PDF ≤ 5 min, download ≤ 60 s. Data access via the API stops immediately | Low | `src/config/constants.js` (`SIGNED_URL_TTL`) | Shorten TTLs if needed (the video player re-signs automatically) | **Accepted**, documented |
| A3 | An existing access token remains valid until expiry (≤ 1 h) after deactivation, but every table/storage policy requires an active profile, and refresh is blocked by the auth ban | Low | Supabase JWT expiry | Optionally lower the JWT expiry (e.g. 15 min) | **Accepted**. Verified: a deactivated member's API calls return no data |
| A4 | Invite/reset links that carry tokens could log a victim into an *attacker's* account if the victim clicks the attacker's link ("login CSRF"). No access to the victim's data results | Low | `src/services/authService.js` (`completeAuthRedirect`) | The reset page shows which email is signed in; links are single-use | **Accepted** |
| A5 | Members can save what their browser plays or downloads; signed URLs prevent sharing *links*, not copying files | Info | — | DRM/streaming host if ever required | **Accepted**, documented |
| L1 | **Login alert emails** sent members' personal data (name, email, device, IP) to an inbox via Resend | Info | migration `20261121100000_remove_alerts_admin_status.sql` | Remove if not needed | **Resolved — removed.** No emails are sent; the stored Resend key and alert settings are deleted from Vault. Sign-ins are still logged in Activity Logs |
| L3 | Activate/deactivate and member edits now run in the database instead of the Edge Function | Info | `admin_set_member_status`, `admin_update_member` | Same checks as the function | **Verified.** SECURITY DEFINER with fixed `search_path`; callable only by active admins (anon has no execute); blocks self-deactivation, own role change and removing the last active admin; writes the audit log (tested) |
| L2 | "Signed in" activity entries were written by the browser and could be skipped or faked | Low | `activity_logs` | Record sign-ins with a server-side trigger; forbid browser inserts of `signed_in` | **Resolved**. Trigger on `auth.users.last_sign_in_at`; browser insert now rejected (tested) |
| A6 | Admin-only error messages from `delete_category` may show short database messages | Info | `src/services/categoryService.js` | Messages are written by our function; admins only | **Accepted** |
| V1 | **LAVA portal (Phase 7A):** quiz/simulator answers must not reach members | Medium (integrity) | `lava_questions`, `lava_get_assessment()`, `lava_submit_attempt()` | Answer key admin-only; questions served without answers; server-side grading | **Resolved by design.** `lava_questions` RLS is admin-only; the read function strips `answer`; results return right/wrong + explanation only (tested in DB and browser) |
| V2 | Members could approve their own simulator access or fake agreement/scores via the API | High if missed | `lava_simulator_requests`, `lava_agreements`, `lava_attempts` | No direct writes; only SECURITY DEFINER functions with admin / own-row checks | **Resolved by design.** INSERT/UPDATE/DELETE revoked from `authenticated`; approval function is admin-only and refuses an admin's own request (tested: PATCH, INSERT and RPC attempts all refused) |
| V3 | Preparation lessons and simulator must stay locked until agreement / approval even if the UI is bypassed | Medium | `lava_lessons` RLS, `lava_has_agreed()`, `lava_has_simulator_access()` | Enforce in RLS and in the functions | **Resolved.** Lessons RLS requires agreement; assessment functions require agreement, simulator also approval (tested via direct API calls) |
| V4 | Unverified company facts, salaries or vacancies could be presented as real | Info (content) | `lava_content`, `lava_positions` | Drafts hidden until an admin publishes; no seeded positions | **Resolved.** Company sections seeded as drafts with [placeholders]; publishing placeholder text shows a warning; positions only appear when an admin publishes them |
| V6 | LAVA lesson videos/PDFs must not be readable by members who haven't agreed (row or file), nor appear in the general library | Medium | `training_resources.audience`, member SELECT policy, `can_read_training_file()`, `lava_lesson_materials` RLS | Gate LAVA files on `lava_has_agreed()` in table RLS and Storage RLS | **Resolved.** Tested: un-agreed member can't read the row or the storage object; library files unaffected; members can't attach materials |
| V5 | Admin-entered lesson/company/job text (incl. links) is rendered to members | Low (XSS) | `src/components/lava/RichText.jsx` | Render as React text, never HTML; allow only http(s)/mailto links | **Resolved.** The formatter builds React elements (no `dangerouslySetInnerHTML`); links are restricted to `http(s)`/`mailto`, open with `rel="noopener noreferrer nofollow"`. Tested: `<script>` shows as text, `javascript:` links are not created |

**No open Critical or High issues.** Every Medium code issue is resolved. The open Medium items are **dashboard settings you need to apply** (C2, C4), plus **C1, public sign-up**, which you chose deliberately (an accepted risk with built-in safeguards).

---

## 2. Verified controls (what was checked and how)

### Authentication & sessions
| Control | Evidence |
|---|---|
| Self sign-up never grants admin; approval mode blocks until activated; duplicate emails refused | DB tests + acceptance S1–S6 |
| Invalid credentials and deactivated (banned) accounts rejected with safe messages | Browser tests |
| Protected URLs typed directly redirect to `/login` (logged out) or `/dashboard` (member on admin URL) | Production acceptance E3 + Phase 5 test (8 admin URLs) |
| Session persists across reloads; expired/revoked sessions → login with notice | Browser tests (Phase 2, acceptance E5) |
| Reset/invite links are single-use and removed from the address bar | Acceptance step 3 + E4 |
| Role and status come from `profiles` (never from JWT metadata); UI guards are cosmetic, and the database enforces | Code review + DB tests |

### Database (RLS) — `npm run test:db`, 158 checks
- RLS **enabled on all 7 tables**; `anon` has **no** table privileges; every `SECURITY DEFINER` function pins `search_path`; every foreign key is indexed.
- **Members:**
  - read only their own profile;
  - can't change role, status or email (`protect_profile_fields`), or anyone else's row;
  - can't insert or delete profiles.
- **Progress & favorites:** read and write only their own; no reading, editing or creating other members' rows; duplicate favorites rejected.
- **Published only:** members see only published resources and live announcements, and only visible categories.
- **Admin-only writes:** only active admins can write resources, categories and announcements; `delete_category` is admin-only.
- **Activity logs** are append-only for everyone in the browser, and admin entries can't be forged, even by admins.
- **Inactive accounts:**
  - inactive members get **nothing** from any table except their own profile row;
  - inactive admins lose admin rights.
- Deactivation preserves progress and favorites.

### LAVA applicant portal (Phase 7A) — `supabase/tests/lava.test.mjs`, 79 checks; `npm run test:lava`, 38 browser checks
| Control | How verified |
|---|---|
| Anonymous visitors have no access to any `lava_*` table or function | DB test (permission denied on every table + RPC) |
| Members see published content/positions only; drafts and archived hidden | DB + browser |
| Agreement: all three answers required; only "Yes ×3" unlocks; stored with server timestamps; one row per member; members can't read or edit another member's row; admins can read but not edit; agreeing doesn't change role/status | DB + browser |
| Lessons, progress and assessments locked before agreement | DB + browser (direct API call) |
| Answer key never sent to members; grading server-side; fake scores rejected | DB + browser |
| Simulator: locked until approval; request = Pending; members can't approve (PATCH/INSERT/RPC refused); admin approve/reject with note; reject re-locks; admins can't decide their own request; decisions audited | DB + browser |
| Deactivated members lose all LAVA access | DB + browser |

### Storage
- **4 buckets, all private**, with size and type limits (SVG not allowed).
- Members read only files of published resources / live announcements, in the matching bucket. Drafts, unreferenced files, inactive users and anon get nothing.
- Only active admins can upload, replace or delete. Unpublishing revokes access immediately.
- Files are reached only through short-lived signed URLs; Supabase checks the read policy before signing (server-side).

### Edge Function `admin-members` — 45 checks
- Token verified with Supabase Auth; caller must be an **active admin** (from `profiles`).
- Members and inactive admins get 403. Members can't create accounts or promote themselves; admins can't change their own role or status.
- Input validation for names, email, phone, role and status. Duplicate emails → 409.
- Rollback on partial failure, leaving no orphan accounts.
- Generic error messages; internals only in server logs.
- Audit entries contain no tokens, passwords or keys.

### Application
| Check | Result |
|---|---|
| `npm audit` (all dependencies) | **0 vulnerabilities** |
| Secret scan (service-role keys, JWTs, `sb_secret_`) in source/docs | None found |
| App refuses to start with a service-role/secret key in `VITE_*` | Yes (`src/lib/supabase.js`) |
| Raw HTML rendering / `eval` | None. Announcements and descriptions render as text |
| PDF.js | 4.10.38 (CVE-2024-4367 fixed in 4.2.67), `isEvalSupported: false` |
| Uploads | Extension + MIME + file-signature checks in the browser; bucket MIME/size limits enforced by Storage; safe object names |
| Search inputs | Sanitized before reaching PostgREST filters |
| Error messages | User-safe text only; raw errors go to the console |
| `.env*` files | Ignored by Git (except `.env.example`, which has placeholders only) |
| Security headers (production build) | Present on every page; assets cached immutably; CSP enforced, with a negative control proving it blocks |

---

## 3. Recommendations after launch
1. Apply C2–C4 before launch. Check Admin → Members regularly; if unwanted accounts appear, deactivate them, switch on approval mode or Confirm email, or add CAPTCHA (C1).
2. Keep a second admin account for emergencies.
3. Run `npm audit` and update dependencies every few months; re-run `npm run test:db` and `npm run build` after updates.
4. Review Admin → Activity Logs periodically.
5. Take a `pg_dump` backup monthly and before every migration ([DEPLOYMENT_GUIDE.md §2](DEPLOYMENT_GUIDE.md)).
