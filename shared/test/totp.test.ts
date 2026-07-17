import { describe, expect, it } from 'vitest';
import { generateTotp, parseOtpauth, isValidTotp } from '../src/totp.js';

// RFC 6238 test vector: ASCII secret "12345678901234567890" = base32 GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ
const SECRET = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';

describe('TOTP (RFC 6238)', () => {
  it('matches the SHA-1 reference vector at T=59s', async () => {
    const r = await generateTotp({ secret: SECRET, digits: 8, period: 30, algorithm: 'SHA-1' }, 59_000);
    expect(r.code).toBe('94287082');
  });

  it('produces a 6-digit code by default', async () => {
    const r = await generateTotp(SECRET, 1_111_111_109_000);
    expect(r.code).toHaveLength(6);
    expect(r.code).toBe('081804');
  });

  it('reports seconds remaining within the period', async () => {
    const r = await generateTotp(SECRET, 45_000); // 15s into the 2nd window
    expect(r.secondsRemaining).toBe(15);
    expect(r.period).toBe(30);
  });

  it('parses an otpauth URI', () => {
    const p = parseOtpauth(
      'otpauth://totp/ACME:alice@example.com?secret=' + SECRET + '&issuer=ACME&digits=6&period=30',
    );
    expect(p.secret).toBe(SECRET);
    expect(p.issuer).toBe('ACME');
    expect(p.account).toBe('alice@example.com');
    expect(p.digits).toBe(6);
  });

  it('validates secrets and rejects junk', () => {
    expect(isValidTotp(SECRET)).toBe(true);
    expect(isValidTotp('not-a-secret!!')).toBe(false);
  });
});
