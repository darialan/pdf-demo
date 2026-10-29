import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: path.resolve(__dirname, 'src/lib/index.ts'),
      name: 'WebPDFPrinter',
      formats: ['es', 'cjs'],
      fileName: format => `index.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      // Third-party consumers provide their own html2canvas, jspdf, and react
      external: [
        'html2canvas',
        'jspdf',
        'react',
        'react-dom',
        'react/jsx-runtime',
      ],
      output: {
        globals: {
          html2canvas: 'html2canvas',
          jspdf: 'jsPDF',
          react: 'React',
          'react-dom': 'ReactDOM',
        },
      },
    },
  },
});
