# Security testing checklist (Phases 2–5)

Run these against your **real** Supabase project after following `supabase/README.md`.
You'll need: one admin account, two member accounts (A and B), and one deactivated member.

## Automated (local, no Supabase needed)

- [ ] `npm run test:db`: 158 database checks (RLS, privilege escalation, deactivation, bootstrap lockout, cascades, storage policies, progress/favorites isolation, Phase 5 categories/announcements/audit log). Expect `158 passed, 0 failed`.
- [ ] `npm run build`, then `grep -ri "service_role\|sb_secret_" dist/assets/*.js` shows only the app's built-in safety check, never a key value.

## Required scenarios (in the browser)

| # | Scenario | Steps | Expected |
|---|---|---|---|
| 1 | Admin can log in | Sign in with the admin account | Lands on `/admin`; stats show real counts |
| 2 | Member can log in | Sign in as member A | Lands on `/dashboard`; name, email, "Active account" shown |
| 3 | Invalid credentials rejected | Wrong password | "Incorrect email or password." No hint about whether the email exists |
| 4 | Admin can create members | Admin → Members → Add member | Success toast; member listed as Active; invitation email arrives; link → "Set your password" → portal |
| 5 | Duplicate emails rejected | Add a member with an existing email (any letter case) | Inline "An account with this email address already exists."; no new row |
| 6 | Members can't access admin routes | As member, open `/admin`, `/admin/members` | Redirected to `/dashboard` with "only available to administrators" |
| 7 | Members can't change their own role | See API test **R1** below | `403` / error `42501`; role unchanged |
| 8 | Inactive members can't access protected resources | Deactivate member B, then (a) sign in as B, (b) if B had a tab open, return to it | (a) "This account has been deactivated…"; (b) "Account deactivated" screen; API test **R4** returns `[]` |
| 9 | Logged-out users can't reach the dashboard | Sign out, open `/dashboard` and `/admin` | Redirected to `/login` |
| 10 | Sessions persist across refresh | Sign in, press F5 / reopen the tab | Still signed in on the same page. With "Remember me" off, closing the browser signs you out |

## Additional checks

- [ ] **Create account**: a new self-registered account is a **member** (never admin), and follows the open/approval setting. API test **R5**.
- [ ] **Forgot password**: the same message appears for existing and unknown emails. The reset link → "Choose a new password" → portal.
- [ ] **Reset link reuse**: opening the same reset/invite link twice shows "Link expired" the second time.
- [ ] **Expired session**: in DevTools → Application → Local Storage, corrupt the `sb-…-auth-token` value, then reload → `/login` with "Your session has ended".
- [ ] **Change password**: Profile → Change password with a wrong current password is rejected. The correct one works, and the old password then fails at login.
- [ ] **Self-protection**: the admin's own row has the deactivate button disabled. API test **R6** is rejected.
- [ ] **Reactivation**: reactivate member B → B can sign in again.
- [ ] **Offline**: in DevTools → Network, set Offline and try to sign in → "Unable to reach the server…" (no raw error text).
- [ ] **Edge Function as member**: API test **R3** returns `403 forbidden`.

## API tests (bypass the UI entirely)

Get values from **Project Settings → API**. To get a user's access token: sign in as that user, then in DevTools → Application → Local Storage open `sb-<ref>-auth-token` and copy `access_token`.

```bash
URL=https://<ref>.supabase.co
ANON=<anon key>
MEMBER_JWT=<member A access_token>
MEMBER_ID=<member A user id>
OTHER_ID=<member B user id>
INACTIVE_JWT=<access_token of a member, captured BEFORE you deactivated them>
H=(-H "apikey: $ANON" -H "Content-Type: application/json")
```

