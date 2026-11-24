# AGENTS.md

## Общение

- Всегда отвечай пользователю **на русском языке**.

Репозиторий из двух приложений: бэкенд на FastAPI (`backend/`, `uv`-проект, Python 3.14) и
фронтенд на React/Vite/TS (`frontend/`). Инструменты, задачи и демоны описаны в `mise.toml`;
`README.md` объясняет их для людей. Этот файл описывает только то, в чём агент иначе ошибётся.

## Коммиты: Conventional Commits

Формат: `<type>(<scope>): <description>`.

- `type` — обязателен, только из списка: `feat`, `fix`, `docs`, `test`, `chore`,
  `refactor`, `ci`, `build`.
- `scope` — необязателен: `backend`, `frontend`, `ci`.
- `description` — по-русски, в императиве, со строчной буквы, без точки в конце,
  до ~72 символов.
- Тело и футеры необязательны; ломающее изменение помечай `!` (`feat(backend)!: ...`)
  или строкой `BREAKING CHANGE:`.
- Один коммит — одно логическое изменение.
- Коммит реализации ссылается на тикет, который он закрывает, например
  `feat: запись на свободный слот (#12)`. GitHub превращает номер в ссылку, и по
  истории видно, какой коммит какую задачу делал.

| Тип | Когда |
| --- | --- |
| feat | новая функциональность |
| fix | исправление бага |
| docs | только документация |
| test | тесты |
| chore | рутина: зависимости, конфиги, инструменты |
| refactor | рефакторинг без изменения поведения |
| ci | изменения в CI |
| build | система сборки и её зависимости |

Примеры:

    feat(backend): добавить роут healthcheck
    fix(frontend): привязать dev-сервер к 127.0.0.1
    chore: зафиксировать версии инструментов в mise.toml

## Команды

- Установка: `mise install` (postinstall-хук сам запускает задачу `install`).
- Быстрая проверка: `mise run check:fast` = **lint -> typecheck -> test**. Её выполняет
  git-хук pre-commit (`hk.pkl`): она не требует сети и генерации.
- Полная проверка: `mise run check` = **check:fast -> contract -> e2e**: то же плюс проверка
  дрейфа кодогенерации контракта и браузерный E2E на настоящих серверах. Её запускает CI
  (`ci.yml`); гоняй её для всей изменённой работы перед выкладкой (нужны свободные порты
  8000/5173 — E2E поднимает серверы сам).
- Отдельные задачи: `mise run lint`, `mise run typecheck`, `mise run test`, `mise run contract`,
  `mise run e2e` (у первых трёх есть подзадача `:backend` / `:frontend`), `mise run gen`
  (кодогенерация контракта), `mise run docker:build` и `mise run docker:smoke` (сборка образа и
  smoke-сценарий в контейнере). Полный список задач с описаниями — в `mise.toml`, сводная
  таблица — в README (раздел «Задачи»).
- `mise run contract` **нельзя** класть в pre-commit: он считает дрейф через `git status`
  и ложно падает при застейдженных изменениях (например, во время коммита). Поэтому pre-commit
  гоняет лёгкую `mise run check:fast` без `contract` и `e2e`.
- Дев-серверы как демоны: `mise dev`, затем `mise daemons status` (бэкенд :8000, фронт :5173).
- Агент в GitHub: в комментариях к issue/PR работают упоминания `/oc` и `/opencode` — их
  обрабатывает `.github/workflows/opencode.yml` (см. README, раздел «CI»).

Одиночный тест (запускается из каталога приложения, а не через mise):
```sh
cd backend  && uv run pytest tests/test_health.py::test_healthcheck
cd frontend && npm run test -- src/App.test.tsx
```

## Кодогенерация контракта

Источник истины для HTTP-контракта — **TypeSpec**: `contract/main.tsp` (плюс конфиг
`contract/tspconfig.yaml`). Всё остальное генерируется одной командой:

```sh
mise run gen
```

- **Генерируемые пути** (их не правят руками): `contract/openapi.json` и
  `frontend/src/api/generated/`.
- `contract/openapi.json` и `frontend/src/api/generated/**` **коммитятся**, потому что
  `mise run check` не должен требовать сети и генерации. Любая ручная правка этих файлов
  затирается при следующем `mise run gen` — меняй `contract/main.tsp`, перегенерируй и
  закоммить сгенерированное вместе с правкой контракта.
