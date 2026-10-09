/**
 * Server-side PDF -> PNG rendering.
 *
 * RESEARCH NOTE (verified by direct test, Oct 2026):
 * pdfjs-dist's default build targets browsers and crashes in Node.js with
 * `UnknownErrorException: hashOriginal.toHex is not a function` (pdfjs itself
 * prints "Warning: Please use the `legacy` build in Node.js environments.").
 * The correct import for server-side rendering is the legacy build:
 *
 *   import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
 *
 * Rendering needs a canvas implementation; we supply one backed by
 * @napi-rs/canvas via a minimal CanvasFactory. Each page is rendered at the
 * requested scale and returned as a PNG buffer.
 */
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs';
import { createCanvas, type Canvas } from '@napi-rs/canvas';

/** Minimal CanvasFactory backed by @napi-rs/canvas (no native cairo needed). */
class NodeCanvasFactory {
  create(width: number, height: number) {
    const canvas = createCanvas(width, height);
    const context = canvas.getContext('2d');
    return { canvas, context };
  }

  reset(canvasAndContext: { canvas: Canvas }, width: number, height: number) {
    canvasAndContext.canvas.width = width;
    canvasAndContext.canvas.height = height;
  }

  destroy(canvasAndContext: { canvas: Canvas }) {
    canvasAndContext.canvas.width = 0;
    canvasAndContext.canvas.height = 0;
  }
}

export interface RenderedPage {
  pageNumber: number;
  width: number;
  height: number;
  png: Buffer;
}

/**
 * Render every page of a PDF buffer to PNG.
 * @param pdfBuffer raw PDF bytes
 * @param scale render scale (2 = crisp retina-quality pages)
 */
export async function renderPdfToPng(
  pdfBuffer: Buffer,
  scale = 2,
): Promise<RenderedPage[]> {
  const data = new Uint8Array(pdfBuffer);
  const doc = await pdfjs.getDocument({ data, useSystemFonts: true }).promise;
  const factory = new NodeCanvasFactory();
  const pages: RenderedPage[] = [];

  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const viewport = page.getViewport({ scale });
    const width = Math.floor(viewport.width);
    const height = Math.floor(viewport.height);
    const { canvas, context } = factory.create(width, height);
    // pdfjs's RenderParameters type is DOM-oriented; our Node canvas factory
    // satisfies it at runtime (verified by test render). Cast the method to
    // keep the call type-safe without fighting lib.dom's canvas types.
    const render = page.render as unknown as (params: unknown) => { promise: Promise<void> };
    await render({ canvasContext: context, viewport, canvasFactory: factory }).promise;
    const png = canvas.toBuffer('image/png');
    factory.destroy({ canvas });
    pages.push({ pageNumber: n, width, height, png });
  }

  await doc.destroy();
  return pages;
}