| ID | Request | Expected |
|---|---|---|
| R1 | `curl -X PATCH "$URL/rest/v1/profiles?id=eq.$MEMBER_ID" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"role":"admin"}'` | `403`, code `42501` "You are not allowed to change this profile field." |
| R2 | `curl "$URL/rest/v1/profiles?select=*" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT"` | Exactly one row (member A's own) |
| R2b | `curl -X PATCH "$URL/rest/v1/profiles?id=eq.$OTHER_ID" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -H "Prefer: return=representation" -d '{"first_name":"x"}'` | `[]`: nothing updated |
| R3 | `curl -X POST "$URL/functions/v1/admin-members" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"action":"create","first_name":"a","last_name":"b","email":"x@example.com"}'` | `403` `forbidden` |
| R4 | `curl "$URL/rest/v1/training_resources?select=*" "${H[@]}" -H "Authorization: Bearer $INACTIVE_JWT"` | `[]` (or `401` once the token expires) |
| R5 | `curl -X POST "$URL/auth/v1/signup" "${H[@]}" -d '{"email":"<a test address>","password":"Passw0rd!","data":{"role":"admin"}}'` | Account created (sign-ups are on by design). In Table Editor → `profiles` its role is **member**, and its status matches `portal_settings.new_account_status` |
| R6 | `curl -X POST "$URL/functions/v1/admin-members" "${H[@]}" -H "Authorization: Bearer $ADMIN_JWT" -d '{"action":"set_status","user_id":"<admin id>","status":"inactive"}'` | `400` `cannot_change_self` |
| R7 | `curl "$URL/rest/v1/profiles?select=*" "${H[@]}" -H "Authorization: Bearer $ANON"` | `401`/`403` permission denied: anon has no table access |
| R8 | `curl -X POST "$URL/rest/v1/rpc/bootstrap_first_admin" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"admin_email":"x@example.com"}'` | Permission denied / not found |
| R9 | `curl -X DELETE "$URL/rest/v1/activity_logs?id=not.is.null" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT"` | `403` permission denied: logs are append-only |

## Phase 3: training storage

You'll need: one published PDF, one published video and one draft (any type), uploaded through **Admin → Upload**.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| S1 | Admin can upload a PDF | Upload → choose a PDF → title, category, Published → Upload | Progress reaches 100%, "Upload complete". The file appears in **Storage → training-pdfs** under a `<uuid>/` folder, with a cover in `resource-thumbnails` |
| S2 | Admin can upload a video | Same with an MP4; pick a frame as thumbnail | Same, in `training-videos` |
| S3 | Large video / resume | (Pro plan, limit raised) Upload a video of a few hundred MB, toggle Wi-Fi off for 10 s mid-upload | "Connection problem — retrying…", then it continues. If it stops, **Retry upload** resumes rather than restarting |
| S4 | Limits enforced | Upload a file over the limit, a `.txt` renamed to `.pdf`, and a `.mov` | Each is rejected before upload with a clear message |
| S5 | Member views published PDF | Member → Library → PDF | Pages render inside the portal; zoom works |
| S6 | Member downloads PDF | Click **Download PDF** | File saves with the resource title as its name |
| S7 | Member plays video | Open the video, press play | Plays; pause, seek, volume, fullscreen and time display work; the thumbnail shows as the poster |
| S8 | Member can't access drafts | Member opens `/library/<draft id>` (copy the id from the admin's Manage page) | "Resource not found". The draft isn't listed anywhere |
| S9 | Unpublish revokes access | Admin unpublishes the PDF; member reloads its page | "Resource not found" |
| S10 | Member can't reach upload / manage | Member opens `/admin/upload`, `/admin/resources` | Redirected to `/dashboard` with a notice |
| S11 | Delete removes files | Admin deletes the draft (confirm) | Row gone. The file is gone from Storage (check the bucket in the Dashboard) |
| S12 | Inactive member | Deactivate a member who has a resource open, then they reload | "Account deactivated"; nothing loads |
| S13 | Buckets are private | Dashboard → Storage | All three buckets marked **Private** |

### Storage API tests

Use the variables from the API tests above. `PDF_PATH` is the `storage_path` of a published PDF and `DRAFT_PATH` the `storage_path` of a draft PDF (Table Editor → `training_resources`).

