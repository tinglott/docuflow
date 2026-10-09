'use client';

import { useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { Suspense } from 'react';
import { BookOpen } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const next = searchParams.get('next') ?? '/upload';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [magicSent, setMagicSent] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      const supabase = getSupabaseBrowser();
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
      }
      router.push(next);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Authentication failed.');
    } finally {
      setBusy(false);
    }
  }

  async function sendMagicLink() {
    setError('');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter your email first.');
      return;
    }
    setBusy(true);
    try {
      const { error } = await getSupabaseBrowser().auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${window.location.origin}${next}` },
      });
      if (error) throw error;
      setMagicSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not send magic link.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white/5 p-8">
      <div className="mb-6 flex items-center gap-2 text-xl font-bold">
        <BookOpen className="h-6 w-6 text-brand-500" /> DocuFlow
      </div>

      <div className="mb-6 grid grid-cols-2 gap-1 rounded-full bg-white/5 p-1 text-sm">
        {(['signin', 'signup'] as const).map((m) => (
          <button
            key={m}
            type="button"
            onClick={() => setMode(m)}
            className={`rounded-full py-2 font-semibold transition ${
              mode === m ? 'bg-brand-500 text-white' : 'text-white/50 hover:text-white'
            }`}
          >
            {m === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-brand-500"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          required
          minLength={6}
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-brand-500"
        />
        {error && <p className="text-sm text-red-300">{error}</p>}
        {magicSent && (
          <p className="text-sm text-green-300">Magic link sent — check your inbox.</p>
        )}
        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-full bg-brand-500 py-3 font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
        >
          {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Create account'}
        </button>
        <button
          type="button"
          onClick={sendMagicLink}
          disabled={busy}
          className="w-full rounded-full border border-white/20 py-3 font-semibold text-white/70 transition hover:bg-white/5 disabled:opacity-60"
        >
          Email me a magic link instead
        </button>
      </form>
    </div>
  );
}

export default function LoginPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-16">
      <Suspense fallback={<div className="text-center text-white/50">Loading…</div>}>
        <LoginForm />
      </Suspense>
    </div>
  );
}
