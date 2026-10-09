import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSupabaseAnonServer } from '@/lib/supabaseServer';
import DashboardClient from './DashboardClient';

export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Dashboard — DocuFlow' };

interface Props {
  params: { docId: string };
}

/**
 * Analytics dashboard shell. The document's public fields load here; all
 * analytics queries run in DashboardClient under the viewer's own Supabase
 * session, and RLS restricts reads to the document owner — so non-owners
 * simply see empty results. The owner_id is never sent to the client.
 */
export default async function DashboardPage({ params }: Props) {
  const supabase = getSupabaseAnonServer();
  const { data: doc } = await supabase
    .from('documents')
    .select('id, title, slug, page_count, created_at')
    .eq('id', params.docId)
    .single();

  if (!doc) notFound();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <DashboardClient
        documentId={doc.id}
        title={doc.title}
        slug={doc.slug}
        pageCount={doc.page_count}
        createdAt={doc.created_at}
      />
    </div>
  );
}
