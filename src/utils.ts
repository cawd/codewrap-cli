import fs, { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { isNotNull, pluck } from "./lib/types.util.js";
import {
  readInFolder,
  processFolder,
  ProcessedEntryFile,
} from "./utils/data-fetching.js";
import {
  getLanguageStats,
  getMostPopularDate,
  getMostPopularDayOfWeek,
  getMostPopularFiles,
  getMostPopularHours,
} from "./utils/stats.js";
import {
  intro,
  confirm,
  isCancel,
  cancel,
  text,
  select,
  multiselect,
  log,
  tasks,
  outro,
  spinner,
} from "@clack/prompts";
import { v4 } from "uuid";

const cursorExists = join(
  homedir(),
  "Library",
  "Application Support",
  "Code",
  "User",
  "History"
);

const codeExists = join(
  homedir(),
  "Library",
  "Application Support",
  "Code",
  "User",
  "History"
);

const cursorPath = generateEditorPath("Cursor");
const codePath = generateEditorPath("Code");

export async function main() {
  intro(`Welcome to code wrapped!`);

  const IDEPaths: {
    name: string;
    path: string;
  }[] = [];

  const projectType = await multiselect({
    message: "Which editors do you use? ↓ ↑",
    options: [
      { value: "Cursor", label: "Cursor" },
      { value: "Code", label: "Code", hint: "VS Code" },
    ],
    required: true,
  });

  if (isCancel(projectType)) {
    cancel("Code wrapped cancelled.");
    process.exit(0);
  }

  if (projectType.includes("Cursor")) {
    const exists = existsSync(cursorPath);
    if (!exists) {
      log.warning(
        `We couldn't find change history for Cursor, it'll be ignored.`
      );
    } else {
      IDEPaths.push({
        name: "Cursor",
        path: cursorPath,
      });
    }
  }

  if (projectType.includes("Code")) {
    const exists = existsSync(codePath);
    if (!exists) {
      log.warning(
        `We couldn't find change history for Code, it'll be ignored.`
      );
    } else {
      IDEPaths.push({
        name: "Code",
        path: codePath,
      });
    }
  }

  const customPathResponse = await text({
    message: `We've found change history for ${IDEPaths.map(pluck("name")).join(" & ")}. Do you want to add a custom IDE name?`,
    placeholder: "Name of vscode fork (enter to skip)",
    initialValue: "",
    validate: (value) => {
      if (["cursor", "code"].includes(value.toLocaleLowerCase())) {
        return `You can't use '${value.toLocaleLowerCase()}' as an IDE name.`;
      }
    },
  });

  if (isCancel(customPathResponse)) {
    cancel("Code wrapped cancelled.");
    process.exit(0);
  }

  if (customPathResponse) {
    const customPath = generateEditorPath(customPathResponse);
    if (existsSync(customPath)) {
      log.success(`We've found change history for '${customPathResponse}'`);
      IDEPaths.push({
        name: customPath,
        path: customPath,
      });
    } else {
      log.warning(
        `We couldn't find change history for '${customPathResponse}', it'll be ignored.`
      );
    }
  }

  const s = spinner();

  s.start("Searching for change history...");

  await new Promise((resolve) => setTimeout(resolve, 500));
  const entryFiles = await Promise.all(
    IDEPaths.flatMap(({ name, path }) => getEntriesForEditor(path))
  );

  s.message("Crunching the numbers...");

  const stats = generateStats(entryFiles);

  await new Promise((resolve) => setTimeout(resolve, 500));

  s.message("Uploading analytics...");

  await new Promise((resolve) => setTimeout(resolve, 5000));

  s.stop("Uploaded analytics!");

  log.success(
    `View your analytics here: https://code-wrapped.vercel.app/${v4()}`
  );

  outro(`Thanks for using code wrapped!`);
}

export function generateStats(entryFiles: ProcessedEntryFile[]) {
  const languageData = getLanguageStats(entryFiles);
  const mostPopularFiles = getMostPopularFiles(entryFiles);

  const allTimestamps = entryFiles.flatMap((entry) => entry.timestamps);
  const mostPopularDates = getMostPopularDate(allTimestamps);
  const mostPopularDaysOfWeek = getMostPopularDayOfWeek(allTimestamps);
  const mostPopularHours = getMostPopularHours(allTimestamps);

  return {
    numberOfChanges: allTimestamps.length,
    languageData: languageData.slice(0, 10),
    mostPopularFiles: mostPopularFiles.slice(0, 10),
    mostPopularDates,
    mostPopularDaysOfWeek,
    mostPopularHours,
  };
}

function getEntriesForEditor(editorPath: string) {
  const folders = readdirSync(editorPath);

  return folders
    .map((file) => readInFolder(editorPath, file))
    .filter(isNotNull)
    .map(processFolder)
    .filter(isNotNull);
}

function generateEditorPath(appName: string) {
  return join(
    homedir(),
    "Library",
    "Application Support",
    appName,
    "User",
    "History"
  );
}
