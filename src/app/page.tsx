import Link from 'next/link';
import { BookOpen, UploadCloud, BarChart3, Lock } from 'lucide-react';
import { getSupabaseAnonServer } from '@/lib/supabaseServer';
import { formatDate } from '@/lib/utils';

export const dynamic = 'force-dynamic';

/** Document library: the owner's flipbooks (public list shows recent docs). */
export default async function HomePage() {
  const supabase = getSupabaseAnonServer();
  const { data: docs } = await supabase
    .from('documents')
    .select('id, title, slug, page_count, access_mode, created_at')
    .order('created_at', { ascending: false })
    .limit(24);

  return (
    <div className="mx-auto max-w-6xl px-4 py-12">
      {/* Hero */}
      <section className="py-10 text-center">
        <div className="mx-auto mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-brand-500/20">
          <BookOpen className="h-9 w-9 text-brand-500" />
        </div>
        <h1 className="text-4xl font-bold sm:text-5xl">
          Turn PDFs into <span className="text-brand-500">flipbooks</span>
        </h1>
        <p className="mx-auto mt-4 max-w-xl text-white/60">
          Upload a PDF and publish a realistic page-flip viewer at a public link.
          Optional lead-capture or password gates, plus per-page analytics.
        </p>
        <div className="mt-8 flex justify-center gap-3">
          <Link
            href="/upload"
            className="flex items-center gap-2 rounded-full bg-brand-500 px-6 py-3 font-semibold text-white transition hover:bg-brand-600"
          >
            <UploadCloud className="h-5 w-5" /> Create a flipbook
          </Link>
          <Link
            href="/login"
            className="rounded-full border border-white/20 px-6 py-3 font-semibold text-white transition hover:bg-white/5"
          >
            Sign in
          </Link>
        </div>

        <div className="mx-auto mt-12 grid max-w-3xl grid-cols-1 gap-4 text-left sm:grid-cols-3">
          {[
            { icon: BookOpen, t: 'Real page flips', d: 'Buttery StPageFlip animation, mobile swipe, fullscreen.' },
            { icon: Lock, t: 'Gates & leads', d: 'Lead-capture or password gates before reading.' },
            { icon: BarChart3, t: 'Page analytics', d: 'Views, dwell time per page, lead CSV export.' },
          ].map((f) => (
            <div key={f.t} className="rounded-2xl bg-white/5 p-5">
              <f.icon className="mb-2 h-6 w-6 text-brand-500" />
              <div className="font-semibold">{f.t}</div>
              <div className="mt-1 text-sm text-white/50">{f.d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* Library */}
      <section className="mt-8">
        <h2 className="mb-4 text-2xl font-bold">Recent flipbooks</h2>
        {!docs || docs.length === 0 ? (
          <div className="rounded-2xl bg-white/5 p-10 text-center text-white/50">
            No flipbooks yet —{' '}
            <Link href="/upload" className="text-brand-500 underline">
              create the first one
            </Link>
            .
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {docs.map((d) => (
              <Link
                key={d.id}
                href={`/d/${d.slug}`}
                className="group rounded-2xl bg-white/5 p-5 transition hover:bg-white/10"
              >
                <div className="font-semibold group-hover:text-brand-500">{d.title}</div>
                <div className="mt-2 flex items-center gap-3 text-xs text-white/40">
                  <span>{d.page_count} pages</span>
                  <span className="rounded-full bg-white/10 px-2 py-0.5">{d.access_mode}</span>
                  <span>{formatDate(d.created_at)}</span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
