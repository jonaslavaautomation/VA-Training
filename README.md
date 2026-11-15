# VA Training Academy

A private online training portal for a Virtual Assistant training organization (about 50+ members).
New members create their own account on the sign-in page, or an administrator creates and invites them. Administrators upload training PDFs and videos. Members sign in to watch, read, track their progress and save favorites, and the administrator gets an email when a member signs in.

| Document | Read it when… |
|---|---|
| **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** | you're putting the site online (step by step) |
| **[PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md)** | you want to confirm everything is ready before launch |
| **[SECURITY_AUDIT.md](SECURITY_AUDIT.md)** | you want to know how the portal is protected and what to configure |
| **[TEST_RESULTS.md](TEST_RESULTS.md)** | you want to see what was tested and what still needs testing live |
| [supabase/README.md](supabase/README.md) | you need details about the database, storage, email templates or limits |
| [docs/SECURITY_CHECKLIST.md](docs/SECURITY_CHECKLIST.md) | you're running the manual/API security tests on the live project |

---

## What it does

**Members**
- **Create their own account** on the sign-in page (always as a member, never an admin), or accept an admin's invitation
- Sign in, set and reset their password, and see a personal dashboard: progress, continue learning, recommendations, announcements.
- Training Library with search, category and type filters, sorting, and "Load more".
- Watch videos (resumes where they stopped); read PDFs inside the portal or download them.
- My Learning (in progress and completed), Favorites, and a Profile page with password change.

**Administrators**
- Dashboard with live statistics and quick actions.
- **Members:** activate/deactivate, edit, change role, view each member's progress. (Adding members by invitation email needs the optional Edge Function.)
- **Upload Center:** drag-and-drop PDFs and videos, with resumable uploads for big files and thumbnails.
- **Training Resources:** edit, publish/unpublish, replace file, delete.
- **Categories:** create, rename, hide, safe delete.
- **Announcements:** draft, publish, schedule, archive.
- **Activity Logs:** a record of who did what, including every sign-in (recorded by the server).

**Security:**
- Every rule is enforced by the database (Row Level Security), not just by hiding buttons.
- Files are in private storage and opened through links that expire.
- Admin actions are re-checked on the server (admin-only database functions) and written to the audit log.

## Technology

| Part | Tool |
|---|---|
| Website | React 18 + Vite, Tailwind CSS, React Router |
| Login, database, file storage | Supabase (Auth, PostgreSQL with Row Level Security, Storage, Edge Functions) |
| PDF viewing / big uploads | PDF.js, tus-js-client (resumable uploads) |
| Hosting | Vercel (config in `vercel.json`) |

---

## Run it on your computer

1. Install **Node.js 20.19+ or 22.12+** (LTS) from <https://nodejs.org>.
2. In a terminal, inside the project folder:
   ```bash
   npm install            # downloads the libraries (first time only)
   cp .env.example .env.local
   ```
3. Open `.env.local` and paste your Supabase **Project URL** and **anon / publishable key** (Supabase → Project Settings → API Keys).
   *No Supabase yet?* Leave them empty: `npm run dev` then runs a **preview** with sample data so you can look around. Preview never appears on the live site.
4. Start it:
   ```bash
   npm run dev            # opens on http://localhost:5173
   ```

### Commands

| Command | What it does |
|---|---|
| `npm run dev` | Run the site locally with live reload |
| `npm run build` | Build the production version into `dist/` |
| `npm run preview` | Serve that production build locally |
| `npm run test:db` | Apply all migrations to a temporary database and run 192 security checks (no Supabase or internet needed) |
| `npm run test:e2e` | Production acceptance test in Chrome against a simulated backend (needs Google Chrome) |
| `npm run test:responsive` | Check every page at phone/tablet/desktop widths (needs Google Chrome) |

---

## Environment variables

These go in `.env.local` (your computer) and in **Vercel → Project → Settings → Environment Variables** (live site). See `.env.example`.

| Variable | Required | Value |
|---|---|---|
| `VITE_SUPABASE_URL` | yes | `https://<your-project-ref>.supabase.co` |
| `VITE_SUPABASE_ANON_KEY` | yes | The **anon / publishable** key (public; safe in the browser). `VITE_SUPABASE_PUBLISHABLE_KEY` also works |
| `VITE_MAX_UPLOAD_MB` | recommended | Your Supabase upload limit in MB (Free plan: `50`) |
| `VITE_ENABLE_PREVIEW` | no | Local testing only. Never set on Vercel |

**Never** put the service-role / secret key in any `VITE_` variable; anything starting with `VITE_` is visible to every visitor. The app refuses to start if it detects one. The secret key lives only inside the Edge Function, where Supabase provides it automatically.

