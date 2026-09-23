export function serializeBigInt(
  value: unknown,
  path: Set<object> = new Set(),
): unknown {
  switch (typeof value) {
    case 'bigint':
      return value.toString();
    case 'object': {
      if (value === null) return null;
      if (path.has(value)) {
        // True cycle on the current path — break it (same as JSON.stringify).
        return undefined;
      }
      if (value instanceof Date) return value.toISOString();
      path.add(value);
      try {
        if (Array.isArray(value)) {
          const out = new Array(value.length);
          for (let i = 0; i < value.length; i++) {
            const item = serializeBigInt(value[i], path);
            // JSON.stringify keeps holes/undefined-in-array as null.
            out[i] = item === undefined ? null : item;
          }
          return out;
        }
        const out: Record<string, unknown> = {};
        for (const key of Object.keys(value)) {
          const serialized = serializeBigInt(
            (value as Record<string, unknown>)[key],
            path,
          );
          if (serialized !== undefined) out[key] = serialized;
        }
        return out;
      } finally {
        path.delete(value);
      }
    }
    default:
      return value;
  }
}
