type ChunkResult<T> = {
  data: T[] | null
  error: { message: string } | null
}

/**
 * PostgREST caps responses at 1,000 rows; loop over 1,000-row ranges
 * until a short batch signals the end of the table.
 */
export async function fetchAllChunked<T>(
  request: (from: number, to: number) => PromiseLike<ChunkResult<T>>
): Promise<T[]> {
  const CHUNK = 1000;
  const all: T[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await request(from, from + CHUNK - 1);
    if (error) {
      // Log technical detail for debugging; show generic message to user
      console.warn("[supabase] query failed", error);
      throw new Error("Gagal memuat data. Silakan coba lagi.");
    }
    all.push(...(data ?? []));
    if (!data || data.length < CHUNK) break;
    from += CHUNK;
  }

  return all;
}
