/**
 * Result type for operations that can succeed or fail.
 *
 * @template T - The type of data returned on success
 * @template E - The type of error returned on failure
 */
export type Result<T, E> = {
  success: boolean;
  data?: T;
  error?: E;
};

/**
 * Result type for validation operations.
 */
export type ValidationResult = {
  success: boolean;
  errors: string[];
};