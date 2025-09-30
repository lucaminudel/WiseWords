import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [react()],
  define: {
    // Expose WISEWORDS_ENV to the browser
    'import.meta.env.WISEWORDS_ENV': JSON.stringify(process.env.WISEWORDS_ENV || 'local_dev'),
    // Fix for amazon-cognito-identity-js global object requirement
    global: 'globalThis'
  },
  server: {
    port: 3001,
  },
  build: {
    outDir: process.env.WISEWORDS_ENV === 'aws_prod' ? 'dist-prod' : 'dist',
    sourcemap: true
  }
})