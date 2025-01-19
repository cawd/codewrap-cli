import moment from "moment";
import { ProcessedEntryFile } from "./data-fetching.js";

export function getLanguageStats(entries: ProcessedEntryFile[]) {
  const languages = entries.map((entry) => entry.language);

  const counts = languages.reduce(
    (acc, language) => {
      acc[language] = (acc[language] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([language, count]) => ({
      language,
      count,
    }));
}

export function getMostPopularFiles(entries: ProcessedEntryFile[]) {
  const sortedFileCounts = entries.sort((a, b) => b.changes - a.changes);

  return sortedFileCounts;
}

export function getMostPopularDate(timestamps: number[]) {
  const counts = timestamps.reduce(
    (acc, timestamp) => {
      const date = new Date(timestamp).setHours(0, 0, 0, 0);
      acc[date] = (acc[date] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([date, count]) => ({
      date,
      count,
    }));
}

export function getMostPopularDayOfWeek(timestamps: number[]) {
  const counts = timestamps.reduce(
    (acc, timestamp) => {
      const momentDate = moment(timestamp);
      const day = momentDate.get("day");
      acc[day] = (acc[day] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([day, count]) => ({
      day,
      count,
    }));
}

export function getMostPopularHours(timestamps: number[]) {
  const counts = timestamps.reduce(
    (acc, timestamp) => {
      const momentDate = moment(timestamp);
      const hour = momentDate.get("hour");
      acc[hour] = (acc[hour] ?? 0) + 1;
      return acc;
    },
    {} as Record<string, number>
  );

  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([hour, count]) => ({
      hour,
      count,
    }));
}
