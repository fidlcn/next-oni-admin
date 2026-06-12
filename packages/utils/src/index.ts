/**
 * Build paginated response structure
 */
export function paginate<T>(
  list: T[],
  total: number,
  page: number,
  pageSize: number,
) {
  return { list, total, page, pageSize };
}

/**
 * Generate success API response
 */
export function success<T>(data: T, message = 'ok') {
  return { code: 0, message, data };
}

/**
 * Generate error API response
 */
export function error(message: string, code = -1) {
  return { code, message, data: null };
}

/**
 * Sleep utility
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
