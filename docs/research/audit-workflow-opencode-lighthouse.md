# Исследование: воркфлоу аудита (OpenCode GitHub Action + Lighthouse CI + GitHub Actions)

Источник заказа — задача «GH-агент аудита по расписанию» (запись на звонок, продолжение).
Ниже — только первичные источники: исходники action'ов, официальная документация GitHub и
OpenCode, документация Lighthouse CI. Где источник не подтверждает утверждение — это явно
помечено как **пробел**.

Дата: 2026-11-25.

## Ссылки на источники

- OpenCode GitHub Action, `action.yml` (коммит `337fd144…`, ветка `dev`):
  <https://github.com/anomalyco/opencode/blob/dev/github/action.yml>
- OpenCode GitHub Action, `github/README.md`:
  <https://github.com/anomalyco/opencode/blob/dev/github/README.md>
- OpenCode — документация GitHub (V1):
  <https://opencode.ai/docs/github>
- OpenCode — Agents (V2, встроенные агенты и permissions):
  <https://opencode.ai/docs/agents/>
- Lighthouse CI Action (`treosh/lighthouse-ci-action`), README:
  <https://github.com/treosh/lighthouse-ci-action>
- Lighthouse CI — Assertions (уровни `off` / `warn` / `error`):
  <https://github.com/GoogleChrome/lighthouse-ci/blob/master/docs/assertions.md>
- GitHub Actions — Events that trigger workflows (раздел `schedule`):
  <https://docs.github.com/en/actions/reference/workflows-and-actions/events-that-trigger-workflows>
- GitHub Actions — Triggering a workflow (relation `GITHUB_TOKEN` → runs, `workflow_dispatch` inputs):
  <https://docs.github.com/en/actions/how-tos/write-workflows/choose-when-workflows-run/trigger-a-workflow>
- GitHub Actions — Workflow commands (job summaries, `$GITHUB_STEP_SUMMARY`):
  <https://docs.github.com/en/actions/reference/workflow-commands-for-github-actions>
- GitHub Actions — Workflow syntax (`on.schedule`, `on.workflow_dispatch`, `concurrency`,
  `permissions`, `timeout-minutes`):
  <https://docs.github.com/en/actions/reference/workflows-and-actions/workflow-syntax>

---

## Вопрос 1 — входы `anomalyco/opencode/github@latest`

### 1.1. Точный список `with:`-входов

Из `action.yml` (коммит `337fd144…`):

| Вход | Required | Описание (цитата) |
| --- | --- | --- |
| `model` | **да** | `Model to use` |
| `agent` | нет | `Agent to use. Must be a primary agent. Falls back to default_agent from config or 'build' if not found.` |
| `share` | нет | `Share the opencode session (defaults to true for public repos)` |
| `prompt` | нет | `Custom prompt to override the default prompt` |
| `use_github_token` | нет, default `"false"` | `Use GITHUB_TOKEN directly instead of OpenCode App token exchange. When true, skips OIDC and uses the GITHUB_TOKEN env var.` |
| `mentions` | нет | `Comma-separated list of trigger phrases (case-insensitive). Defaults to '/opencode,/oc'` |
| `variant` | нет | `Model variant for provider-specific reasoning effort (e.g., high, max, minimal)` |
| `oidc_base_url` | нет | `Base URL for OIDC token exchange API. Only required when running a custom GitHub App install. Defaults to https://api.opencode.ai` |

Важно: действие **composite** — оно не содержит логики создания issue. Оно ставит CLI и запускает
`opencode github run`, передавая входы **переменными окружения** (`MODEL`, `AGENT`, `SHARE`,
`PROMPT`, `USE_GITHUB_TOKEN`, `MENTIONS`, `VARIANT`, `OIDC_BASE_URL`). То есть **входа «создать
issue» не существует**: issue создаёт сам агент инструментами.

### 1.2. Поддерживаемые события

Документация OpenCode (V1, `opencode.ai/docs/github`) перечисляет поддерживаемые события, включая
`schedule` и `workflow_dispatch`:

> `schedule` — Cron-based schedule. **Requires `prompt` input.** Output goes to logs and PRs
> (**no issue to comment on**).

> `workflow_dispatch` — Manual trigger from GitHub UI. **Requires `prompt` input.** Output goes to
> logs and PRs.

Следствие: при расписании/ручном запуске у агента **нет issue, куда комментировать** — вывод идёт
в логи прогона. Значит, «сохранить вывод агента» надо обеспечивать нам (например,
`$GITHUB_STEP_SUMMARY`), а не рассчитывать на авто-комментарий действия.

### 1.3. `prompt`

- Тип — строка; в документации всегда многострочный YAML-блок (`prompt: |`). Передаётся в
  окружение как `PROMPT`.
- Для `schedule`, `workflow_dispatch` и `issues` — **обязателен** (нет комментария, из которого
  можно взять инструкцию).

### 1.4. (а) Может ли `agent: build` создавать GitHub issue?

Прямой цитаты «`build` умеет создавать issue» в источниках **нет — это пробел**. Что подтверждено:

