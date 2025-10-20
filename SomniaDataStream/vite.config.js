import { defineConfig } from 'vite'

export default defineConfig({
  server: {
    port: 3000,
    host: true
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          ethers: ['ethers']
        }
      }
    }
  },
  define: {
    global: 'globalThis',
    'process.env': {}
  }
})