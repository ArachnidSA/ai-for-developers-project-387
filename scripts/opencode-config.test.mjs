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