- У действия **нет входа** для создания issue (см. 1.1), значит создание делает сам агент
  инструментами (скорее всего `shell` → `gh`, либо встроенный GitHub-инструмент — механизм
  документацией не описан, **пробел**).
- Официальный пример расписания в документации прямо просит агента открыть issue:

  > `Review the codebase for any TODO comments and create a summary. If you find issues worth
  > addressing, open an issue to track them.`

- Про встроенные агенты (V2, `opencode.ai/docs/agents/`):
  - **Build** (`build`, primary) — агент по умолчанию: *«Tools and access outside the workspace are
    allowed by default»*.
  - **Plan** (`plan`, primary) — *«Explores and plans without editing normal project files… and
    shell commands remain permission-controlled»*.
  - Права — упорядоченный список правил `{ action, resource, effect }`, где `effect` ∈
    `allow|ask|deny`, а действия включают `shell`, `edit`, `subagent`, `read`/`glob`/`grep`,
    `webfetch`/`websearch`, `skill`.
- **Нет действия `bash`** в таблице permissions — команды идут через действие **`shell`**.
  (`permission.edit` управляет правками/записью файлов.)

Вывод: чтобы агент создал issue из расписания, нужен агент с доступом к `shell`, то есть
`build` (по умолчанию) либо **кастомный primary-агент** с `edit: deny` и разрешённым `shell`
(например, только `gh issue …`). `plan` в headless-раннере ненадёжен: `shell` там
«permission-controlled», а подтвердить разрешение в CI некому (**вывод, не цитата**).

### 1.5. (в) Рекомендуемый способ авторизации

Для задачи «прочитать отчёт и открыть issue» достаточно **`use_github_token: true`** с
`GITHUB_TOKEN`:

- Документация: в режиме `use_github_token` `id-token: write` **не нужен** (OIDC-обмен
  пропускается), токен передаётся через `env`, права выдаёт воркфлоу.
- Про расписание: *«With `use_github_token: true`, grant `contents: write` and
  `pull-requests: write` to create branches or PRs»* — но нам ветки/PR не нужны, поэтому
  достаточно `contents: read` + `issues: write`.
- В OIDC-режиме права берутся у **GitHub App** (шире и требует установленного приложения).
- Минимальные права под фактические операции: `contents: read` (checkout) + `issues: write`
  (поиск и создание issue).

### 1.6. (г) Автор issue, созданного ботом

- В режиме `use_github_token` действия идут от `GITHUB_TOKEN`, актор — **`github-actions[bot]`**
  (общее поведение GitHub для `GITHUB_TOKEN`).
- В OIDC-режиме — от установки приложения opencode, актор — бот приложения
  (**`opencode-agent[bot]`** — по README этого репозитория; upstream-документация имя бота
  **не называет — пробел**).
- Практический эффект: события, порождённые `GITHUB_TOKEN`, **не запускают** новые прогоны
  воркфлоу (исключения — `workflow_dispatch`/`repository_dispatch` и `pull_request` с
  approval). Значит issue, созданный аудитом, **не** запустит `opencode-triage` — петли нет.

---

## Вопрос 2 — Lighthouse CI

### 2.1. Входы/выходы `treosh/lighthouse-ci-action`

Из README действия:

- Аудит идёт **Lighthouse v12.6**, Chrome предустановлен в окружении раннера.
- Входы: `urls` (список по строкам), `uploadArtifacts` (default `false`) — сохраняет результаты
  **артефактами** (эквивалент `actions/upload-artifact`), `temporaryPublicStorage`,
  `budgetPath` (**валит сборку** при выходе за бюджет), `runs` (default `1`), `configPath`
  (файл `lighthouserc`), `serverBaseUrl`/`serverToken`.
- Выходы (используются как `steps.<id>.outputs.<name>`):
  - `resultsPath` — путь к папке `.lighthouseci` (например `/Users/lighthouse-ci-action/.lighthouseci`);
  - `links` — JSON `{ url: "<report.html>" }`;
  - `assertionResults` — JSON с результатами проверок;
  - `manifest` — JSON-массив: `{ url, isRepresentativeRun, htmlPath, jsonPath, summary: {
    performance, accessibility, "best-practices", seo, pwa } }`. ← **самый удобный для разбора
    агентом** (короткий, стабильный, только баллы по категориям).

### 2.2. Файлы отчёта

Внутри `.lighthouseci` лежат `*.report.html` и `*.report.json` (пути видны в `manifest` как
`htmlPath`/`jsonPath`). Отдельный JSON — `assertionResults`.

### 2.3. (б) Как прочитать артефакты внутри шага Actions

Чистый путь — **выходы шага** (`manifest`, `assertionResults`, `resultsPath`), а не парсинг
файлов вручную: их можно положить в `env`/файл и передать в промпт агента. Сырые
`*.report.json` — полный формат Lighthouse, тяжёлый для промпта.

### 2.4. (в) Как не валить джобу

Не использовать `budgetPath` (он валит сборку). Вместо этого задать проверки в `lighthouserc`
через `configPath` с уровнем **`warn`**:

