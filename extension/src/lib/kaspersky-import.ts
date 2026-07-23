/**
 * Parser for Kaspersky Password Manager's plaintext export format:
 *
 *   Website name: Foo
 *   Website URL: https://foo.com
 *   Login name:
 *   Login: user@example.com
 *   Password: ...
 *   Comment:
 *   ---
 *
 * Kaspersky also exports "Applications" (Application/Login name/Login/Password/Comment, no URL)
 * and "Other Accounts" (Account name/…, sometimes with extra freeform "Key - value" lines like
 * "Client ID - …") using the same "---"-separated block shape with different title keys. This
 * parser is section-header-agnostic: it just reads "Key: value" (and "Key - value") lines out of
 * each block and figures out the record from whichever keys are present, so it doesn't need to
 * know about "Websites" / "Applications" / "Other Accounts" headers at all.
 *
 * Pure and synchronous - no chrome APIs, no network. Deliberately does NOT touch the vault key or
 * do any encryption; that only happens inside the popup's unlocked session (see Import.tsx),
 * because this is a zero-knowledge vault.
 */

import type { LoginFields } from '@pm/shared';

export interface ParsedImportEntry {
  fields: LoginFields;
  /** Best-effort dedupe key: base-domain (or lowercased name if no URL) + lowercased identifier. */
  key: string;
}

export interface ParseResult {
  entries: ParsedImportEntry[];
  /** Blocks that had at least one recognized "Key: value" line but didn't yield a usable record. */
  skipped: number;
}

interface KV {
  key: string;
  value: string;
}

function normalizeText(text: string): string {
  return text.replace(/^﻿/, '').replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/** Split the export into "---"-delimited blocks. Section headers (e.g. a lone "Websites" line)
 *  just ride along inside whichever block they precede - they don't match the KV regexes below,
 *  so they're harmlessly ignored rather than needing special-case handling. */
function splitBlocks(text: string): string[][] {
  const lines = normalizeText(text).split('\n');
  const blocks: string[][] = [];
  let current: string[] = [];
  for (const raw of lines) {
    if (raw.trim() === '---') {
      blocks.push(current);
      current = [];
    } else {
      current.push(raw);
    }
  }
  if (current.some((l) => l.trim())) blocks.push(current);
  return blocks;
}

// Key never contains ':' or ' - ', so these safely split on the FIRST occurrence even if the
// value itself contains colons or dashes (e.g. a password or an API secret).
const COLON_RE = /^([A-Za-z][A-Za-z0-9 _/]{0,40}):[ \t]?(.*)$/;
const DASH_RE = /^([A-Za-z][A-Za-z0-9 _/]{0,40}) - (.*)$/;

function parseKv(blockLines: string[]): KV[] {
  const out: KV[] = [];
  for (const raw of blockLines) {
    const line = raw.trimEnd();
    if (!line.trim()) continue;
    const m = COLON_RE.exec(line) ?? DASH_RE.exec(line);
    if (m && m[1] !== undefined && m[2] !== undefined) out.push({ key: m[1].trim(), value: m[2] });
  }
  return out;
}

/** Single-label hosts that are still real, autofill-worthy sites (local admin panels etc.) even
 *  though they have no dot in them. Everything else with no dot (an app name like "txadmin"
 *  mistakenly filed under the URL field) is rejected and kept as text in notes instead. */
function looksLikeRealHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return h.includes('.') || h === 'localhost';
}

/** Best-effort "does this look like a real website" check + https:// prefixing. Kaspersky often
 *  stores bare domains ("gmx.net") but sometimes a non-URL app identifier ("txadmin") under the
 *  same "Website URL" key - only the former should become an autofill-matchable URI. */
function normalizeUrl(raw: string): string | null {
  const v = raw.trim();
  if (!v) return null;
  // Preserve whatever scheme the export already had (e.g. "http://localhost"); default to https.
  const withProto = /^[a-z][a-z0-9+.-]*:\/\//i.test(v) ? v : `https://${v}`;
  try {
    const u = new URL(withProto);
    if (!looksLikeRealHost(u.hostname)) return null;
    return withProto;
  } catch {
    return null;
  }
}

