# Календарь звонков (продолжение)


[![hexlet-check](https://github.com/ArachnidSA/ai-for-developers-project-387/actions/workflows/hexlet-check.yml/badge.svg)](https://github.com/ArachnidSA/ai-for-developers-project-387/actions)

Интегрируйте работу агентов в GitHub проект

Учебный проект Хекслета: https://ru.hexlet.io/programs/ai-for-developers
Как это должно работать: https://files.hexlet.app/a/2ipc5m

## Стек

- Разное

## Установка

<!-- Опишите установку: клонирование, зависимости, переменные окружения -->

```bash
git clone https://github.com/ArachnidSA/ai-for-developers-project-387.git
cd ai-for-developers-project-387
```

## Использование

<!-- Добавьте примеры запуска и запись asciinema — именно это смотрит работодатель -->

## Деплой (Render)

Публичный адрес: **https://ai-for-developers-project-387-lnqe.onrender.com**

Сервис собирается из корневого [`Dockerfile`](Dockerfile): стадия на Node собирает SPA, затем
python-стадия ставит зависимости и отдаёт статику вместе с API (`/api`) одним процессом FastAPI.
Приложение слушает `0.0.0.0` и порт из переменной `PORT` (Render подставляет свой).

- **Сервис:** Render Web Service, Environment Docker, план Free, регион Frankfurt,
  health check `/api/healthcheck`, автодеплой по push в `main` (для этого к репозиторию
  подключено Render-приложение).
- **Конфигурация:** справочно — [`render.yaml`](render.yaml). Живой сервис создан через
  MCP-инструмент Render (`create_web_service`) и `render.yaml` не читает; см.
  [`docs/mcp-render.md`](docs/mcp-render.md).

### Хранение

База — SQLite-файл **внутри контейнера**. Данные переживают перезапуск процесса, но **не**
пересоздание контейнера (редеплой, смена образа, перенос инстанса): после деплоя без внешнего
тома данные сбрасываются. Решение зафиксировано в
[`docs/adr/0006-ephemeral-storage-on-hosting.md`](docs/adr/0006-ephemeral-storage-on-hosting.md).

---

<details>
<summary>Автоматические тесты Хекслета</summary>

Тесты запускаются на каждый коммит. За запуск отвечает файл `.github/workflows/hexlet-check.yml` — не удаляйте и не переименовывайте ни его, ни репозиторий.

</details>

## О Хекслете

[Хекслет](https://ru.hexlet.io/) — школа программирования: авторские программы обучения с практикой, поддержкой наставников и реальными проектами, которые остаются в резюме. Этот репозиторий — один из таких проектов.
