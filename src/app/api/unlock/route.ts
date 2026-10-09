import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnonServer, getSupabaseServiceRole } from '@/lib/supabaseServer';
import { createHash, timingSafeEqual } from 'crypto';

export const runtime = 'nodejs';

/**
 * POST /api/unlock
 * Verifies the password gate for a password-protected flipbook.
 * Body: { slug: string, password: string }
 * Returns { ok: true } on success. The hash comparison is timing-safe and
 * the stored hash is never exposed to the client.
 */
export async function POST(req: NextRequest) {
  try {
    const { slug, password } = (await req.json()) as {
      slug?: string;
      password?: string;
    };

    if (!slug || typeof password !== 'string') {
      return NextResponse.json({ error: 'slug and password are required.' }, { status: 400 });
    }

    const anon = getSupabaseAnonServer();
    const { data: doc, error: docError } = await anon
      .from('documents')
      .select('id, access_mode')
      .eq('slug', slug)
      .single();

    if (docError || !doc) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }
    if (doc.access_mode !== 'password') {
      return NextResponse.json({ ok: true });
    }

    // Secrets are owner-only under RLS — read them with the service role.
    const service = getSupabaseServiceRole();
    const { data: secret, error: secretError } = await service
      .from('document_secrets')
      .select('password_hash')
      .eq('document_id', doc.id)
      .single();

    if (secretError || !secret) {
      return NextResponse.json({ error: 'Document not found.' }, { status: 404 });
    }

    const candidate = createHash('sha256').update(password).digest();
    const expected = Buffer.from(secret.password_hash, 'hex');
    const ok = candidate.length === expected.length && timingSafeEqual(candidate, expected);

    // Small delay on failure to slow brute-force guessing.
    if (!ok) {
      await new Promise((r) => setTimeout(r, 600));
      return NextResponse.json({ error: 'Incorrect password.' }, { status: 403 });
    }
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('Unlock error:', err);
    return NextResponse.json({ error: 'Something went wrong.' }, { status: 500 });
  }
}
