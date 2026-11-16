# Supabase setup (Phases 2–5)

Everything the backend needs is in this folder. Nothing is created by hand except the first admin user.

```
supabase/
├── config.toml                              # CLI config (local dev values + function settings)
├── migrations/
│   ├── 20261114100000_core_schema.sql       # tables, constraints, indexes, updated_at triggers
│   ├── 20261114100100_auth_helpers.sql      # is_admin(), profile triggers, privilege guard, admin bootstrap
│   ├── 20261114100200_rls_policies.sql      # Row Level Security for every table
│   ├── 20261115100000_training_storage.sql  # Phase 3: private buckets, Storage RLS, file integrity, orphan finder
│   ├── 20261116100000_learning_progress_resume.sql  # Phase 4: video resume columns + tighter progress UPDATE policy
│   ├── 20261117100000_admin_management.sql  # Phase 5: contact numbers, category visibility, announcements workflow + images, audit log, admin helpers
│   ├── 20261118100000_login_alerts.sql      # Server-side sign-in log
│   ├── 20261119100000_self_signup.sql       # "Create account": portal_settings.new_account_status
│   ├── 20261120100000_direct_login_alert_email.sql  # alert emails via Resend (superseded by 010)
│   ├── 20261121100000_remove_alerts_admin_status.sql # no alert emails; admin_set_member_status / admin_update_member
│   ├── 20261122100000_lava_portal.sql       # Phase 7A: LAVA applicant portal tables, RLS, grading + approval functions
│   └── 20261122100100_lava_seed_content.sql # Phase 7A: generated from content/lava/ (npm run build:lava-seed)
├── content/lava/                            # course JSON, company drafts + simulator activities (portal.mjs), build-seed.mjs
├── functions/
│   ├── _shared/cors.ts
│   ├── admin-members/index.ts               # create / edit / activate / deactivate members, send emails
│   ├── admin-members/deno.json
│   └── .env.example                         # Edge Function secrets template
├── setup/                                   # copy-paste SQL: create_admins, 1_enable_create_account, 2_lava_portal
└── tests/                                   # `npm run test:db`: rls.test.mjs (194), lava.test.mjs (79), setup.test.mjs (15); pglite-supabase.mjs helper
```

---

## 1. Connect the Supabase project

1. Create a project at <https://supabase.com/dashboard>.
2. **Project Settings → API**: copy the **Project URL** and the **anon / publishable** key.
3. In the app folder:
   ```bash
   cp .env.example .env.local
   # set VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY
   ```
4. On Vercel (Project → Settings → Environment Variables), add the same two variables, then redeploy.

> The **service_role / secret** key never goes in `.env.local` or the host's frontend env vars. Supabase injects it into the Edge Function automatically.

## 2. Configure authentication (Dashboard)

| Setting | Where | Value |
|---|---|---|
| Public sign-ups ("Create account") | Authentication → Sign In / Providers → **Allow new users to sign up** | **On**. New accounts are always members; open or approval mode via `portal_settings` (DEPLOYMENT_GUIDE §5) |
| Confirm email | Authentication → Sign In / Providers → Email → **Confirm email** | **Off**: new members sign in immediately (owner's choice). If you turn it On, set the **Confirm signup** template link to `{{ .SiteURL }}/login?token_hash={{ .TokenHash }}&type=email` |
| Email provider | Authentication → Sign In / Providers → Email | Enabled |
| Site URL | Authentication → URL Configuration | `https://your-app-domain` |
| Redirect URLs | Authentication → URL Configuration | `https://your-app-domain/reset-password` and `http://localhost:5173/reset-password` |
| Custom SMTP | Authentication → Emails → SMTP Settings | **Required for real use.** The built-in sender only delivers a few emails per hour and only to your team's addresses. Any provider works (Resend, Postmark, SendGrid, SES…). |
| Access token expiry *(optional)* | Project Settings → JWT Keys / Auth | Default is 3600 s. Lowering it (e.g. 900 s) shortens how long a deactivated user's already-issued token can live (it can't read any data either way, see §8). |

### Email templates (recommended)

**Authentication → Emails → Templates.** Replace the link in these two templates. Links in this form work on any device or browser, and email link scanners can't use them up before the member clicks.

