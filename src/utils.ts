import { existsSync, readdirSync } from "fs";
import { homedir } from "os";
import { join } from "path";
import { isNotNull, pluck } from "./lib/types.util.js";
import {
  readInFolder,
  processFolder,
  getYearData,
  sortIntoYears,
  YearData,
} from "./utils/data-fetching.js";
import {
  intro,
  isCancel,
  cancel,
  text,
  multiselect,
  log,
  outro,
  spinner,
  select,
} from "@clack/prompts";
import { parseJson } from "./lib/json.util.js";
import { z } from "zod";
import { isErr } from "./lib/result.util.js";
import dotenv from "dotenv";

dotenv.config();

const API_PATH =
  process.env.NODE_ENV_CODEWRAP === "development"
    ? "http://localhost:3000/api/upload"
    : "https://www.codewrap.dev/api/upload";
const SITE_PATH =
  process.env.NODE_ENV_CODEWRAP === "development"
    ? "http://localhost:3000/view/"
    : "https://codewrap.dev/view/";
const platform = process.platform;


let cursorPath = generateEditorPath("Cursor");
let codePath = generateEditorPath("Code");

export async function main() {
  intro(`Welcome to codewrap by cawd!`);

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
    cancel("Codewrap cancelled.");
    process.exit(0);
  }

  if (projectType.includes("Cursor")) {
    let exists = existsSync(cursorPath);
		if (!exists) {
			const addCustomPath = await select({
				message: `We couldn't find data for Cursor, it'll be ignored. Want to add custom path for Cursor? `,
        options: [
          { value: "Yes", label: "Yes" },
          { value: "No", label: "No" },
        ],
			});

      if (isCancel(addCustomPath)) {
        cancel("Codewrap cancelled.");
        process.exit(0);
      }

      if (addCustomPath === "Yes") {
        const customPathResponse = await text({
          message: `What's the path to your Cursor history?`,
          placeholder: generateEditorPath("Cursor"),
          initialValue: "",
				});

        if (isCancel(customPathResponse)) {
          cancel("Codewrap cancelled.");
          process.exit(0);
        }

				if (customPathResponse) {
					cursorPath = String(customPathResponse);
					exists = existsSync(cursorPath);
					if (!exists) {
						log.warning(
							`We couldn't find data for '${cursorPath}', it'll be ignored.`
						);
					} else {
            IDEPaths.push({
              name: "Cursor",
              path: cursorPath,
            });
          }
				}
			}
		} else {
      IDEPaths.push({
        name: "Cursor",
        path: cursorPath,
      });
		}
  }

  if (projectType.includes("Code")) {
    let exists = existsSync(codePath);
    if (!exists) {
			const addCustomPath = await select({
				message: `We couldn't find data for Code, it'll be ignored. Want to add custom path for Code?`,
        options: [
          { value: "Yes", label: "Yes" },
          { value: "No", label: "No" },
        ],
			});

      if (isCancel(addCustomPath)) {
        cancel("Codewrap cancelled.");
        process.exit(0);
      }

      if (addCustomPath === "Yes") {
        const customPathResponse = await text({
          message: `What's the path to your Code history?`,
          placeholder: generateEditorPath("Code"),
          initialValue: "",
				});

        if (isCancel(customPathResponse)) {
          cancel("Codewrap cancelled.");
          process.exit(0);
        }

				if (customPathResponse) {
					codePath = String(customPathResponse);
					exists = existsSync(codePath);
					if (!exists) {
						log.warning(
							`We couldn't find data for '${codePath}', it'll be ignored.`
						);
					} else {
            IDEPaths.push({
              name: "Code",
              path: codePath,
            });
          }
				}
			}
		} else {
      IDEPaths.push({
        name: "Code",
        path: codePath,
      });
		}
	}

  const addCustomEditor = await select({
    message: `Do you want to use data from any other editors besides ${IDEPaths.map(pluck("name")).join(" & ")}? ↓ ↑`,
    options: [
      { value: "No", label: "No" },
      { value: "Yes", label: "Yes" },
    ],
  });

  if (addCustomEditor === "Yes") {
    const customPathResponse = await text({
      message: `We've found data for ${IDEPaths.map(pluck("name")).join(" & ")}. What's the name of the editor you want to add?`,
      placeholder: "Name of vscode fork (enter to skip)",
      initialValue: "",
      validate: (value) => {
        if (["cursor", "code"].includes(value.toLocaleLowerCase())) {
          return `You can't use '${value.toLocaleLowerCase()}' as an IDE name.`;
        }
      },
    });

    if (isCancel(customPathResponse)) {
      cancel("Codewrap cancelled.");
      process.exit(0);
    }

    if (customPathResponse) {
      const customPath = generateEditorPath(customPathResponse);
      if (existsSync(customPath)) {
        log.success(`We've found data for '${customPathResponse}'`);
        IDEPaths.push({
          name: customPath,
          path: customPath,
        });
      } else {
        log.warning(
          `We couldn't find data for '${customPathResponse}', it'll be ignored.`
        );
      }
    }
  }

  const githubResponse = await text({
    message: `What's your GitHub username? (no @)`,
    placeholder: "(enter to skip)",
    initialValue: "",
    validate: (value) => {
      if (value.toLocaleLowerCase().includes("@")) {
        return 'Do not include "@" in your GitHub username.';
      }
    },
  });

  const github =
    typeof githubResponse === "string" && githubResponse.trim().length > 0
      ? githubResponse
      : null;

  const s = spinner();

  s.start("Searching for change history...");

  await new Promise((resolve) => setTimeout(resolve, 500));
  const entryFiles = await Promise.all(
    IDEPaths.flatMap(({ name, path }) => getEntriesForEditor(path))
  );

  s.message("Crunching the numbers...");

  await new Promise((resolve) => setTimeout(resolve, 500));

  const allChanges = entryFiles.flatMap(getYearData);
  const yearData = sortIntoYears(allChanges);

  s.message("Uploading analytics...");

  const { id, accessToken } = await uploadAnalytics(yearData, github);

  s.stop("Uploaded analytics!");

  const link = SITE_PATH + id;

  log.success(`Success! View your code wrap: ${link}`);

  outro(`Thanks for using codewrap by cawd!`);
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
	if (platform === "linux") {
		return join(homedir(), ".config", appName, "User", "History");
	} else if (platform === "win32") {
		return join(homedir(), "AppData", "Roaming", appName, "User", "History");
	} else {
		return join(
			homedir(),
			"Library",
			"Application Support",
			appName,
			"User",
			"History"
		);
	}
}


async function uploadAnalytics(yearData: YearData[], github: string | null) {
  const response = await fetch(API_PATH, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      data: yearData,
      ...(github && { github }),
    }),
  });

  if (!response.ok) {
    log.error(`Failed to upload analytics: ${response.status}`);
    throw new Error("Failed to upload analytics");
  }

  const bodyJson = await response.text();

  const body = parseJson(
    z.object({
      id: z.string(),
      accessToken: z.string(),
    }),
    bodyJson
  );

  if (isErr(body)) {
    log.error(`Failed to parse response: ${body.error}`);
    throw new Error("Failed to parse response");
  }

  return body.value;
}