**Edge Function secrets** are set with `npx supabase secrets set …`, not in `.env.local`:

| Secret | Value |
|---|---|
| `SITE_URL` | Your live address, e.g. `https://<your-site-domain>` (invite/reset links go here) |
| `ALLOWED_ORIGINS` | Browser addresses allowed to call the function (comma-separated) |

---

## Supabase setup (summary)

Full steps: **[DEPLOYMENT_GUIDE.md §2–6](DEPLOYMENT_GUIDE.md)**. Details: [supabase/README.md](supabase/README.md).

1. **Back up first** if the project already has data (`pg_dump`, see below).
2. **Database:** `npx supabase link --project-ref <ref>` then `npx supabase db push`. This applies the 9 files in `supabase/migrations/` in order:

   | File | Adds |
   |---|---|
   | `20261114100000_core_schema.sql` | 7 tables, indexes |
   | `20261114100100_auth_helpers.sql` | admin checks, profile trigger, first-admin bootstrap |
   | `20261114100200_rls_policies.sql` | Row Level Security |
   | `20261115100000_training_storage.sql` | private storage buckets + rules |
   | `20261116100000_learning_progress_resume.sql` | video resume |
   | `20261117100000_admin_management.sql` | contact numbers, category visibility, announcements, audit log |
| `20261118100000_login_alerts.sql` | server-side sign-in log |
| `20261119100000_self_signup.sql` | Create account: new-account setting |
| `20261120100000_direct_login_alert_email.sql` | alert emails (superseded by the next one) |
| `20261121100000_remove_alerts_admin_status.sql` | no alert emails; admin activate/deactivate/edit functions |

3. **Storage buckets** are created by the migrations, all **private**:

   | Bucket | Holds | Limit |
   |---|---|---|
   | `training-pdfs` | PDFs | 50 MB |
   | `training-videos` | MP4 / WebM | 2 GB |
   | `resource-thumbnails` | thumbnails | 5 MB |
   | `announcement-images` | announcement images | 5 MB |

   The project-wide limit (Storage → Settings) also applies. **Free plan: 50 MB per file.**
4. **Edge Function (optional):** `npx supabase functions deploy admin-members`, after setting the secrets above. Only needed for **Add member** by invitation, access emails and email changes.
5. **Create account + member controls:** one copy-paste SQL script, no terminal. See [DEPLOYMENT_GUIDE.md §4b](DEPLOYMENT_GUIDE.md).
6. **Auth settings:**
   - turn **on** "Allow new users to sign up" (for the Create account page) and turn **off** "Confirm email" (new members get in right away);
   - password minimum 8 with letters and digits;
   - custom SMTP;
   - the invite and reset email templates;
   - Site URL and Redirect URL (`/reset-password`).

### First administrator
1. Supabase → Authentication → Users → **Add user**, using your email and a strong password, with **Auto Confirm User** ticked.
2. SQL Editor: `select public.bootstrap_first_admin('<your-email>');`

This only works while no admin exists.

### Creating member accounts
**Option 1 — members sign up themselves:** the sign-in page has **Create an account**.
- With Supabase **Confirm email** off (current choice), they're signed in as soon as the account is created. No email is sent; they appear in **Admin → Members**, where you can deactivate or reactivate them.
- New accounts can learn immediately (default). To approve each new person first, run this once in the SQL Editor:
  `update public.portal_settings set new_account_status = 'inactive';`
  New accounts then wait until you activate them in **Admin → Members** (filter **Inactive**). Switch back with `'active'`.

**Option 2 — you create them** (needs the optional Edge Function): sign in as admin → **Members → Add member**. Enter the name, email, optional contact number and role.
- **Active:** they get an invitation email to set their password.
- **Inactive:** no email yet; reactivate them later and press ✉ to send the invite.

To add another administrator, choose role **Administrator**.

---

## Deploying to Vercel (summary)

Full steps: **[DEPLOYMENT_GUIDE.md §7–10](DEPLOYMENT_GUIDE.md)**.

1. Put the code in a private Git repository (GitHub/GitLab/Bitbucket).
2. Vercel → **Add New → Project** → import the repository. The build settings come from `vercel.json`: framework Vite, command `npm run build`, output `dist`. Node 22 comes from `package.json`.
3. Add the environment variables, then deploy.
4. In Supabase, set **Site URL** and **Redirect URLs** to the Vercel address, and update the Edge Function secrets.
5. Verify on the live site, including on a phone, using [PRODUCTION_CHECKLIST.md](PRODUCTION_CHECKLIST.md).

