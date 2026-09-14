import { describe, expect, it } from 'vitest';
import {
  LARGEST_REAL_DAMAGE_TAKEN,
  SCRIPTED_DAMAGE_THRESHOLD,
  isScriptedDamage,
} from './damage';

describe('scripted damage', () => {
  it('is exactly 2^29', () => {
    expect(SCRIPTED_DAMAGE_THRESHOLD).toBe(2 ** 29);
  });

  it('catches the Sha of Pride values seen in this history', () => {
    // Sentinel plus the real damage those raiders took before it fired.
    for (const value of [549_862_883, 544_171_967, 540_609_798]) {
      expect(isScriptedDamage(value)).toBe(true);
    }
  });

  it('keeps the largest real pull in the dataset', () => {
    expect(isScriptedDamage(LARGEST_REAL_DAMAGE_TAKEN)).toBe(false);
  });

  it('leaves a wide gap between what it drops and what it keeps', () => {
    // Nothing observed lies between the two; a rule that had to split a
    // continuum would be a judgement call rather than a fact.
    expect(SCRIPTED_DAMAGE_THRESHOLD / LARGEST_REAL_DAMAGE_TAKEN).toBeGreaterThan(5);
  });

  it('accepts bigint, which is how the database returns it', () => {
    expect(isScriptedDamage(BigInt(SCRIPTED_DAMAGE_THRESHOLD))).toBe(true);
    expect(isScriptedDamage(BigInt(SCRIPTED_DAMAGE_THRESHOLD - 1))).toBe(false);
  });
});
