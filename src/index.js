// bulk-print.js
(function (global, factory) {
  typeof exports === 'object' && typeof module !== 'undefined' ? module.exports = factory() :
  typeof define === 'function' && define.amd ? define(factory) :
  (global = typeof globalThis !== 'undefined' ? globalThis : global || self, global.BulkPrint = factory());
})(this, (function () {
  'use strict';
    class BulkPrint {
    constructor(options = {}) {
      this.options = {
        pageSelector: options.pageSelector || '.print-page',
        threshold: options.threshold || 100,
        batchSize: options.batchSize
      };

      this.reset();
      this._listeners = {}; 
    }

    // 新增：订阅事件
    on(eventName, callback) {
      if (!this._listeners[eventName]) {
        this._listeners[eventName] = [];
      }
      this._listeners[eventName].push(callback);
      return this; // 支持链式调用
    }

    // 新增：取消订阅
    off(eventName, callback) {
      if (!this._listeners[eventName]) return;
      if (callback) {
        const index = this._listeners[eventName].indexOf(callback);
        if (index > -1) this._listeners[eventName].splice(index, 1);
      } else {
        // 如果不传入callback，则移除该事件的所有监听器
        this._listeners[eventName] = [];
      }
      return this;
    }

    // 新增：内部触发事件
    _emit(eventName, data) {
      if (!this._listeners[eventName]) return;
      // 异步触发，避免阻塞主流程
      setTimeout(() => {
        this._listeners[eventName].forEach(callback => {
          try {
            callback({ ...data, type: eventName }); // 将事件类型注入数据
          } catch (err) {
            console.error(`[BulkPrint] 事件处理错误 (${eventName}):`, err);
          }
        });
      }, 0);
    }

    reset() {
      this.isPrinting = false;

      // 重置任务状态变量
      this.currentBatch = 0;
      this.totalBatches = 0;
      this.totalPages = 0;

      this.cleanup();
    }

    cleanup() {
      // 清理所有临时iframe
      document.querySelectorAll('iframe[data-bulk-print]').forEach(iframe => {
        iframe.remove();
      });
    }

    async print({ element, totalPages }) {
      if (!element || !totalPages) {
        throw new Error('需要 element 和 totalPages 参数');
      }

      if (this.isPrinting) {
        throw new Error('打印任务正在进行中');
      }

      this.reset();

      this.isPrinting = true;
      this.totalPages = totalPages;

      try {
        const pages = Array.from(element.querySelectorAll(this.options.pageSelector));

        if (pages.length === 0) {
          throw new Error('未找到打印页面');
        }

        // 智能选择打印策略
        if (totalPages <= this.options.threshold) {
          await this.printAllOnce(pages);
        } else {
          await this.printInBatches(pages, totalPages);
        }

        return { success: true, pages: totalPages };

      } finally {
        this.isPrinting = false;
        this.cleanup();
      }
    }

    // 直接打印（少量页面）
    async printAllOnce(pages) {
      const iframe = await this.createIframe(pages, 0, pages.length);
      await this.printIframe(iframe);
      iframe.remove();
    }

    // 优化打印（大量页面）
    async printInBatches(pages, totalPages) {
      // 计算实际批次大小（根据内存优化）
      const actualBatchSize = this.options.batchSize || this.calculateBatchSize(totalPages);
      this.totalBatches = Math.ceil(totalPages / actualBatchSize);

      console.log(`📄 批量打印: ${totalPages}页, ${actualBatchSize}页/批, 共${this.totalBatches}批`);

      this._emit('start', {
        totalPages,
        totalBatches: this.totalBatches,
        batchSize: actualBatchSize
      });

      // 分批打印
      for (let i = 0; i < pages.length && this.isPrinting; i += actualBatchSize) {
        const batchEnd = Math.min(i + actualBatchSize, pages.length);
        const batch = pages.slice(i, batchEnd);

        this.currentBatch++;

        // 触发每个批次开始的事件
        this._emit('batchStart', {
          batch: this.currentBatch,
          totalBatches: this.totalBatches,
          pagesInBatch: batch.length,
          startPage: i + 1
        });

        console.log(`⏳ 打印第 ${this.currentBatch}/${this.totalBatches} 批 (${batch.length}页)`);

        // 创建并打印当前批次
        const iframe = await this.createIframe(batch, i, batch.length);
        await this.printIframe(iframe);

        // 触发每个批次结束的事件
        this._emit('batchComplete', {
          batch: this.currentBatch,
          totalBatches: this.totalBatches,
          pagesInBatch: batch.length
        });

        // 立即清理
        iframe.remove();

        // 批次间智能等待（第一批等久一点，后续短一点）
        if (batchEnd < pages.length) {
          const delay = this.currentBatch === 1 ? 5000 : 3000; // 5秒/3秒
          console.log(`⏰ 等待 ${delay/1000}秒...`);
          await new Promise(r => setTimeout(r, delay));
        }
      }
    }

    calculateBatchSize(totalPages) {
      // 简化的智能算法：每批100页，最多不超过15批
      const targetBatches = Math.max(5, Math.min(15, Math.ceil(totalPages / 100)));
      let batchSize = Math.ceil(totalPages / targetBatches);

      // 根据浏览器能力调整
      const isChrome = navigator.userAgent.includes('Chrome');
      const maxSafeSize = isChrome ? 150 : 100;

      // 确保在合理范围内
      return Math.max(20, Math.min(maxSafeSize, batchSize));
    }

    createIframe(pages, startIndex, count) {
      return new Promise((resolve, reject) => {
        const iframe = document.createElement('iframe');
        iframe.setAttribute('data-bulk-print', 'true');
        iframe.style.cssText = `
          position: fixed;
          width: 0;
          height: 0;
          border: 0;
          opacity: 0;
          pointer-events: none;
        `;
        document.body.appendChild(iframe);

        // 等待iframe加载完成
        iframe.onload = () => {
            try {
            const doc = iframe.contentDocument;
            const criticalStyles = this.extractCriticalStyles();

            // 1. 构建完整的HTML字符串
            const content = pages.map((page, index) => {
              const clone = page.cloneNode(true);
              clone.querySelectorAll('script, style[media="screen"], link[rel="stylesheet"][media="screen"], .no-print, [onclick], [onload]').forEach(el => el.remove());
              // 移除内联样式，统一使用CSS控制分页
              return `<div class="print-page">${clone.innerHTML}</div>`;
            }).join('');

            // 2. 使用innerHTML一次性设置整个文档内容
            doc.open();
            doc.write(`
              <!DOCTYPE html>
              <html>
              <head>
                <meta charset="UTF-8">
                <style>
                  @page { margin: 0.5in; size: auto; }
                  @media print {
                    body { margin: 0; padding: 0; -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
                    .print-page { page-break-after: always; break-after: page; }
                    .print-page:last-child { page-break-after: auto; }
                  }
                  body { font-family: Arial, sans-serif; line-height: 1.5; }
                  .print-page { display: block !important; visibility: visible !important; opacity: 1 !important; }
                  * { box-sizing: border-box; }
                  img { max-width: 100%; height: auto; }
                  table { border-collapse: collapse; width: 100%; }
                  .print-page { page-break-inside: avoid; }
                  ${criticalStyles}
                </style>
              </head>
              <body>
                ${content}
              </body>
              </html>
            `);
            doc.close();
            resolve(iframe);
          } catch (error) {
              reject(error);
          }
        };

        // 设置src以确保onload事件触发，可以是一个空白页面
        iframe.onerror = () => reject(new Error('iframe 加载失败'));
        iframe.src = 'about:blank';
      });
    }

    // 提取关键样式（避免跨域问题）
    extractCriticalStyles() {
      let styles = '';

      try {
        const styleTags = document.querySelectorAll('style');
        styleTags.forEach(style => {
          if (!style.media || style.media.includes('print') || style.media === 'all') {
            styles += style.textContent + '\n';
          }
        });

        styles += `
          * { box-sizing: border-box; }
          img { max-width: 100%; height: auto; }
          table { border-collapse: collapse; width: 100%; }
          .print-page { page-break-inside: avoid; }
        `;
      } catch (error) {
        console.warn('提取样式失败，使用基础样式:', error);
      }

      return styles;
    }

    async printIframe(iframe) {
      return new Promise((resolve) => {
        const win = iframe.contentWindow;

        // 等待iframe完全加载
        const waitForLoad = () => {
          if (iframe.contentDocument.readyState === 'complete') {
            setTimeout(() => {
              try {
                win.focus();
                win.print();

                // 使用更智能的完成检测
                this.waitForPrintCompletion(iframe, resolve);

              } catch (error) {
                console.warn('打印出错:', error);
                resolve();
              }
            }, 100);
          } else {
            setTimeout(waitForLoad, 100);
          }
        };

        waitForLoad();
      });
    }

    // 等待打印完成（改进版）
    waitForPrintCompletion(iframe, resolve) {
      const win = iframe.contentWindow;

      if (win.matchMedia) {
        const mediaQueryList = win.matchMedia('print');
        let handlerCalled = false;

        const handler = (mql) => {
          if (!mql.matches && !handlerCalled) {
            handlerCalled = true;
            mediaQueryList.removeListener(handler);
            setTimeout(resolve, 500);
          }
        };

        mediaQueryList.addListener(handler);

        // 超时保护（8秒）
        setTimeout(() => {
          if (!handlerCalled) {
            mediaQueryList.removeListener(handler);
            resolve();
          }
        }, 8000);
      } else {
        setTimeout(resolve, 3000);
      }
    }

    cancel() {
      const wasPrinting = this.isPrinting;
      this.isPrinting = false;
      this.cleanup();
      if (wasPrinting) {
        // 触发‘cancel’事件，并附带有用信息
        this._emit('cancel', {
          message: '打印任务已被用户取消',
          printedPages: this.currentBatch * (this.options.batchSize || this.calculateBatchSize(this.totalPages)),
          totalPages: this.totalPages,
          currentBatch: this.currentBatch,
          totalBatches: this.totalBatches
        });
      }
      return wasPrinting;
    }

    // 获取状态
    getStatus() {
      return {
        isPrinting: this.isPrinting,
        currentBatch: this.currentBatch,
        totalBatches: this.totalBatches,
        totalPages: this.totalPages,
        progress: this.totalPages ? Math.round((this.currentBatch / this.totalBatches) * 100) : 0
      };
    }
  }

  BulkPrint.create = (options) => new BulkPrint(options);

  return BulkPrint;
}));