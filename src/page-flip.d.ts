declare module "page-flip/dist/js/page-flip.module.js" {
  export interface FlipEvent {
    data: unknown;
    object: unknown;
  }

  export interface PageFlipSettings {
    width: number;
    height: number;
    size?: "fixed" | "stretch";
    minWidth?: number;
    maxWidth?: number;
    minHeight?: number;
    maxHeight?: number;
    startPage?: number;
    drawShadow?: boolean;
    flippingTime?: number;
    usePortrait?: boolean;
    startZIndex?: number;
    autoSize?: boolean;
    maxShadowOpacity?: number;
    showCover?: boolean;
    mobileScrollSupport?: boolean;
    swipeDistance?: number;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  }

  export class PageFlip {
    constructor(element: HTMLElement, settings: PageFlipSettings);
    on(event: "flip", callback: (e: FlipEvent) => void): void;
    off(event: "flip"): void;
    loadFromHTML(items: HTMLElement[]): void;
    getUI(): { destroy(): void };
    getCurrentPageIndex(): number;
    turnToPage(page: number): void;
    update(): void;
  }
}
