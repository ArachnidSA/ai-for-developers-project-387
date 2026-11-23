#!/usr/bin/env node
// Дымовая проверка поставки: собирает образ из корневого Dockerfile, поднимает
// контейнер на выбранном порту, дожидается готовности и прогоняет проверки:
//
//   - GET /api/healthcheck → 200;
//   - GET / → собранный SPA (index.html);
//   - GET /book, GET /owner → тот же index.html (fallback клиентской маршрутизации);
//   - /api/* обслуживает API, статика его не перехватывает;
//   - сценарий гостя и владельца по HTTP: тип события → слоты → запись →
//     список владельца → повтор на тот же слот → 409.
//
// Контейнер гасится в конце (в том числе при ошибке). Скрипт намеренно написан
// на Node (он уже нужен для `mise run gen`) и не зависит от оболочки, поэтому
// одинаково работает в CI на Ubuntu и на Windows.
import { execFileSync } from "node:child_process";
import { createServer } from "node:net";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const here = dirname(fileURLToPath(import.meta.url));
// scripts/ -> корень репозитория, откуда и собирается образ.
const root = resolve(here, "..");

const IMAGE = process.env.DOCKER_IMAGE ?? "calendar-app:local";
const CONTAINER = `calendar-smoke-${process.pid}`;
// Пояс владельца: окно записи (14 дней от «сегодня») строится в нём — как в BookPage.
const OWNER_TIME_ZONE = "Asia/Yekaterinburg";
// Сдвиг на 1 день (завтра по поясу владельца) всегда попадает в окно записи и не пуст.
const DAY_OFFSET = 1;

const delay = (ms) => new Promise((done) => setTimeout(done, ms));

/** Запустить docker, вернуть stdout. Бросает при ненулевом коде выхода. */
function docker(args, options = {}) {
  return execFileSync("docker", args, { encoding: "utf8", ...options });
}

/** Свободный TCP-порт на loopback: отдаём контейнеру и публикуем на него же. */
function freePort() {
  return new Promise((done, fail) => {
    const server = createServer();
    server.unref();
    server.on("error", fail);
    server.listen(0, "127.0.0.1", () => {
      const { port } = server.address();
      server.close(() => done(port));
    });
  });
}

function check(condition, message) {
  if (!condition) {
    throw new Error(`Проверка не прошла: ${message}`);
  }
  console.log(`  ok — ${message}`);
}

/** Календарный день `YYYY-MM-DD` в поясе владельца со сдвигом `offsetDays`. */
function ownerDay(offsetDays) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: OWNER_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const part = (type) => parts.find((item) => item.type === type)?.value ?? "";
  const today = `${part("year")}-${part("month")}-${part("day")}`;
  const [year, month, date] = today.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, date + offsetDays)).toISOString().slice(0, 10);
}

async function request(base, path, options) {
  const response = await fetch(`${base}${path}`, {
    ...options,
    signal: AbortSignal.timeout(10_000),
  });
  const text = await response.text();
  return { status: response.status, contentType: response.headers.get("content-type") ?? "", text };
}

async function requestJson(base, path, options) {
  const response = await request(base, path, options);
  let body = null;
  try {
    body = JSON.parse(response.text);
  } catch {
    body = null;
  }
  return { ...response, body };
}

/** POST JSON-тела и разбор ответа — общий путь для запросов сценария. */
async function postJson(base, path, payload) {
  return requestJson(base, path, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(payload),
  });
}

/** Ждём, пока приложение в контейнере начнёт отвечать на healthcheck. */
async function waitForHealth(base) {
  const deadline = Date.now() + 90_000;
  let lastError = "нет ответа";
  while (Date.now() < deadline) {
    try {
      const response = await request(base, "/api/healthcheck");
      if (response.status === 200) {
        return;
      }
      lastError = `healthcheck вернул ${response.status}`;
    } catch (error) {
      lastError = error instanceof Error ? error.message : String(error);
    }
    await delay(500);
  }
  throw new Error(`Контейнер не стал готов за 90 c (${lastError})`);
}

