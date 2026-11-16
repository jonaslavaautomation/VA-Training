# Deployment Guide — VA Training Academy

This guide takes you from "code on my computer" to "live website", step by step.
It assumes no deployment experience. Go in order; each step says how to check it worked.

> **Nothing here has been deployed for you.** Every step below is yours to run when you're ready.
> Replace anything in `<angle brackets>` with your own values. No real domains or keys are used in this guide.

**Contents**
1. [What you need](#1-what-you-need)
2. [Back up first (existing projects)](#2-back-up-first-existing-projects)
3. [Set up the Supabase database](#3-set-up-the-supabase-database)
4. [Deploy the Edge Function](#4-deploy-the-edge-function)
5. [Configure Supabase Auth, email and storage](#5-configure-supabase-auth-email-and-storage)
6. [Create the first administrator](#6-create-the-first-administrator)
7. [Put the code in a Git repository](#7-put-the-code-in-a-git-repository)
8. [Connect the repository to Vercel](#8-connect-the-repository-to-vercel)
9. [Tell Supabase your live website address](#9-tell-supabase-your-live-website-address)
10. [Verify the live site](#10-verify-the-live-site)
11. [If something goes wrong (rollback)](#11-if-something-goes-wrong-rollback)
12. [Updating the site later](#12-updating-the-site-later)

---

## 1. What you need

| Item | Where |
|---|---|
| A Supabase project | <https://supabase.com/dashboard> |
| A Vercel account | <https://vercel.com> |
| A GitHub, GitLab or Bitbucket account | to hold the code |
| Node.js 20.19+ or 22.12+ on your computer | <https://nodejs.org> (choose "LTS") |
| A custom SMTP email provider (recommended) | e.g. Resend, Postmark, SendGrid, Amazon SES |
| *(optional)* Docker Desktop | only for `supabase db dump` backups |

Check Node: open a terminal in the project folder and run `node -v`.

---

## 2. Back up first (existing projects)

**Skip this section only if the Supabase project is brand new and empty.**
If members or training files already exist, back up before applying any migration.

### 2a. Database backup (recommended method: `pg_dump`)
1. Supabase Dashboard → **Connect** (top bar) → **Session pooler** → copy the connection string. It looks like `postgresql://postgres.<ref>:[YOUR-PASSWORD]@<region>.pooler.supabase.com:5432/postgres`.
2. Install PostgreSQL client tools (they provide `pg_dump`), version 15 or newer.
3. Run, pasting your connection string and database password:
   ```bash
   mkdir -p backups
   pg_dump "<connection-string>" --no-owner --format=custom --file "backups/va-academy-$(date +%Y%m%d-%H%M).dump"
   ```
   This copies **all** database contents: tables, member accounts (the `auth` schema), progress, favorites, logs and policies.
4. Check: the file exists and isn't tiny. `ls -lh backups/` should show more than a few KB.

**Alternative (needs Docker running):**
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>
npx supabase db dump --linked -f backups/schema.sql
npx supabase db dump --linked --data-only -f backups/data.sql
```

**Dashboard backups:** on paid plans, Supabase keeps automatic daily backups under **Database → Backups**. Check what your plan includes; don't rely on it alone before a migration.

### 2b. Storage files
Database backups do **not** include uploaded PDFs, videos or images. To keep copies, go to Dashboard → **Storage** and download the contents of `training-pdfs`, `training-videos`, `resource-thumbnails` and `announcement-images` (or keep the original files you uploaded). Migrations never delete storage files.

### 2c. Store backups safely
Backups contain member emails and account data, so treat them as confidential. Keep them off shared drives and out of Git.

---

## 3. Set up the Supabase database

The database is created by 9 migration files in `supabase/migrations/`. They run **in filename order**:

| # | File | What it does | Changes existing data? |
|---|---|---|---|
| 1 | `20261114100000_core_schema.sql` | Creates the 7 tables, indexes, timestamps | No (new tables) |
| 2 | `20261114100100_auth_helpers.sql` | Admin checks, profile creation trigger, admin bootstrap | Adds an inactive profile for existing auth users |
| 3 | `20261114100200_rls_policies.sql` | Row Level Security on every table | No |
| 4 | `20261115100000_training_storage.sql` | Private storage buckets and file rules | No |
| 5 | `20261116100000_learning_progress_resume.sql` | Video resume columns | No (adds columns, default 0) |
| 6 | `20261117100000_admin_management.sql` | Contact numbers, category visibility, announcements, audit log | Converts `announcements.published` → `status`, then removes the old column |
| 7 | `20261118100000_login_alerts.sql` | Server-side sign-in log | No (adds a trigger and a function) |
| 8 | `20261119100000_self_signup.sql` | "Create account": new-account setting | No (adds a settings table) |
| 9 | `20261120100000_direct_login_alert_email.sql` | Alert emails (superseded by 10) | No (replaces a function) |
| 10 | `20261121100000_remove_alerts_admin_status.sql` | Removes alert emails; admin activate/deactivate/edit in the database | No (deletes only stored alert settings) |
| 11 | `20261122100000_lava_portal.sql` | LAVA applicant portal tables, RLS and functions | No (adds tables; extends allowed activity-log values) |
| 12 | `20261122100100_lava_seed_content.sql` | LAVA courses, quizzes and simulator activities; draft company sections | No (inserts only what's missing) |
| 13 | `20261123100000_lava_lesson_materials.sql` | LAVA lesson videos & PDFs; LAVA files readable only after the agreement | No (adds a column with default `library` and a table) |

None of them delete members, progress, favorites, resources or files.

### Option A — Supabase CLI (recommended)
```bash
npx supabase login
npx supabase link --project-ref <your-project-ref>     # ref = the "xxxx" in https://xxxx.supabase.co
npx supabase migration list                            # shows which files are already applied
npx supabase db push                                   # applies only the missing ones, in order
```

### Option B — SQL Editor
Dashboard → **SQL Editor** → open each file that hasn't been applied yet, in order. Paste it and click **Run**. Stop at the first error and see [Troubleshooting](README.md#troubleshooting).

**Check:** Dashboard → **Table Editor** shows `profiles`, `categories`, `training_resources`, `announcements`, `favorites`, `learning_progress`, `activity_logs`. Dashboard → **Storage** shows 4 buckets, all marked **Private**.

---

## 4. Deploy the Edge Function

**Optional.** The `admin-members` function adds members by invitation email, re-sends access emails and changes a member's email. Activate/deactivate and editing names, contact numbers and roles work without it. It's the only code that uses the secret service-role key, which Supabase provides to it automatically.

```bash
npx supabase secrets set \
  SITE_URL=https://<your-site-domain> \
  ALLOWED_ORIGINS=https://<your-site-domain>

npx supabase functions deploy admin-members
```

- Use your Vercel production address (e.g. `https://<project-name>.vercel.app`) until you have a custom domain. Update both secrets later if the domain changes.
- During local development you can add `http://localhost:5173` to `ALLOWED_ORIGINS`, separated by a comma.

**Check:** Dashboard → **Edge Functions** lists `admin-members`.

### 4b. Create account + member controls (copy-paste, no terminal)

New members create their own account on the sign-in page and are signed in right away. **No emails are sent to you.** You control access in **Admin → Members**: deactivate anyone (they lose access immediately; their progress is kept) and reactivate them any time. Every sign-in is listed under **Admin → Activity Logs**.

**1. Two switches.** Supabase → **Authentication → Sign In / Providers**:
- **Allow new users to sign up** → **ON**
- **Email → Confirm email** → **OFF** (so new members get in immediately)

Click **Save**.

**2. Run one script.**
1. In VS Code, open [supabase/setup/1_enable_create_account.sql](supabase/setup/1_enable_create_account.sql) and copy everything.
2. In Supabase, go to **SQL Editor → New query**, paste, and click **Run**.
3. You'll see: *"All set: anyone can create an account and sign in…"*

Safe to run again. If you ran an earlier version that set up login alert emails, this turns them off and deletes the stored Resend key.

**3. Try it.** Open your site in a private window → **Create an account**. You land on the dashboard. As admin, open **Admin → Members**: the new person is listed, and the ⛔ / ✓ buttons deactivate / reactivate them.

**If something doesn't work:**
| Problem | Fix |
|---|---|
| New member sees "Account not active" | Step 2 wasn't run, or you deactivated them. Run the script / reactivate them |
| "Sign-ups are currently closed" | Step 1: turn **Allow new users to sign up** ON |
| New member must confirm their email first | Step 1: turn **Confirm email** OFF |
| Deactivate shows "Run supabase/setup/1_enable_create_account.sql…" | Step 2 wasn't run yet |

**Optional:** **Add member** (you create the account and the person gets an invitation email), **Send access email** and changing a member's email appear only once the `admin-members` Edge Function from step 4 is deployed. Everything else works without it.

### 4c. LAVA Automation applicant portal (copy-paste, no terminal)

1. In VS Code, open [supabase/setup/2_lava_portal.sql](supabase/setup/2_lava_portal.sql) and copy everything.
2. Supabase → **SQL Editor → New query** → paste → **Run**.
3. You'll see: *"LAVA portal ready…"*
4. Do the same with [supabase/setup/3_lava_lesson_materials.sql](supabase/setup/3_lava_lesson_materials.sql) (lesson videos & PDFs). You'll see: *"Lesson videos & PDFs ready…"*

Then, signed in as admin, open **Admin → LAVA Applicants**:
- **Company content:** the six company sections (What is LAVA, history, mission/vision, services, niches, clients) start as **drafts with [placeholders]**. Members can't see them until you replace the text with verified information and set them to **Published**.
- **Positions:** none are created for you. Add positions with confirmed salaries and click **Publish (hiring)**.
- Courses, quizzes and simulator activities are ready to use and editable.

Safe to run again; it never overwrites your edits. Details: [docs/LAVA_PORTAL.md](docs/LAVA_PORTAL.md).

---

## 5. Configure Supabase Auth, email and storage

Dashboard → **Authentication**:

| Setting | Value | Why |
|---|---|---|
| Sign In / Providers → **Allow new users to sign up** | **On** | Needed for the **Create account** page. Accounts are always members, never admins |
| Sign In / Providers → Email → **Confirm email** | **Off** (your choice) | People are signed in right after creating their account; no confirmation email. Trade-off: the email address isn't verified (see SECURITY_AUDIT.md C1). To require confirmation later, turn it On; the app handles both |
| *(Optional)* Attack Protection → **CAPTCHA** | Turnstile or hCaptcha | Recommended if bots start creating accounts. Ask me to add the widget to the sign-up form |
| Sign In / Providers → Email | Enabled | Email + password login |
| **Password requirements** (Providers → Email) | Minimum length **8**; require letters and digits | The app enforces this on its forms; this makes the server enforce it too |
| Emails → **SMTP Settings** | Your provider's details | The built-in sender only sends a few emails per hour, to team members only |
| Emails → Templates → **Invite user** and **Reset password** | Use the templates in [supabase/README.md §2](supabase/README.md) | Links that work on any device |
| URL Configuration | Set in [step 9](#9-tell-supabase-your-live-website-address) | |

**New accounts: open or approval?** By default, people who create their own account can use the portal right away. To approve every new person yourself, run this once in the **SQL Editor**:
```sql
update public.portal_settings set new_account_status = 'inactive';
```
New accounts then see "Account not active" until you activate them in **Admin → Members** (no email is sent; check the Members list, filter **Inactive**). Switch back any time with `'active'`.

Dashboard → **Storage → Settings → Upload file size limit**:
- **Free plan:** 50 MB, which is the maximum, so videos must be 50 MB or smaller.
- **Paid plan:** raise it, e.g. to 2 GB, then set the same value as `VITE_MAX_UPLOAD_MB` in Vercel (step 8).

---

## 6. Create the first administrator

1. Dashboard → **Authentication → Users → Add user → Create new user**: enter your email and a strong password, and tick **Auto Confirm User**.
2. Dashboard → **SQL Editor**, run:
   ```sql
   select public.bootstrap_first_admin('<your-email>');
   ```
   It replies `… is now an active administrator.` It only works while no admin exists.

All other accounts are created inside the app: **Admin → Members → Add member**.

---

## 7. Put the code in a Git repository

The project folder isn't a Git repository yet. From the project folder:

```bash
git init
git add .
git status            # make sure NO .env.local or backups/ files are listed
git commit -m "VA Training Academy"
```

Create an **empty private** repository on GitHub (or GitLab/Bitbucket), then follow its "push an existing repository" instructions, e.g.:

```bash
git remote add origin <your-repository-url>
git branch -M main
git push -u origin main
```

`.gitignore` already excludes `.env*` (except `.env.example`), `node_modules` and `dist`. Add `backups/` to `.gitignore` if you keep backups in the project folder.

---

## 8. Connect the repository to Vercel

1. Go to <https://vercel.com> → **Add New… → Project**, then **Import** your GitHub repository. Allow Vercel access to the repo if asked.
2. **Build settings.** Vercel reads them from `vercel.json` and detects Vite automatically; confirm they show:
   - **Framework Preset:** Vite
   - **Build Command:** `npm run build`
   - **Output Directory:** `dist`
   - Node.js version: 22.x (from `"engines"` in `package.json`; you can also check it under Settings → Build and Deployment)
3. **Environment variables.** Expand "Environment Variables" before the first deploy, or later under **Settings → Environment Variables**. Tick **Production** and **Preview**:

   | Key | Value |
   |---|---|
   | `VITE_SUPABASE_URL` | `https://<your-project-ref>.supabase.co` |
   | `VITE_SUPABASE_ANON_KEY` | the **anon / publishable** key (Supabase → Project Settings → API Keys) |
   | `VITE_MAX_UPLOAD_MB` | `50` on Free, or the limit you set in step 5 |

   Never add the service-role / secret key here. The app refuses to start if it detects one.
4. Click **Deploy**. When it finishes, Vercel shows your address, e.g. `https://<project-name>.vercel.app`.
5. *(Optional)* **Settings → Domains** → add your custom domain. Vercel provides HTTPS automatically.

**Check:**
- Opening the address shows the sign-in page.
- If you see "The portal isn't available right now", the environment variables are missing or were added *after* the build. These values are baked in when the site is built, so after adding or changing them go to **Deployments** → the latest deployment → **⋯ → Redeploy** (untick "Use existing Build Cache").

**Preview deployments:** every branch or pull request gets its own temporary address, like `https://<project>-git-<branch>-<team>.vercel.app`. Sign-in works there, but email links and **Add member** only work on the addresses listed in Supabase (step 9) and in `ALLOWED_ORIGINS`. Use your production address for real work.

> **Supabase custom domain?** If your Supabase project uses a custom domain (not `*.supabase.co`), add it to the `Content-Security-Policy` value in `vercel.json` (`img-src`, `media-src` and `connect-src`) or the browser will block it.

---

## 9. Tell Supabase your live website address

Dashboard → **Authentication → URL Configuration**:
- **Site URL:** `https://<your-site-domain>`
- **Redirect URLs:** add `https://<your-site-domain>/reset-password` (keep `http://localhost:5173/reset-password` for local development)
- *(Optional, preview deployments)* also add `https://*-<your-vercel-team>.vercel.app/reset-password` so email links work on Vercel preview addresses

Also make sure the Edge Function secrets from step 4 (`SITE_URL`, `ALLOWED_ORIGINS`) use the same domain. After changing them, run `npx supabase functions deploy admin-members` again.

---

## 10. Verify the live site

Do these on the live address, ideally in a private/incognito window:

1. **Sign in** as the admin; you should land on the Admin dashboard.
2. **Direct links:** paste `https://<your-site-domain>/admin/members` into a new tab and refresh. The page loads, with no Vercel "404: NOT_FOUND" page.
3. **Member invite:** Members → Add member, using an email address you can check. The invitation arrives, the link opens "Set your password", and you land in the portal.
4. **Password reset:** sign out → "Forgot password?" → the email arrives → set a new password → sign in.
5. **Private files:**
   - Upload a small PDF and a short MP4 as **Published**. As the member, open both: the PDF shows pages and the video plays.
   - Right-click the video → "Copy video address", wait over an hour, then open it. It no longer works, because links expire.
   - Unpublish the PDF: the member gets "Resource not found".
6. **Deactivation:** deactivate the test member. They're signed out and can't sign in. Reactivate, and their progress is still there.
7. **Security headers:** open <https://securityheaders.com> and scan your site. Expect a high grade; the headers come from `vercel.json`.
8. **Mobile:** on a phone, sign in, use the bottom tab bar, play a video, and open a PDF. Test portrait and landscape.

Then work through **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** and the full **[docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md)**.

---

## 11. If something goes wrong (rollback)

| Problem | What to do |
|---|---|
| New website version is broken | Vercel → **Deployments** → open the last good deployment → **⋯ → Promote to Production** (Instant Rollback). Instant; no data touched |
| Edge Function misbehaving | `git checkout <last-good-commit> -- supabase/functions` then `npx supabase functions deploy admin-members` |
| A migration failed halfway | Postgres can undo schema changes, and a file pasted into the SQL Editor runs as one unit, so a failed file normally leaves nothing half-applied. Run `npx supabase migration list` to see whether it was recorded. Read the error, fix the cause (see README Troubleshooting), run it again. If unsure, restore the backup into a new project to compare |
| A migration applied but data looks wrong | **Restore your backup into a NEW Supabase project first** to inspect it: `pg_restore --no-owner --dbname "<new-project-connection-string>" backups/<file>.dump`. Only restore over production once you're sure, ideally with help |
| Locked out of admin | SQL Editor: `update public.profiles set role = 'admin', status = 'active' where email = '<your-email>';` |

The Phase 5 migration (#6) removes the old `announcements.published` column after copying its values into `status`. Only a backup restore can bring the old column back, and nothing in the app uses it.

---

## 12. Updating the site later

1. Make and test changes locally (`npm run dev`, `npm run test:db`, `npm run build`).
2. Back up (section 2) if the change includes a new migration.
3. `git commit` and `git push`. Vercel rebuilds and publishes automatically (pushes to `main` go to production).
4. New migration? `npx supabase db push`. Edge Function changed? `npx supabase functions deploy admin-members`.
5. Re-run the quick checks in section 10.
