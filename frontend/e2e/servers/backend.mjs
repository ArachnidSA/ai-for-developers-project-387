// Обёртка webServer для Playwright: поднимает настоящий бэкенд на временной SQLite-БД.
//
// Перед стартом удаляет e2e.db, чтобы каждый прогон начинался с чистого хранилища:
// таблицы создаёт само приложение при старте (`init_db()` в lifespan, см. app/main.py).
// Файл БД лежит в backend/ и покрыт корневым .gitignore (`*.db`).
import { spawn } from 'node:child_process'
import { rmSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
// frontend/e2e/servers -> корень репозитория -> backend
const backendDir = resolve(here, '../../..', 'backend')
const databaseUrl = 'sqlite:///./e2e.db'

for (const suffix of ['', '-wal', '-shm']) {
  rmSync(resolve(backendDir, `e2e.db${suffix}`), { force: true })
}

const child = spawn(
  'uv',
  ['run', 'uvicorn', 'app.main:app', '--host', '127.0.0.1', '--port', '8000'],
  {
    cwd: backendDir,
    env: { ...process.env, DATABASE_URL: databaseUrl },
    stdio: 'inherit',
  },
)

for (const signal of ['SIGINT', 'SIGTERM']) {
  process.on(signal, () => child.kill(signal))
}
child.on('exit', (code, signal) => process.exit(code ?? (signal ? 1 : 0)))
