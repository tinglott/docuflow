export type AccessMode = 'public' | 'lead' | 'password';

export interface Document {
  id: string;
  owner_id: string;
  title: string;
  slug: string;
  page_count: number;
  page_urls: string[];
  brand_color: string;
  access_mode: AccessMode;
  created_at: string;
}

export interface Lead {
  id: string;
  document_id: string;
  email: string;
  name: string | null;
  created_at: string;
}

export interface PageViewRow {
  id: string;
  document_id: string;
  session_id: string;
  created_at: string;
}

export interface PageEventRow {
  id: string;
  document_id: string;
  session_id: string;
  page_number: number;
  dwell_seconds: number;
  created_at: string;
}
