import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  server: { proxy: { '/api': 'http://127.0.0.1:4317' }, host: '127.0.0.1', watch: { ignored: ['**/src-tauri/target/**', '**/src-tauri/resources/**'] } },
})
