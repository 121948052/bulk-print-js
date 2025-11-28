// index.d.ts
declare module 'bulk-print-js' {
  interface BulkPrintOptions {
    batchSize?: number;
    autoMode?: boolean;
    delayBetweenBatches?: number;
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
  }

  class BulkPrint {
    constructor(options?: BulkPrintOptions);
    
    findPages(container: HTMLElement, selector: string): HTMLElement[];
    
    on(event: string, handler: (data: any) => void): this;

    print(options: PrintOptions): Promise<void>;
    stop(): void;
    getStats(): PrintStats;

    static getBrowserThreshold(browser: string): number;
    static detectBrowser(): string;
  }

  export default BulkPrint;
}