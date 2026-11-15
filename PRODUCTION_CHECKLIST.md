# Production Checklist — VA Training Academy

Tick every box before telling members the portal is live.
Each item links to the step that explains it ([DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md) = DG).

## Before deployment
- [ ] **Backup taken** of the existing database (`pg_dump` file saved somewhere safe) — DG §2. *Skip only for a brand-new project.*
- [ ] Storage files backed up or originals kept — DG §2b
- [ ] `npm run test:db` passes locally (192 checks)
- [ ] `npm run build` succeeds locally

## Supabase
- [ ] All 9 migrations applied (or STEP 1 script run) (`npx supabase migration list` shows them all) — DG §3
- [ ] 7 tables present; 4 storage buckets present and **Private**
- [ ] *(Optional)* Edge Function `admin-members` deployed, only if you want Add member / access emails — DG §4
- [ ] Function secrets `SITE_URL` and `ALLOWED_ORIGINS` set to the **live domain** — DG §4/§9
- [ ] `1_enable_create_account.sql` run in SQL Editor (latest version) — DG §4b
- [ ] **Allow new users to sign up = ON** (needed for “Create account”) — DG §5
- [ ] **Confirm email = OFF** (instant access, your choice) — DG §5
- [ ] New-account mode chosen: open (default) or approval (`new_account_status = 'inactive'`) — DG §5
- [ ] Test: create an account on the live site; you're signed in right away; as admin, deactivate then reactivate that account in Admin → Members
- [ ] Password requirements: minimum 8, letters + digits — DG §5
- [ ] Custom **SMTP** configured, and a test email received — DG §5
- [ ] Invite + Reset password email templates updated — DG §5
- [ ] Storage upload limit set; `VITE_MAX_UPLOAD_MB` matches — DG §5
- [ ] Site URL + Redirect URL (`/reset-password`) set to the live domain — DG §9
- [ ] First administrator created with `bootstrap_first_admin` — DG §6
- [ ] *(Recommended)* Second administrator account for emergencies (promote via SQL Editor)

## Vercel
- [ ] Repository imported in Vercel; framework Vite, build `npm run build`, output `dist` — DG §8
- [ ] Environment variables set (Production + Preview): `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_MAX_UPLOAD_MB`, then **redeployed** — DG §8
- [ ] **No** service-role / secret key in any Vercel environment variable
- [ ] Site loads the sign-in page (not "portal isn't available")
- [ ] HTTPS active (padlock icon); custom domain configured if used
- [ ] If Supabase uses a custom domain, it's added to the CSP in `vercel.json`

## Live verification (DG §10)
- [ ] Admin login works
- [ ] Direct link + refresh on `/admin/members` and `/library` works
- [ ] Invitation email → set password → member login works
- [ ] Forgot password email → reset works
- [ ] Published PDF opens and video plays for a member; a draft is not visible
- [ ] Deactivated member is blocked; after reactivation their progress is intact
- [ ] Member is redirected away from `/admin`
- [ ] Phone test: login, bottom tabs, video, PDF
- [ ] securityheaders.com scan shows the security headers
- [ ] Full acceptance test in [TEST_RESULTS.md §4](TEST_RESULTS.md) repeated on the live site, with results recorded

## After launch
- [ ] Monitor Supabase usage (Dashboard → Usage): storage and **egress** (video bandwidth)
- [ ] Weekly: glance at Admin → Activity Logs
- [ ] Monthly: take a `pg_dump` backup — DG §2
- [ ] Monthly: Admin → Training Resources → remove "unused files" if the notice appears
