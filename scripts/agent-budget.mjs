// Чистая логика бюджета агента: подсчёт попыток по истории Actions и классификация
// причины отчёта. Воркфлоу opencode.yml использует её через github-script, а тесты —
// напрямую. Держим здесь, чтобы единственная точка отказа счётчика была покрыта тестами.

/** Максимум запросов человека к агенту на одном PR. */
export const BUDGET_LIMIT = 3

/** Таймаут шага вызова модели в секундах. Должен совпадать с timeout-minutes шага. */
export const AGENT_TIMEOUT_SECONDS = 1500

/**
 * Сколько попыток агента уже израсходовано по прогонам с меткой `tag`.
 * Свой прогон исключается по `runId`, но учитываются его прошлые попытки (Re-run),
 * поэтому предел не зависит от того, успел ли текущий прогон попасть в API.
 */
export function usedAttempts(runs, tag, runId = null) {
  let used = 0
  for (const run of runs) {
    if (run.display_title !== tag) continue
    const attempts = run.run_attempt || 1
    used += run.id === runId ? attempts - 1 : attempts
  }
  return used
}

/**
 * Причина отчёта без вызова модели: `limit_exhausted` | `timeout` | `infra` |
 * `agent_failed`, либо `null`, если отчёт не нужен (успех).
 */
export function classifyReason({
  budgetOutcome,
  allowed,
  setupOutcome,
  modelOutcome,
  done,
  elapsed,
  timeout,
}) {
  // Любой нештатный исход шага бюджета — инфраструктура: доверять `allowed` нельзя.
  if (budgetOutcome !== 'success') return 'infra'
  if (allowed !== true) return 'limit_exhausted'
  if (setupOutcome === 'failure' || setupOutcome === 'cancelled') return 'infra'
  if (modelOutcome === 'failure' || modelOutcome === 'cancelled') {
    // Таймаут шага и падение дают один и тот же outcome; считаем таймаутом,
    // если вызов не завершился и время близко к пределу шага.
    return !done && elapsed >= timeout - 60 ? 'timeout' : 'agent_failed'
  }
  return null
}
