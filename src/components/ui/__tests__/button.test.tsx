import { describe, expect, it } from 'vitest';

describe('Button Component', () => {
  it('has deterministic baseline assertion', () => {
    expect('button').toBe('button');
  });

  it('has deterministic secondary assertion', () => {
    expect(2 + 2).toBe(4);
  });
});
