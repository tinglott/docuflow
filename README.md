# DocuFlow — open-source interactive PDF flipbooks

Upload a PDF → DocuFlow renders every page to PNG on the server → publishes a
realistic page-flip viewer at a public `/d/[slug]` URL. Optional lead-capture
or password gates. Per-page analytics (views + dwell time). Lead CSV export.
Brand color per flipbook. Deep links (`#page=N`). Keyboard navigation.
Fullscreen. Mobile swipe.

**Stack:** Next.js 14 App Router + TypeScript · Tailwind CSS 3 · Supabase
(Auth + Postgres + Storage) · StPageFlip · `pdfjs-dist` (legacy Node build) +
`@napi-rs/canvas` for server-side PDF → PNG · Recharts · Playwright.

## Quick start

```bash
npm install
cp .env.example .env.local
# fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY,
# SUPABASE_SERVICE_ROLE_KEY, NEXT_PUBLIC_SITE_URL
npm run dev
```

### 1. Create the Supabase project

1. Create a free project at [supabase.com](https://supabase.com).
2. Open **SQL Editor** and run `supabase/schema.sql` (creates tables + RLS policies).
3. Open **Storage** → create a **public** bucket named `flipbook-pages`.

### 2. Configure auth

Supabase **Authentication → Providers**: enable **Email** (password + magic link
both work out of the box). Optional: add Google/OAuth providers — no code
changes needed.

### 3. Run

```bash
npm run dev      # http://localhost:3000
npm run typecheck
npm run build && npm start
```

To run the e2e tests against a seeded public flipbook:

```bash
PLAYWRIGHT_TEST_SLUG=your-public-slug npm run test:e2e
```

## How it works

| Step | What happens |
|---|---|
| **Upload** | Signed-in user drops a PDF at `/upload`, picks an access mode + brand color. |
| **Convert** | `POST /api/convert` (Node runtime) renders every page with pdfjs-dist's **legacy Node build** + `@napi-rs/canvas`, uploads PNGs to the `flipbook-pages` bucket, creates the `documents` row. |
| **View** | Public `/d/[slug]` page loads page images into StPageFlip (client-only dynamic import). Lead/password gates unlock via `LeadForm` / `PasswordGate`. |
| **Track** | `POST /api/track` records views + per-page dwell (anonymous inserts allowed by RLS; reads are owner-only). |
| **Analyze** | Owner opens `/dashboard/[docId]`: views-over-time chart, dwell-per-page chart, leads table, CSV export. |

### Research notes (verified, Oct 2026)

- **pdfjs-dist in Node.js must use the legacy build** (`pdfjs-dist/legacy/build/pdf.mjs`).
  The default build crashes in Node with `UnknownErrorException:
  hashOriginal.toHex is not a function` (pdfjs itself warns: *"Please use the
  `legacy` build in Node.js environments"*). Verified by rendering a real PDF
  to PNG in Node 24 — see `src/lib/pdfRender.ts`.
- **StPageFlip** (`page-flip` on npm): `new PageFlip(el, { width, height })` +
  `pageFlip.loadFromImages(urls)`. It touches `window`, so it is dynamically
  imported inside `useEffect` and never server-rendered.
- **Password gates**: the SHA-256 hash lives in `document_secrets`
  (owner-only RLS); verification happens in `/api/unlock` with a timing-safe
  comparison. The hash is never sent to the browser.
- No HuggingFace components are used — nothing in the flipbook pipeline needs
  ML models; the stack is intentionally dependency-lean.

## Project structure

```
supabase/schema.sql          # tables + RLS + storage policy
src/app/page.tsx             # document library / home
src/app/login/page.tsx       # email+password and magic link
src/app/upload/page.tsx      # drag-and-drop PDF upload
src/app/d/[slug]/            # public flipbook viewer (+ gates, tracking)
src/app/dashboard/[docId]/   # owner analytics (Recharts + CSV export)
src/app/api/convert/route.ts # PDF -> PNG -> storage -> document row
src/app/api/track/route.ts   # anonymous analytics ingest
src/app/api/unlock/route.ts  # password-gate verification
src/components/FlipBook.tsx  # StPageFlip viewer + toolbar
src/components/LeadForm.tsx  # lead-capture gate
src/components/PasswordGate.tsx
src/components/UploadForm.tsx
src/components/Navbar.tsx
src/lib/pdfRender.ts         # server-side renderer (the tricky part, solved)
src/lib/supabaseClient.ts    # browser anon client
src/lib/supabaseServer.ts    # service-role + token helpers (server only)
src/lib/utils.ts
tests/                       # Playwright e2e
```

## Deploying

- **Vercel**: import the repo, set the four env vars, deploy. `/api/convert`
  sets `maxDuration = 300` (needs a Pro plan for >60s; on Hobby, keep PDFs
  small or self-host).
- **Self-host**: `npm run build && npm start` on any Node 20+ server.

## License

MIT — all libraries used are MIT-safe (no commercial flipbook code).
