import type { NotUndefined } from "./types.util.js";

export type Result<O, E extends Result.ErrorValueBase> =
  | Result.Ok<O>
  | Result.Err<E>;

// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Result {
  export interface Ok<O = undefined> {
    _tag: "Ok";
    value: O extends undefined ? void : O;
  }

  export interface Err<E> {
    _tag: "Err";
    error: E;
  }

  /** Internal only interface */
  interface OkWithValue<O extends NotUndefined> {
    _tag: "Ok";
    value: O;
  }

  /** Internal only interface */
  type ResultWithValue<O extends NotUndefined, E extends ErrorValueBase> =
    | OkWithValue<O>
    | Err<E>;

  /** Should only be used in jest setup files */
  export interface ErrorValueBase {
    type: string;
  }

  export function partition<O extends NotUndefined, E extends ErrorValueBase>(
    responses: ResultWithValue<O, E>[]
  ): [O[], E[]] {
    const oks = responses
      .filter((resp) => resp._tag === "Ok")
      .map((resp) => resp.value);
    const errs = responses
      .filter((resp) => resp._tag === "Err")
      .map((resp) => resp.error);

    return [oks, errs];
  }
}

export function Ok(): Result.Ok;
export function Ok<O>(value: O): Result.Ok<O>;
export function Ok<O>(value?: O): Result.Ok<O> {
  if (arguments.length === 0) {
    return {
      _tag: "Ok",
      value: undefined,
    } as Result.Ok<O>;
  }

  return {
    _tag: "Ok",
    value,
  } as Result.Ok<O>;
}

export function Err<E extends Result.ErrorValueBase>(
  error: E & { type: E["type"] }
): Result.Err<E> {
  return {
    _tag: "Err",
    error,
  };
}

export function isOk<O, E extends Result.ErrorValueBase>(
  result: Result<O, E>
): result is Result.Ok<O> {
  return result._tag === "Ok";
}

export function isErr<O, E extends Result.ErrorValueBase>(
  result: Result<O, E>
): result is Result.Err<E> {
  return result._tag === "Err";
}

export function match<O, E extends Result.ErrorValueBase, R>(
  result: Result<O, E>,
  {
    onErr,
    onOk,
  }: {
    onErr: (error: E) => R;
    onOk: (value: O | void) => R;
  }
): R {
  if (isErr(result)) {
    return onErr(result.error);
  }

  return onOk(result.value);
}
