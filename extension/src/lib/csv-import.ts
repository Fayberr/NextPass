/**
 * Browser CSV password-export parser: Chrome/Edge/Brave/Opera ("name,url,username,password,note"),
 * Firefox ("url,username,password,…"), Safari ("Title,URL,Username,Password,Notes,OTPAuth") and,
 * for anything else, a generic column-mapping fallback the Import screen lets the user fill in
 * by hand. Reuses the Kaspersky importer's URL normalization + dedupe-key logic so both import
 * paths produce identical ParsedImportEntry records for the shared preview/import pipeline.
 *
 * Pure and synchronous - no chrome APIs, no network, no encryption (see kaspersky-import.ts for
 * why: zero-knowledge vault, item encryption only happens in the unlocked background session).
 */

import type { LoginFields } from '@pm/shared';
import {
  normalizeUrl,
  dedupeKeyFor,
  type ParsedImportEntry,
  type ParseResult,
} from './kaspersky-import.js';

export interface CsvTable {
  headers: string[];
  rows: string[][];
}

/** Which CSV column index feeds which login field (null = column not present). */
export interface CsvMapping {
  name: number | null;
  url: number | null;
  username: number | null;
  password: number | null;
  notes: number | null;
}

/**
 * Cheap format sniff so the Import screen can route pasted text: a CSV export's first line is a
 * comma-separated header row, while Kaspersky-style text dumps are "Key: value" lines. Only a
 * hint - parseCsv still validates properly.
 */
export function looksLikeCsv(text: string): boolean {
  const firstLine =
    text
      .replace(/^﻿/, '')
      .split(/\r?\n/)
      .find((l) => l.trim()) ?? '';
  if ((firstLine.match(/,/g) ?? []).length < 2) return false;
  if (/^[^,]{1,60}:\s/.test(firstLine)) return false; // "Key: value" text export, not CSV
  return true;
}

/** RFC-4180-ish CSV parser: quoted fields, "" escapes, newlines inside quotes, CRLF/LF. */
export function parseCsv(text: string): CsvTable | null {
  const src = text.replace(/^﻿/, '');
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let inQuotes = false;
  for (let i = 0; i < src.length; i++) {
    const c = src[i]!;
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        field += c;
      }
    } else if (c === '"') {
      inQuotes = true;
    } else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++;
      row.push(field);
      field = '';
      rows.push(row);
      row = [];
    } else {
      field += c;
    }
  }
  if (field !== '' || row.length > 0) {
    row.push(field);
    rows.push(row);
  }

  const clean = rows.filter((r) => r.some((cell) => cell.trim() !== ''));
  if (clean.length < 2) return null; // need a header row + at least one data row
  const headers = clean[0]!.map((h) => h.trim());
  if (headers.length < 2) return null;
  return { headers, rows: clean.slice(1) };
}

/** Known header spellings across browser exports (all compared lowercased). Order matters:
 *  earlier aliases win, so e.g. a file with both "username" and "email" maps "username". */
const HEADER_ALIASES: Record<keyof CsvMapping, string[]> = {
  name: ['name', 'title', 'account', 'account name', 'website name', 'display name'],
  url: ['url', 'urls', 'website', 'web site', 'login_uri', 'uri', 'origin_url', 'hostname', 'site'],
  username: ['username', 'user name', 'login', 'login_username', 'user', 'login name', 'email'],
  password: ['password', 'login_password', 'pass'],
  notes: ['note', 'notes', 'comment', 'comments', 'extra'],
};

export function guessMapping(headers: string[]): CsvMapping {
  const lower = headers.map((h) => h.trim().toLowerCase());
  const pick = (aliases: string[]): number | null => {
    for (const a of aliases) {
      const i = lower.indexOf(a);
      if (i !== -1) return i;
    }
    return null;
  };
  return {
    name: pick(HEADER_ALIASES.name),
    url: pick(HEADER_ALIASES.url),
    username: pick(HEADER_ALIASES.username),
    password: pick(HEADER_ALIASES.password),
    notes: pick(HEADER_ALIASES.notes),
  };
}

/** A mapping is usable once the password column is known plus at least one identifying column. */
export function mappingUsable(m: CsvMapping): boolean {
  return m.password !== null && (m.url !== null || m.name !== null || m.username !== null);
}

export function csvToEntries(table: CsvTable, m: CsvMapping): ParseResult {
  const entries: ParsedImportEntry[] = [];
  let skipped = 0;
  const cell = (row: string[], i: number | null) => (i === null ? '' : (row[i] ?? '').trim());

  for (const row of table.rows) {
    const rawUrl = cell(row, m.url);
    const identifier = cell(row, m.username);
    const password = cell(row, m.password);
    const noteText = cell(row, m.notes);
    let title = cell(row, m.name);

    if (!rawUrl && !identifier && !password) {
      skipped++;
      continue;
    }

    const normUrl = rawUrl ? normalizeUrl(rawUrl) : null;
    const uris = normUrl ? [normUrl] : [];

    if (!title) {
      // Fall back to the site's hostname, then the identifier - never import nameless items.
      let host = '';
      if (normUrl) {
        try {
          host = new URL(normUrl).hostname.replace(/^www\./, '');
        } catch {}
      }
      title = host || identifier || 'Imported login';
    }

    let username: string | undefined;
    let email: string | undefined;
    if (identifier) {
      if (identifier.includes('@')) email = identifier;
      else username = identifier;
    }

    const notesParts: string[] = [];
    if (noteText) notesParts.push(noteText);
    if (rawUrl && !normUrl) notesParts.push(`Site: ${rawUrl}`); // unparseable URL, keep as text

    const fields: LoginFields = {
      name: title,
      username,
      email,
      password: password || undefined,
      uris,
      // Same reasoning as the Kaspersky import: a bulk import doesn't know which exact
      // subdomain the real login page lives on, so match the whole site.
      matchMode: 'base_domain',
      notes: notesParts.length ? notesParts.join('\n') : undefined,
    };

    entries.push({ fields, key: dedupeKeyFor(uris, identifier, title) });
  }

  return { entries, skipped };
}
