import { NextRequest, NextResponse } from 'next/server';
import { getSupabaseAnonServer } from '@/lib/supabaseServer';

export const runtime = 'nodejs';

interface TrackBody {
  documentId?: string;
  /** 'view' = a flipbook was opened; 'dwell' = time spent on one page */
  type?: 'view' | 'dwell';
  sessionId?: string;
  pageNumber?: number;
  dwellSeconds?: number;
  userAgent?: string;
}

/**
 * POST /api/track
 * Public (no auth): records anonymous analytics. RLS on page_views and
 * page_events allows anonymous inserts but restricts reads to owners.
 */
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as TrackBody;
    const { documentId, type, sessionId } = body;

    if (!documentId || !type || !sessionId) {
      return NextResponse.json({ error: 'documentId, type and sessionId are required.' }, { status: 400 });
    }

    const supabase = getSupabaseAnonServer();

    if (type === 'view') {
      const { error } = await supabase.from('page_views').insert({
        document_id: documentId,
        session_id: sessionId,
        user_agent: body.userAgent?.slice(0, 255) ?? null,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    if (type === 'dwell') {
      const pageNumber = Number(body.pageNumber);
      const dwellSeconds = Math.max(0, Number(body.dwellSeconds) || 0);
      if (!Number.isInteger(pageNumber) || pageNumber < 1) {
        return NextResponse.json({ error: 'Invalid pageNumber.' }, { status: 400 });
      }
      const { error } = await supabase.from('page_events').insert({
        document_id: documentId,
        session_id: sessionId,
        page_number: pageNumber,
        dwell_seconds: dwellSeconds,
      });
      if (error) throw error;
      return NextResponse.json({ ok: true });
    }

    return NextResponse.json({ error: 'Invalid type.' }, { status: 400 });
  } catch (err) {
    console.error('Track error:', err);
    // Analytics must never break the viewer — fail silently with 200.
    return NextResponse.json({ ok: false });
  }
}
