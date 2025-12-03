# bulk-print-js

> 专业的大批量 Web 打印解决方案，解决内存溢出和性能卡顿问题

[![npm version](https://img.shields.io/npm/v/bulk-print-js.svg)](https://www.npmjs.com/package/bulk-print-js)
[![license](https://img.shields.io/npm/l/bulk-print-js.svg)](https://github.com/121948052/bulk-print-js/blob/master/LICENSE)
[![downloads](https://img.shields.io/npm/dm/bulk-print-js.svg)](https://www.npmjs.com/package/bulk-print-js)

## 🎯 简介

`bulk-print-js` 是一个专业的 JavaScript 库，专门解决 Web 端大批量打印时的内存溢出和性能问题。通过智能分批处理技术，将大型打印任务分解为多个小型任务，确保系统稳定性和流畅的用户体验。

### 核心特性

- 🚀 **内存优化** - 防止大批量打印导致浏览器内存溢出
- ⚡ **智能分批** - 超过设定阈值自动分批次打印，批次大小智能优化
- 🎪 **事件驱动** - 提供 `start`, `batchStart`, `batchComplete`, `cancel` 事件，便于构建UI交互
- 🛡️ **沙箱隔离** - 在独立 `iframe` 中打印，样式隔离，不影响主页面。

## 📦 安装

```bash
npm install bulk-print-js
```

或直接通过 CDN 使用：

```html
<script src="https://cdn.jsdelivr.net/npm/bulk-print-js/dist/bulk-print.min.js"></script>
```

## 🚀 快速开始

```javascript
import BulkPrint from 'bulk-print-js';

// 1. 创建实例
const printer = BulkPrint.create({
  pageSelector: '.print-page', // 可选，默认 '.print-page'
  threshold: 100,              // 可选，默认 100
  batchSize: 80                // 可选，不设置则智能计算
});

// 2. 订阅事件（可选）
printer
  .on('start', (e) => console.log(`开始: 共${e.totalPages}页，${e.totalBatches}批`))
  .on('batchStart', (e) => console.log(`批次 ${e.batch}/${e.totalBatches} 开始`))
  .on('cancel', (e) => console.warn(`已取消: ${e.message}`));

// 3. 执行打印
try {
  const result = await printer.print({
    element: document.getElementById('content'), // 页面容器
    totalPages: 528                             // 总页数
  });
  console.log('打印完成', result);
} catch (error) {
  console.error('打印失败', error);
}
```

## 配置选项

| 参数 | 类型 | 默认值 | 说明 |
| :--- | :--- | :--- | :--- |
| `pageSelector` | `string` | `'.print-page'` | 页面元素的选择器 |
| `threshold` | `number` | `100` | 触发自动分批的页数阈值 |
| `batchSize` | `number` | `undefined` | 自定义每批页数（不设置则智能计算） |

## 事件说明

| 事件名 | 触发时机 | 数据示例 |
| :--- | :--- | :--- |
| `start` | 开始分批打印时 | `{type: 'start', totalPages, totalBatches, batchSize}` |
| `batchStart` | 每个批次开始时 | `{type: 'batchStart', batch, totalBatches, pagesInBatch, startPage}` |
| `batchComplete` | 每个批次打印完成后 | `{type: 'batchComplete', batch, totalBatches, pagesInBatch}` |
| `cancel` | 任务被取消时 | `{type: 'cancel', message, printedPages, totalPages, currentBatch, totalBatches}` |

> **注意**：所有事件数据都会自动注入 `type` 属性，标识事件类型。

## API 参考

### `print({ element, totalPages })`
启动打印任务。
*   `element` (必填): DOM容器元素
*   `totalPages` (必填): 整数，总页数

**返回值**：`{ success: boolean, pages: number }`

### `cancel()`
取消当前打印任务。返回 `Boolean`，表示是否成功取消了一个进行中的任务。触发 `cancel` 事件。

### `getStatus()`
获取当前状态快照。返回 `{isPrinting, currentBatch, totalBatches, totalPages, progress}`。

### `reset()`
重置打印状态，清理所有状态变量。

### `cleanup()`
清理所有临时创建的 iframe 元素。

### `on(eventName, callback)` / `off(eventName, callback)`
订阅/取消订阅事件。支持链式调用。

### `BulkPrint.create(options)`
静态方法，创建 BulkPrint 实例的便捷方法。
```javascript
const printer = BulkPrint.create({ pageSelector: '.my-page' });
```

## 常见问题

**Q: 打印样式和网页不一致？**
A: 插件会提取页面中的样式，但复杂样式建议内联或确保样式标签的 `media` 属性包含 `print`。

**Q: 如何处理超大规模（如1000+页）打印？**
A: 插件会自动优化。对于极大量数据，建议在业务层拆分成多个独立打印任务。

**Q: 打印对话框导致页面“卡住”？**
A: 这是浏览器原生行为。确保 `print()` 由用户操作（如点击按钮）直接触发。

## 📄 许可证

MIT © Van Zhang

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

## 📞 支持

如有问题，请通过以下方式联系：
- [创建 Issue](https://github.com/yourusername/bulk-print-js/issues)
- 邮箱：121948052@qq.com

---

**立即开始使用 bulk-print-js，让大批量打印变得简单可靠！** 🖨️✨