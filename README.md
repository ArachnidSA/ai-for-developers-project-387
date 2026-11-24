# Календарь звонков (продолжение)

[![hexlet-check](https://github.com/ArachnidSA/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/ArachnidSA/ai-for-developers-project-387/actions)

Продолжение проекта «Запись на звонок» (Calendar): бэкенд на FastAPI (`backend/`, uv-проект,
Python 3.14) и фронтенд на React + Vite + TypeScript (`frontend/`) в одном репозитории.
Окружение разработки описывает [mise](https://mise.jdx.dev/): `mise.toml` фиксирует версии
инструментов, задачи и фоновые сервисы.

**Работающее приложение: <https://ai-for-developers-project-387-lnqe.onrender.com>**

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Структура

```
backend/           FastAPI-приложение (uv-проект)
frontend/          React + Vite + TypeScript
contract/          TypeSpec-контракт API (источник истины) и генерация SDK
docs/              ADR (docs/adr/) и документация агента (docs/agents/, docs/mcp-render.md)
version.txt        текущая версия пакета (обновляет release-please)
release-please-config.json  настройки релизов (release-please)
mise.toml          инструменты, задачи, демоны, хуки
hk.pkl             git-хуки (проверки перед коммитом)
.github/           CI (hexlet-check, ci, opencode, release-please)
skills-lock.json   версии скилов coding-агентов (см. «Скилы агента»)
```

## Быстрый старт

```sh
mise install          # поставит python/uv/node/hk/pitchfork и зависимости проекта
mise run check:fast   # линтер + проверка типов + тесты (то же гоняет git-хук pre-commit)
mise run check        # полная проверка: check:fast + дрейф кодогенерации + браузерный E2E
mise dev              # поднять бэкенд (:8000) и фронт (:5173) как фоновые демоны
mise daemons status   # состояние сервисов
```

## Задачи

| Команда | Что делает |
|---|---|
| `mise run install` | `uv sync` (бэкенд) + `npm ci` (фронт) |
| `mise run gen` | сгенерировать OpenAPI и клиентский SDK из TypeSpec (`contract/`) |
| `mise run contract` | `gen` + проверка, что сгенерированные артефакты не разошлись с закоммиченными |
| `mise run lint` | `ruff` (бэкенд) и `oxlint` (фронт) |
| `mise run typecheck` | `mypy` (Python) и `tsc` (TypeScript) |
| `mise run test` | тесты: `pytest` (бэкенд) и `vitest` (фронт) |
| `mise run e2e` | браузерный E2E-сценарий гостя: Playwright сам поднимает бэкенд и фронт |
| `mise run check:fast` | лёгкая проверка `lint → typecheck → test` — её гоняет git-хук pre-commit |
| `mise run check` | полная проверка: `check:fast` + `contract` + `e2e` — то же гоняет CI |
| `mise run docker:build` | собрать Docker-образ приложения (корневой `Dockerfile`) |
| `mise run docker:smoke` | собрать образ, поднять контейнер на свободном порту и прогнать сценарий (SPA, API, запись, `409`) |
| `mise dev` | бэкенд и фронт как демоны |

## Разработка

- Бэкенд: http://127.0.0.1:8000 (Swagger на `/docs`). Роуты под `/api`: `GET /healthcheck`,
  `GET`/`POST /event-types`, `PATCH`/`DELETE /event-types/{id}`, `POST /event-types/{id}/archive`,
  `GET /event-types/{id}/slots`, `GET`/`POST /bookings`, `DELETE /bookings/{id}`. Контракт —
  TypeSpec в `contract/`, клиентский SDK генерируется командой `mise run gen` (см.
  `contract/README.md`).
- Фронтенд: http://127.0.0.1:5173; запросы к `/api/*` проксируются на бэкенд
  (`frontend/vite.config.ts`), поэтому CORS не нужен.

Запуск по отдельности:

```sh
cd backend  && uv run fastapi dev app/main.py
cd frontend && npm run dev
```

## Деплой (Render)

Публичная ссылка: **<https://ai-for-developers-project-387-lnqe.onrender.com>**

Приложение упаковано в один Docker-образ из корневого [`Dockerfile`](Dockerfile): стадия на
Node собирает SPA, python-стадия ставит зависимости бэкенда и отдаёт статику вместе с `/api`
одним процессом FastAPI. Контейнер стартует без ручных команд и слушает `0.0.0.0` и порт из
переменной `PORT` (по умолчанию 8000) — эту переменную Render подставляет при деплое.

- **Сервис:** Render Web Service, Environment Docker, тариф Free, регион Frankfurt,
  health check `/api/healthcheck`, авто-деплой при push в ветку `main` (для этого к репозиторию
  подключено Render-приложение).
- Локально образ собирается и проверяется задачами `mise run docker:build` и
  `mise run docker:smoke`.
- Справочное описание сервиса — в [`render.yaml`](render.yaml). Живой сервис создан через
  MCP-сервер Render (`create_web_service`), который `render.yaml` не читает.

### Хранение данных

Хранилище — SQLite-файл **внутри контейнера** (`DATABASE_URL=sqlite:////app/data/calendar.db`).
**Данные сбрасываются** при пересоздании контейнера и при редеплое: внешнего тома у сервиса нет,
поэтому после пересборки каталог пуст, а типы событий и записи приходится заводить заново. Для
сохранения между деплоями нужен внешний том или управляемая БД — сейчас этого нет сознательно,
см. [`docs/adr/0006-ephemeral-storage-on-hosting.md`](docs/adr/0006-ephemeral-storage-on-hosting.md).

### Подключение MCP-сервера Render

Проектный [`opencode.json`](opencode.json) подключает hosted MCP-сервер Render без секретов: в
конфиге только ссылка на источник ключа, а само значение лежит вне репозитория (`render-api-key`
закрыт `.gitignore` и `.dockerignore`). Порядок подключения, получение ключа и альтернативы
описаны в [`docs/mcp-render.md`](docs/mcp-render.md).

## E2E (Playwright)

`mise run e2e` прогоняет браузерный сценарий гостя (выбор типа → календарь → запись →
подтверждение) на **настоящих** серверах: Playwright сам поднимает FastAPI (`127.0.0.1:8000`,
временная БД `backend/e2e.db`) и Vite (`127.0.0.1:5173`). API бронирования не подменяется.
Перед первым запуском поставь браузер Chromium:

```sh
npx --prefix frontend playwright install chromium   # в CI: npx playwright install --with-deps chromium
```

## Скилы агента

Скилы для coding-агентов ([mattpocock/skills](https://github.com/mattpocock/skills))
устанавливаются в `.agents/skills/` (каталог в `.gitignore`), а их версии фиксирует
**`skills-lock.json`** — он коммитится и является источником истины: в нём записаны
коммит-источник и хеш содержимого каждого скила. Требуется Node 22.20+ — из `mise` он уже доступен.

```sh
npx skills@latest install   # восстановить скилы из skills-lock.json (после клона)
npx skills@latest update -p # обновить проектные скилы до новых версий
npx skills@latest list      # что установлено и не разошлось ли с lock
npx skills@latest add mattpocock/skills   # доставить скилы, которых ещё нет
```

После `update` или `add` закоммить `skills-lock.json`. Правки файлов внутри `.agents/skills/`
в коммит не попадут и будут перезаписаны при следующем `install`.

OpenCode видит скилы из `.agents/skills/` автоматически. Чтобы вызвать конкретный, упомяните его
в промпте как `@<id>`, например `@code-review` или `@tdd` — id совпадает с именем каталога скила.

## CI

`.github/workflows/ci.yml` на каждый push запускает `mise run check` — тот же полный набор, что и
локально: `check:fast` (lint, typecheck, test), `contract` (дрейф кодогенерации) и `e2e`
(браузерный сценарий). Перед проверками CI ставит браузер:
`npx playwright install --with-deps chromium`.
`.github/workflows/hexlet-check.yml` — проверки курса Hexlet (не редактируется).
`.github/workflows/opencode.yml` — запуск агента OpenCode по упоминанию в комментарии; см.
[ниже](#агент-opencode-по-комментарию-opencodeyml).
`.github/workflows/opencode-triage.yml` — автотриаж новых обращений; см.
[ниже](#автотриаж-новых-обращений-opencode-triageyml).
`.github/workflows/opencode-review.yml` — авторевью pull request по критериям `REVIEW.md`; см.
[ниже](#авторевью-pull-request-opencode-reviewyml).

### Агент OpenCode по комментарию (`opencode.yml`)

Воркфлоу `.github/workflows/opencode.yml` запускает агента OpenCode прямо в раннере GitHub
Actions — без локального запуска и без отдельного токена.

- **Событие:** `issue_comment` и `pull_request_review_comment` типа `created` — любой новый
  комментарий к issue/PR или к строке кода в PR (вкладка *Files*).
- **Слова-триггеры (mentions):** `/oc` и `/opencode`, регистронезависимо. Заданы явно: в
  `with.mentions` воркфлоу и в условии `if` джобы. Ран стартует, только если комментарий
  содержит одно из них.
- **Модель:** `provod/deepseek-v4.1-flash` через провайдера provod.ai; ключ — из секрета
  репозитория `PROVOD_API_KEY`.
- **Назначение:** по упоминанию агент читает контекст (тело issue/PR, при комментарии к строке —
  файл, строки и дифф) и выполняет просьбу: объясняет, отвечает, вносит правку или делает
  ревью.
- **Результаты:** ответный комментарий агента (`opencode-agent[bot]`) в issue/PR; если агент
  менял файлы — новая ветка и pull request с изменениями; ход и логи видны в Actions.

Доступ выдаёт установленное OpenCode-приложение (`github.com/apps/opencode-agent`): воркфлоу
обменивает OIDC-токен (`id-token: write`) на токен установки приложения, поэтому отдельные
`GITHUB_TOKEN`-права или PAT не нужны. Ран запускают только авторы с ролью
`OWNER`/`MEMBER`/`COLLABORATOR`; у джобы есть `timeout-minutes: 30` и `concurrency` по номеру
issue/PR. Примеры: `/oc объясни этот issue`, `/opencode добавь тесты`.

### Автотриаж новых обращений (`opencode-triage.yml`)

Воркфлоу `.github/workflows/opencode-triage.yml` сам разбирает каждое новое обращение — без
упоминания `/oc` в комментарии.

- **Событие:** `issues` типа `opened` (срабатывает только на issues, не на PR).
- **Фильтры (кого пропускаем):** автотриаж не запускается для обращений от ботов
  (`github.event.issue.user.type == 'Bot'`) и для уже размеченных обращений — с метками
  `ready-for-agent`, `ready-for-human`, `needs-triage`, `needs-info`, `wontfix`. Благодаря
  этому **готовые тикеты**, которые создаёт `to-tickets` (автор — `opencode-agent`, метка
  `ready-for-agent`), остаются нетронутыми.
- **Права:** `id-token: write` и `contents: read` — как у `opencode.yml`; доступ выдаёт
  установленное приложение `opencode-agent`, отдельный токен не нужен.
- **Ограничения:** `agent: plan` — агент не редактирует код и не открывает PR;
  `timeout-minutes: 15`; `concurrency` по номеру issue.
- **Результат:** агент читает `.agents/skills/triage/SKILL.md`, делает разбор (одна категория
  `bug`/`enhancement`, один state, redundancy-проверка по коду) и оставляет **один комментарий**
  с рекомендацией и, при необходимости, уточняющими вопросами. Метки он не применяет — их ставит
  мейнтейнер по рекомендации.

### Авторевью pull request (`opencode-review.yml`)

Воркфлоу `.github/workflows/opencode-review.yml` автоматически ревьюит каждый PR по критериям из
`REVIEW.md`.

- **Событие:** `pull_request` типов `opened`, `synchronize`, `reopened`, `ready_for_review`;
  черновики пропускаются.
- **Критерии:** `REVIEW.md` в корне — что проверять (корректность, тесты, контракт, конвенции,
  безопасность, scope, читаемость) и как расставлять уровни Blocker / Should-fix / Nit.
- **Права:** `contents: read`, `issues: write`, `pull-requests: write` через `GITHUB_TOKEN`,
  намеренно **без** `id-token: write`: на `pull_request` джоба исполняет код из head-ревизии PR, а
  ограниченный токен не позволяет обменять OIDC на токен приложения `opencode-agent`.
- **Ограничения:** `agent: plan` — агент не редактирует код, не одобряет и не мержит PR;
  `timeout-minutes: 20`. PR из форков пропускаются: GitHub не передаёт таким прогонам секреты,
  и ревью упало бы вместо комментария. На `pull_request` воркфлоу и локальный composite action
  берутся из head-ревизии PR — это осознанная граница доверия: ветки заводят только участники с
  правом записи, форки отсечены, а контент PR трактуется как данные (защита от prompt-injection),
  не как инструкции.
- **Устаревшее ревью отменяется:** `concurrency` по номеру PR с `cancel-in-progress: true` —
  новый push отменяет прогон по старой ревизии.
- **Результат:** один комментарий к PR с находками по файлам и итогом по уровням.

**Шаблон PR** — `.github/PULL_REQUEST_TEMPLATE.md`: разделы «Что и зачем», «Тип изменения»,
«Проверки», «Риск», «Откат».

**Общая подготовка.** Шаги, общие для всех трёх воркфлоу (`opencode.yml`,
`opencode-triage.yml`, `opencode-review.yml`), вынесены в composite action
`.github/actions/opencode-setup`: пустой `render-api-key` для проектного конфига, объявление
провайдера provod.ai в глобальном конфиге и восстановление скилов из `skills-lock.json`.

## Релизы

Релизы ведёт [release-please](https://github.com/googleapis/release-please) по Conventional
Commits. При push в `main` воркфлоу `.github/workflows/release-please.yml` открывает или
обновляет release-PR: он подставляет следующую версию в `version.txt` и добавляет запись в
`CHANGELOG.md`. Слияние этого PR создаёт git-тег и GitHub Release. Настройки — манифестные, в
корне: `release-please-config.json` (тип `simple`, секции changelog) и
`.release-please-manifest.json` (текущая версия пакета `.`).

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
