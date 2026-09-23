export function normalize(res: unknown): unknown[] {
  if (!res) return [];

  if (Array.isArray(res)) return res;
  const obj = res as Record<string, unknown>;
  if (Array.isArray(obj.data)) return obj.data;
  if (Array.isArray(obj.results)) return obj.results;
  if (Array.isArray(obj.items)) return obj.items;

  return [];
}
