// index.d.ts
declare module 'bulk-print-js' {
  interface BulkPrintOptions {
    batchSize?: number;
    autoMode?: boolean;
    delay?: number;
    confirmEachBatch?: boolean;
    pageSelector?: string;
  }

  interface PrintOptions {
    printElement: HTMLElement;
    totalPages: number;
    batchThreshold?: number;
    directPrintCallback?: () => void;
  }

  interface PrintStats {
    totalPages: number;
    totalBatches: number;
    currentBatch: number;
    printedPages: number;
    isPrinting: boolean;
  }

  interface BatchEventData {
    batch: number;
    totalBatches: number;
    startPage: number;
    pagesInBatch: number;
  }

  interface ProgressEventData {
    progress: number;
    printedPages: number;
    totalPages: number;
    currentBatch: number;
    totalBatches: number;
    status: 'processing' | 'queued';
  }

  interface FinishEventData {
    status: 'queued' | 'done';
    message?: string;
    totalPages: number;
    printedPages: number;
    totalBatches?: number;
    mode?: 'single' | 'batch';
  }

  class BulkPrint {
    constructor(options?: BulkPrintOptions);
    
    findPages(container: HTMLElement, selector: string): HTMLElement[];
    
    on(event: 'batchStart', handler: (data: BatchEventData) => void): this;
    on(event: 'progress', handler: (data: ProgressEventData) => void): this;
    on(event: 'finish', handler: (data: FinishEventData) => void): this;
    on(event: 'error', handler: (error: Error) => void): this;
    on(event: 'cancel', handler: (data: { batch: number }) => void): this;
    on(event: 'stopped', handler: (data: { printedPages: number; totalPages: number; currentBatch: number }) => void): this;
    on(event: string, handler: (data: any) => void): this;
    off(event: string): this;

    print(options: PrintOptions): Promise<void>;
    stop(): boolean;
    getStatus(): PrintStats;

    static getBrowserThreshold(browser: string): number;
    static detectBrowser(): string;
    static create(options?: BulkPrintOptions): BulkPrint;
  }

  export default BulkPrint;
}