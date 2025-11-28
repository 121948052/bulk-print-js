// index.js
(function (global, factory) {
    typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
    typeof define === 'function' && define.amd ? define(factory) :
    (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.BulkPrint = factory());
})(this, (function () {
    'use strict';

    class BulkPrint {
        constructor(options = {}) {
            this.options = {
                batchSize: Math.max(1, options.batchSize || 100),
                autoMode: !!options.autoMode,
                delayBetweenBatches: Math.max(0, options.delayBetweenBatches || 500),
                pageSelector: options.pageSelector || '.print-page',
                confirmEachBatch: options.confirmEachBatch !== false
            };

            this.reset();
            this.events = {};
        }

        // 重置状态
        reset() {
            this.currentBatch = this.totalBatches = this.totalPages = this.printedPages = 0;
            this.isPrinting = false;
        }

        // 查找页面元素
        findPages(container, selector) {
            if (!container || !selector) return [];
            
            try {
                let results = [...container.querySelectorAll(selector)];
                if (container.shadowRoot) {
                    results.push(...container.shadowRoot.querySelectorAll(selector));
                }
                return results;
            } catch (error) {
                console.warn('查找页面失败:', error);
                return [];
            }
        }

        // 事件系统
        on(event, handler) {
            this.events[event] = handler;
            return this;
        }

        _emit(event, data) {
            this.events[event]?.(data);
        }

        // 主打印方法
        async print({ printElement, totalPages, batchThreshold = 100, directPrintCallback }) {
            if (!printElement || !totalPages) {
                throw new Error('缺少必要参数');
            }

            if (this.isPrinting) {
                throw new Error('打印进行中');
            }

            // 保存自定义打印回调
            this.directPrintCallback = directPrintCallback;

            try {
                if (totalPages <= batchThreshold) {
                    await this.printAll(printElement);
                } else {
                    await this.printInBatches(printElement, totalPages);
                }
            } catch (error) {
                this._emit('error', error);
                throw error;
            }
        }

        // 单次打印
        async printAll(printElement) {
            const pages = this.findPages(printElement, this.options.pageSelector);
            pages.forEach(page => page.style.display = 'block');
            await this.doPrint();
        }

        // 分批打印
        async printInBatches(printElement, totalPages) {
            this.isPrinting = true;
            this.totalPages = totalPages;
            this.totalBatches = Math.ceil(totalPages / this.options.batchSize);

            // 模式选择
            if (!this.options.autoMode) {
                this.options.autoMode = confirm(
                    `${totalPages}页分${this.totalBatches}批打印\n确定=自动，取消=手动`
                );
            }

            try {
                for (let i = 0; i < this.totalBatches && this.isPrinting; i++) {
                    await this.printBatch(printElement, i);
                }
                this._emit('finish', { totalPages, printedPages: this.printedPages });
            } finally {
                this.isPrinting = false;
            }
        }

        // 单批次打印
        async printBatch(printElement, batchIndex) {
            const start = batchIndex * this.options.batchSize;
            const end = Math.min(start + this.options.batchSize, this.totalPages);
            const count = end - start;

            await this.showBatch(printElement, start, count);

            this._emit('batchStart', {
                batch: batchIndex + 1,
                totalBatches: this.totalBatches,
                startPage: start,
                pagesInBatch: count
            });

            // 确认打印
            if (!this.options.autoMode && this.options.confirmEachBatch) {
                if (!confirm(`打印第 ${batchIndex + 1}/${this.totalBatches} 批 (${count} 页)`)) {
                    this.isPrinting = false;
                    return;
                }
            }

            await this.doPrint();
            
            this.printedPages += count;
            
            this._emit('progress', {
                progress: Math.round((this.printedPages / this.totalPages) * 100),
                printedPages: this.printedPages
            });

            // 批次延迟
            if (batchIndex < this.totalBatches - 1) {
                await new Promise(r => setTimeout(r, this.options.delayBetweenBatches));
            }
        }

        // 显示指定批次
        async showBatch(printElement, start, count) {
            const pages = this.findPages(printElement, this.options.pageSelector);
            
            if (!pages.length) {
                throw new Error(`未找到页面: ${this.options.pageSelector}`);
            }

            // 隐藏所有，显示当前批次
            pages.forEach(page => page.style.display = 'none');
            for (let i = 0; i < count; i++) {
                if (pages[start + i]) {
                    pages[start + i].style.display = 'block';
                }
            }
        }

        // 执行打印
        async doPrint() {
            return new Promise(resolve => {
                if (this.directPrintCallback && typeof this.directPrintCallback === 'function') {
                    // 使用用户自定义的打印回调
                    this.directPrintCallback();
                    setTimeout(resolve, this.options.autoMode ? 2000 : 500);
                } else {
                    // 默认使用 window.print()
                    window.print();
                    setTimeout(resolve, this.options.autoMode ? 2000 : 500);
                }
            });
        }

        // 工具方法
        getStats() {
            return {
                totalPages: this.totalPages,
                totalBatches: this.totalBatches,
                currentBatch: this.currentBatch,
                printedPages: this.printedPages,
                isPrinting: this.isPrinting
            };
        }

        stop() {
            this.isPrinting = false;
        }

        // 静态方法
        static getBrowserThreshold(browser) {
            const thresholds = { Chrome: 100, Firefox: 80, Safari: 60, Edge: 90, IE: 40 };
            return thresholds[browser] || 100;
        }

        static detectBrowser() {
            const ua = navigator.userAgent;
            if (ua.includes('Chrome') && !ua.includes('Edg')) return 'Chrome';
            if (ua.includes('Firefox')) return 'Firefox';
            if (ua.includes('Safari') && !ua.includes('Chrome')) return 'Safari';
            if (ua.includes('Edg')) return 'Edge';
            if (ua.includes('Trident') || ua.includes('MSIE')) return 'IE';
            return 'Unknown';
        }
    }

    return BulkPrint;
}));