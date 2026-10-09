/**
 * Type declarations for `page-flip` (StPageFlip) v2.
 * The package ships no .d.ts files, so we declare the API surface we use
 * (verified against page-flip@2.0.7 dist + official docs).
 */
declare module 'page-flip' {
  export interface IFlipSetting {
    startPage?: number;
    size?: 'fixed' | 'stretch';
    width?: number;
    height?: number;
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    clickEvent?: boolean;
    useMouseEvents?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  }

  export interface IFlipEvent {
    data: number;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: IFlipSetting);
    loadFromImages(images: string[]): void;
    loadFromHTML(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
    turnToPage(page: number): void;
    turnToNextPage(): void;
    turnToPrevPage(): void;
    flipNext(corner?: unknown): void;
    flipPrev(corner?: unknown): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    on(event: 'flip' | 'changeState' | 'init' | 'update', callback: (e: IFlipEvent) => void): void;
    destroy(): void;
  }
}
