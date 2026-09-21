# Terigent

Terigent is a responsive React/Vite project completed across four VOLTIX full-stack tasks, including database-backed member registration and authentication.

## Task 6 - Company service management

- Public, responsive service catalogue on the homepage, loaded from `GET /api/services`
- Administrator service management integrated into `/admin`
- Protected list/create/update/delete APIs under `/api/admin/services`
- Active services are public; hidden and deleted services are excluded automatically
- PostgreSQL-backed service name, description, category, optional pricing text, availability, and timestamps
- Allow-listed, size-limited JSON validation, parameterized SQL, admin-session authorization, and same-origin mutation checks

## Task 4 - Member registration and authentication

- `/register`, `/login`, protected `/dashboard`, and `/account` pages
- Member APIs at `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, and `/api/auth/me`
- Server validation, normalized case-insensitive email uniqueness, salted scrypt password hashes, opaque seven-day sessions, trusted-origin CSRF checks, and PostgreSQL-backed throttling
- Member cookie `terigent_user_session` and database sessions are fully separate from the Task 3 administrator cookie and `/api/admin/auth/*`; members cannot authorize announcement writes

## Task 1 - Responsive task-management interface

- Responsive landing page for desktop and mobile
- Authenticated three-column task board for not started, in-progress, and completed work
- Add, move, complete, reopen, and remove member-owned tasks
- Priority, deadline, reminder, assignee, and project information
- PostgreSQL persistence isolated by member account

The public homepage contains the product presentation. The interactive task board is available only in the authenticated member workspace and does not import the former anonymous browser demo data.

## Task 2 - Contact inquiry system

- Contact form with name, email, subject, and message fields
- Client- and server-side validation with clear errors and field limits
- PostgreSQL persistence through `POST /api/contact`
- Sending, success, reset, and safe failure states
- Honeypot protection, request-size limits, rate limiting, and parameterized SQL

Contact inquiries are stored in the `inquiries` table created by `db/migrations/001_create_inquiries.sql`.

## Task 3 - Internal content management

### Features

- A pinned public announcement bar that opens a scrollable list of every announcement, newest first
- Administrator UI at `/admin` for creating, editing, and deleting announcements
- Signed-in administrators can manage announcements or open a specific announcement editor directly from the public list
- Public `GET /api/announcements`; authenticated `POST /api/announcements`, `PATCH /api/announcements/:id`, and `DELETE /api/announcements/:id`
- Server-verified, eight-hour HMAC session in an HttpOnly, SameSite=Strict cookie (Secure in production)
- Origin validation on login, logout, and every announcement mutation
- Passwords are verified using Node.js `crypto.scrypt`; the production password hash and session secret remain in Vercel environment variables
- PostgreSQL-backed login throttling: five failed attempts per hashed IP-and-username key in 15 minutes
- Parameterized PostgreSQL queries, server-side validation, safe errors, and plain-text React rendering

## Shared architecture and database

- Front end: React, Vite, React Icons, plain CSS
- API: Vercel Node.js Functions under `api/`
- Database: PostgreSQL through `pg`, using the existing `DATABASE_URL` and `DATABASE_SSL`
- Migrations: run `001` through `db/migrations/005_create_services.sql` in numeric order

The repository contains no Neon SDK or Neon-specific variable. If the existing `DATABASE_URL` points to Neon, Task 3 uses that same Neon database and pool. For Vercel Functions, use Neon's pooled connection string when available. Migration 002 only creates `announcements` and `admin_login_attempts`; it does not alter or remove `inquiries`.

## Local development

Requirements: Node.js 20.19+ or 22.12+, npm, PostgreSQL, and either `psql` or the provider's SQL editor.

```powershell
npm install
Copy-Item .env.example .env.local
```

Fill `.env.local` with a non-production database and administrator values. To generate the password hash and a random session secret without putting the password in PowerShell history:

```powershell
$securePassword = Read-Host 'Admin password (minimum 12 characters)' -AsSecureString
$credential = [System.Net.NetworkCredential]::new('', $securePassword)
$env:ADMIN_PASSWORD = $credential.Password
node scripts/generate-admin-credentials.mjs
Remove-Item Env:ADMIN_PASSWORD
Remove-Variable credential, securePassword
```

Copy the two output lines into `.env.local`. Set `ADMIN_USERNAME` separately. Do not commit either output. Create schemas in order:

```powershell
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/001_create_inquiries.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/002_create_announcements_and_admin_login_attempts.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/003_create_users_and_user_sessions.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/004_create_user_tasks.sql
psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/migrations/005_create_services.sql
```

If `DATABASE_URL` is only stored in `.env.local`, load it into the current PowerShell session without printing it, or pass it through your database tool's secure connection UI. For local PostgreSQL without TLS use `DATABASE_SSL=false`; hosted Neon uses `true`.

Run the front end and Functions together:

```powershell
npx vercel dev
```

Open `http://localhost:3000`, then `http://localhost:3000/admin`. Plain `npm run dev` runs Vite only and does not emulate `/api/*`.

## Environment variables

| Variable | Required | Purpose |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Existing server-side PostgreSQL connection string; prefer a pooled Neon string for Vercel |
| `DATABASE_SSL` | Yes | `true` for Neon/hosted PostgreSQL; `false` only for a local non-TLS server |
| `ADMIN_USERNAME` | Yes | Single administrator username |
| `ADMIN_PASSWORD_HASH` | Yes | `scrypt$...` value generated by the script |
| `SESSION_SECRET` | Yes | Random signing key generated by the script; minimum 32 characters |

None uses a `VITE_` prefix, so none is bundled into browser JavaScript.

Task 4 adds no environment variables: it reuses `DATABASE_URL` and `DATABASE_SSL`. Run `psql $env:DATABASE_URL -v ON_ERROR_STOP=1 -f db/cleanup_auth_records.sql` periodically to remove expired sessions and old rate-limit records.

To change the administrator username or password, generate a new hash, update `ADMIN_USERNAME` and/or `ADMIN_PASSWORD_HASH` in the relevant Vercel environments, then redeploy. Changing `SESSION_SECRET` signs every administrator out; use it for deliberate session invalidation.

## Database migrations with Neon

No new Neon project, paid resource, database, or branch is required. Reuse the Task 2 database for Production. For safety, use separate Neon branches/databases for Preview and Development so test CRUD never changes production.

Run migrations 002 through 005 once against each environment's database, after migration 001. Migration 005 is non-destructive and creates only the company services table and its public-listing index.

Neon SQL Editor alternative:

1. Open the intended Neon project and select the correct branch/database.
2. Open **SQL Editor**.
3. Open `db/migrations/002_create_announcements_and_admin_login_attempts.sql` locally, copy its complete contents, paste them into the editor, and run.
4. Confirm both `announcements` and `admin_login_attempts` exist. Do not run test `DELETE` statements against Production.

## Vercel deployment

1. Before deploying code, create/select separate Preview and Development Neon branches or databases. Keep the existing production database for Production.
2. Run migrations 001 through 005 on a new Preview/Development database; run only 005 on a database already current through Task 4.
3. In Vercel: project → **Settings** → **Environment Variables**, preserve the five existing variables above. Task 4 adds none.
4. Scope Production to production database/admin values. Scope Preview to the preview database and distinct admin/session values. Scope Development to a local/development database and distinct values. A branch-specific Preview variable can further isolate one branch.
5. Deploy a Preview (`vercel deploy` or push a non-production branch). Check all Task 2–4 behavior there.
6. After Preview passes, ensure migration 004 has run on Production, then deploy Production (`vercel deploy --prod` or merge to the production branch).

Environment-variable changes affect only new deployments, so adding or rotating any of these values requires redeployment. Database migration alone does not require redeployment, but deploy only after its target schema is ready.

## Deployment verification

Use the Preview URL first, then repeat on the production URL without destructive production test data unless approved:

1. Open `/` and verify the announcement section loads for a signed-out visitor.
2. In a private window, call/open `/api/announcements`; expect `200` JSON.
3. Attempt `POST /api/announcements` without a session; expect `401`.
4. Open `/admin`, sign in, create a short uniquely named announcement, and confirm it appears in the list.
5. Open `/` in another tab, reload, and confirm the same announcement appears newest first.
6. Edit it in `/admin`, reload the public page, and confirm content and updated time change.
7. Delete it after the confirmation dialog and confirm it disappears publicly.
8. Submit the existing contact form and confirm its normal success response; verify the `inquiries` table if this is a non-production environment.
9. Sign out, reload `/admin`, and confirm editing controls require login again.
10. Open `/register`, create a unique member account, and confirm the success message appears on `/login`.
11. Sign in, confirm `/account` shows the correct name, email, and creation time, then refresh to verify the session persists.
12. Sign out and confirm `/account` redirects to `/login`. Re-send the old cookie only in a safe test environment and confirm `/api/auth/me` returns `401`.
13. While signed in only as a member, attempt announcement `POST`, `PATCH`, and `DELETE`; each must return `401`, while public announcements and Contact remain available.

The UI prevents blank/overlong input. Automated handler tests also cover blank values, 101-character titles, invalid IDs, missing rows, unauthorized writes, cross-origin writes, and logout.

## Quality checks

```powershell
npm run lint
npm test
npm run build
npm run verify:ui
```

API tests use injected repositories and do not touch a real database. Live persistence must be verified against a safe Development/Preview database after migration.

## Troubleshooting and logs

- Login failure: confirm all three admin variables are set in the environment of the deployment being visited, then redeploy. Five failures for the same hashed IP/username key cause a 15-minute cooldown stored in PostgreSQL.
- Database connection or API 500: confirm `DATABASE_URL`, `DATABASE_SSL=true`, the correct Neon branch, and migration 002. Do not paste connection strings into tickets, screenshots, chat, or logs.
- Dashboard logs: Vercel project → deployment → **Logs**, filter to Functions and `/api/auth/*` or `/api/announcements*`. The application logs only short operation labels and error messages; still redact URLs, hostnames, usernames, SQL, cookies, and credentials before sharing.
- CLI logs: `vercel logs --deployment <deployment-id> --level error` for Preview, or `vercel logs --environment production --level error --since 5m` for recent Production errors.
- A `500` from `/api/announcements` immediately after deployment usually means migration 002 has not run on the exact database selected by that deployment environment.

## Test accounts

Create member test accounts through `/register`; no shared member password is committed. Keep administrator credentials environment-only.
