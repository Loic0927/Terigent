# Terigent

Terigent is a responsive project-management SaaS experience built for the VOLTIX Full Stack Developer Internship tasks. It includes an interactive browser-persisted task-board preview and a production-oriented contact inquiry system.

## Features

- Responsive React landing page and interactive three-column task board
- Contact form with Name, Email, Subject, and Message fields
- Client- and server-side validation with clear field errors and length limits
- PostgreSQL persistence through the `POST /api/contact` Vercel Function
- Sending, success, reset, and safe failure states
- Basic abuse protection: hidden honeypot, 12 KB body limit, and per-instance IP rate limiting
- Parameterized SQL; database credentials remain server-side
- Automated API tests and responsive UI verification

## Architecture

- **Front end:** React, Vite, React Icons, plain CSS
- **API:** Vercel Node.js Function in `api/contact.js`
- **Database:** PostgreSQL via `pg`
- **Task-board demo storage:** browser `localStorage` (unchanged)

The API validates and normalizes untrusted input before calling the repository. The repository inserts values with PostgreSQL parameters (`$1` through `$4`), never SQL string concatenation.

## Local setup

Requirements: Node.js 20+, npm, PostgreSQL, and `psql` (or a provider SQL console).

```bash
npm install
Copy-Item .env.example .env.local
```

Edit `.env.local` with your own PostgreSQL connection string. Do not commit it.

Create the schema:

```bash
psql "$env:DATABASE_URL" -f db/migrations/001_create_inquiries.sql
```

For a local PostgreSQL server without TLS, set `DATABASE_SSL=false`. For hosted databases, leave it as `true`.

Run the complete app, including the Vercel Function:

```bash
npx vercel dev
```

Open the URL printed by Vercel CLI (normally `http://localhost:3000`) and submit the Contact form. `npm run dev` starts only Vite and is useful for front-end-only work; it does not emulate `/api/contact`.

Confirm the saved row:

```sql
SELECT id, name, email, subject, message, created_at
FROM inquiries
ORDER BY created_at DESC
LIMIT 10;
```

## Environment variables

| Variable | Required | Description |
| --- | --- | --- |
| `DATABASE_URL` | Yes | Server-side PostgreSQL connection string |
| `DATABASE_SSL` | Recommended | `true` for hosted PostgreSQL; `false` only for non-TLS local PostgreSQL |

Neither variable uses the `VITE_` prefix, so Vite does not expose it to browser code.

## Contact API

`POST /api/contact`

```json
{
  "name": "Ada Lovelace",
  "email": "ada@example.com",
  "subject": "Product demo",
  "message": "I would like to learn more."
}
```

Limits: name 100, email 254, subject 150, and message 5,000 characters. A successful insert returns `201`; validation returns `400`; oversized bodies return `413`; rate limiting returns `429`; persistence failures return `500`. Internal database details are never returned to clients.

## Quality checks

```bash
npm run lint
npm test
npm run build
npm run verify:ui
```

This JavaScript project has no separate TypeScript type-check step. ESLint covers static code checks.

## Deploy to Vercel

1. Create a managed PostgreSQL database (for example Neon, Supabase, or a Vercel Marketplace PostgreSQL integration).
2. Run `db/migrations/001_create_inquiries.sql` against the production database exactly once. The migration is idempotent.
3. Import this Git repository into Vercel.
4. Keep the detected **Vite** framework preset. Build command: `npm run build`; output directory: `dist`.
5. In Project Settings → Environment Variables, add `DATABASE_URL` and `DATABASE_SSL=true` for Production and Preview as appropriate.
6. Deploy, then submit the Contact form on the deployed site.
7. Verify the request returns `201` in Vercel Function logs and confirm the row with the SQL query above.

Do not put credentials in source files or variables prefixed with `VITE_`. The in-memory rate limiter is intentionally lightweight and scoped to each serverless instance; use a shared Redis-backed limiter if stronger cross-instance enforcement is later required.
