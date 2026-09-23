import { serializeBigInt } from './bigint.util';

describe('serializeBigInt', () => {
  it('converts bigint to string', () => {
    expect(serializeBigInt(123n)).toBe('123');
  });

  it('converts Date to ISO string', () => {
    const date = new Date('2026-01-01T00:00:00.000Z');
    expect(serializeBigInt(date)).toBe('2026-01-01T00:00:00.000Z');
  });

  it('passes through primitives unchanged', () => {
    expect(serializeBigInt('hello')).toBe('hello');
    expect(serializeBigInt(42)).toBe(42);
    expect(serializeBigInt(null)).toBeNull();
    expect(serializeBigInt(undefined)).toBeUndefined();
    expect(serializeBigInt(true)).toBe(true);
  });

  it('walks nested objects and arrays', () => {
    const input = {
      id: 1n,
      meta: { createdAt: new Date('2026-01-01T00:00:00.000Z'), count: 2n },
      items: [{ id: 3n }, { id: 4n }],
    };
    expect(serializeBigInt(input)).toEqual({
      id: '1',
      meta: { createdAt: '2026-01-01T00:00:00.000Z', count: '2' },
      items: [{ id: '3' }, { id: '4' }],
    });
  });

  it('keeps shared (non-cyclic) references — serializes them each time', () => {
    const shared = { id: 1n };
    const input = { a: shared, b: shared };
    expect(serializeBigInt(input)).toEqual({ a: { id: '1' }, b: { id: '1' } });
  });

  it('breaks true cycles without infinite recursion', () => {
    const obj: Record<string, unknown> = { id: 1n };
    obj.self = obj;
    expect(() => serializeBigInt(obj)).not.toThrow();
    expect(serializeBigInt(obj)).toEqual({ id: '1' });
  });

  it('drops undefined object properties (like JSON.stringify)', () => {
    expect(serializeBigInt({ a: 1n, b: undefined })).toEqual({ a: '1' });
  });

  it('converts undefined array items to null (like JSON.stringify)', () => {
    expect(serializeBigInt([1n, undefined, 2n])).toEqual(['1', null, '2']);
  });

  it('handles null values inside structures', () => {
    expect(serializeBigInt({ a: null, b: [null, 1n] })).toEqual({
      a: null,
      b: [null, '1'],
    });
  });
});
