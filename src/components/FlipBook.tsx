'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Expand,
  Shrink,
  BookOpen,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { PageFlip as PageFlipInstance } from 'page-flip';

interface FlipBookProps {
  pageUrls: string[];
  title: string;
  brandColor: string;
  /** 1-based page to open on (from #page=N deep links) */
  initialPage?: number;
  /** Called whenever the visible page changes (1-based) */
  onPageChange?: (page: number) => void;
}

/**
 * Realistic page-flip viewer powered by StPageFlip.
 * RESEARCH NOTE: page-flip touches `window`/`document`, so it must only load
 * in the browser. We dynamically import it inside useEffect (never SSR).
 * API verified against the official docs: `new PageFlip(el, settings)` +
 * `pageFlip.loadFromImages(urls)`.
 */
export default function FlipBook({
  pageUrls,
  title,
  brandColor,
  initialPage = 1,
  onPageChange,
}: FlipBookProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const flipRef = useRef<PageFlipInstance | null>(null);
  const onPageChangeRef = useRef(onPageChange);
  onPageChangeRef.current = onPageChange;

  const [ready, setReady] = useState(false);
  const [currentPage, setCurrentPage] = useState(initialPage);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function init() {
      if (!containerRef.current || pageUrls.length === 0) return;
      // Dynamic import: page-flip is browser-only.
      const { PageFlip } = await import('page-flip');

      if (cancelled || !containerRef.current) return;

      const width = Math.min(420, window.innerWidth - 32);
      const height = Math.round(width * 1.4142); // A-series-ish ratio

      const flip = new PageFlip(containerRef.current, {
        width,
        height,
        size: 'stretch',
        minWidth: 280,
        maxWidth: 900,
        minHeight: 396,
        maxHeight: 1272,
        drawShadow: true,
        flippingTime: 700,
        usePortrait: true,
        startZIndex: 0,
        autoSize: true,
        maxShadowOpacity: 0.5,
        showCover: true,
        mobileScrollSupport: true,
        swipeDistance: 30,
        clickEvent: false,
        useMouseEvents: true,
      });

      flip.loadFromImages(pageUrls);
      flip.on('flip', (e) => {
        const page = e.data + 1;
        setCurrentPage(page);
        onPageChangeRef.current?.(page);
      });

      flipRef.current = flip;
      setReady(true);

      const start = Math.min(Math.max(initialPage, 1), pageUrls.length);
      if (start > 1) {
        // Defer so the book finishes its initial layout first.
        setTimeout(() => {
          if (!cancelled) {
            flip.turnToPage(start - 1);
            setCurrentPage(start);
          }
        }, 350);
      }
    }

    init();
    return () => {
      cancelled = true;
      try {
        flipRef.current?.destroy();
      } catch {
        /* already destroyed */
      }
      flipRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pageUrls.join('|')]);

  const goTo = useCallback(
    (page: number) => {
      const clamped = Math.min(Math.max(page, 1), pageUrls.length);
      flipRef.current?.turnToPage(clamped - 1);
      setCurrentPage(clamped);
      onPageChangeRef.current?.(clamped);
      // Keep the URL deep link in sync.
      window.history.replaceState(null, '', `#page=${clamped}`);
    },
    [pageUrls.length],
  );

  const toggleFullscreen = useCallback(async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      } else {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      /* fullscreen unavailable — ignore */
    }
  }, []);

  useEffect(() => {
    const onChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    document.addEventListener('fullscreenchange', onChange);
    return () => document.removeEventListener('fullscreenchange', onChange);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'ArrowRight') goTo(currentPage + 1);
      if (e.key === 'ArrowLeft') goTo(currentPage - 1);
      if (e.key === 'Home') goTo(1);
      if (e.key === 'End') goTo(pageUrls.length);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [currentPage, goTo, pageUrls.length]);

  if (pageUrls.length === 0) {
    return (
      <div className="flex flex-col items-center gap-3 rounded-xl bg-white/5 p-10 text-center">
        <BookOpen className="h-10 w-10 text-white/30" />
        <p className="text-white/60">This flipbook has no pages yet.</p>
      </div>
    );
  }

  return (
    <div className="flex w-full flex-col items-center">
      <div className="relative w-full max-w-3xl">
        <div ref={containerRef} aria-label={title} className="mx-auto" />
        {!ready && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/20 border-t-white" />
          </div>
        )}
      </div>

      {/* Toolbar */}
      <div className="mt-5 flex items-center gap-2 rounded-full bg-white/10 px-3 py-2 backdrop-blur">
        <button
          onClick={() => goTo(currentPage - 1)}
          disabled={currentPage <= 1}
          className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-30"
          aria-label="Previous page"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-1 text-sm text-white/80">
          <input
            type="number"
            min={1}
            max={pageUrls.length}
            value={currentPage}
            onChange={(e) => goTo(Number(e.target.value) || 1)}
            className="w-14 rounded-md bg-white/10 px-2 py-1 text-center text-white outline-none"
            aria-label="Page number"
          />
          <span className="text-white/50">/ {pageUrls.length}</span>
        </div>

        <button
          onClick={() => goTo(currentPage + 1)}
          disabled={currentPage >= pageUrls.length}
          className="rounded-full p-2 text-white transition hover:bg-white/10 disabled:opacity-30"
          aria-label="Next page"
        >
          <ChevronRight className="h-5 w-5" />
        </button>

        <div className="mx-1 h-5 w-px bg-white/15" />

        <button
          onClick={toggleFullscreen}
          className="rounded-full p-2 text-white transition hover:bg-white/10"
          aria-label="Toggle fullscreen"
        >
          {isFullscreen ? <Shrink className="h-5 w-5" /> : <Expand className="h-5 w-5" />}
        </button>

        <a
          href="#page=1"
          onClick={(e) => {
            e.preventDefault();
            goTo(1);
          }}
          className={cn(
            'rounded-full px-4 py-2 text-sm font-semibold text-white transition',
          )}
          style={{ backgroundColor: brandColor }}
        >
          Start over
        </a>
      </div>
    </div>
  );
}
