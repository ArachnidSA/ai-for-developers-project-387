#!/usr/bin/env node
// Проверка дрейфа кодогенерации контракта.
//
// Задача `mise run contract` сначала запускает `mise run gen`, а затем этот скрипт:
// если сгенерированные артефакты отличаются от закоммиченных, генерация «разошлась»
// с контрактом — выходим с кодом 1. Проверка запускается в CI и переиспользуется
// композитной задачей `mise run check`.
//
// Проверяемые пути (оба генерируются из `contract/main.tsp`):
//   - contract/openapi.json;
//   - frontend/src/api/generated/.
//
// Скрипт намеренно написан на Node (он и так нужен для `mise run gen`) и не зависит
// от оболочки: одни и те же команды работают и в CI на Ubuntu, и на Windows.
import { execFileSync } from "node:child_process";

const GENERATED_PATHS = ["contract/openapi.json", "frontend/src/api/generated"];

/** Запустить git, вернуть stdout. Бросает при ненулевом коде выхода. */
function git(args) {
  return execFileSync("git", args, { encoding: "utf8" });
}

/** Запустить git, вернуть { ok, output } и не бросать при ненулевом коде выхода. */
function tryGit(args) {
  try {
    return { ok: true, output: git(args) };
  } catch (error) {
    const stdout = typeof error.stdout === "string" ? error.stdout : "";
    const stderr = typeof error.stderr === "string" ? error.stderr : "";
    return { ok: false, output: stdout + stderr };
  }
}

// Корень репозитория — чтобы скрипт не зависел от рабочего каталога вызова.
const root = git(["rev-parse", "--show-toplevel"]).trim();

// Дифф по отслеживаемым файлам: даёт человекочитаемую причину дрейфа.
const diff = tryGit(["-C", root, "diff", "--exit-code", "--", ...GENERATED_PATHS]);
// `git status` с `--untracked-files=all` покрывает и новые (неотслеживаемые) файлы.
const status = tryGit([
  "-C",
  root,
  "status",
  "--porcelain",
  "--untracked-files=all",
  "--",
  ...GENERATED_PATHS,
]);

const statusOutput = status.output.trim();
const diffOutput = diff.output.trim();

if (diff.ok && statusOutput === "") {
  console.log("OK: сгенерированные артефакты совпадают с закоммиченными.");
  process.exit(0);
}

console.error("Дрейф кодогенерации: сгенерированные артефакты отличаются от закоммиченных.");
console.error("Источник истины — contract/main.tsp. Перегенерируйте и закоммитьте:");
console.error("  mise run gen");
console.error("  git add contract/openapi.json frontend/src/api/generated");

if (statusOutput !== "") {
  console.error("\nИзменённые/неотслеживаемые пути (git status --porcelain):");
  console.error(statusOutput);
}
if (diffOutput !== "") {
  console.error("\nДифф (git diff):");
  console.error(diffOutput);
}

process.exit(1);
