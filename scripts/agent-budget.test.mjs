import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'

import { AGENT_TIMEOUT_SECONDS, BUDGET_LIMIT, classifyReason, usedAttempts } from './agent-budget.mjs'

test('usedAttempts: считает попытки по метке и исключает свой прогон', () => {
  const runs = [
    { id: 1, display_title: 'oc #27', run_attempt: 1 },
    { id: 2, display_title: 'oc #27', run_attempt: 1 },
    { id: 9, display_title: 'oc #5', run_attempt: 1 },
  ]
  assert.equal(usedAttempts(runs, 'oc #27'), 2)
  assert.equal(usedAttempts(runs, 'oc #27', 2), 1)
  assert.equal(usedAttempts(runs, 'oc #5'), 1)
  assert.equal(usedAttempts(runs, 'oc #999'), 0)
})

test('usedAttempts: Re-run текущего прогона расходует попытку', () => {
  const runs = [{ id: 2, display_title: 'oc #27', run_attempt: 2 }]
  assert.equal(usedAttempts(runs, 'oc #27', 2), 1)
})

test('classifyReason: успех — отчёт не нужен', () => {
  const base = {
    budgetOutcome: 'success',
    allowed: true,
    setupOutcome: 'success',
    modelOutcome: 'success',
    done: true,
    elapsed: 0,
    timeout: 1500,
  }
  assert.equal(classifyReason(base), null)
})

test('classifyReason: сбой бюджета и подготовки — infra, лимит — limit_exhausted', () => {
  const base = {
    budgetOutcome: 'success',
    allowed: true,
    setupOutcome: 'success',
    modelOutcome: 'success',
    done: true,
    elapsed: 0,
    timeout: 1500,
  }
  assert.equal(classifyReason({ ...base, budgetOutcome: 'failure' }), 'infra')
  assert.equal(classifyReason({ ...base, budgetOutcome: 'cancelled' }), 'infra')
  assert.equal(classifyReason({ ...base, allowed: false }), 'limit_exhausted')
  assert.equal(classifyReason({ ...base, setupOutcome: 'failure' }), 'infra')
})

test('AGENT_TIMEOUT_SECONDS согласован с timeout-minutes шага модели', () => {
  const workflow = readFileSync(
    new URL('../.github/workflows/opencode.yml', import.meta.url),
    'utf8',
  )
  const match = workflow.match(/id:\s*model\b[\s\S]*?timeout-minutes:\s*(\d+)/)
  assert.ok(match, 'в opencode.yml должен быть шаг модели с timeout-minutes')
  assert.equal(Number(match[1]) * 60, AGENT_TIMEOUT_SECONDS)
})

test('BUDGET_LIMIT положительный', () => {
  assert.ok(BUDGET_LIMIT > 0)
})

test('classifyReason: таймаут и сбой агента', () => {
  const base = {
    budgetOutcome: 'success',
    allowed: true,
    setupOutcome: 'success',
    modelOutcome: 'failure',
    done: false,
    elapsed: 100,
    timeout: 1500,
  }
  assert.equal(classifyReason(base), 'agent_failed')
  assert.equal(classifyReason({ ...base, elapsed: 1490 }), 'timeout')
  assert.equal(classifyReason({ ...base, modelOutcome: 'cancelled', elapsed: 1490 }), 'timeout')
})
