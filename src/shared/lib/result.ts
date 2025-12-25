/**
 * Result type for operations that can fail
 * Inspired by Rust's Result<T, E>
 */
export type Result<T, E = Error> =
  | { ok: true; data: T }
  | { ok: false; error: E }

/**
 * Create a successful result
 */
export function ok<T>(data: T): Result<T, never> {
  return { ok: true, data }
}

/**
 * Create an error result
 */
export function err<E>(error: E): Result<never, E> {
  return { ok: false, error }
}

/**
 * Check if result is ok
 */
export function isOk<T, E>(result: Result<T, E>): result is { ok: true; data: T } {
  return result.ok
}

/**
 * Check if result is error
 */
export function isErr<T, E>(result: Result<T, E>): result is { ok: false; error: E } {
  return !result.ok
}

/**
 * Unwrap result, throwing if error
 * Use with caution - prefer explicit error handling
 */
export function unwrap<T, E>(result: Result<T, E>): T {
  if (result.ok) {
    return result.data
  }
  throw result.error
}

/**
 * Unwrap result with default value
 */
export function unwrapOr<T, E>(result: Result<T, E>, defaultValue: T): T {
  if (result.ok) {
    return result.data
  }
  return defaultValue
}

/**
 * Map over successful result
 */
export function map<T, U, E>(
  result: Result<T, E>,
  fn: (data: T) => U
): Result<U, E> {
  if (result.ok) {
    return ok(fn(result.data))
  }
  return result
}

/**
 * Map over error result
 */
export function mapErr<T, E, F>(
  result: Result<T, E>,
  fn: (error: E) => F
): Result<T, F> {
  if (result.ok) {
    return result
  }
  return err(fn(result.error))
}

