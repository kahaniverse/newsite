import { describe, it, expect } from 'vitest';
import { parsePgTextArray } from '@/lib/db/parse';

describe('parsePgTextArray', () => {
  it('passes JS arrays through', () => {
    expect(parsePgTextArray(['a', 'b'])).toEqual(['a', 'b']);
  });

  it('parses Postgres text-array literals', () => {
    expect(parsePgTextArray('{scienceFiction}')).toEqual(['scienceFiction']);
    expect(parsePgTextArray('{a,b,c}')).toEqual(['a', 'b', 'c']);
  });

  it('returns [] for empty/null', () => {
    expect(parsePgTextArray(null)).toEqual([]);
    expect(parsePgTextArray(undefined)).toEqual([]);
    expect(parsePgTextArray('{}')).toEqual([]);
  });

  it('respects quoted elements with commas inside', () => {
    expect(parsePgTextArray('{"foo, bar",baz}')).toEqual(['foo, bar', 'baz']);
  });

  it('respects backslash-escaped quotes', () => {
    expect(parsePgTextArray('{"a\\"b","c"}')).toEqual(['a"b', 'c']);
  });

  it('treats NULL token as empty string', () => {
    expect(parsePgTextArray('{a,NULL,b}')).toEqual(['a', '', 'b']);
  });

  it('returns [] for non-array non-string', () => {
    expect(parsePgTextArray(42)).toEqual([]);
    expect(parsePgTextArray({})).toEqual([]);
  });
});