/**
 * Deliberately uses the exact hostname, NOT the base domain - even though items themselves get
 * matchMode 'base_domain' for autofill purposes (see blockToEntry). Two different subdomains of
 * the same site with the same username (e.g. nextcloud.fayber.dev and ai.fayber.dev, both user
 * "fayber") are genuinely distinct accounts, not duplicates; collapsing on base domain here was
 * caught during testing (it silently ate 3 of 4 real *.fayber.dev logins) and would have dropped
 * real passwords. A false NEGATIVE (importing an actual duplicate twice) is the safe failure mode
 * for a one-shot import - the user can merge/delete afterward - a false positive is not.
 */
function dedupeKeyFor(uris: string[], identifier: string, name: string): string {
  let host = '';
  for (const u of uris) {
    const withProto = /^https?:\/\//i.test(u) ? u : `https://${u}`;
    try {
      host = new URL(withProto).hostname.toLowerCase();
      break;
    } catch {
      /* ignore, try next uri */
    }
  }
  return `${(host || name).trim().toLowerCase()}|${identifier.trim().toLowerCase()}`;
}

function blockToEntry(kv: KV[]): ParsedImportEntry | null {
  let title: string | undefined;
  let url: string | undefined;
  let loginName: string | undefined;
  let login: string | undefined;
  let password: string | undefined;
  let comment: string | undefined;
  // Freeform extras (e.g. "Client ID"/"Client Secret" in Kaspersky's "Other Accounts") get folded
  // into notes rather than LoginFields.customFields - the UI doesn't render customFields anywhere
  // yet (no edit form, no detail view), so anything put there would be saved but invisible.
  const extra: { key: string; value: string }[] = [];

  for (const { key, value } of kv) {
    switch (key.toLowerCase()) {
      case 'website name':
      case 'application':
      case 'account name':
        if (!title && value.trim()) title = value.trim();
        break;
      case 'website url':
        if (value.trim()) url = value.trim();
        break;
      case 'login name':
        if (value.trim()) loginName = value.trim();
        break;
      case 'login':
        if (value.trim()) login = value.trim();
        break;
      case 'password':
        if (value.trim()) password = value.trim();
        break;
      case 'comment':
        if (value.trim()) comment = value.trim();
        break;
      default:
        if (value.trim()) extra.push({ key: key.trim(), value: value.trim() });
    }
  }

  if (!title && !login && !password && !url) return null; // header-only / empty block

  const name = title || login || url || 'Imported item';
  let username: string | undefined;
  let email: string | undefined;
  if (login) {
    if (login.includes('@')) email = login;
    else username = login;
  }

  const normUrl = url ? normalizeUrl(url) : null;
  const uris = normUrl ? [normUrl] : [];

  const notesParts: string[] = [];
  if (comment) notesParts.push(comment);
  if (loginName && loginName !== login) notesParts.push(`Kaspersky login type: ${loginName}`);
  if (url && !normUrl) notesParts.push(`Site: ${url}`); // couldn't parse as a real URL, keep as text
  for (const { key, value } of extra) notesParts.push(`${key}: ${value}`);

  const fields: LoginFields = {
    name,
    username,
    email,
    password,
    uris,
    // 'base_domain' rather than the app-wide default of 'host': a bulk import doesn't know
    // which exact subdomain the real login page lives on, so match the whole site.
    matchMode: 'base_domain',
    notes: notesParts.length ? notesParts.join('\n') : undefined,
  };

  return { fields, key: dedupeKeyFor(uris, username ?? email ?? '', name) };
}

export function parseKasperskyExport(text: string): ParseResult {
  const blocks = splitBlocks(text);
  const entries: ParsedImportEntry[] = [];
  let skipped = 0;
  for (const block of blocks) {
    const kv = parseKv(block);
    if (kv.length === 0) continue; // pure section-header/blank block - not a real record
    const entry = blockToEntry(kv);
    if (entry) entries.push(entry);
    else skipped++;
  }
  return { entries, skipped };
}

/** Same dedupe-key shape, computed from an existing vault item's already-decrypted summary
 *  fields, so newly-parsed entries can be checked against what's already saved. */
export function dedupeKeyForExisting(uris: string[], username: string | null, name: string): string {
  return dedupeKeyFor(uris, username ?? '', name);
}
