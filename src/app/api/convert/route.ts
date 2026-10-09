import { NextRequest, NextResponse } from 'next/server';
import { renderPdfToPng } from '@/lib/pdfRender';
import {
  getSupabaseServiceRole,
  getUserIdFromToken,
} from '@/lib/supabaseServer';
import { slugify } from '@/lib/utils';
import { createHash } from 'crypto';

// Must run in Node (pdfjs + native canvas), not the Edge runtime.
export const runtime = 'nodejs';
// PDF rendering can take a while for large documents.
export const maxDuration = 300;

const MAX_PDF_BYTES = 50 * 1024 * 1024; // 50 MB
const RENDER_SCALE = 2; // crisp retina-quality pages

/**
 * POST /api/convert
 * Authenticated: requires `Authorization: Bearer <supabase access token>`.
 * Multipart form fields:
 *   - pdf: the PDF file (required)
 *   - title: document title (required)
 *   - access_mode: 'public' | 'lead' | 'password' (default 'public')
 *   - password: required when access_mode === 'password'
 *   - brand_color: hex color string (default '#7c5cbf')
 *
 * Renders every page to PNG, uploads pages to the `flipbook-pages` storage
 * bucket, creates the document row (and password secret when needed), and
 * returns the public viewer URL.
 */
export async function POST(req: NextRequest) {
  try {
    const authHeader = req.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;
    const ownerId = await getUserIdFromToken(token);
    if (!ownerId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const form = await req.formData();
    const file = form.get('pdf');
    const title = String(form.get('title') ?? '').trim();
    const accessMode = String(form.get('access_mode') ?? 'public');
    const password = String(form.get('password') ?? '');
    const brandColor = String(form.get('brand_color') ?? '#7c5cbf');

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: 'A PDF file is required.' }, { status: 400 });
    }
    if (!title) {
      return NextResponse.json({ error: 'A title is required.' }, { status: 400 });
    }
    if (!['public', 'lead', 'password'].includes(accessMode)) {
      return NextResponse.json({ error: 'Invalid access_mode.' }, { status: 400 });
    }
    if (accessMode === 'password' && password.length < 4) {
      return NextResponse.json(
        { error: 'Password must be at least 4 characters.' },
        { status: 400 },
      );
    }
    if (file.size > MAX_PDF_BYTES) {
      return NextResponse.json({ error: 'PDF exceeds the 50 MB limit.' }, { status: 400 });
    }

    const pdfBuffer = Buffer.from(await file.arrayBuffer());

    // 1. Render pages server-side (pdfjs legacy build + @napi-rs/canvas).
    let pages;
    try {
      pages = await renderPdfToPng(pdfBuffer, RENDER_SCALE);
    } catch (err) {
      console.error('PDF render failed:', err);
      return NextResponse.json(
        { error: 'Could not render this PDF. It may be corrupted or encrypted.' },
        { status: 422 },
      );
    }
    if (pages.length === 0) {
      return NextResponse.json({ error: 'The PDF has no pages.' }, { status: 422 });
    }

    const supabase = getSupabaseServiceRole();
    const slug = slugify(title);

    // 2. Create the document row first so page uploads have a stable prefix.
    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        owner_id: ownerId,
        title,
        slug,
        page_count: pages.length,
        page_urls: [],
        brand_color: brandColor,
        access_mode: accessMode,
      })
      .select('id, slug')
      .single();

    if (docError || !doc) {
      console.error('Document insert failed:', docError);
      return NextResponse.json({ error: 'Could not create the document.' }, { status: 500 });
    }

    // 3. Upload rendered pages to storage.
    const pageUrls: string[] = [];
    for (const page of pages) {
      const path = `${doc.id}/page-${page.pageNumber}.png`;
      const { error: uploadError } = await supabase.storage
        .from('flipbook-pages')
        .upload(path, page.png, {
          contentType: 'image/png',
          upsert: true,
        });
      if (uploadError) {
        console.error('Page upload failed:', uploadError);
        // Roll back the document row so no half-published flipbook remains.
        await supabase.from('documents').delete().eq('id', doc.id);
        return NextResponse.json({ error: 'Could not upload rendered pages.' }, { status: 500 });
      }
      const { data: publicUrl } = supabase.storage.from('flipbook-pages').getPublicUrl(path);
      pageUrls.push(publicUrl.publicUrl);
    }

    // 4. Save page URLs.
    const { error: updateError } = await supabase
      .from('documents')
      .update({ page_urls: pageUrls })
      .eq('id', doc.id);
    if (updateError) {
      console.error('Page URL update failed:', updateError);
      return NextResponse.json({ error: 'Could not finalize the document.' }, { status: 500 });
    }

    // 5. Store the password gate secret (separate table — never publicly readable).
    if (accessMode === 'password') {
      const passwordHash = createHash('sha256').update(password).digest('hex');
      const { error: secretError } = await supabase
        .from('document_secrets')
        .insert({ document_id: doc.id, password_hash: passwordHash });
      if (secretError) {
        console.error('Secret insert failed:', secretError);
        return NextResponse.json({ error: 'Could not set the password gate.' }, { status: 500 });
      }
    }

    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
    return NextResponse.json({
      id: doc.id,
      slug: doc.slug,
      pageCount: pages.length,
      viewerUrl: `${siteUrl}/d/${doc.slug}`,
    });
  } catch (err) {
    console.error('Unexpected convert error:', err);
    return NextResponse.json({ error: 'Something went wrong. Please try again.' }, { status: 500 });
  }
}
