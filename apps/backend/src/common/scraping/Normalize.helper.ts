export function normalize(res: any) {
  if (!res) return [];

  if (Array.isArray(res)) return res;
  if (Array.isArray(res.data)) return res.data;
  if (Array.isArray(res.results)) return res.results;
  if (Array.isArray(res.items)) return res.items;

  return [];
}