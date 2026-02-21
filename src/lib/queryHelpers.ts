/** Default page size for list queries */
export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

/** Parse page/limit from URLSearchParams with hard cap */
export function parsePagination(params: URLSearchParams) {
  const page = Math.max(1, parseInt(params.get('page') ?? '1'));
  const limit = Math.min(
    parseInt(params.get('limit') ?? String(DEFAULT_PAGE_SIZE)),
    MAX_PAGE_SIZE,
  );
  const offset = (page - 1) * limit;
  return { page, limit, offset };
}

/** Wrap a promise with a timeout */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout')), ms),
    ),
  ]);
}
