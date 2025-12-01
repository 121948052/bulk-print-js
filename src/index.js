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
        delay: Math.max(0, options.delay || 500),
        pageSelector: options.pageSelector || '.print-page',
        confirmEachBatch: options.confirmEachBatch !== false
      };

      this.reset();
      this._listeners = {};
      this._printContainer = null;
    }

    // 重置状态
    reset() {
      this.currentBatch = 0;
      this.totalBatches = 0;
      this.totalPages = 0;
      this.printedPages = 0;
      this.isPrinting = false;
      this.directPrintCallback = null;
      this._cleanupPrintContainer();
    }

    // 查找页面元素 - 支持单层 Shadow DOM
    findPages(container, selector) {
      if (!container || !selector) return [];
      
      try {
        let results = [...container.querySelectorAll(selector)];
        // 支持单层 Shadow DOM
        if (container.shadowRoot) {
            results.push(...container.shadowRoot.querySelectorAll(selector));
        }
        // 搜索子元素的 Shadow DOM（单层）
        const children = container.children || [];
        for (let child of children) {
            if (child.shadowRoot) {
                results.push(...child.shadowRoot.querySelectorAll(selector));
            }
        }
        return results;
      } catch (error) {
        console.warn('查找页面失败:', error);
        return [];
      }
    }

    // 事件系统
    on(event, handler) {
      if (typeof handler === 'function') {
        this._listeners[event] = handler;
      }
      return this;
    }

    off(event) {
      delete this._listeners[event];
      return this;
    }

    _emit(event, data) {
      const handler = this._listeners[event];
      if (handler) {
        try {
          handler(data);
        } catch (err) {
          console.error(`[BulkPrint] 事件处理错误 (${event}):`, err);
        }
      }
    }

    // 主打印方法
    async print({ printElement, totalPages, batchThreshold = 100, directPrintCallback } = {}) {
      if (!printElement || !totalPages) {
        throw new Error('需要 printElement 和 totalPages 参数');
      }

      if (this.isPrinting) {
        throw new Error('打印任务正在进行中');
      }

      // 保存自定义打印回调
      this.directPrintCallback = directPrintCallback;

      try {
        this.isPrinting = true;
        const shouldBatch = totalPages > batchThreshold;

        if (shouldBatch) {
          await this.printInBatches(printElement, totalPages);
        } else {
          await this.printAll(printElement);
        }
      } catch (error) {
        this._emit('error', error);
        throw error;
      } finally {
        this.isPrinting = false;
      }
    }

    // 单次打印
    async printAll(printElement) {
      const pages = this.findPages(printElement, this.options.pageSelector);
      pages.forEach(page => page.style.display = 'block');
      await this.doPrint();
      
      this._emit('finish', {
        status: 'done',
        totalPages: pages.length,
        printedPages: pages.length,
        mode: 'single'
      });
    }

    // 分批打印
    async printInBatches(printElement, totalPages) {
      this.totalPages = totalPages;
      this.totalBatches = Math.ceil(totalPages / this.options.batchSize);
      this.printedPages = 0;

      // 模式选择
      if (!this.options.autoMode) {
        this.options.autoMode = confirm(
          `${totalPages}页分${this.totalBatches}批打印\n确定=自动，取消=手动`
        );
      }

      for (let i = 0; i < this.totalBatches && this.isPrinting; i++) {
        await this.printSingleBatch(printElement, i);
      }

      if (this.isPrinting) {
        this._emit('finish', {
          status: 'queued',
          message: '所有打印任务已提交到打印队列',
          totalPages,
          printedPages: this.printedPages,
          totalBatches: this.totalBatches
        });
      }
    }

    // 单批次打印
    async printSingleBatch(printElement, batchIndex) {
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
          this._emit('cancel', { batch: batchIndex + 1 });
          throw new Error('用户取消打印');
        }
      }

      await this.doPrint();
      
      this.printedPages += count;
      
      this._emit('progress', {
        progress: Math.round((this.printedPages / this.totalPages) * 100),
        printedPages: this.printedPages,
        totalPages: this.totalPages,
        currentBatch: this.currentBatch,
        totalBatches: this.totalBatches,
        status: this.printedPages === this.totalPages ? 'queued' : 'processing' // 状态指示
      });

      // 批次延迟
      if (batchIndex < this.totalBatches - 1) {
        await new Promise(r => setTimeout(r, this.options.delay));
      }
    }

    // 显示指定批次
    async showBatch(printElement, start, count) {
      const pages = this.findPages(printElement, this.options.pageSelector);
      
      if (!pages.length) {
        throw new Error(`未找到页面: ${this.options.pageSelector}`);
      }

      // 使用隐藏容器方案
      await this._prepareHiddenContainer(pages, start, count);

      await new Promise(resolve => requestAnimationFrame(resolve));
    }

    // 准备隐藏容器用于打印
    async _prepareHiddenContainer(pages, start, count) {
      // 清理之前的容器
      this._cleanupPrintContainer();
      
      // 创建隐藏的打印容器
      this._printContainer = document.createElement('div');
      this._printContainer.id = `bulk-print-container-${Date.now()}`;
      this._printContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: -9999;
        visibility: hidden;
        pointer-events: none;
        background: white;
      `;
      
      // 复制当前批次的页面到隐藏容器
      for (let i = 0; i < count; i++) {
        const pageIndex = start + i;
        if (pageIndex < pages.length) {
          const originalPage = pages[pageIndex];
          const clonedPage = originalPage.cloneNode(true);
          
          // 确保克隆的页面可见
          clonedPage.style.display = 'block';
          clonedPage.style.visibility = 'visible';
          clonedPage.style.position = 'static';
          
          this._printContainer.appendChild(clonedPage);
        }
      }
      
      // 添加到页面并等待渲染
      document.body.appendChild(this._printContainer);
      
      // 等待样式应用完成
      await new Promise(resolve => setTimeout(resolve, 50));
    }

    // 清理打印容器
    _cleanupPrintContainer() {
      if (this._printContainer && this._printContainer.parentNode) {
        this._printContainer.parentNode.removeChild(this._printContainer);
        this._printContainer = null;
      }
    }

    // 执行打印
    async doPrint() {
      return new Promise(resolve => {
        const delay = this.options.autoMode ? 1500 : 800;

        if (this.directPrintCallback && typeof this.directPrintCallback === 'function') {
          this.directPrintCallback();
          setTimeout(resolve, delay);
        } else {
          // 隐藏容器方案：临时显示容器进行打印
          this._printContainer.style.visibility = 'visible';
          this._printContainer.style.zIndex = '9999';
          
          window.print();
          
          // 打印后恢复隐藏
          setTimeout(() => {
            if (this._printContainer) {
              this._printContainer.style.visibility = 'hidden';
              this._printContainer.style.zIndex = '-9999';
            }
            resolve();
          }, 100);
        }
      });
    }

    // 工具方法
    getStatus() {
      return {
        totalPages: this.totalPages,
        totalBatches: this.totalBatches,
        currentBatch: this.currentBatch,
        printedPages: this.printedPages,
        isPrinting: this.isPrinting
      };
    }

    stop() {
      const wasPrinting = this.isPrinting;
      this.isPrinting = false;

      if (wasPrinting) {
        this._emit('stopped', {
          printedPages: this.printedPages,
          totalPages: this.totalPages,
          currentBatch: this.currentBatch
        });
      }
      
      return wasPrinting;
    }

    // 静态方法
    static getBrowserThreshold(browser) {
      const thresholds = { 
        Chrome: 150, 
        Firefox: 100, 
        Safari: 80, 
        Edge: 120, 
        IE: 50 
      };
      return thresholds[browser] || 100;
    }

    static detectBrowser() {
      const ua = navigator.userAgent;

      if (ua.includes('edg')) return 'Edge';
      if (ua.includes('chrome')) return 'Chrome';
      if (ua.includes('firefox')) return 'Firefox';
      if (ua.includes('safari')) return 'Safari';
      if (ua.includes('trident') || ua.includes('msie')) return 'IE';

      return 'Unknown';
    }

    static create(options) {
      return new BulkPrint(options);
    }
  }

  return BulkPrint;
}));