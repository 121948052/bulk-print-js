import { defineConfig } from 'vite';
import { resolve } from 'path';
import { copyFileSync } from 'fs';

export default defineConfig({
  build: {
    lib: {
      entry: resolve(__dirname, 'src/index.js'),
      name: 'BulkPrint',
      fileName: (format) => `bulk-print.${format}.js`
    },
    rollupOptions: {
      external: [],
      output: {
        globals: {}
      }
    }
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