| ID | Request | Expected |
|---|---|---|
| T1 | `curl "$URL/storage/v1/object/public/training-pdfs/$PDF_PATH"` | `400`/`404`: there is no public access |
| T2 | `curl "$URL/storage/v1/object/training-pdfs/$PDF_PATH" -H "apikey: $ANON"` (no user token) | `400`/`404` "Object not found": anon can't read |
| T3 | `curl -X POST "$URL/storage/v1/object/sign/training-pdfs/$PDF_PATH" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"expiresIn":60}'` | `200` with a `signedURL` |
| T4 | Open `$URL/storage/v1<signedURL>` from T3 in a browser, then again after 60 s | Downloads the first time; `400` "jwt expired" after expiry |
| T5 | Same as T3 with `$DRAFT_PATH` | `400` "Object not found": no signing for drafts |
| T6 | Same as T3 with `$INACTIVE_JWT` | `400`/`401`: inactive users can't sign |
| T7 | `curl -X POST "$URL/storage/v1/object/training-pdfs/test/evil.pdf" -H "apikey: $ANON" -H "Authorization: Bearer $MEMBER_JWT" -H "Content-Type: application/pdf" --data-binary @some.pdf` | `400`/`403` row-level security: members can't upload |
| T8 | `curl -X DELETE "$URL/storage/v1/object/training-pdfs" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d "{\"prefixes\":[\"$PDF_PATH\"]}"` | `200 []`: nothing deleted; the file is still in Storage |
| T9 | `curl -X POST "$URL/rest/v1/rpc/find_orphaned_training_files" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{}'` | Error "Only administrators can do this." |

## Phase 4: member learning experience

You'll need: two member accounts (A and B), at least one published video (a minute or longer), two published PDFs in different categories, and one draft.

