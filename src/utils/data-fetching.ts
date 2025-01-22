import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { z } from "zod";
import { parseJson } from "../lib/json.util.js";
import { isErr } from "../lib/result.util.js";
import moment from "moment";

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
  changes: number;
  timestamps: number[];
}

export interface YearData {
  year: number;
  changes: {
    file: string;
    timestamp: number;
  }[];
}

// Most edited file
// Count number of occurrences in changes array

export function processFolder(
  entryFile: z.infer<typeof EntryFile>
): ProcessedEntryFile | null {
  const fileEdited = entryFile.resource.split("/").pop() ?? entryFile.resource;
  const fileExtension = fileEdited.split(".").pop();
  if (!fileExtension) {
    return null;
  }

  const timestamps = entryFile.entries.map((entry) => entry.timestamp);

  return {
    fileLocation: entryFile.resource.split("file://")[1],
    changes: entryFile.entries.length,
    timestamps,
  };
}

function transformFileExtension(fileExtension: string) {
  const map = new Map([
    ["jsx", "js"],
    ["cjs", "js"],
    ["mjs", "js"],
    ["tsx", "ts"],
  ]);

  return map.get(fileExtension) ?? fileExtension;
}

export function getYearData(processedEntry: ProcessedEntryFile) {
  return processedEntry.timestamps
    .map((timestamp) => ({
      file: processedEntry.fileLocation,
      timestamp,
    }))
    .filter((change) => typeof change.file === "string")
    .sort((a, b) => a.timestamp - b.timestamp);
}

export function sortIntoYears(changes: YearData["changes"]): YearData[] {
  const years = changes.reduce(
    (acc, change) => {
      const year = moment(change.timestamp).year();
      acc[year] = (acc[year] ?? []).concat(change);
      return acc;
    },
    {} as Record<number, YearData["changes"]>
  );

  return Object.entries(years)
    .map(([year, changes]) => ({
      year: parseInt(year),
      changes,
    }))
    .sort((a, b) => a.year - b.year);
}
