import { defineConfig, loadEnv } from 'vite'
import vue from '@vitejs/plugin-vue'
import path from 'path'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  return {
    plugins: [vue()],
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src')
      }
    },
    server: {
      host: '0.0.0.0',
      port: 20498,
      proxy: {
        '/api': {
          target: 'http://localhost:19498',
          changeOrigin: true
        },
        '/uploads': {
          target: 'http://localhost:19498',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir: 'dist',
      sourcemap: false
    }
  }
})
