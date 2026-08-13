import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  // fileParallelism отключён: интеграционные тесты пишут в один SQLite-файл (dev.db),
  // параллельные воркеры вызывали бы блокировки (SQLITE_BUSY). Тесты идут последовательно.
  test: { environment: 'jsdom', globals: true, fileParallelism: false },
  resolve: { alias: { '@': path.resolve(__dirname, './src') } },
})
