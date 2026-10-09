-- DocuFlow schema — run in the Supabase SQL editor.
-- Tables: documents, document_secrets, page_views, page_events, leads.
-- Password hashes live in document_secrets (owner-only) so the public
-- documents read policy never exposes them.

-- ---------------------------------------------------------------- documents
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references auth.users (id) on delete cascade,
  title text not null,
  slug text not null unique,
  page_count int not null default 0,
  page_urls text[] not null default '{}',
  brand_color text not null default '#7c5cbf',
  access_mode text not null default 'public'
    check (access_mode in ('public', 'lead', 'password')),
  created_at timestamptz not null default now()
);

-- ------------------------------------------------------- document_secrets
create table if not exists public.document_secrets (
  document_id uuid primary key references public.documents (id) on delete cascade,
  -- SHA-256 hex of the gate password. Compared server-side with a
  -- timing-safe comparison. This is an access gate, not credential storage.
  password_hash text not null
);

-- ------------------------------------------------------------- page_views
create table if not exists public.page_views (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  session_id text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists page_views_document_idx on public.page_views (document_id, created_at desc);

-- ------------------------------------------------------------ page_events
create table if not exists public.page_events (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  session_id text not null,
  page_number int not null check (page_number >= 1),
  dwell_seconds numeric not null default 0 check (dwell_seconds >= 0),
  created_at timestamptz not null default now()
);
create index if not exists page_events_document_idx on public.page_events (document_id, page_number);

-- ------------------------------------------------------------------ leads
create table if not exists public.leads (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.documents (id) on delete cascade,
  email text not null,
  name text,
  created_at timestamptz not null default now()
);
create index if not exists leads_document_idx on public.leads (document_id, created_at desc);

-- -------------------------------------------------------------------- RLS
alter table public.documents enable row level security;
alter table public.document_secrets enable row level security;
alter table public.page_views enable row level security;
alter table public.page_events enable row level security;
alter table public.leads enable row level security;

-- documents: anyone can read listings (public viewer needs this);
-- only the owner can insert/update/delete their own rows.
create policy "documents public read"
  on public.documents for select using (true);
create policy "documents owner insert"
  on public.documents for insert with check (auth.uid() = owner_id);
create policy "documents owner update"
  on public.documents for update using (auth.uid() = owner_id);
create policy "documents owner delete"
  on public.documents for delete using (auth.uid() = owner_id);

-- document_secrets: owner only, all operations.
create policy "secrets owner all"
  on public.document_secrets for all
  using (
    exists (
      select 1 from public.documents d
      where d.id = document_secrets.document_id and d.owner_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.documents d
      where d.id = document_secrets.document_id and d.owner_id = auth.uid()
    )
  );

-- page_views / page_events: anyone (anon included) can insert;
-- only the document owner can read.
create policy "page_views anon insert"
  on public.page_views for insert with check (true);
create policy "page_views owner read"
  on public.page_views for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = page_views.document_id and d.owner_id = auth.uid()
    )
  );

create policy "page_events anon insert"
  on public.page_events for insert with check (true);
create policy "page_events owner read"
  on public.page_events for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = page_events.document_id and d.owner_id = auth.uid()
    )
  );

-- leads: anyone can submit; only the owner can read/export.
create policy "leads anon insert"
  on public.leads for insert with check (true);
create policy "leads owner read"
  on public.leads for select
  using (
    exists (
      select 1 from public.documents d
      where d.id = leads.document_id and d.owner_id = auth.uid()
    )
  );

-- ----------------------------------------------------------------- storage
-- Create a public bucket named `flipbook-pages` (via Dashboard > Storage or):
--   insert into storage.buckets (id, name, public) values ('flipbook-pages', 'flipbook-pages', true);
-- The /api/convert route uploads with the service-role key (bypasses RLS).
-- Public read policy for the bucket:
create policy "flipbook-pages public read"
  on storage.objects for select
  using (bucket_id = 'flipbook-pages');
