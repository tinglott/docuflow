'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { UploadCloud, FileText, Loader2 } from 'lucide-react';
import { getSupabaseBrowser } from '@/lib/supabaseClient';
import type { AccessMode } from '@/types';
import { cn } from '@/lib/utils';

const MODES: { value: AccessMode; label: string; hint: string }[] = [
  { value: 'public', label: 'Public', hint: 'Anyone with the link can read.' },
  { value: 'lead', label: 'Lead gate', hint: 'Readers enter an email first.' },
  { value: 'password', label: 'Password', hint: 'Readers need a password.' },
];

/** Drag-and-drop PDF upload form. Posts to /api/convert with the user's token. */
export default function UploadForm() {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [file, setFile] = useState<File | null>(null);
  const [title, setTitle] = useState('');
  const [mode, setMode] = useState<AccessMode>('public');
  const [password, setPassword] = useState('');
  const [brandColor, setBrandColor] = useState('#7c5cbf');
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState('');

  function pickFile(f: File | undefined) {
    if (!f) return;
    if (f.type !== 'application/pdf') {
      setError('Please choose a PDF file.');
      return;
    }
    if (f.size > 50 * 1024 * 1024) {
      setError('PDFs are limited to 50 MB.');
      return;
    }
    setError('');
    setFile(f);
    if (!title) {
      setTitle(f.name.replace(/\.pdf$/i, '').replace(/[-_]+/g, ' '));
    }
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!file) {
      setError('Choose a PDF first.');
      return;
    }
    if (!title.trim()) {
      setError('Give your flipbook a title.');
      return;
    }
    if (mode === 'password' && password.length < 4) {
      setError('Password must be at least 4 characters.');
      return;
    }

    setBusy(true);
    setStatus('Uploading PDF…');
    try {
      const supabase = getSupabaseBrowser();
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      if (!token) {
        router.push('/login?next=/upload');
        return;
      }

      const form = new FormData();
      form.append('pdf', file);
      form.append('title', title.trim());
      form.append('access_mode', mode);
      form.append('brand_color', brandColor);
      if (mode === 'password') form.append('password', password);

      setStatus('Rendering pages — this can take a minute…');
      const res = await fetch('/api/convert', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: form,
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error ?? 'Conversion failed.');
      }
      router.push(`/d/${data.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong.');
      setBusy(false);
      setStatus('');
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto w-full max-w-2xl space-y-6">
      {/* Drop zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragging(false);
          pickFile(e.dataTransfer.files?.[0]);
        }}
        onClick={() => fileRef.current?.click()}
        className={cn(
          'flex cursor-pointer flex-col items-center gap-3 rounded-2xl border-2 border-dashed p-10 text-center transition',
          dragging ? 'border-brand-500 bg-brand-500/10' : 'border-white/20 bg-white/5 hover:border-white/40',
        )}
      >
        <UploadCloud className="h-12 w-12 text-white/40" />
        {file ? (
          <div className="flex items-center gap-2 text-white">
            <FileText className="h-5 w-5 text-brand-500" />
            <span className="font-medium">{file.name}</span>
            <span className="text-sm text-white/50">({(file.size / 1024 / 1024).toFixed(1)} MB)</span>
          </div>
        ) : (
          <>
            <p className="text-lg font-medium text-white">Drop your PDF here</p>
            <p className="text-sm text-white/50">or click to browse — up to 50 MB</p>
          </>
        )}
        <input
          ref={fileRef}
          type="file"
          accept="application/pdf"
          className="hidden"
          onChange={(e) => pickFile(e.target.files?.[0])}
        />
      </div>

      {/* Title */}
      <label className="block">
        <span className="mb-1 block text-sm font-semibold text-white/70">Title</span>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="My Awesome Flipbook"
          className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-brand-500"
        />
      </label>

      {/* Access mode */}
      <div>
        <span className="mb-2 block text-sm font-semibold text-white/70">Who can read it?</span>
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
          {MODES.map((m) => (
            <button
              key={m.value}
              type="button"
              onClick={() => setMode(m.value)}
              className={cn(
                'rounded-xl border p-4 text-left transition',
                mode === m.value
                  ? 'border-brand-500 bg-brand-500/15'
                  : 'border-white/15 bg-white/5 hover:border-white/30',
              )}
            >
              <div className="font-semibold text-white">{m.label}</div>
              <div className="mt-1 text-xs text-white/50">{m.hint}</div>
            </button>
          ))}
        </div>
      </div>

      {mode === 'password' && (
        <label className="block">
          <span className="mb-1 block text-sm font-semibold text-white/70">Gate password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="At least 4 characters"
            autoComplete="off"
            className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-white outline-none placeholder:text-white/30 focus:border-brand-500"
          />
        </label>
      )}

      {/* Brand color */}
      <label className="flex items-center gap-3">
        <span className="text-sm font-semibold text-white/70">Brand color</span>
        <input
          type="color"
          value={brandColor}
          onChange={(e) => setBrandColor(e.target.value)}
          className="h-10 w-14 cursor-pointer rounded-lg border border-white/15 bg-transparent"
        />
        <span className="text-sm text-white/50">{brandColor}</span>
      </label>

      {error && <p className="rounded-xl bg-red-500/10 p-3 text-sm text-red-300">{error}</p>}

      <button
        type="submit"
        disabled={busy}
        className="flex w-full items-center justify-center gap-2 rounded-full bg-brand-500 py-4 text-lg font-semibold text-white transition hover:bg-brand-600 disabled:opacity-60"
      >
        {busy ? (
          <>
            <Loader2 className="h-5 w-5 animate-spin" /> {status}
          </>
        ) : (
          'Create flipbook'
        )}
      </button>
    </form>
  );
}
