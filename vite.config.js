import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'BulkPrintJS',
      fileName: (format) => `bulk-print-js.${format}.js`
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    },
    target: ['es2015', 'chrome58', 'firefox57', 'safari11']
  },
  plugins: [
    {
      name: 'copy-types',
      closeBundle() {
        copyFileSync('src/index.d.ts', 'dist/index.d.ts');
        console.log('类型文件已复制到 dist 目录');
      }
    }
  ]
});