type SupabaseFailure = {
  message: string;
  details?: string;
  hint?: string;
  code?: string;
};

export function assertSupabase<T>(
  result: { data: T | null; error: SupabaseFailure | null },
  fallbackMessage: string,
) {
  if (result.error) {
    throw new Error(result.error.message || fallbackMessage);
  }

  return result.data;
}
