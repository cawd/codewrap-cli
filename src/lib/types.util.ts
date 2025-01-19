export type NotUndefined =
  | string
  | number
  | boolean
  | null
  | unknown[]
  | Record<string, unknown>;

export function isDefined<T>(value: T | undefined): value is T {
  return value !== undefined;
}

export function isNotNull<T>(value: T | null): value is T {
  return value !== null;
}

export function pluck<Key extends keyof any>(
  key: Key
): <Value>(value: Record<Key, Value>) => Value {
  return (value) => value[key];
}
