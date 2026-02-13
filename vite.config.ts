import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    rollupOptions: {
      external: ['html2pdf.js'],
      output: {
        globals: {
          'html2pdf.js': 'html2pdf'
        }
      }
    }
  }
})
