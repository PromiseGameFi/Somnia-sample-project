import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { nodePolyfills } from 'vite-plugin-node-polyfills'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    nodePolyfills({
      globals: {
        Buffer: true,
        global: true,
        process: true,
      },
      protocolImports: true,
    }),
  ],
  // Provide a global object for libraries expecting Node's global
  define: {
    global: {},
  },
  // Ensure CommonJS modules that mix ES imports are transformed (some SDK deps)
  build: {
    commonjsOptions: {
      transformMixedEsModules: true,
    },
  },
  // Map Node global to browser globalThis during dependency optimization
  optimizeDeps: {
    esbuildOptions: {
      define: {
        global: 'globalThis',
      },
    },
  },
})
