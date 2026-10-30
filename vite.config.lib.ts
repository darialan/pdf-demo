import path from 'path';
import { defineConfig } from 'vite';

export default defineConfig({
  publicDir: false,
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    sourcemap: true,
    lib: {
      entry: { index: path.resolve(__dirname, 'src/lib/index.ts'), react: path.resolve(__dirname, 'src/lib/react.ts') },
      name: 'WebPrinter',
      formats: ['es', 'cjs'],
      fileName: (format, entryName) => `${entryName}.${format === 'es' ? 'mjs' : 'cjs'}`,
    },
    rollupOptions: {
      // Runtime dependencies are installed automatically via dependencies.
      // Keep them external so consumers' bundlers can deduplicate them;
      // React remains a host-provided optional peer dependency.
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
