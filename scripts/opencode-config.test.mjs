import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

// CI использует OpenCode V1: права задаются ключом `permission` (ед. ч.), а
// `external_directory` по умолчанию `ask` — без явного allow прогон виснет на approve.
test('CI-конфиг OpenCode: external_directory разрешён в V1-синтаксисе', () => {
  const action = readFileSync(
    new URL('../.github/actions/opencode-setup/action.yml', import.meta.url),
    'utf8',
  )
  const match = action.match(/<<'JSON'\r?\n([\s\S]*?)\r?\n\s*JSON/)
  assert.ok(match, 'в opencode-setup должен быть heredoc с JSON-конфигом')

  const config = JSON.parse(match[1])
  assert.equal(config.permission?.external_directory, 'allow')
  assert.equal('permissions' in config, false, 'V2-ключ permissions не поддерживается CI (V1)')
  assert.equal('agents' in config, false, 'V1 использует ключ agent, а не agents')
})

// Проектный opencode.json читает тот же V1-клиент: агент аудита обязан быть в V1-форме, иначе
// `opencode github run` падает на загрузке конфига и ломает все агентские воркфлоу (это уже
// случилось с V2-формой при первом заходе — поймало авторевью, а не `check`).
test('проектный opencode.json: агент audit задан в V1-синтаксисе', () => {
  const config = JSON.parse(readFileSync(new URL('../opencode.json', import.meta.url), 'utf8'))

  assert.equal('agents' in config, false, 'V1 использует ключ agent, а не agents')
  assert.equal('permissions' in config, false, 'V1 использует ключ permission, а не permissions')

  const audit = config.agent?.audit
  assert.ok(audit, 'в opencode.json должен быть агент audit')
  assert.equal(audit.mode, 'primary', 'агент аудита — primary (его выбирает with.agent)')

  // Агент не меняет файлы, кроме своей сводки, и не запускает ничего, кроме gh issue / gh search.
  assert.equal(audit.permission?.edit?.['*'], 'deny')
  assert.equal(audit.permission?.edit?.['audit-summary.md'], 'allow')
  assert.equal(audit.permission?.bash?.['*'], 'deny')
  assert.equal(audit.permission?.bash?.['gh issue *'], 'allow')
  assert.equal(audit.permission?.bash?.['gh search *'], 'allow')
})
