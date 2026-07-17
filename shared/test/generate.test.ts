import { describe, it, expect } from 'vitest';
import { generatePassword } from '../src/generate.js';

describe('generatePassword', () => {
  it('respects the requested length', () => {
    expect(generatePassword({ length: 8 })).toHaveLength(8);
    expect(generatePassword({ length: 32 })).toHaveLength(32);
    expect(generatePassword({ length: 64 })).toHaveLength(64);
  });

  it('honors character-class toggles', () => {
    const digitsOnly = generatePassword({ length: 40, lowercase: false, uppercase: false, symbols: false });
    expect(digitsOnly).toMatch(/^[0-9]+$/);

    const noSymbols = generatePassword({ length: 40, symbols: false });
    expect(noSymbols).toMatch(/^[a-zA-Z0-9]+$/);
  });

  it('includes at least one char from each selected class', () => {
    // Run several times since selection is random.
    for (let i = 0; i < 50; i++) {
      const pw = generatePassword({ length: 12, avoidAmbiguous: false });
      expect(pw).toMatch(/[a-z]/);
      expect(pw).toMatch(/[A-Z]/);
      expect(pw).toMatch(/[0-9]/);
      expect(pw).toMatch(/[!@#$%^&*()\-_=+[\]{};:,.?/]/);
    }
  });

  it('avoids ambiguous look-alike characters when asked', () => {
    for (let i = 0; i < 20; i++) {
      expect(generatePassword({ length: 60, avoidAmbiguous: true })).not.toMatch(/[O0Il1|S5B8]/);
    }
  });

  it('produces different output each call', () => {
    const a = generatePassword();
    const b = generatePassword();
    expect(a).not.toEqual(b);
  });
});
