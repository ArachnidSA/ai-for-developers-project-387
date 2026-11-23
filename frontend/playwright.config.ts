import { defineConfig, devices } from '@playwright/test'
import { fileURLToPath } from 'node:url'

const frontendDir = fileURLToPath(new URL('.', import.meta.url))

// По умолчанию используем поставляемый Chromium (`npx playwright install chromium`).
// Если CDN недоступен (например, блокируется), можно прогнать на системном браузере:
//   PLAYWRIGHT_CHANNEL=msedge mise run e2e
const channel = process.env.PLAYWRIGHT_CHANNEL

// E2E поднимает настоящие бэкенд и фронтенд (webServer) — API бронирования
// не подменяется. Бэкенд стартует на временной SQLite-БД (см. e2e/servers/backend.mjs).
export default defineConfig({
  testDir: './e2e',
  // Тесты делят состояние сервера, поэтому идут строго по одному.
  fullyParallel: false,
  workers: 1,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    baseURL: 'http://127.0.0.1:5173',
    trace: 'on-first-retry',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], ...(channel ? { channel } : {}) },
    },
  ],
  webServer: [
    {
      command: 'node e2e/servers/backend.mjs',
      url: 'http://127.0.0.1:8000/api/healthcheck',
      cwd: frontendDir,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
    {
      // Vite слушает жёстко 127.0.0.1:5173 (strictPort) и проксирует /api на :8000.
      command: 'npm run dev',
      url: 'http://127.0.0.1:5173',
      cwd: frontendDir,
      reuseExistingServer: false,
      timeout: 120_000,
      stdout: 'pipe',
      stderr: 'pipe',
    },
  ],
})
