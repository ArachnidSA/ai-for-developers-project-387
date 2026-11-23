# Контракт API «Calendar»

Источник истины для HTTP-контракта — файлы **TypeSpec** (`main.tsp`, `tspconfig.yaml`).
Всё остальное здесь и в SDK генерируется из них.

## Как запускать генерацию

```sh
mise run gen
```

Задача ставит зависимости контракта из `package-lock.json` (`npm ci`) и запускает
`npm run gen` в этом каталоге, что выполняет два шага:

1. `tsp compile .` — `@typespec/openapi3` пишет **`contract/openapi.json`** (OpenAPI 3.0);
2. `openapi-ts` (`@hey-api/openapi-ts`) читает `openapi.json` и пишет клиентский
   **TypeScript SDK** в **`frontend/src/api/generated/`**.

## Что нельзя править руками

- `contract/openapi.json`;
- `frontend/src/api/generated/**` (все файлы с шапкой `auto-generated`).

Любая правка этих файлов затирается при следующем `mise run gen`. Меняйте только
`main.tsp` (и при необходимости `tspconfig.yaml`), затем перегенерируйте и закоммитьте
вместе с описанием.

## Зафиксированные версии

Версии пакетов-генераторов закреплены точно (без `^`) в `contract/package.json` и
`contract/package-lock.json`:

| Пакет | Версия | Роль |
| --- | --- | --- |
| `@typespec/compiler` | 1.18.0 | компилятор TypeSpec (`tsp`) |
| `@typespec/http` | 1.18.0 | HTTP-словарь (`@route`, `@get`, `@post`, `@body`) |
| `@typespec/openapi3` | 1.18.0 | эмиттер `contract/openapi.json` |
| `@hey-api/openapi-ts` | 0.99.0 | генератор TS SDK из OpenAPI |
| `typescript` | 5.9.3 | нужен только генератору (peer-зависимость `@hey-api/openapi-ts`) |

## Решения по генераторам

- **Серверные артефакты не генерируются.** Для FastAPI нет поддерживаемого
  TypeSpec-эмиттера, а Pydantic-модели и роутеры пишутся руками и сверяются с
  `openapi.json`. Поэтому шаг «сгенерировать серверные артефакты» пропущен.
- **Клиентский SDK генерируется не TypeSpec-эмиттером, а из OpenAPI.** Официальный
  эмиттер `@typespec/http-client-js` ориентирован на Node-пакеты: он подключает
  рантайм `@typespec/ts-http-runtime` и `uri-template`, использует TS-`enum` для
  перечислений и импортирует типы как значения. Это конфликтует со строгим
  браузерным `tsconfig` фронтенда (`verbatimModuleSyntax`, `erasableSyntaxOnly`,
  окружение без Node-типов). Выбранный `@hey-api/openapi-ts` генерирует
  самодостаточный SDK на `fetch` без внешних рантайм-зависимостей, который проходит
  `tsc -b` и `oxlint` без ослабления настроек. TypeSpec остаётся источником истины:
  SDK строится из `openapi.json`, который порождает TypeSpec.

## Использование SDK во фронтенде

Обёртки доменного слоя — `frontend/src/api/eventTypes.ts` (типы событий) и
`frontend/src/api/slots.ts` (свободные слоты), конфигурация базового URL —
`frontend/src/api/client.ts`. Компоненты ходят в API только через эти модули, а не
через `fetch` напрямую.

## Эндпоинты

| Метод и путь | Назначение |
| --- | --- |
| `GET /api/event-types?include_archived=` | список типов событий (гостю — только действующие; владельцу с `include_archived=true` — все) |
| `POST /api/event-types` | создание типа события |
| `PATCH /api/event-types/{eventTypeId}` | изменение переданных полей типа (404) |
| `DELETE /api/event-types/{eventTypeId}` | удаление типа без записей (404; 409, если записи есть и нужна архивация) |
| `POST /api/event-types/{eventTypeId}/archive` | архивация типа: скрыт от гостей, записи сохраняются (404) |
| `GET /api/event-types/{eventTypeId}/slots?date=YYYY-MM-DD` | свободные слоты типа на день в поясе владельца (`start`/`end` в UTC; 400 вне окна записи, 404 для неизвестного/архивного типа) |
| `POST /api/bookings` | создание записи гостем (`end` считает сервер; 400 вне рабочих часов/окна, 404 для неизвестного/архивного типа, 409 при конфликте) |
| `GET /api/bookings` | предстоящие записи всех типов для владельца |
| `DELETE /api/bookings/{id}` | удаление записи и освобождение слота (404) |

Ошибки данных и конфликтов отдаются телом `ApiError { detail: string }` (в контракте описаны для
`400`/`404`/`409`). Ответы `422` — это валидация FastAPI (список ошибок другой формы), поэтому в
TypeSpec они не описаны.

