declare module "page-flip/dist/js/page-flip.module.js" {
  type FlipCorner = "top" | "bottom";
  type FlipEvent = {
    data: number | string | boolean | object | null;
    object: PageFlip;
  };

  type FlipSettings = {
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
    clickEventForward?: boolean;
    useMouseEvents?: boolean;
    showPageCorners?: boolean;
    disableFlipByClick?: boolean;
  };

  export class PageFlip {
    constructor(root: HTMLElement, settings: FlipSettings);
    loadFromHTML(items: HTMLElement[] | NodeListOf<HTMLElement>): void;
    loadFromImages(imagesHref: string[]): void;
    update(): void;
    turnToPage(page: number): void;
    flipNext(corner?: FlipCorner): void;
    flipPrev(corner?: FlipCorner): void;
    getCurrentPageIndex(): number;
    getPageCount(): number;
    getUI(): { destroy(): void };
    on(eventName: string, callback: (event: FlipEvent) => void): PageFlip;
    off(eventName: string): void;
  }
}
