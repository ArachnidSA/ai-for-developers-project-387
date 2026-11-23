# MCP-сервер Render в проекте

Проектный [`opencode.json`](../opencode.json) подключает официальный **hosted remote**
MCP-сервер Render (`https://mcp.render.com/mcp`, транспорт Streamable HTTP). Это позволяет
агенту OpenCode управлять сервисом на Render — например, создавать Web Service из
корневого `Dockerfile`.

> Секретов в репозитории нет: в `opencode.json` хранится только ссылка на источник ключа
> (`{file:...}` или `{env:...}`), а само значение — вне проекта.

Форма конфигурации — OpenCode V2: имена серверов лежат под `mcp.servers.<имя>`, тип remote
задаётся полем `type`. Подробности — в официальной документации:
<https://opencode.ai/docs/mcp-servers>.

## Вход: API-ключ (и альтернатива — OAuth)

Учётные данные хранятся вне репозитория; в `opencode.json` — только ссылка на источник.

**OAuth (альтернатива).** Для remote-серверов OpenCode включает OAuth по умолчанию, но с Render
«из коробки» он не заводится: авторизационный сервер Render не поддерживает ни Dynamic Client
Registration (DCR), ни CIMD, поэтому авто-вход падает с
`incompatible auth server does not support dynamic client registration`. OAuth заработает лишь с
предрегистрированным клиентом (`oauth.client_id`), которого у нас нет, — и в этом варианте в
файле секрета всё равно нет.

**API-ключ (используется в конфиге).** Практичный путь для Render — ключ в заголовке
`Authorization`; значение лежит вне репозитория.

Действующий конфиг (`oauth: false` + заголовок `Authorization`):

```json
{
  "mcp": {
    "servers": {
      "render": {
        "type": "remote",
        "url": "https://mcp.render.com/mcp",
        "oauth": false,
        "protocol": "auto",
        "headers": {
          "Authorization": "Bearer {file:./render-api-key}"
        }
      }
    }
  }
}
```

> `protocol: "auto"` нужен потому, что сервер Render отвечает по более новой ревизии MCP:
> с классическим `initialize` соединение рвётся (`ECONNRESET`), а `auto` сначала пробует
> `server/discover` и только потом откатывается на legacy.

### Как получить ключ

Render Dashboard → **Account Settings** → **API Keys** → **Create API Key**
(<https://render.com/docs/api-keys>). Ключ показывается один раз — скопируйте сразу.

### Куда положить значение (вне репозитория)

**Вариант А — файл в корне проекта (используется в конфиге сейчас; не требует перезапуска
приложения).** Положите в файл `render-api-key` в корне репозитория **только сам ключ**, без
перевода строки и кавычек. Файл закрыт от git (`.gitignore`) и от контекста сборки
(`.dockerignore`) — ни в репозиторий, ни в образ он не попадает. В конфиге указан
относительный путь `{file:./render-api-key}` (относительно каталога `opencode.json`);
OpenCode подставляет содержимое и перечитывает конфиг при сохранении.

Не удаляйте строку `/render-api-key` из `.gitignore` и `render-api-key` из `.dockerignore`.
Если файл удобнее держать вне проекта, укажите абсолютный путь или путь через `~/`.

**Вариант Б — переменная окружения.** Замените в `opencode.json` заголовок на
`"Authorization": "Bearer {env:RENDER_API_KEY}"` и задайте переменную до запуска OpenCode:

```powershell
# Windows PowerShell (на текущую сессию)
$env:RENDER_API_KEY = "<ключ>"
# постоянно (нужен перезапуск приложения OpenCode)
setx RENDER_API_KEY "<ключ>"
```

```sh
# Linux/macOS
export RENDER_API_KEY="<ключ>"
```

Shell-выражения вида `$NAME` внутри строк JSON не раскрываются; если файл или переменная не
заданы, подставляется пустая строка.

## Проверка подключения

```sh
opencode mcp auth --help   # справка
opencode mcp list          # список серверов и состояний
```

- Сервер `render` в списке уже означает, что проектный `opencode.json` подхвачен.
- До появления ключа статус — `needs authentication`; после — `connected`.
- `/mcps` в интерфейсе OpenCode — состояние, вход и отключение сервера.
- Статус `failed` с ошибкой вида `ECONNRESET` — не про конфигурацию, а про сеть окружения.

## Ссылки

- Render MCP Server: <https://render.com/docs/mcp-server>
- Render API keys: <https://render.com/docs/api-keys>
- OpenCode — MCP servers (V2): <https://opencode.ai/docs/mcp-servers>
- Исследование по схеме конфигурации: ветка `research/render-mcp`,
  `docs/research/render-mcp-and-opencode-json.md`