`vercel.json` also sets:
- the redirect that makes direct links like `/library/…` work;
- strict security headers (Content-Security-Policy and more);
- long-term caching for build files.

---

## Backups

Do this **monthly** and **before every database change**. Details: [DEPLOYMENT_GUIDE.md §2](DEPLOYMENT_GUIDE.md).

```bash
pg_dump "<connection string from Supabase → Connect → Session pooler>" --no-owner --format=custom \
  --file "backups/va-academy-$(date +%Y%m%d).dump"
```
- This includes member accounts, progress, favorites, logs and all settings.
- Uploaded files are **not** included. Keep your original files, or download the storage buckets from the Dashboard.
- Paid Supabase plans also keep automatic daily backups (Database → Backups).
- To restore, use `pg_restore` into a **new** project first to check it. See DEPLOYMENT_GUIDE §11.

---

## Troubleshooting

| What you see | What to do |
|---|---|
| "The portal isn't available right now" on the live site | Vercel is missing `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY`, or they were added after the build. Add them → Deployments → **⋯ → Redeploy** (without build cache) |
| Vercel "404: NOT_FOUND" on refresh or direct link | `vercel.json` must be in the repository root (it contains the rewrite to `index.html`) |
| Login works locally but not live | Supabase → Authentication → URL Configuration: set the live **Site URL** / Redirect URL |
| Invitation or reset emails don't arrive | Configure custom SMTP (the built-in sender is very limited). Check spam |
| Email link says "Link expired" | Links are single-use and expire (default 24 h). Admin → Members → ✉ sends a new one |
| No **Add member** button | Normal without the optional `admin-members` Edge Function; members create their own accounts. Deploy it to add members by invitation |
| Deactivate says "Run supabase/setup/1_enable_create_account.sql…" | Run that script once in the Supabase SQL Editor |
| "The email could not be sent" / "Too many emails" | SMTP not configured, or the rate limit was hit |
| "Account not available" after sign-in | The user has no profile row. Delete the auth user and re-invite them |
| "Account deactivated" | Reactivate the member in Admin → Members |
| Upload: "larger than the storage limit allows" | Raise Storage → Settings → upload limit (paid plan) and set `VITE_MAX_UPLOAD_MB` to match |
| Upload page: "storage buckets weren't found" | Run the migrations (`npx supabase db push`) |
| Video says "format can't be played" | Re-encode to MP4 (H.264 + AAC), e.g. HandBrake "Fast 720p30" |
| Images, videos or PDFs blocked on a custom Supabase domain | Add the domain to the CSP in `vercel.json` |
| A migration fails | Read the error message; don't edit already-applied files. Restore the backup into a new project to compare if unsure |
| Locked out as admin | SQL Editor: `update public.profiles set role='admin', status='active' where email='<your-email>';` |

---

## Project structure

```
va-training-academy/
├── vercel.json                # Vercel build, SPA rewrite, security headers
├── .env.example               # Environment variable template (no real keys)
├── DEPLOYMENT_GUIDE.md · PRODUCTION_CHECKLIST.md · SECURITY_AUDIT.md · TEST_RESULTS.md
├── docs/SECURITY_CHECKLIST.md # Manual + API security tests
├── supabase/
│   ├── migrations/            # 9 database migrations (apply in order)
│   ├── functions/admin-members/   # Optional server function: add members by invitation, access emails
│   ├── setup/                 # Copy-paste SQL: create_admins, 1_enable_create_account
│   ├── tests/rls.test.mjs     # npm run test:db
│   └── README.md              # Database, storage, email, limits
├── tests/e2e/                 # npm run test:e2e / test:responsive
└── src/
    ├── lib/                   # Supabase client, errors, validation, media, PDF helpers
    ├── services/              # All data access (Supabase queries, uploads, signed links)
    ├── context/ · hooks/      # Sign-in state, notifications
    ├── routes/                # Route table + guards (member / admin)
    ├── components/            # UI building blocks, layouts, admin & media components
    ├── pages/                 # auth/, member/, admin/
    └── mocks/                 # Sample data for local preview only
```

**How data flows:** pages → hooks → `src/services/` → Supabase. Pages never talk to Supabase directly, and every permission is checked again by the database.

## Build history

| Phase | Scope | Status |
|---|---|---|
| 1 | Frontend foundation | ✅ |
| 2 | Authentication, database, RLS, member accounts | ✅ |
| 3 | Uploads, private storage, video player, PDF viewer | ✅ |
| 4 | Member learning experience | ✅ |
| 5 | Full admin management | ✅ |
| 6 | Testing, security audit, performance, responsive, deployment preparation | ✅ Done — awaiting approval to deploy |
