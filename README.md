# Batch Print Manager

A professional solution for handling large-scale printing tasks in web applications. Prevents browser memory overflow by intelligently splitting large print jobs into multiple batches.

## Installation

```bash
npm install bulk-print-js
```

## Usage

```javascript
import BulkPrint from 'bulk-print-js';

const printManager = new BulkPrint({
    batchSize: 50,
    autoMode: false,
    delay: 1000
});

// 事件监听
printManager
    .on('progress', (data) => {
        console.log(`打印进度: ${data.progress}%`);
    })
    .on('finish', (data) => {
        console.log(`打印完成! 共打印 ${data.printedPages} 页`);
    });

// 执行打印
await printManager.print({
    printElement: document.getElementById('print-area'),
    totalPages: 350,
    batchThreshold: 100
});
```

## API Documentation

# bulk-print-js

> 专业的大批量 Web 打印解决方案，解决内存溢出和性能卡顿问题

[![npm version](https://img.shields.io/npm/v/bulk-print-js.svg)](https://www.npmjs.com/package/bulk-print-js)
[![license](https://img.shields.io/npm/l/bulk-print-js.svg)](https://github.com/yourusername/bulk-print-js/blob/main/LICENSE)
[![downloads](https://img.shields.io/npm/dm/bulk-print-js.svg)](https://www.npmjs.com/package/bulk-print-js)

## 🎯 简介

`bulk-print-js` 是一个专业的 JavaScript 库，专门解决 Web 端大批量打印时的内存溢出和性能问题。通过智能分批处理技术，将大型打印任务分解为多个小型任务，确保系统稳定性和流畅的用户体验。

### 核心特性

- 🚀 **内存优化** - 防止大批量打印导致浏览器内存溢出
- ⚡ **智能分批** - 自动将大型文档拆分为可管理的小批次
- 🔧 **灵活配置** - 支持自动/手动模式，可定制批次大小和延迟
- 📊 **进度追踪** - 实时监控打印进度和状态
- 🛡️ **错误恢复** - 支持批次级别的错误隔离和恢复
- 🌐 **跨浏览器** - 兼容主流现代浏览器

## 📦 安装

```bash
npm install bulk-print-js
```

或直接通过 CDN 使用：

```html
<script src="https://cdn.jsdelivr.net/npm/bulk-print-js/dist/bulk-print.min.js"></script>
```

## 🚀 快速开始

### 基本用法

```javascript
import BulkPrint from 'bulk-print-js';

// 创建打印实例
const printer = new BulkPrint({
    batchSize: 50,
    autoMode: true
});

// 执行打印
await printer.print({
    printElement: document.getElementById('print-area'),
    totalPages: 300,
    batchThreshold: 100,
    directPrintCallback: () => {
        // 用户自定义的打印逻辑
        // 可以在这里处理隐藏元素、自定义样式等
        window.print();
    }
});
```

### 完整示例

```javascript
import BulkPrint from 'bulk-print-js';

const printer = new BulkPrint({
    batchSize: 100,
    delay: 1000
});

// 事件监听
printer
    .on('batchStart', (data) => {
        console.log(`开始第 ${data.batch} 批打印`);
    })
    .on('progress', (data) => {
        updateProgressBar(data.progress);
    })
    .on('finish', (data) => {
        alert(`打印完成！共 ${data.printedPages} 页`);
    });

// 执行打印
try {
    await printer.print({
        printElement: document.getElementById('print-area'),
        totalPages: 300,
        batchThreshold: 100,
        directPrintCallback: () => {
            // 用户自定义的打印逻辑
            // 可以在这里处理隐藏元素、自定义样式等
            window.print();
        }
    });
} catch (error) {
    console.error('打印失败:', error);
}
```

## 📖 API 文档

### 构造函数

```javascript
new BulkPrint(options)
```

**参数：**
- `options` {Object} - 配置选项
  - `batchSize` {number} - 每批页数，默认：`100`
  - `autoMode` {boolean} - 自动模式，默认：`false`
  - `delay` {number} - 批次间延迟(ms)，默认：`500`
  - `confirmEachBatch` {boolean} - 每批确认，默认：`true`
  - `pageSelector` {string} - 页面元素选择器，默认：`'.print-page'`

### 实例方法

#### `print(options)`
执行打印任务。

**参数：**
- `printElement` {HTMLElement} - 要打印的DOM元素
- `totalPages` {number} - 总页数
- `batchThreshold` {number} - 分批阈值，超过此值将分批打印，默认：`100`
- `directPrintCallback` {function} - 自定义打印回调函数，可选
执行打印任务。

```javascript
await printer.print({
    printElement: document.getElementById('content'),
    totalPages: 300,
    batchThreshold: 100,
    directPrintCallback: () => {
        // 用户自定义的打印逻辑
        // 可以在这里处理隐藏元素、自定义样式等
        window.print();
    }
});
```

#### `on(event, handler)`
监听打印事件。

```javascript
printer.on('progress', (data) => {
    console.log(`进度: ${data.progress}%`);
    console.log(`状态: ${data.status}`); // "processing" 或 "queued"
});
printer.on('finish', (data) => {
    console.log(data.message); // "所有打印任务已提交到打印队列"
    console.log(`状态: ${data.status}`); // "queued"
    console.log(`总页数: ${data.totalPages}`);
    console.log(`已提交打印: ${data.printedPages}页`);
    console.log(`总批次数: ${data.totalBatches}`);
});
```

支持的事件：
- `batchStart` - 批次开始
- `progress` - 进度更新
- `error` - 错误发生
- `finish` - 打印完成
- `cancel` - 用户取消打印
- `stopped` - 打印被停止

#### `stop()`
停止打印过程，返回是否成功停止。

```javascript
const wasStopped = printer.stop();
if (wasStopped) {
    console.log('打印已停止');
}
```

#### `getStatus()`
获取打印状态信息。

```javascript
const stats = printer.getStatus();
console.log(stats.printedPages); // 已打印页数
```

#### `off(event)`
移除事件监听器。

```javascript
printer.off('progress');
```

### 静态方法

#### `BulkPrint.detectBrowser()`
检测浏览器类型。

```javascript
const browser = BulkPrint.detectBrowser(); // 'Chrome', 'Firefox', etc.
```

#### `BulkPrint.getBrowserThreshold(browser)`
获取浏览器推荐阈值。

```javascript
const threshold = BulkPrint.getBrowserThreshold('Chrome'); // 150
```

#### `BulkPrint.create(options)`
创建 BulkPrint 实例的静态方法。

```javascript
const printer = BulkPrint.create({ batchSize: 50 });
```

## 🎪 使用示例

### React 集成

```jsx
import React, { useRef, useState } from 'react';
import BulkPrint from 'bulk-print-js';

function DocumentPrint() {
    const printRef = useRef();
    const [progress, setProgress] = useState(0);
    
    const handlePrint = async () => {
        const printer = new BulkPrint();
        
        printer.on('progress', (data) => {
            setProgress(data.progress);
        });
        
        await printer.print({
            printElement: printRef.current,
            totalPages: 200,
            directPrintCallback: () => {
                // 用户自定义的打印逻辑
                window.print();
            }
        });
    };
    
    return (
        <div>
            <div>打印进度: {progress}%</div>
            <button onClick={handlePrint}>开始打印</button>
            <div ref={printRef} style={{ display: 'none' }}>
                {/* 打印内容 */}
            </div>
        </div>
    );
}
```

### Vue 集成

```vue
<template>
    <div>
        <div>进度: {{ progress }}%</div>
        <button @click="startPrint">批量打印</button>
        <div ref="printContent" class="print-content">
            <!-- 打印内容 -->
        </div>
    </div>
</template>

<script>
import BulkPrint from 'bulk-print-js';

export default {
    data() {
        return {
            progress: 0,
            printer: null
        };
    },
    mounted() {
        this.printer = new BulkPrint();
        this.printer.on('progress', (data) => {
            this.progress = data.progress;
        });
    },
    methods: {
        async startPrint() {
            await this.printer.print({
                printElement: this.$refs.printContent,
                totalPages: 150,
                directPrintCallback: () => {
                    // 用户自定义的打印逻辑
                    window.print();
                }
            });
        }
    }
};
</script>
```

## 微前端支持

默认支持一层 Shadow DOM 查找。如果您的微前端架构需要更深层的查找，请使用自定义的 `findPages` 函数：

```javascript
const printer = new BulkPrint({
    pageSelector: '.custom-page'  // 自定义页面选择器
});

## ⚙️ HTML 结构要求

确保打印内容遵循以下结构：

```html
<div id="print-container">
    <div class="print-page">
        <!-- 页面 1 内容 -->
    </div>
    <div class="print-page">
        <!-- 页面 2 内容 -->
    </div>
    <!-- 更多页面... -->
</div>
```

## 🎨 配置选项

### 浏览器推荐阈值

| 浏览器 | 推荐阈值 | 说明 |
|--------|----------|------|
| Chrome | 150 页 | 内存管理最佳 |
| Firefox | 100 页 | 稍保守的阈值 |
| Safari | 80 页 | 内存限制较严格 |
| Edge | 120 页 | 基于 Chromium |
| IE | 50 页 | 旧版浏览器 |

### 性能调优建议

```javascript
// 高性能配置
const highPerfPrinter = new BulkPrint({
    batchSize: 80,
    autoMode: true,
    delay: 2000
});

// 用户友好配置
const userFriendlyPrinter = new BulkPrint({
    batchSize: 50,
    autoMode: false,
    confirmEachBatch: true,
    delay: 1000
});
```

## 🔧 故障排除

### 常见问题

**Q: 打印内容显示不全？**
A: 确保 CSS 中定义了正确的 `@media print` 样式。

**Q: 内存使用仍然很高？**
A: 尝试减小 `batchSize` 或使用 `BulkPrint.getBrowserThreshold()` 获取推荐值。

**Q: 如何自定义页面样式？**
A: 在打印容器的 CSS 中使用 `@media print` 查询：

```css
@media print {
    .print-page {
        page-break-after: always;
        margin: 0;
        padding: 0;
    }
}
```

## 📄 许可证

MIT © [Your Name]

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：
- [创建 Issue](https://github.com/yourusername/bulk-print-js/issues)
- 邮箱：121948052@qq.com

---

**立即开始使用 bulk-print-js，让大批量打印变得简单可靠！** 🖨️✨