- `mise run contract` = `mise run gen` + проверка, что сгенерированные файлы не разошлись
  с закоммиченными; при дрейфе задача падает. Эту проверку выполняют CI и полная
  `mise run check`; git-хук pre-commit гоняет лёгкую `mise run check:fast` без неё
  (см. «Команды»).
- Подробности о генераторах и зафиксированных версиях — в `contract/README.md`.

## Особенности инструментов

- Линтер фронтенда — **oxlint** (`.oxlintrc.json`), а не ESLint; проверка типов — `tsc -b`
  (project references в `tsconfig.json`). Скрипт `build` тоже сначала запускает `tsc -b`.
- Область mypy на бэкенде — только `app tests` (не корень репозитория); включён плагин
  pydantic для mypy; у ruff `line-length = 100`, правила `E,F,I,B,UP,SIM`.
- Добавление зависимостей требует синхронизации lock-файлов, так как установка и CI работают
  в строгом режиме (`uv sync` / `npm ci`): для Python используй `uv add` внутри `backend/`,
  а `frontend/package-lock.json` обновляй при любом изменении `package.json`.
- Для команд бэкенда предпочитай `uv run` из `backend/`, чтобы использовалось зафиксированное
  окружение `.venv`.

## Подводные камни рантайма

- Дев-сервер Vite жёстко привязан к `host: '127.0.0.1'` с `strictPort`, потому что на Windows
  Vite иначе слушает только `::1`, что ломает прокси и проверку готовности порта в mise.
  Не меняй это.
- В dev-режиме `/api/*` проксируется на бэкенд (`frontend/vite.config.ts`), поэтому CORS не
  нужен; конфиг CORS на бэкенде важен только при прямых запросах.
- Настройки бэкенда читаются через `pydantic-settings` (`app/core/config.py`). Путь `env_file`
  задан как `.env` и относителен рабочему каталогу, поэтому `.env` создавай в `backend/` и
  запускай бэкенд-команды оттуда (копируй из `backend/.env.example`). Переменные `VITE_*` на
  фронте попадают в бандл и публичны (секретов там быть не должно) — см. `frontend/.env.example`.
- Точка входа бэкенда — `backend/app/main.py`; роутеры лежат в `backend/app/routers/` и
  монтируются под `/api`.

## Скилы агента: установка и обновление

Скилы из `mattpocock/skills` лежат в `.agents/skills/` (каталог в `.gitignore`), их версии
фиксирует коммитящийся **`skills-lock.json`** (коммит-источник + хеш каждого скила).
Установка и обновление — только через CLI, вручную файлы не трогай:

```sh
npx skills@latest install    # восстановить .agents/skills из skills-lock.json
npx skills@latest update -p  # обновить; затем закоммить skills-lock.json
npx skills@latest list       # состояние: tracked / modified / missing
```

OpenCode находит их в `.agents/skills/` сам; вызов — `@<id>`, где id равен имени каталога
(`@code-review`, `@tdd`). Локальные правки файлов скилов перезапишет `install`, потому что
их хеши не совпадут с lock.

## Agent skills

### Issue tracker

Issues и спеки живут в GitHub Issues репозитория `ArachnidSA/ai-for-developers-project-387`,
все операции — через `gh` CLI. См. `docs/agents/issue-tracker.md`.

Это продолжение проекта «Запись на звонок»; его исходная спецификация и решения остаются в
репозитории `ArachnidSA/ai-for-developers-project-386`:

- [Спека: приложение «Запись на звонок» (Calendar) (#14)](https://github.com/ArachnidSA/ai-for-developers-project-386/issues/14)
- ADR [`docs/adr/`](https://github.com/ArachnidSA/ai-for-developers-project-386/tree/main/docs/adr) (0001–0006)

### Triage labels

Пять канонических ролей мапятся на одноимённые метки: `needs-triage`, `needs-info`,
`ready-for-agent`, `ready-for-human`, `wontfix`. См. `docs/agents/triage-labels.md`.

### Domain docs

Раскладка single-context: `GLOSSARY.md` и `docs/adr/` в корне репозитория.
См. `docs/agents/domain.md`.

## Не трогать

- `.github/workflows/hexlet-check.yml` — автосгенерированный инструмент курса Hexlet: не
  редактируй, не удаляй и не переименовывай его, и не переименовывай репозиторий
  (см. `.github/workflows/README.md`).
- `.agents/` — инструментарий агентов (в `.gitignore`); не коммить и не править вручную.
  Версии скилов фиксирует коммитящийся `skills-lock.json` — см. «Скилы агента: установка и обновление».
