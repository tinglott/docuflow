'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { Download, ExternalLink, Eye, Users, Clock } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import { formatDate } from '@/lib/utils';
import type { Lead, PageEventRow, PageViewRow } from '@/types';

interface DashboardClientProps {
  documentId: string;
  title: string;
  slug: string;
  pageCount: number;
  createdAt: string;
}

interface DayBucket {
  day: string;
  views: number;
}

/** Owner analytics: views over time, dwell per page, leads + CSV export. */
export default function DashboardClient({
  documentId,
  title,
  slug,
  pageCount,
  createdAt,
}: DashboardClientProps) {
  const [views, setViews] = useState<PageViewRow[]>([]);
  const [events, setEvents] = useState<PageEventRow[]>([]);
  const [leads, setLeads] = useState<Lead[]>([]);
  const [loading, setLoading] = useState(true);
  const [denied, setDenied] = useState(false);

  useEffect(() => {
    async function load() {
      const supabase = getSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      if (!sessionData.session) {
        setDenied(true);
        setLoading(false);
        return;
      }

      // RLS: only the document owner can read these tables. Non-owners
      // get empty arrays (or errors) — never anyone else's data.
      const [vRes, eRes, lRes] = await Promise.all([
        supabase
          .from('page_views')
          .select('id, document_id, session_id, created_at')
          .eq('document_id', documentId)
          .order('created_at', { ascending: true })
          .limit(5000),
        supabase
          .from('page_events')
          .select('id, document_id, session_id, page_number, dwell_seconds, created_at')
          .eq('document_id', documentId)
          .limit(20000),
        supabase
          .from('leads')
          .select('id, document_id, email, name, created_at')
          .eq('document_id', documentId)
          .order('created_at', { ascending: false })
          .limit(5000),
      ]);

      if (vRes.error || eRes.error || lRes.error) {
        setDenied(true);
      } else {
        setViews(vRes.data ?? []);
        setEvents(eRes.data ?? []);
        setLeads(lRes.data ?? []);
      }
      setLoading(false);
    }
    load();
  }, [documentId]);

  const viewsByDay: DayBucket[] = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of views) {
      const day = v.created_at.slice(0, 10);
      map.set(day, (map.get(day) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([day, views]) => ({ day: day.slice(5), views }))
      .sort((a, b) => (a.day < b.day ? -1 : 1));
  }, [views]);

  const dwellByPage = useMemo(() => {
    const total = new Map<number, number>();
    const count = new Map<number, number>();
    for (const e of events) {
      total.set(e.page_number, (total.get(e.page_number) ?? 0) + Number(e.dwell_seconds));
      count.set(e.page_number, (count.get(e.page_number) ?? 0) + 1);
    }
    return Array.from({ length: pageCount }, (_, i) => {
      const p = i + 1;
      const n = count.get(p) ?? 0;
      return {
        page: `p${p}`,
        avgDwell: n > 0 ? Math.round((total.get(p) ?? 0) / n) : 0,
      };
    });
  }, [events, pageCount]);

  const avgDwellOverall = useMemo(() => {
    if (events.length === 0) return 0;
    const sum = events.reduce((a, e) => a + Number(e.dwell_seconds), 0);
    return Math.round(sum / events.length);
  }, [events]);

  function exportCsv() {
    const header = 'email,name,created_at';
    const rows = leads.map((l) =>
      [l.email, l.name ?? '', l.created_at]
        .map((v) => `"${String(v).replace(/"/g, '""')}"`)
        .join(','),
    );
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `docuflow-leads-${slug}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  if (loading) {
    return <div className="py-20 text-center text-white/50">Loading analytics…</div>;
  }

  if (denied) {
    return (
      <div className="mx-auto max-w-md rounded-2xl bg-white/5 p-10 text-center">
        <h1 className="text-xl font-bold">Not available</h1>
        <p className="mt-2 text-sm text-white/50">
          Sign in as the flipbook owner to view analytics.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block rounded-full bg-brand-500 px-6 py-3 font-semibold text-white"
        >
          Sign in
        </Link>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{title}</h1>
          <p className="mt-1 text-sm text-white/50">
            Published {formatDate(createdAt)} · {pageCount} pages
          </p>
        </div>
        <Link
          href={`/d/${slug}`}
          className="flex items-center gap-2 rounded-full border border-white/20 px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-white/5"
        >
          <ExternalLink className="h-4 w-4" /> View flipbook
        </Link>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        {[
          { icon: Eye, label: 'Total views', value: views.length },
          { icon: Clock, label: 'Avg. dwell / page', value: `${avgDwellOverall}s` },
          { icon: Users, label: 'Leads captured', value: leads.length },
        ].map((s) => (
          <div key={s.label} className="rounded-2xl bg-white/5 p-6">
            <s.icon className="mb-2 h-6 w-6 text-brand-500" />
            <div className="text-3xl font-bold">{s.value}</div>
            <div className="text-sm text-white/50">{s.label}</div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="mt-6 grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="rounded-2xl bg-white/5 p-6">
          <h2 className="mb-4 font-semibold">Views over time</h2>
          {viewsByDay.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">No views yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <LineChart data={viewsByDay}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="day" stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} allowDecimals={false} />
                <Tooltip
                  contentStyle={{ background: '#1e1830', border: '1px solid rgba(255,255,255,0.15)' }}
                />
                <Line type="monotone" dataKey="views" stroke="#7c5cbf" strokeWidth={2} dot={false} />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-2xl bg-white/5 p-6">
          <h2 className="mb-4 font-semibold">Avg. dwell per page (seconds)</h2>
          {events.length === 0 ? (
            <p className="py-10 text-center text-sm text-white/40">No reading data yet.</p>
          ) : (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dwellByPage}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis dataKey="page" stroke="rgba(255,255,255,0.5)" fontSize={10} interval={2} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={12} />
                <Tooltip
                  contentStyle={{ background: '#1e1830', border: '1px solid rgba(255,255,255,0.15)' }}
                />
                <Bar dataKey="avgDwell" fill="#7c5cbf" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      {/* Leads */}
      <div className="mt-6 rounded-2xl bg-white/5 p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="font-semibold">Leads ({leads.length})</h2>
          <button
            onClick={exportCsv}
            disabled={leads.length === 0}
            className="flex items-center gap-2 rounded-full bg-brand-500 px-4 py-2 text-sm font-semibold text-white transition hover:bg-brand-600 disabled:opacity-40"
          >
            <Download className="h-4 w-4" /> Export CSV
          </button>
        </div>
        {leads.length === 0 ? (
          <p className="py-6 text-center text-sm text-white/40">
            No leads yet. Switch this flipbook to the “Lead gate” access mode to start capturing emails.
          </p>
        ) : (
          <div className="max-h-80 overflow-auto rounded-xl">
            <table className="w-full text-left text-sm">
              <thead className="sticky top-0 bg-[#1c1533]">
                <tr className="text-white/50">
                  <th className="px-4 py-2 font-medium">Email</th>
                  <th className="px-4 py-2 font-medium">Name</th>
                  <th className="px-4 py-2 font-medium">Date</th>
                </tr>
              </thead>
              <tbody>
                {leads.map((l) => (
                  <tr key={l.id} className="border-t border-white/5">
                    <td className="px-4 py-2">{l.email}</td>
                    <td className="px-4 py-2 text-white/60">{l.name ?? '—'}</td>
                    <td className="px-4 py-2 text-white/60">{formatDate(l.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
