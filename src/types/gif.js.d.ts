declare module 'gif.js' {
  export interface GIFOptions {
    workers?: number;
    quality?: number;
    width?: number;
    height?: number;
    workerScript?: string;
    repeat?: number;
    background?: string;
    dither?: boolean | string;
  }

  export interface GifFrameOptions {
    delay?: number;
    copy?: boolean;
  }

  export default class GIF {
    constructor(options: GIFOptions);
    on(event: 'finished', callback: (blob: Blob) => void): void;
    on(event: 'progress', callback: (percent: number) => void): void;
    addFrame(element: HTMLCanvasElement | HTMLImageElement, options?: GifFrameOptions): void;
    render(): void;
    abort(): void;
  }
} 