| # | Scenario | Steps | Expected |
|---|---|---|---|
| L1 | Dashboard | Member A signs in | "Welcome back, <first name>". Available = number of published resources; Started and Completed = 0; "You haven't started any training yet" with **Explore the library** |
| L2 | Library browsing | Training Library | Only published items. Each card shows title, description, category, type, thumbnail/icon and "Added …" |
| L3 | Search / filters / sort | Search a word from one title; click **Videos**, then **PDFs**; click a category; choose A–Z, Oldest | Results narrow correctly; "Showing X of Y" updates. Video/PDF Library titles change. With more than 12 items, **Load more** appears |
| L4 | Drafts hidden | Search the draft's title; open `/library/<draft id>` | "No matching resources" / "Resource not found" |
| L5 | Video progress | Open the video (don't play) → check My Learning; then play 30 s and pause | Nothing appears after just opening. After pausing it's under **In progress** with a % and "Resume at 0:30" |
| L6 | Resume | Reload the video page | "Resuming from 0:30 · Start over", and playback continues from 0:30 |
| L7 | No fake completion | Drag the seek bar to the end | Still **In progress** (≤ 99%) |
| L8 | Completion | Watch through to the end | "Lesson completed" toast; moves to **Completed** |
| L9 | PDF progress | Open a PDF → My Learning; then **Mark as complete**; then **Mark as not completed** | Started → Completed → back to In progress |
| L10 | Favorites | Heart a video and a PDF; open Favorites; filter Videos; unheart one | Both listed (filter works); the removed card disappears instantly and stays gone after reload |
| L11 | Accuracy | Compare dashboard numbers with **Table Editor → learning_progress** filtered by member A's `user_id` | Started = A's rows for published resources; Completed = those with `status = completed` |
| L12 | Isolation | Member B favorites/completes something different; sign in as A | None of B's progress or favorites appear for A. API test **P1** below |
| L13 | Inactive | Deactivate A, then A reloads any learning page | "Account deactivated" |
| L14 | Navigation | Desktop: sidebar highlights the current page incl. Video/PDF Library; **Log out** works. Phone: bottom tabs (Home, Library, Learning, Favorites, Profile) work | All of these behave correctly, with no sideways scrolling on a phone |
| L15 | Admin unchanged | Admin uploads and publishes a PDF | Appears in A's library and the "Available" count |

### Progress API tests

| ID | Request | Expected |
|---|---|---|
| P1 | `curl "$URL/rest/v1/learning_progress?select=*&user_id=eq.$OTHER_ID" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT"` | `[]` |
| P2 | `curl -X PATCH "$URL/rest/v1/learning_progress?user_id=eq.$OTHER_ID" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -H "Prefer: return=representation" -d '{"status":"completed"}'` | `[]`: nothing changed |
| P3 | `curl -X POST "$URL/rest/v1/favorites" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d "{\"user_id\":\"$OTHER_ID\",\"resource_id\":\"<published id>\"}"` | `403` row-level security |
| P4 | Same favorite added twice for yourself | Second attempt: `409` duplicate key |

## Phase 5: admin management

Use one admin and two members (A and B).

| # | Scenario | Steps | Expected |
|---|---|---|---|
| M1 | Dashboard stats | Compare the 8 cards with Table Editor counts (`profiles` with role = member; `training_resources` by status/type) | Identical. Quick actions open the right pages |
| M2 | Member list | Search a name and an email; Inactive tab; role filter; Oldest first; next page (with more than 20 accounts) | Results correct. "Last sign-in" shows a time, "Invitation pending" or "Never" |
| M3 | Create member | Add member with a contact number (Active) | Invitation email arrives. The member appears; Activity Logs shows "Member created" by you |
| M4 | Create inactive | Add member with status Inactive | No email. The account can't sign in until reactivated (then use ✉ to send the invite) |
| M5 | Duplicate | Add a member with an existing email | Inline "already exists" error |
| M6 | Edit | Change name and contact number; promote a member to Administrator; demote again | Saved. Logs show "Member updated (Changed: phone…)" and "Member role changed (member → admin)" |
| M7 | Self-protection | Edit your own account | Role and status controls are locked |
| M8 | Deactivate / reactivate | Deactivate member A (confirm), A reloads; reactivate | A sees "Account deactivated" and can't sign in. After reactivation, A's My Learning shows the earlier progress |
| M9 | Member details | Open A's details | Contact, registration date, last sign-in, started, completed and favorites are correct |
| R1 | Resources | Filter by category, type and status; edit; publish/unpublish; delete (confirm) | Works. Logs show each action |
| R2 | Replace file | Replace a PDF, then open it as a member | The new document shows. The old file is gone from Storage. Log: "Resource file replaced" |
| C1 | Categories | Create, rename, add a description, hide one | The member library shows the renamed category and hides the hidden one |
| C2 | Safe delete | Delete a category that has resources | You must pick where the resources go and tick the confirmation. Afterwards the resources show the new category |
| A1 | Announcements | Publish one with an image; schedule one for tomorrow; save a draft | Members see only the published one (with its image) on their dashboard and on /announcements |
| A2 | Lifecycle | Unpublish, archive, restore, delete (confirm) | Members' view updates accordingly. Each step is logged |
| L1 | Activity logs | Filter by "Admin actions", an action type, a search term, and a date range | Correct rows, with actor, action, record, details and time |

### Admin API tests (member token)

| ID | Request | Expected |
|---|---|---|
| X1 | `curl -X POST "$URL/rest/v1/categories" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"name":"Hack"}'` | `403` RLS |
| X2 | `curl -X POST "$URL/rest/v1/rpc/delete_category" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"p_category":"<id>"}'` | Error "Only administrators can delete categories." |
| X3 | `curl -X POST "$URL/rest/v1/announcements" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"title":"x","content":"y","status":"published"}'` | `403` RLS |
| X4 | `curl "$URL/rest/v1/announcements?select=*" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT"` | Only live published announcements (no drafts, scheduled or archived) |
| X5 | `curl -X POST "$URL/rest/v1/activity_logs" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"activity_type":"member_created"}'` | `403` RLS (can't forge audit entries) |
| X6 | `curl -X POST "$URL/rest/v1/rpc/admin_member_auth_info" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"p_ids":["<id>"]}'` | Error "Only administrators can do this." |
| X7 | `curl -X POST "$URL/functions/v1/admin-members" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"action":"update","user_id":"<own id>","role":"admin"}'` | `403` forbidden |
| X8 | `curl -X PATCH "$URL/rest/v1/profiles?id=eq.<own id>" "${H[@]}" -H "Authorization: Bearer $MEMBER_JWT" -d '{"status":"active"}'` | `403` "not allowed to change this profile field" |

## Sign-off

- [ ] All required scenarios pass
- [ ] All API tests return the expected result
- [ ] Custom SMTP configured, and sign-ups disabled in the Dashboard
- [ ] `ALLOWED_ORIGINS` and `SITE_URL` set to the production domain
- [ ] Project upload limit and `VITE_MAX_UPLOAD_MB` set to the same value
- [ ] All three storage buckets are Private, and all Phase 3 scenarios pass
- [ ] All Phase 4 learning scenarios pass with two separate member accounts
- [ ] Phase 5: migration applied, `admin-members` redeployed, all M/R/C/A/L scenarios and X1–X8 pass
