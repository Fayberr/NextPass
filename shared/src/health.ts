/**
 * Client-side password health audit — runs entirely offline over already-decrypted logins, so it
 * leaks nothing. Flags weak, reused, and (optionally) old passwords, and scores overall vault
 * health 0–100. No external breach API (that would break zero-knowledge / offline guarantees).
 */

export type Weakness = 'weak' | 'reused' | 'old' | 'no_password';

export interface AuditEntry {
  id: string;
  name: string;
  issues: Weakness[];
  strength: number; // 0–4 (see passwordStrength)
}

export interface AuditReport {
  entries: AuditEntry[];
  score: number; // 0–100 overall health
  counts: { total: number; weak: number; reused: number; old: number };
}

export interface AuditInput {
  id: string;
  name: string;
  password?: string;
  updatedAt?: number;
}

const OLD_MS = 1000 * 60 * 60 * 24 * 365; // 1 year

/** Rough password strength 0 (empty) – 4 (strong), from length + character-class variety. */
export function passwordStrength(pw: string): number {
  if (!pw) return 0;
  let variety = 0;
  if (/[a-z]/.test(pw)) variety++;
  if (/[A-Z]/.test(pw)) variety++;
  if (/[0-9]/.test(pw)) variety++;
  if (/[^a-zA-Z0-9]/.test(pw)) variety++;

  const len = pw.length;
  // Estimated entropy bits ≈ length * log2(alphabet).
  const alphabet = (/[a-z]/.test(pw) ? 26 : 0) + (/[A-Z]/.test(pw) ? 26 : 0) + (/[0-9]/.test(pw) ? 10 : 0) + (/[^a-zA-Z0-9]/.test(pw) ? 30 : 0);
  const bits = len * Math.log2(Math.max(alphabet, 2));

  if (len < 6 || bits < 28) return 1;
  if (bits < 44 || variety < 2) return 2;
  if (bits < 64 || variety < 3) return 3;
  return 4;
}

export function auditVault(logins: AuditInput[]): AuditReport {
  const withPw = logins.filter((l) => l.password);
  // Reuse detection: same password across 2+ entries.
  const byPassword = new Map<string, string[]>();
  for (const l of withPw) {
    const arr = byPassword.get(l.password!) ?? [];
    arr.push(l.id);
    byPassword.set(l.password!, arr);
  }
  const reusedIds = new Set<string>();
  for (const [, ids] of byPassword) if (ids.length > 1) ids.forEach((id) => reusedIds.add(id));

  const now = Date.now();
  const entries: AuditEntry[] = logins.map((l) => {
    const issues: Weakness[] = [];
    const strength = passwordStrength(l.password ?? '');
    if (!l.password) issues.push('no_password');
    else {
      if (strength <= 2) issues.push('weak');
      if (reusedIds.has(l.id)) issues.push('reused');
      if (l.updatedAt && now - l.updatedAt > OLD_MS) issues.push('old');
    }
    return { id: l.id, name: l.name, issues, strength };
  });

  const weak = entries.filter((e) => e.issues.includes('weak')).length;
  const reused = entries.filter((e) => e.issues.includes('reused')).length;
  const old = entries.filter((e) => e.issues.includes('old')).length;

  // Score: start at 100, penalize each issue class relative to vault size.
  const total = logins.length || 1;
  const penalty = (weak * 8 + reused * 6 + old * 2) / total;
  const score = Math.max(0, Math.min(100, Math.round(100 - penalty * 10)));

  return { entries, score, counts: { total: logins.length, weak, reused, old } };
}