**Invite user**
```html
<h2>You're invited to VA Training Academy</h2>
<p>Your training administrator has created an account for you.</p>
<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=invite">Set your password</a></p>
```

**Reset password**
```html
<h2>Reset your password</h2>
<p><a href="{{ .SiteURL }}/reset-password?token_hash={{ .TokenHash }}&type=recovery">Choose a new password</a></p>
<p>If you didn't request this, you can ignore this email.</p>
```

The app also accepts the default template links, so keeping the defaults works too. The custom links are more reliable.

## 3. Run the database migrations

**Option A: Supabase CLI (recommended)**
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>   # ref = the xxxx in https://xxxx.supabase.co
npx supabase db push                                 # applies supabase/migrations in order
```

**Option B: SQL Editor.** Open each file in `supabase/migrations/` in filename order, paste it into **SQL Editor**, and run it.

Optional local check (no Supabase needed): `npm run test:db` applies the migrations to an in-memory Postgres and runs the RLS/privilege tests.

> Already ran earlier migrations? Just run `npx supabase db push` again. It applies only the files your project hasn't run yet. In the SQL Editor, run only the new files, in order:
> - coming from Phase 2: `20261115100000_training_storage.sql`, then `20261116100000_learning_progress_resume.sql`
> - coming from Phase 3: `20261116100000_learning_progress_resume.sql`, then `20261117100000_admin_management.sql`
> - coming from Phase 4: `20261117100000_admin_management.sql` only
>
> The Phase 4 migration is additive: it adds two columns with default `0`, so existing progress rows keep working, and it replaces one policy.

## 4. Deploy the Edge Function

```bash
npx supabase secrets set \
  SITE_URL=https://your-app-domain \
  ALLOWED_ORIGINS=https://your-app-domain,http://localhost:5173

