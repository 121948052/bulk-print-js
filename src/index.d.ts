// index.d.ts
declare module 'bulk-print-js' {
  interface BulkPrintOptions {
    pageSelector?: string;
    threshold?: number;
    batchSize?: number;
  }

  interface PrintOptions {
    element: HTMLElement;
    totalPages: number;
  }

  interface PrintStatus {
    isPrinting: boolean;
    currentBatch: number;
    totalBatches: number;
    totalPages: number;
    progress: number;
  }

  interface StartEventData {
    type: 'start';
    totalPages: number;
    totalBatches: number;
    batchSize: number;
  }

  interface BatchStartEventData {
    type: 'batchStart';
    batch: number;
    totalBatches: number;
    pagesInBatch: number;
    startPage: number;
  }

  interface BatchCompleteEventData {
    type: 'batchComplete';
    batch: number;
    totalBatches: number;
    pagesInBatch: number;
  }

  interface CancelEventData {
    type: 'cancel';
    message: string;
    printedPages: number;
    totalPages: number;
    currentBatch: number;
    totalBatches: number;
  }

  type EventData = StartEventData | BatchStartEventData | BatchCompleteEventData | CancelEventData;

  class BulkPrint {
    constructor(options?: BulkPrintOptions);
    
    on(event: 'start', handler: (data: StartEventData) => void): this;
    on(event: 'batchStart', handler: (data: BatchStartEventData) => void): this;
    on(event: 'batchComplete', handler: (data: BatchCompleteEventData) => void): this;
    on(event: 'cancel', handler: (data: CancelEventData) => void): this;
    on(event: string, handler: (data: EventData) => void): this;
    
    off(event: string, callback?: (data: any) => void): this;

    print(options: PrintOptions): Promise<{ success: boolean; pages: number }>;
    cancel(): boolean;
    getStatus(): PrintStatus;
    reset(): void;
    cleanup(): void;

    static create(options?: BulkPrintOptions): BulkPrint;
  }

  export default BulkPrint;
}