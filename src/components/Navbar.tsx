'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { BookOpen, LogOut, Plus } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

export default function Navbar() {
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    const supabase = getSupabaseBrowser();
    supabase.auth.getSession().then(({ data }) => {
      setEmail(data.session?.user.email ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user.email ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  async function signOut() {
    await getSupabaseBrowser().auth.signOut();
    setEmail(null);
    window.location.href = '/';
  }

  return (
    <header className="border-b border-white/10 bg-[#14101f]/90 backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link href="/" className="flex items-center gap-2 text-xl font-bold tracking-wide text-white">
          <BookOpen className="h-6 w-6 text-brand-500" />
          DocuFlow
        </Link>

        <nav className="flex items-center gap-3 text-sm">
          {email ? (
            <>
              <span className="hidden text-white/50 sm:inline">{email}</span>
              <Link
                href="/upload"
                className="flex items-center gap-1 rounded-full bg-brand-500 px-4 py-2 font-semibold text-white transition hover:bg-brand-600"
              >
                <Plus className="h-4 w-4" /> New flipbook
              </Link>
              <button
                onClick={signOut}
                className="flex items-center gap-1 rounded-full px-3 py-2 text-white/60 transition hover:text-white"
              >
                <LogOut className="h-4 w-4" /> Sign out
              </button>
            </>
          ) : (
            <Link
              href="/login"
              className="rounded-full bg-brand-500 px-4 py-2 font-semibold text-white transition hover:bg-brand-600"
            >
              Sign in
            </Link>
          )}
        </nav>
      </div>
    </header>
  );
}
