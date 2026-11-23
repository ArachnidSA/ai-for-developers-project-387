/// <reference types="vitest/config" />
import tailwindcss from '@tailwindcss/vite'
import react from '@vitejs/plugin-react'
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    // Алиас @/* -> src/*, чтобы импорты shadcn/ui (@/components, @/lib) разрешались.
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  server: {
    // Явно слушаем IPv4 127.0.0.1: иначе на Windows vite занимает только ::1,
    // и ни прокси, ни проверка готовности (TCP по 127.0.0.1) не срабатывают.
    host: '127.0.0.1',
    port: 5173,
    strictPort: true,
    proxy: {
      // В dev-режиме запросы к /api уходят на FastAPI, поэтому CORS не нужен.
      '/api': 'http://127.0.0.1:8000',
    },
  },
  test: {
    environment: 'jsdom',
    // Без глобалов vitest RTL не включает авто-cleanup — чистим DOM между тестами вручную.
    setupFiles: ['./src/test/setup.ts'],
    // Vitest запускает только юнит-тесты из src; Playwright-спеки живут в e2e/
    // и запускаются через `mise run e2e`.
    include: ['src/**/*.{test,spec}.{ts,tsx}'],
  },
})