/** Проверки статики: SPA отдаётся, `/api/*` не перехвачен. */
async function checkSpa(base) {
  console.log("Проверка раздачи SPA и API:");
  const index = await request(base, "/");
  check(index.status === 200, "GET / отвечает 200");
  check(index.contentType.includes("text/html"), "GET / отдаёт HTML");
  check(index.text.includes('<div id="root">'), "GET / отдаёт index.html приложения");

  for (const route of ["/book", "/owner"]) {
    const page = await request(base, route);
    check(page.status === 200, `GET ${route} отвечает 200`);
    check(page.text === index.text, `GET ${route} отдаёт тот же index.html`);
  }

  const health = await requestJson(base, "/api/healthcheck");
  check(health.status === 200, "GET /api/healthcheck отвечает 200");
  check(health.body?.status === "success", "GET /api/healthcheck отдаёт JSON API");

  const eventTypes = await requestJson(base, "/api/event-types");
  check(eventTypes.status === 200, "GET /api/event-types отвечает 200");
  check(Array.isArray(eventTypes.body), "/api/* обслуживает API, а не статика");
}

/** Сквозной сценарий гостя и владельца против контейнера. */
async function checkGuestAndOwner(base) {
  console.log("Сценарий гостя и владельца:");
  const name = `Созвон ${Date.now()}`;
  const created = await postJson(base, "/api/event-types", {
    name,
    description: "Созвон для проверки",
    duration_minutes: 30,
  });
  check(created.status === 201, "владелец заводит тип события (201)");
  const eventTypeId = created.body?.id;
  check(Number.isInteger(eventTypeId), "тип события получил идентификатор");

  const day = ownerDay(DAY_OFFSET);
  const slots = await requestJson(base, `/api/event-types/${eventTypeId}/slots?date=${day}`);
  check(slots.status === 200, `слоты на ${day} отдаются (200)`);
  check(Array.isArray(slots.body) && slots.body.length > 0, "в дне есть свободные слоты");

  const start = slots.body[0].start;
  const booked = await postJson(base, "/api/bookings", {
    event_type_id: eventTypeId,
    start,
    guest_name: "Гость Тестовый",
    guest_email: "guest@example.com",
  });
  check(booked.status === 201, "гость записывается на свободный слот (201)");

  // Данные переживают запрос: файловая SQLite видна следующему обращению.
  const upcoming = await requestJson(base, "/api/bookings");
  check(upcoming.status === 200, "владелец получает список предстоящих записей (200)");
  check(
    Array.isArray(upcoming.body) && upcoming.body.some((item) => item.guest_name === "Гость Тестовый"),
    "запись гостя видна в списке владельца",
  );

  const conflict = await postJson(base, "/api/bookings", {
    event_type_id: eventTypeId,
    start,
    guest_name: "Второй гость",
  });
  check(conflict.status === 409, "повтор на занятый слот отклоняется (409)");
}

async function main() {
  console.log(`Сборка образа ${IMAGE} из корневого Dockerfile...`);
  docker(["build", "-t", IMAGE, "-f", "Dockerfile", "."], { cwd: root, stdio: "inherit" });

  const port = await freePort();
  console.log(`Запуск контейнера ${CONTAINER} на порту ${port}...`);
  docker(
    [
      "run",
      "-d",
      "--name",
      CONTAINER,
      "-e",
      `PORT=${port}`,
      "-p",
      `127.0.0.1:${port}:${port}`,
      IMAGE,
    ],
    { cwd: root },
  );

  const base = `http://127.0.0.1:${port}`;
  await waitForHealth(base);
  console.log("Контейнер готов, прогоняем проверки:");
  await checkSpa(base);
  await checkGuestAndOwner(base);
}

try {
  await main();
  console.log("\nOK: образ собирается, контейнер стартует по PORT и проходит сценарий.");
} catch (error) {
  console.error(`\nОшибка проверки: ${error instanceof Error ? error.message : error}`);
  try {
    console.error("\nЛоги контейнера:");
    console.error(docker(["logs", CONTAINER], { stdio: ["ignore", "pipe", "pipe"] }));
  } catch {
    // Контейнер мог не запуститься — логов нет.
  }
  process.exitCode = 1;
} finally {
  try {
    docker(["rm", "-f", CONTAINER], { stdio: "ignore" });
  } catch {
    // Контейнер не создавался — гасить нечего.
  }
}
