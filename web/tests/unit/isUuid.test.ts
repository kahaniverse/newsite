import { describe, it, expect } from 'vitest';
import { isUuid } from '@/lib/db/parse';

// isUuid guards `WHERE id = ${id}::uuid` from throwing a Postgres 500 on
// non-UUID seed ids like 'sample-story'. Its precision matters.
describe('isUuid', () => {
  it('accepts a canonical v4 uuid', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
  });

  it('accepts uppercase hex', () => {
    expect(isUuid('123E4567-E89B-12D3-A456-426614174000')).toBe(true);
  });

  it('rejects the sample non-uuid ids', () => {
    expect(isUuid('sample-story')).toBe(false);
    expect(isUuid('sample-alt-1')).toBe(false);
  });

  it('rejects a string missing dashes', () => {
    expect(isUuid('123e4567e89b12d3a456426614174000')).toBe(false);
  });

  it('rejects too-short and too-long', () => {
    expect(isUuid('123e4567-e89b-12d3-a456-42661417400')).toBe(false);   // 11 in last group
    expect(isUuid('123e4567-e89b-12d3-a456-4266141740000')).toBe(false); // 13 in last group
  });

  it('rejects non-string inputs', () => {
    expect(isUuid(null)).toBe(false);
    expect(isUuid(undefined)).toBe(false);
    expect(isUuid(123)).toBe(false);
    expect(isUuid({})).toBe(false);
  });
});