> `warn` — The audit result will be checked, and the result will be printed to stderr, but failure
> will not [fail the build]. `error` — … exit Lighthouse CI with a [failure].

То есть `warn` (или `off`) даёт «предупреждение без падения».

### 2.5. (г) Альтернатива и формат

- `lhci autorun` с конфигом — та же функциональность; действие лишь оборачивает её в один шаг.
- Для передачи агенту предпочтителен **`manifest`** (баллы по категориям на URL); при
  необходимости — `assertionResults`.

---

## Вопрос 3 — GitHub Actions: `schedule` + `workflow_dispatch`

### 3.1. (а) Синтаксис `on:` с двумя событиями

Оба ключа в одном файле:

```yaml
on:
  schedule:
    - cron: '0 6 * * *'
  workflow_dispatch:
    inputs:
      # ...
```

Правило синтаксиса: если хотя бы у одного события есть параметры/`types`, у **всех** событий в
списке нужно ставить `:` (одноэлементное `on: push` vs `on: { push: … }` смешивать нельзя).

### 3.2. (б) `cron` — границы

- Формат — 5 полей POSIX-крона, время **UTC**.
- **Минимальный интервал — 5 минут** (`*/5 * * * *`); чаще нельзя.
- Расписание может **задерживаться** (в периоды высокой нагрузки), прогоны иногда пропускаются.
- В **публичном** репозитории запланированные воркфлоу **автоматически отключаются после 60
  дней без активности** репозитория (нужно включить заново вручную).
- `on.schedule` описан в Workspace syntax; раздел `schedule` в «Events that trigger workflows»
  подтверждает правило про 60 дней.

### 3.3. (в) Входы `workflow_dispatch` и их чтение

- Типы входа: `string` (по умолчанию), `boolean`, `choice` (+`options`), `number`, `environment`.
- Триггер приходит, **только если файл воркфлоу лежит в ветке по умолчанию** (`main`).
- Значения доступны в контекстах `inputs.<name>` и `github.event.inputs.<name>` (в `inputs`
  булево остаётся булевым; `choice` — строка).
- Ограничения: максимум **25** входов верхнего уровня; payload до **65 535** символов.

### 3.4. (г) `concurrency` и `timeout-minutes`

- `concurrency: { group: <строка>, cancel-in-progress: <bool> }` — гарантирует, что в группе
  выполняется не более одного прогона; `cancel-in-progress: false` не убивает текущий (в
  репозитории так сделано в `opencode.yml` и `opencode-triage.yml`).
- `timeout-minutes` задаётся на job (или шаг) и ограничивает время выполнения.
  (Точный текст — в Workflow syntax; в этом файле не перечитывался построчно.)

### 3.5. (д) Минимальные `permissions` и `$GITHUB_STEP_SUMMARY`

- Под операции «прочитать отчёт + создать issue»: `contents: read` + `issues: write`
  (`issues: write` покрывает и поиск, и создание). `id-token` не нужен в режиме
  `use_github_token`.
- `$GITHUB_STEP_SUMMARY` — **файл-переменная окружения**, отдельных прав не требует:
  `echo "…" >> $GITHUB_STEP_SUMMARY`. Он **свой для каждого шага**, изолирован между шагами,
  лимит **1 MiB** на шаг; превышение — ошибка выгрузки, но статус джобы не меняется.
- Дополнительно (важно для дедупликации по меткам): события, порождённые `GITHUB_TOKEN`, не
  создают новых прогонов воркфлоу (кроме `workflow_dispatch`/`repository_dispatch` и
  `pull_request` с approval).

---

## Пробелы (не выдумываем)

1. **Механизм создания issue агентом** не описан: не подтверждено, доступен ли агенту `gh` CLI
   или у него есть отдельный GitHub-инструмент. В документации есть только пример-промпт
   «open an issue». Проверять при реализации.
2. **Имя бота-автора** issue в OIDC-режиме upstream-документацией не названо
   (`opencode-agent[bot]` — наблюдение этого репозитория, не первоисточник).
3. **V1 против V2 в правах.** Установленный в CI CLI — OpenCode **V1** (проверено прогоном:
   `V2 permissions are not supported by OpenCode V1`). В V1 права задаются ключом `permission`
   (ед. ч.) и сгруппированы по инструментам: команды — `permission.bash`, правки файлов —
   `permission.edit`; агенты — под ключом `agent` (ед. ч.). В V2 это `permissions` (массив правил
   `action`/`resource`/`effect`), действие команд называется `shell`, а агенты — `agents`.
   Формулировка «`permission.edit`/`bash`» описывает именно **V1**; в V2 ей соответствует
   `edit`/`shell`.
4. **Точная patch-версия** `treosh/lighthouse-ci-action` в README не указана (примеры только
   мажором `@v12`); для фиксации версии брать полный тег/commit SHA из релизов.
5. **Построчный текст** `concurrency`/`timeout-minutes` в этом отчёте не перечитывался (взята
   общая семантика и практика репозитория).
