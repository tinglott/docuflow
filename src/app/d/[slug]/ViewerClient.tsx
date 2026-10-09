'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import FlipBook from '@/components/FlipBook';
import LeadForm from '@/components/LeadForm';
import PasswordGate from '@/components/PasswordGate';
import { getSessionId } from '@/lib/utils';
import type { AccessMode } from '@/types';

interface ViewerClientProps {
  documentId: string;
  slug: string;
  title: string;
  pageUrls: string[];
  brandColor: string;
  accessMode: AccessMode;
}

/**
 * Client wrapper for the public viewer:
 *  - enforces lead / password gates before showing the book
 *  - records a `view` event on unlock
 *  - records `dwell` events per page (time spent before turning)
 *  - supports #page=N deep links
 */
export default function ViewerClient({
  documentId,
  slug,
  title,
  pageUrls,
  brandColor,
  accessMode,
}: ViewerClientProps) {
  const [unlocked, setUnlocked] = useState(accessMode === 'public');
  const [initialPage, setInitialPage] = useState(1);
  const pageEnteredAt = useRef<number>(Date.now());
  const currentPageRef = useRef(1);
  const trackedView = useRef(false);

  // Deep link: #page=N
  useEffect(() => {
    const m = window.location.hash.match(/page=(\d+)/);
    if (m) {
      const n = Math.min(Math.max(parseInt(m[1], 10) || 1, 1), pageUrls.length);
      setInitialPage(n);
      currentPageRef.current = n;
    }
    // Remember a previously completed lead gate / password unlock.
    if (accessMode === 'lead' && window.localStorage.getItem(`docuflow-lead-${documentId}`)) {
      setUnlocked(true);
    }
    if (accessMode === 'password' && window.sessionStorage.getItem(`docuflow-unlock-${slug}`)) {
      setUnlocked(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const track = useCallback(
    async (body: Record<string, unknown>) => {
      try {
        await fetch('/api/track', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            documentId,
            sessionId: getSessionId(),
            userAgent: navigator.userAgent,
            ...body,
          }),
        });
      } catch {
        /* analytics must never break the viewer */
      }
    },
    [documentId],
  );

  // Record the view once the reader is unlocked.
  useEffect(() => {
    if (unlocked && !trackedView.current) {
      trackedView.current = true;
      pageEnteredAt.current = Date.now();
      track({ type: 'view' });
    }
  }, [unlocked, track]);

  const handlePageChange = useCallback(
    (page: number) => {
      const now = Date.now();
      const dwellSeconds = Math.round((now - pageEnteredAt.current) / 1000);
      const prevPage = currentPageRef.current;
      // Only record meaningful dwells (ignore instant skips).
      if (dwellSeconds >= 1 && dwellSeconds < 3600) {
        track({ type: 'dwell', pageNumber: prevPage, dwellSeconds });
      }
      currentPageRef.current = page;
      pageEnteredAt.current = now;
    },
    [track],
  );

  // Flush the final page's dwell when the reader leaves.
  useEffect(() => {
    const flush = () => {
      if (!trackedView.current) return;
      const dwellSeconds = Math.round((Date.now() - pageEnteredAt.current) / 1000);
      if (dwellSeconds >= 1 && dwellSeconds < 3600) {
        // sendBeacon is fire-and-forget; wrap in try/catch for safety.
        try {
          navigator.sendBeacon(
            '/api/track',
            JSON.stringify({
              documentId,
              sessionId: getSessionId(),
              type: 'dwell',
              pageNumber: currentPageRef.current,
              dwellSeconds,
            }),
          );
        } catch {
          /* ignore */
        }
      }
    };
    window.addEventListener('pagehide', flush);
    return () => window.removeEventListener('pagehide', flush);
  }, [documentId]);

  if (!unlocked) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center px-4">
        {accessMode === 'lead' ? (
          <LeadForm
            documentId={documentId}
            title={title}
            brandColor={brandColor}
            onUnlocked={() => setUnlocked(true)}
          />
        ) : (
          <PasswordGate
            slug={slug}
            title={title}
            brandColor={brandColor}
            onUnlocked={() => setUnlocked(true)}
          />
        )}
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6 text-center">
        <h1 className="text-3xl font-bold">{title}</h1>
        <p className="mt-1 text-sm text-white/50">
          {pageUrls.length} pages · use ← → keys, swipe, or the toolbar
        </p>
      </div>
      <FlipBook
        pageUrls={pageUrls}
        title={title}
        brandColor={brandColor}
        initialPage={initialPage}
        onPageChange={handlePageChange}
      />
      <p className="mt-6 text-center text-xs text-white/30">
        Share this flipbook: {typeof window !== 'undefined' ? window.location.href.split('#')[0] : ''} — link
        directly to any page with #page=N
      </p>
    </div>
  );
}
