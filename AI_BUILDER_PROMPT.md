# DocuFlow — Master AI Builder Prompt

> Paste this entire file into Cursor / Bolt.new / v0 / Lovable / Windsurf /
> Claude as the build specification. Then say: **"Generate the complete
> codebase now. Every file in the tree must exist with full working source —
> no placeholders, no TODOs."**

---

## 1. Product brief

Build **DocuFlow**: an open-source, Flipsnack-style interactive PDF flipbook
platform (MIT-licensed libraries only).

**User flow:** sign in → upload a PDF → the server rasterizes every page to
PNG → a realistic page-flip viewer is published at a public `/d/[slug]` URL.
Optional lead-capture gate or password gate before reading. Per-page analytics
(views + dwell time). Lead list with CSV export. Per-flipbook brand color.
Deep links (`#page=N`). Keyboard navigation. Fullscreen. Mobile swipe.

## 2. Stack (do not change)

- Next.js 14 App Router + TypeScript (strict)
- Tailwind CSS 3 + Lucide React icons
- Supabase (Auth + Postgres + Storage) via `@supabase/supabase-js`
- `page-flip` (StPageFlip) for the flip engine
- `pdfjs-dist` + `@napi-rs/canvas` for server-side PDF → PNG
- Recharts for analytics charts
- Playwright for e2e tests
- `uuid` / `crypto` for IDs and hashing; `clsx` for classnames

## 3. Critical implementation rules (researched — do not improvise)

1. **pdfjs-dist in Node.js MUST use the legacy build.**
   `import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'`.
   The default build crashes in Node (`UnknownErrorException:
   hashOriginal.toHex is not a function`). Supply a minimal `CanvasFactory`
   backed by `@napi-rs/canvas`; render each page with
   `page.render({ canvasContext, viewport, canvasFactory })`; export PNG via
   `canvas.toBuffer('image/png')`.
2. **StPageFlip is browser-only.** Never import it at module top level in a
   server component. Dynamically `import('page-flip')` inside `useEffect`,
   then `new PageFlip(el, { width, height, ... })` and
   `pageFlip.loadFromImages(urls)`.
3. **API routes that render PDFs run on Node**, not Edge:
   `export const runtime = 'nodejs'` in `src/app/api/convert/route.ts`.
4. **Never leak secrets to the client.** `SUPABASE_SERVICE_ROLE_KEY` lives
   only in server modules (`src/lib/supabaseServer.ts`, API routes).
5. **Password hashes live in a separate `document_secrets` table** with
   owner-only RLS; verification happens in `POST /api/unlock` with a
   timing-safe comparison. The hash is never sent to the browser.
6. **Analytics RLS:** anonymous inserts allowed on `page_views` /
   `page_events` / `leads`; selects restricted to the document owner via
   `exists (... owner_id = auth.uid())` subqueries.
7. **next.config.mjs** must set
   `serverExternalPackages: ['@napi-rs/canvas', 'pdfjs-dist']` and client
   webpack fallbacks `{ canvas: false, fs: false, path: false }`, plus
   `images.remotePatterns` for `**.supabase.co`.

## 4. File tree (create every file, full working source)

```
docuflow/
├── package.json
├── tsconfig.json
├── next.config.mjs
├── postcss.config.mjs
├── tailwind.config.ts
├── playwright.config.ts
├── next-env.d.ts
├── .env.example
├── .gitignore
├── README.md
├── AI_BUILDER_PROMPT.md              # this file
├── supabase/
│   └── schema.sql                    # documents, document_secrets, page_views, page_events, leads + RLS + storage policy
├── src/
│   ├── types/
│   │   └── index.ts                  # Document, Lead, PageViewRow, PageEventRow, AccessMode
│   ├── lib/
│   │   ├── pdfRender.ts              # renderPdfToPng() — legacy build + NodeCanvasFactory
│   │   ├── supabaseClient.ts         # 'use client' browser anon client (singleton)
│   │   ├── supabaseServer.ts         # service-role client, getUserIdFromToken(), anon server client
│   │   └── utils.ts                  # cn(), slugify(), getSessionId(), formatDate()
│   ├── components/
│   │   ├── Navbar.tsx                # brand + auth state + upload link
│   │   ├── FlipBook.tsx              # 'use client' StPageFlip viewer + toolbar (prev/next, page input, fullscreen, keyboard)
│   │   ├── LeadForm.tsx              # email gate -> inserts lead -> unlocks
│   │   ├── PasswordGate.tsx          # password gate -> POST /api/unlock -> unlocks
│   │   └── UploadForm.tsx            # drag-drop PDF, title, access mode, brand color -> POST /api/convert
│   └── app/
│       ├── globals.css
│       ├── layout.tsx
│       ├── page.tsx                  # hero + document library
│       ├── login/page.tsx            # email/password + magic link (Suspense for useSearchParams)
│       ├── upload/page.tsx
│       ├── d/[slug]/page.tsx         # server: fetch doc by slug + metadata; 404 if missing
│       ├── d/[slug]/ViewerClient.tsx # gates, view/dwell tracking, #page=N deep links
│       ├── dashboard/[docId]/page.tsx
│       ├── dashboard/[docId]/DashboardClient.tsx  # Recharts views + dwell, leads table, CSV export
│       └── api/
│           ├── convert/route.ts      # auth via Bearer token; render; upload PNGs; create doc (+ secret)
│           ├── track/route.ts        # public analytics ingest (view/dwell)
│           └── unlock/route.ts       # password verification
└── tests/
    ├── home.spec.ts                  # hero, login, upload, 404
    └── viewer.spec.ts                 # seeded-slug viewer tests (skip without PLAYWRIGHT_TEST_SLUG)
```

## 5. Feature checklist (every item must work)

- [ ] Email/password sign-up, sign-in, magic link; navbar reflects session
- [ ] Upload PDF (≤50 MB) with title, access mode, brand color; progress states
- [ ] Server renders ALL pages to PNG (scale 2), uploads to `flipbook-pages/{docId}/page-N.png`
- [ ] Document row created with slug, page URLs, access mode; password secret stored separately
- [ ] Public viewer at `/d/[slug]` with realistic page flip, toolbar, keyboard, fullscreen, swipe
- [ ] `#page=N` deep link opens on page N and stays in sync while reading
- [ ] Lead gate: valid email required, lead saved, remembered in localStorage
- [ ] Password gate: verified server-side, remembered in sessionStorage, 403 on wrong password
- [ ] View + per-page dwell tracked; final page flushed with `sendBeacon` on `pagehide`
- [ ] Dashboard: views-over-time line chart, dwell-per-page bar chart, stat cards, leads table, CSV download
- [ ] RLS: public doc reads; owner-only writes/reads of analytics, leads, secrets
- [ ] Playwright tests pass; `tsc --noEmit` clean; `next build` succeeds

## 6. UI design system

Dark theme (`#14101f` background), brand purple `#7c5cbf`, gold accents
`#e8a838` for CTAs. Rounded-full buttons, generous spacing, Lucide icons only
(no emojis). Mobile-first. Every page needs a real empty state — never a blank
screen or a "coming soon".

## 7. Generation order

1. Config + schema (`package.json`, `next.config.mjs`, `supabase/schema.sql`)
2. `src/lib/*` and `src/types/*`
3. API routes (`convert`, `track`, `unlock`)
4. Components (`FlipBook`, gates, forms, navbar)
5. App pages (layout, home, login, upload, viewer, dashboard)
6. Tests + README

Generate the complete codebase now. Every file in the tree must exist with
full working source — no placeholders, no TODOs, no stub components.
