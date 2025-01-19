import type { z } from "zod";
import { Err, isErr, Ok, Result } from "./result.util.js";

export function safeJsonParse<T>(
  json: string
): Result<T, JSONErrors.InvalidJSON> {
  try {
    return Ok(JSON.parse(json));
  } catch {
    return Err({ type: "invalid-json" });
  }
}

export function parseJson<T extends z.ZodTypeAny>(
  schema: T,
  jsonString: string
): Result<z.infer<T>, JSONErrors> {
  const jsonData = safeJsonParse(jsonString);

  if (isErr(jsonData)) {
    return jsonData;
  }

  const data = schema.safeParse(jsonData.value);

  if (!data.success) {
    return Err({
      type: "failed-to-validate",
    });
  }

  return Ok(data.data);
}

export type JSONErrors = JSONErrors.InvalidJSON | JSONErrors.FailedToValidate;
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace JSONErrors {
  export interface InvalidJSON {
    type: "invalid-json";
  }

  export interface FailedToValidate {
    type: "failed-to-validate";
  }
}
