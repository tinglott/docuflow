'use client';

import { useState } from 'react';
import { Mail, User, ArrowRight } from 'lucide-react';

interface LeadFormProps {
  documentId: string;
  title: string;
  brandColor: string;
  /** Called after the lead is saved — the viewer unlocks. */
  onUnlocked: () => void;
}

/**
 * Lead-capture gate shown before a gated flipbook. Saves the lead via the
 * public /api/track-adjacent leads insert (RLS allows anonymous inserts)
 * — implemented here with the anon client directly.
 */
export default function LeadForm({ documentId, title, brandColor, onUnlocked }: LeadFormProps) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setError('Please enter a valid email address.');
      return;
    }

    setSaving(true);
    try {
      const { getSupabaseBrowser } = await import('@/lib/supabaseClient');
      const supabase = getSupabaseBrowser();
      const { error: insertError } = await supabase.from('leads').insert({
        document_id: documentId,
        email: email.trim().toLowerCase(),
        name: name.trim() || null,
      });
      if (insertError) throw insertError;

      window.localStorage.setItem(`docuflow-lead-${documentId}`, '1');
      onUnlocked();
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="mx-auto w-full max-w-md rounded-2xl bg-white p-8 text-center shadow-2xl">
      <div
        className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full text-white"
        style={{ backgroundColor: brandColor }}
      >
        <Mail className="h-7 w-7" />
      </div>
      <h2 className="text-2xl font-bold text-gray-900">Read &ldquo;{title}&rdquo;</h2>
      <p className="mt-2 text-sm text-gray-600">
        Enter your email to unlock this flipbook. We&rsquo;ll never share your address.
      </p>

      <form onSubmit={submit} className="mt-6 space-y-3 text-left">
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
            <User className="h-3 w-3" /> Name (optional)
          </span>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Jane Reader"
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-gray-400"
          />
        </label>
        <label className="block">
          <span className="mb-1 flex items-center gap-1 text-xs font-semibold text-gray-500">
            <Mail className="h-3 w-3" /> Email
          </span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            className="w-full rounded-lg border border-gray-200 px-4 py-3 text-gray-900 outline-none focus:border-gray-400"
          />
        </label>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-full py-3 font-semibold text-white transition disabled:opacity-60"
          style={{ backgroundColor: brandColor }}
        >
          {saving ? 'Unlocking…' : 'Unlock the flipbook'}
          <ArrowRight className="h-4 w-4" />
        </button>
      </form>
    </div>
  );
}