npx supabase functions deploy admin-members
```

- `SITE_URL` is where invite and reset links send people (`$SITE_URL/reset-password`).
- `ALLOWED_ORIGINS` lists the browser origins allowed to call the function.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are provided by Supabase automatically.
- `config.toml` sets `verify_jwt = false` for this function on purpose: the function validates the caller's token itself (`auth.getUser`) and then checks `profiles.role = 'admin'` and `status = 'active'`. This works with both legacy JWT keys and the new API keys. If you deploy without `config.toml`, pass `--no-verify-jwt`.

## 5. Create the first administrator (one-time)

No admin email or password is hardcoded anywhere, and the first person to sign up is **not** made an admin. New auth users always start as **inactive members**.

1. **Authentication → Users → Add user → Create new user.** Enter your email and a strong password, and tick **Auto Confirm User**.
2. **SQL Editor**, run:
   ```sql
   select public.bootstrap_first_admin('you@example.com');
   ```
   → `you@example.com is now an active administrator.`
3. Sign in to the app. You'll land on `/admin`.

`bootstrap_first_admin` only works while **no** admin exists. It can't be called through the API: execution is revoked from `anon` and `authenticated`, so only the SQL Editor (`postgres`) can run it.

**Adding more admins later.** Create them as members in the app first, then run in the SQL Editor:
```sql
update public.profiles set role = 'admin' where email = 'colleague@example.com';
```
Role changes are deliberately impossible from the browser, even for admins.

## 6. How member creation works

1. Admin fills in the form on **Admin → Members → Add member**.
2. The browser calls `admin-members` with the admin's access token. No service key is involved.
3. The function verifies the token, confirms the caller is an **active admin**, validates the input and rejects duplicate emails (409).
4. `auth.admin.inviteUserByEmail()` creates the auth user and sends the invitation. In the same database transaction, the `on_auth_user_created` trigger inserts the profile as an **inactive member**.
5. The function activates the profile (`status = 'active'`, `role = 'member'`).
   - If that step fails, the auth user is deleted, which cascades to the profile, so nothing is left half-created.
   - If the email fails, any record from that attempt is removed.
6. The member clicks the email, lands on `/reset-password`, sets a password, and enters the portal.

## 7. What each role can do (enforced in Postgres)

| | anon | inactive user | member | admin |
|---|---|---|---|---|
| Read own profile | ✗ | ✓ | ✓ | ✓ |
| Read other profiles | ✗ | ✗ | ✗ | ✓ |
| Edit own first/last name | ✗ | ✗ | ✓ | ✓ |
| Change role / status / email | ✗ | ✗ | ✗ | via Edge Function only |
| Published resources, categories, announcements | ✗ | ✗ | ✓ | ✓ (incl. drafts) |
| Create/edit resources, categories, announcements | ✗ | ✗ | ✗ | ✓ |
| Own favorites / progress | ✗ | ✗ | ✓ | ✓ |
| Others' favorites / progress / activity | ✗ | ✗ | ✗ | read only |
| Update / delete activity logs | ✗ | ✗ | ✗ | ✗ (append-only) |

How it's enforced:
- `public.is_admin()` and `public.is_active_user()` are `SECURITY DEFINER` helpers, which avoids recursive RLS.
- The `protect_profile_fields` trigger blocks browser sessions from changing `role`, `status`, `email`, `id` or `created_at`.

## 8. Deactivation (access revocation)

When an admin deactivates an account, the Edge Function:
1. sets `profiles.status = 'inactive'`. From that moment, RLS returns **no portal data** to that user.
2. **bans** the auth user, which blocks new sign-ins and refresh tokens, so any open session ends at its next token refresh (≤ JWT expiry).

The app also re-checks the profile whenever the tab regains focus and shows "Account deactivated". Reactivation reverses both steps. Admins can't deactivate themselves.

## 9. Training storage (Phase 3)

### Buckets (created by the Phase 3 migration, all private)

| Bucket | Holds | Bucket limit | Allowed types |
|---|---|---|---|
| `training-pdfs` | PDF guides | 50 MB | `application/pdf` |
| `training-videos` | Training videos | 2 GB | `video/mp4`, `video/webm` |
| `resource-thumbnails` | Video thumbnails / PDF covers | 5 MB | JPEG, PNG, WebP |

Check them under **Storage** in the Dashboard: each should show **Private**. Never switch them to public.

### Storage rules (Storage RLS on `storage.objects`)
- **Upload, replace, delete:** active admins only.
- **Read (and so signed-URL creation):**
  - active admins can read every file;
  - active members can read only files attached to a **published** resource, in the bucket matching its type;
  - inactive users and signed-out visitors can read nothing.
- Unpublishing a resource revokes member access to its file **immediately**. A signed URL a member already holds keeps working until it expires (lifetimes below).
- The database stores **object paths only** (`storage_path`, `thumbnail_path`), never URLs. One file belongs to exactly one resource, and a resource can't be published without a file.

### Signed URL lifetimes (`src/config/constants.js → SIGNED_URL_TTL`)

| Use | Lifetime | Why |
|---|---|---|
| Video playback | 1 hour | If it expires mid-lesson, the player silently gets a fresh URL and resumes at the same position |
| PDF viewing | 5 minutes | The viewer downloads the whole document immediately |
| PDF download | 60 seconds | Used by the browser right away |
| Thumbnails | 1 hour | Cached in the app and refreshed before expiry |

### Set the upload size limit
1. **Dashboard → Storage → Settings → Upload file size limit.** This is project-wide and **overrides** the bucket limits when it's lower.
   - **Free plan:** 50 MB maximum. So on Free, videos are limited to **50 MB**, whatever the bucket says.
   - **Pro and above:** raise it, e.g. to 2 GB, to match the video bucket.
2. Set `VITE_MAX_UPLOAD_MB` in `.env.local` and your host's env vars to the same number (default `50`), then redeploy the frontend.

The upload screen reads the real bucket limits from Supabase, takes the lower of that and `VITE_MAX_UPLOAD_MB`, and shows the result. Files over the limit are rejected before uploading. If the two settings disagree, Storage still rejects the file, and the admin sees "larger than the storage limit allows".

### How uploads work
- PDFs and videos use **resumable TUS uploads** in 6 MB chunks (the size Supabase requires).
  - Progress is shown as a percentage. Brief network drops and server errors are retried automatically, up to 5 times.
  - After that, **Retry upload** continues from the last confirmed chunk.
  - If the tab is closed mid-upload, selecting the same file again within 24 hours resumes it.
- Files are checked three ways before upload: extension, browser MIME type, and the file's actual signature bytes. A renamed `.txt` can't pose as a PDF. Storage enforces type and size again on the server.
- Order of operations: **file → thumbnail → database record**. If the record can't be saved, the uploaded files are deleted again.
- Deleting a resource removes the record first (members lose access instantly), then its files.
- Anything left behind by a closed tab or a failed delete appears on **Manage Resources** as "unused files" (older than 1 hour) with a one-click **Remove**.

### Video formats
- **MP4 with H.264 video + AAC audio** plays in every browser and is the recommended format.
- WebM plays in Chrome, Firefox and Edge, but not on older iPhones.
- MOV/HEVC is not accepted, because many browsers can't play it.
- If the admin's own browser can't decode a selected video, the upload screen warns before uploading.

## 9b. Learning progress (Phase 4)

`learning_progress` (one row per member per resource) now stores:

| Column | Meaning |
|---|---|
| `status` | `in_progress` or `completed` |
| `progress_percent` | Furthest point reached (videos). Shows 100 only when completed |
| `last_position_seconds` *(new)* | Where the member stopped. Opening the video resumes here |
| `watched_seconds` *(new)* | Seconds actually played (seeking doesn't count) |
| `completed_at` | When it was completed |

**Rules:**
- **Videos.** Opening a video creates no progress; the first save happens after playback starts. Position is saved every 15 seconds of playback, on pause, at the end, when the tab is hidden, and when leaving the page, so a member watching continuously causes at most about 4 small writes a minute. A video completes automatically once the member has reached **90%** of it **and** actually played **70%** of its length (`VIDEO_COMPLETION` in `src/config/constants.js`). Jumping straight to the end doesn't count.
- **PDFs.** Opening one marks it **started**. The member completes it with **Mark as complete**, and can undo that with **Mark as not completed**.
- Progress for unpublished resources is hidden from members' stats. It isn't deleted, so it comes back if the resource is republished.

**RLS change (and why).** The member UPDATE policy on `learning_progress` previously checked only that the row stayed theirs. A member could therefore re-point their own row at a resource id they can't see (e.g. a draft). It now also requires the referenced resource to be visible to them, the same rule INSERT already had. No other policies changed, and admins keep read access to everyone's progress.

## 9c. Admin management (Phase 5)

### Apply (from Phase 4)
1. `npx supabase db push` (or run `20261117100000_admin_management.sql` in the SQL Editor).
2. **Redeploy the Edge Function.** It changed: role, status and contact number on create/update, plus audit logging.
   ```bash
   npx supabase functions deploy admin-members
   ```
3. Redeploy the frontend.

### What the migration changes
| Area | Change |
|---|---|
| `profiles` | + `phone` (optional, digits/`+()-.` and spaces, max 32). Members may edit their own; role, status and email stay locked by `protect_profile_fields` |
| `categories` | + `is_visible`, `updated_at`. Hidden categories aren't shown to members |
| `announcements` | `published boolean` replaced by `status` (`draft`/`published`/`archived`); + `image_path`, `publish_at` (scheduling), `published_at`, `updated_at`. Existing rows are migrated |
| Storage | New private bucket `announcement-images` (5 MB, JPEG/PNG/WebP) with admin-only write and live-only read |
| `activity_logs` | Same table, extended: + `target_type`, `target_id`, `target_label`, `details`. `user_id` is nullable for system actions. Admin action types added |
| Audit triggers | `training_resources`, `categories` and `announcements` log every insert, update and delete, with the admin as actor (server-side) |
| Functions | `delete_category(id, move_to)`: reassign and delete in one transaction. `admin_member_auth_info(ids)`: last sign-in times, admins only. The orphan finder now covers announcement images |

### RLS / security changes (and why)
- **Categories SELECT.** Previously any active user could read every category. Now members see only `is_visible` ones and admins see all (new admin policy). This supports hidden categories.
- **Announcements SELECT for members.** Was `published = true`. Now `status = 'published'` and the scheduled time has arrived, so scheduled posts stay hidden until then, with no cron job needed.
- **Activity log INSERT.** Previously members could insert any allowed type for themselves. Now browser sessions, admins included, can insert **only member learning types**, with no target or details. Admin entries can only come from the audit triggers (`log_admin_action`, which the API can't call) or the Edge Function using the service role. This means no one can forge the audit trail.
- **Logs stay append-only.** UPDATE and DELETE privileges are still revoked; nobody can edit or delete them from the browser.
- Everything else is unchanged. All admin writes still require an active admin through RLS, and member management still goes only through `admin-members`.

### Edge Function changes (`admin-members`)
- `create` accepts `phone`, `role` (`member`/`admin`) and `status`:
  - **active** sends the invitation;
  - **inactive** creates the account without any email, blocked from signing in until reactivated.
- `update` accepts `phone` and `role`. An admin can't change their own role, and the last active admin can't be demoted.
- Every change writes an audit entry with the calling admin as actor. Entries contain only ids, names, emails and changed **field names**, never passwords, tokens or keys.

## 9d. LAVA applicant portal (Phase 7A)

Apply with `npx supabase db push`, or paste `setup/2_lava_portal.sql` into the SQL Editor.

- **New tables (all RLS-enabled, no anon access):** `lava_content`, `lava_positions`, `lava_agreements`, `lava_courses`, `lava_lessons`, `lava_lesson_progress`, `lava_assessments`, `lava_questions`, `lava_attempts`, `lava_simulator_requests`.
- **Existing tables:** unchanged. `activity_logs` only gets new *allowed* values (LAVA admin actions); nothing is removed.
- **RLS summary:** members read published content and their own agreement, progress, attempts and request. Lessons unlock only after agreeing to all three conditions. Questions (with answers) are admin-only. Agreements, attempts and access requests can't be written directly (insert/update revoked), only through the SECURITY DEFINER functions. Only admins can approve or reject simulator access, never their own request.
- Full description: [../docs/LAVA_PORTAL.md](../docs/LAVA_PORTAL.md).

## 10. Storage & bandwidth limitations (read before uploading lots of video)

Plan figures change; check <https://supabase.com/pricing> for current numbers.

| | Free | Pro |
|---|---|---|
| Max upload per file | 50 MB (hard limit) | Configurable (up to hundreds of GB) |
| Storage included | 1 GB | 100 GB, then billed per GB |
| Egress (bandwidth) included | 5 GB / month | 250 GB / month, then billed per GB |

What this means in practice:
- **No transcoding or adaptive streaming.** Supabase serves the uploaded file as-is, using HTTP range requests, so playback quality is exactly what you upload. There's no automatic 360p version for slow connections.
- **Bandwidth roughly equals file size × views.** For example, a 300 MB video watched fully by 50 members is about 15 GB of egress. On the Free plan that's 3 videos' worth for the month.
- **Encode before uploading.** 720p H.264 at about 1.5 Mbps is about 0.7 GB per hour of video and looks fine for screen recordings. HandBrake's "Fast 720p30" preset is a good default. This is the biggest lever on both storage and bandwidth.
- **Downloads aren't DRM.** Signed URLs stop link sharing after expiry and keep files private, but a signed-in member can always save what their browser plays. The player hides the browser's download menu; that only deters casual saving.
- If video volume outgrows Supabase, a dedicated video host (Mux, Cloudflare Stream, Bunny Stream) adds adaptive streaming. That would be a later-phase decision.

## 11. Troubleshooting

| Symptom | Fix |
|---|---|
| "Member management is not deployed yet" / network error on Add member | Deploy `admin-members` (§4) and check `ALLOWED_ORIGINS` includes the URL you're using |
| "The email could not be sent" | Configure custom SMTP (§2) |
| "Too many emails were sent recently" | Built-in email rate limit: set up custom SMTP |
| Invite link says "Link expired" | Links are single-use and expire (default 24 h). Use the ✉ button on the Members page to send a new one |
| "Account not available" after sign-in | The user has no profile row. Users that existed when the migrations ran are backfilled automatically, so this should only happen if a profile was deleted by hand. Delete the auth user and re-invite them |
| Signed in but see "Account deactivated" | The profile is inactive. Reactivate it on the Members page |
| Upload page: "storage buckets weren't found" | Run the Phase 3 migration (§3) |
| "larger than the storage limit allows" | Raise the project upload limit (§9) and set `VITE_MAX_UPLOAD_MB` to match |
| "You don't have permission to upload files" | Only active admins can upload. Check the profile's role/status |
| Video shows "format can't be played" | Re-encode to MP4 (H.264 + AAC) and upload again |
| Member sees a resource but the file won't open | The resource was unpublished, or its file is missing. Check Manage Resources |
