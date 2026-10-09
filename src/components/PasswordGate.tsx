'use client';

import { useState } from 'react';
import { Lock, ArrowRight } from 'lucide-react';

interface PasswordGateProps {
  slug: string;
  title: string;
  brandColor: string;
  /** Called after the password is accepted — the viewer unlocks. */
  onUnlocked: () => void;
}

/** Password gate: verifies against /api/unlock (hash never leaves the server). */
export default function PasswordGate({ slug, title, brandColor, onUnlocked }: PasswordGateProps) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [checking, setChecking] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setChecking(true);
    try {
      const res = await fetch('/api/unlock', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slug, password }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? 'Incorrect password.');
        return;
      }
      window.sessionStorage.setItem(`docuflow-unlock-${slug}`, '1');
      onUnlocked();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setChecking(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: brandColor }}
      >
        <Lock className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Protected flipbook</h2>
      <p className="mt-2 text-sm text-gray-600">
        &ldquo;{title}&rdquo; is password protected. Enter the password to continue.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="off"
          className="w-full rounded-lg border border-gray-200 px-4 py-3 text-center text-gray-900 outline-none focus:border-gray-400"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button
          type="submit"
          disabled={checking || password.length === 0}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold text-white transition disabled:opacity-60"
          style={{ backgroundColor: brandColor }}
        >
          {checking ? 'Checking…' : 'Unlock'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
