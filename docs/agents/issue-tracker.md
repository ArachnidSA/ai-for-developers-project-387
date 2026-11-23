# Issue tracker: GitHub

Issues и спеки этого репозитория живут как GitHub issues. Все операции — через `gh` CLI.

Репозиторий: `ArachnidSA/ai-for-developers-project-387`. `gh` определяет его сам, когда запущен
внутри клона; там, где `<owner>/<repo>` нужен явно, подставляй это значение.

## Происхождение: первый проект (репозиторий 386)

Это продолжение проекта «Запись на звонок» (`ArachnidSA/ai-for-developers-project-386`); его ADR
скопированы сюда в `docs/adr/` (0001–0006). Источник живёт в репозитории 386:

- **Исходная спецификация** — [«Спека: приложение «Запись на звонок» (Calendar)» (#14)](https://github.com/ArachnidSA/ai-for-developers-project-386/issues/14).
- **Решения** — ADR [`docs/adr/`](https://github.com/ArachnidSA/ai-for-developers-project-386/tree/main/docs/adr) (0001-sqlite-for-storage … 0006-ephemeral-storage-on-hosting).
- **Карта решений** — [«Карта: Запись на звонок по брифу» (#8)](https://github.com/ArachnidSA/ai-for-developers-project-386/issues/8).

Issues и спеки нового проекта заводи только в `ArachnidSA/ai-for-developers-project-387`; на
тикеты репозитория 386 ссылайся по полному URL.

## Conventions

- **Создать issue**: `gh issue create --title "..." --body "..."`. Для многострочного тела
  используй heredoc.
- **Прочитать issue**: `gh issue view <number> --json number,title,body,labels,comments`.
- **Список issues**: `gh issue list --state open --json number,title,body,labels,comments --jq '[.[] | {number, title, body, labels: [.labels[].name], comments: [.comments[].body]}]'`
  с нужными фильтрами `--label` и `--state`.
- **Сделать issue подзадачей родителя**: `gh issue create --parent <parent> ...`, либо
  `gh issue edit <parent> --add-sub-issue <child>`. Где sub-issues недоступны, поставь
  `Part of #<parent>` в начало тела ребёнка.
- **Блокировка**: нативные зависимости GitHub — канонический, видимый в UI способ.
  `gh issue create --blocked-by <n>,<n> ...` или `gh issue edit <child> --add-blocked-by <blocker>`.
  Где зависимостей нет, используй строку `Blocked by: #<n>, #<n>` в начале тела ребёнка.
  Тикет разблокирован, когда закрыты все его блокеры.
- **Сколько открытых блокеров**:
  `gh api repos/ArachnidSA/ai-for-developers-project-387/issues/<n> --jq .issue_dependencies_summary.blocked_by`
  (только открытые; `0` — можно брать в работу). Альтернатива:
  `gh issue view <n> --json blockedBy --jq '[.blockedBy.nodes[] | select(.state == "OPEN")] | length'` —
  там перечислены и закрытые блокеры, поэтому фильтр обязателен.
- **Комментарий**: `gh issue comment <number> --body "..."`
- **Метки**: `gh issue edit <number> --add-label "..."` / `--remove-label "..."`
- **Закрыть**: сначала `gh issue comment <number> --body "..."` с объяснением, затем
  `gh issue close <number>`. У уже закрытого issue `gh issue close --comment` теряет комментарий,
  но всё равно возвращает код 0.

Заводи issues только в свой репозиторий. Никогда не заводи их в `mattpocock/skills` (откуда эти
скилы), если он тебе не принадлежит. В форке `gh` может по умолчанию целиться в родителя, поэтому
перед первым `gh issue create` за сессию проверь `gh repo view --json nameWithOwner` и уточни
у пользователя, если это не `ArachnidSA/ai-for-developers-project-387`.

## Pull requests as a request surface

**PRs as a request surface: no.** _(Set to `yes` if this repo treats external PRs as feature requests; `/triage` reads this flag.)_

Когда флаг переключён в `yes`, PR проходят те же метки и состояния, что и issues, через аналоги
`gh pr`:

- **Прочитать PR**: `gh pr view <number>`, затем `gh pr view <number> --comments` (вне TTY
  `--comments` печатает только комментарии, без тела), диф — `gh pr diff <number>`.
- **Список внешних PR для triage**: `gh api --paginate 'repos/{owner}/{repo}/pulls?state=open' --jq '.[] | select(.author_association | IN("OWNER","MEMBER","COLLABORATOR") | not) | {number, title, author: .user.login, author_association, labels: [.labels[].name]}'`.
- **Комментарий / метка / закрытие**: `gh pr comment`, `gh pr edit --add-label`/`--remove-label`,
  `gh pr close`.

GitHub делит одно пространство номеров между issues и PR, поэтому голый `#42` может быть и тем,
и другим: проверь `gh pr view 42`, при неудаче — `gh issue view 42`.

## Когда скил говорит «опубликуй в issue tracker»

Создай GitHub issue.

## Когда скил говорит «прочитай нужный тикет»

Читай так, как описано в **Прочитать issue** выше.

## Wayfinding operations

Используется скилом `/wayfinder`. **Карта** — один issue, тикеты — его дочерние issues.

- **Карта**: один issue с меткой `wayfinder:map`, в теле — разделы Notes / Decisions-so-far / Fog.
  `gh issue create --label wayfinder:map`.
- **Дочерний тикет**: issue, привязанный к карте как GitHub sub-issue (см. выше). Где sub-issues
  выключены, добавь ребёнка в task list в теле карты и поставь `Part of #<map>` в начало тела
  ребёнка. Метки: `wayfinder:<type>` (`research` / `prototype` / `grilling` / `task`). После
  взятия в работу тикет назначается на ведущего разработчика.
- **Блокировка**: см. **Блокировка** в Conventions.
- **Запрос фронтира**: открытые дети карты (`gh issue list --state open`, ограниченные sub-issues
  или task list карты), выбрось те, у кого есть открытый блокер (см. **Сколько открытых блокеров**
  либо открытый issue в строке `Blocked by`) или ассайни; побеждает первый в порядке карты.
- **Взять в работу**: `gh issue edit <n> --add-assignee @me` — первая запись этой сессии.
- **Завершить**: `gh issue comment <n> --body "<ответ>"`, затем `gh issue close <n>`, затем допиши
  указатель на контекст (суть и ссылку) в Decisions-so-far карты.
