export function serializeBigInt(
  value: unknown,
  seen: WeakSet<object> = new WeakSet(),
): unknown {
  switch (typeof value) {
    case 'bigint':
      return value.toString();
    case 'object': {
      if (value === null) return null;
      if (seen.has(value)) return undefined;
      seen.add(value);
      if (value instanceof Date) return value.toISOString();
      if (Array.isArray(value)) {
        const out = new Array(value.length);
        for (let i = 0; i < value.length; i++) {
          out[i] = serializeBigInt(value[i], seen);
        }
        return out;
      }
      const out: Record<string, unknown> = {};
      for (const key of Object.keys(value)) {
        const serialized = serializeBigInt(
          (value as Record<string, unknown>)[key],
          seen,
        );
        if (serialized !== undefined) out[key] = serialized;
      }
      return out;
    }
    default:
      return value;
  }
}
