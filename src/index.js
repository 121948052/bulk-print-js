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
        delay: Math.max(100, options.delay || 500),
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
        console.warn('[BulkPrint] 查找页面失败:', error);
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
          await this.printAll(printElement, totalPages);
        }
      } catch (error) {
        this._emit('error', error);
        throw error;
      } finally {
        this.isPrinting = false;
        this._cleanupPrintContainer();
      }
    }

    // 单次打印
    async printAll(printElement, totalPages) {
      const pages = this.findPages(printElement, this.options.pageSelector);

      await this._prepareHiddenContainer(pages, 0, pages.length);

      // 触发批次开始事件（单次打印也算一个批次）
      this._emit('batchStart', {
        batch: 1,
        totalBatches: 1,
        startPage: 1,
        pagesInBatch: pages.length
      });

      await this.doPrint();

      // 更新进度
      this.printedPages = pages.length;
      this._emit('progress', {
        progress: 100,
        printedPages: this.printedPages,
        totalPages: totalPages || pages.length,
        currentBatch: 1,
        totalBatches: 1,
        status: 'queued'
      });

      this._emit('finish', {
        status: 'done',
        totalPages: totalPages || pages.length,
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
      const pages = this.findPages(printElement, this.options.pageSelector);

      await this._prepareHiddenContainer(pages, start, count);

      this._emit('batchStart', {
        batch: batchIndex + 1,
        totalBatches: this.totalBatches,
        startPage: start + 1,
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
      this.currentBatch = batchIndex + 1;

      this._emit('progress', {
        progress: Math.round((this.printedPages / this.totalPages) * 100),
        printedPages: this.printedPages,
        totalPages: this.totalPages,
        currentBatch: this.currentBatch,
        totalBatches: this.totalBatches,
        status: this.printedPages === this.totalPages ? 'queued' : 'processing'
      });

      // 清理当前批次的容器，为下一批做准备
      this._cleanupPrintContainer();

      // 批次延迟
      if (batchIndex < this.totalBatches - 1) {
        await new Promise(r => setTimeout(r, this.options.delay));
      }
    }

    // 准备隐藏容器用于打印
    async _prepareHiddenContainer(pages, start, count) {
      // 清理之前的容器
      this._cleanupPrintContainer();

      // 检查是否有足够的页面
      if (pages.length === 0) {
        throw new Error(`未找到页面: ${this.options.pageSelector}`);
      }

      if (start >= pages.length) {
        throw new Error(`起始索引 ${start} 超出页面范围`);
      }

      // 创建隐藏的打印容器
      this._printContainer = document.createElement('div');
      this._printContainer.id = `bulk-print-container-${Date.now()}`;
      this._printContainer.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 999999;
        visibility: hidden;
        pointer-events: none;
        background: white;
        overflow: auto;
      `;

      // 复制当前批次的页面到隐藏容器
      let actualCount = 0;
      for (let i = 0; i < count; i++) {
        const pageIndex = start + i;
        if (pageIndex < pages.length) {
          const originalPage = pages[pageIndex];
          try {
            const clonedPage = originalPage.cloneNode(true);

            // 复制计算样式
            const computedStyle = window.getComputedStyle(originalPage);
            clonedPage.style.cssText = originalPage.style.cssText;

            // 确保克隆的页面可见
            clonedPage.style.display = 'block';
            clonedPage.style.visibility = 'visible';
            clonedPage.style.position = 'relative';
            clonedPage.style.width = computedStyle.width || '100%';
            clonedPage.style.height = computedStyle.height || 'auto';

            // 添加分页（如果需要）
            if (i < count - 1) {
              clonedPage.style.pageBreakAfter = 'always';
              clonedPage.style.breakAfter = 'page';
            }

            this._printContainer.appendChild(clonedPage);
            actualCount++;
          } catch (err) {
            console.warn(`[BulkPrint] 复制第 ${pageIndex + 1} 页失败:`, err);
          }
        }
      }

      if (actualCount === 0) {
        throw new Error('未能复制任何页面到打印容器');
      }

      // 添加到页面并等待渲染
      document.body.appendChild(this._printContainer);

      // 等待样式应用完成
      await new Promise(resolve => {
        // 等待两帧确保渲染完成
        requestAnimationFrame(() => {
          requestAnimationFrame(resolve);
        });
      });
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
          // 确保容器存在
          if (!this._printContainer) {
            console.error('[BulkPrint] 打印容器不存在');
            resolve();
            return;
          }

          // 临时显示容器进行打印
          this._printContainer.style.visibility = 'visible';

          // 触发打印
          window.print();
          
          // 打印后恢复隐藏
          setTimeout(() => {
            if (this._printContainer) {
              this._printContainer.style.visibility = 'hidden';
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
      this._cleanupPrintContainer();

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
      const ua = navigator.userAgent.toLowerCase();

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