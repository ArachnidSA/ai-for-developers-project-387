import assert from 'node:assert/strict'
import { test } from 'node:test'

import { classifyReason, usedAttempts } from './agent-budget.mjs'

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
  assert.equal(classifyReason({ ...base, allowed: false }), 'limit_exhausted')
  assert.equal(classifyReason({ ...base, setupOutcome: 'failure' }), 'infra')
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
