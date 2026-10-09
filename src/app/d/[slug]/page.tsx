import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { getSupabaseAnonServer } from '@/lib/supabaseServer';
import ViewerClient from './ViewerClient';

export const dynamic = 'force-dynamic';

interface Props {
  params: { slug: string };
}

async function getDocument(slug: string) {
  const supabase = getSupabaseAnonServer();
  const { data, error } = await supabase
    .from('documents')
    .select('id, title, slug, page_count, page_urls, brand_color, access_mode, created_at')
    .eq('slug', slug)
    .single();
  if (error || !data) return null;
  return data;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const doc = await getDocument(params.slug);
  return {
    title: doc ? `${doc.title} — DocuFlow Flipbook` : 'Flipbook not found',
    description: doc
      ? `Read "${doc.title}" as an interactive page-flip flipbook (${doc.page_count} pages).`
      : undefined,
  };
}

export default async function ViewerPage({ params }: Props) {
  const doc = await getDocument(params.slug);
  if (!doc || !doc.page_urls || doc.page_urls.length === 0) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <ViewerClient
        documentId={doc.id}
        slug={doc.slug}
        title={doc.title}
        pageUrls={doc.page_urls}
        brandColor={doc.brand_color}
        accessMode={doc.access_mode}
      />
    </div>
  );
}
