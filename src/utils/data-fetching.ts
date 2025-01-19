import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { parseJson } from "../lib/json.util.js";
import { isErr } from "../lib/result.util.js";
import { homedir } from "os";
import map from "lang-map";

const EntryFile = z.object({
  version: z.number(),
  entries: z.array(
    z.object({
      timestamp: z.number(),
    })
  ),
  resource: z.string(),
});

export function readInFolder(editorPath: string, folder: string) {
  const entryFile = join(editorPath, folder, "entries.json");
  if (!existsSync(entryFile)) {
    return null;
  }

  const fileContent = readFileSync(
    join(editorPath, folder, "entries.json"),
    "utf8"
  );

  const parsed = parseJson(EntryFile, fileContent);
  if (isErr(parsed)) {
    console.log(parsed.error);
    return null;
  }

  return parsed.value;
}

export interface ProcessedEntryFile {
  fileLocation: string;
  language: string;
  changes: number;
  timestamps: number[];
}

export function processFolder(
  entryFile: z.infer<typeof EntryFile>
): ProcessedEntryFile | null {
  const fileEdited = entryFile.resource.split("/").pop() ?? entryFile.resource;
  const fileExtension = fileEdited.split(".").pop();
  if (!fileExtension) {
    return null;
  }

  const language = map.languages(transformFileExtension(fileExtension))[0];
  if (!language) {
    return null;
  }

  const timestamps = entryFile.entries.map((entry) => entry.timestamp);

  return {
    fileLocation: entryFile.resource.split("file://")[1],
    language,
    changes: entryFile.entries.length,
    timestamps,
  };
}

function transformFileExtension(fileExtension: string) {
  const map = new Map([
    ["jsx", "js"],
    ["cjs", "js"],
    ["tsx", "ts"],
  ]);

  return map.get(fileExtension) ?? fileExtension;
}
