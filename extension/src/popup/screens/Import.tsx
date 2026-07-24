import { useState } from 'react';
import { Button, Textarea, Field, Select } from '../ui.js';
import { ArrowLeft, Upload, Check, ShieldCheck, Chrome } from '../icons.js';
import { send } from '../client.js';
import {
  parseKasperskyExport,
  dedupeKeyForExisting,
  type ParsedImportEntry,
} from '../../lib/kaspersky-import.js';
import {
  looksLikeCsv,
  parseCsv,
  guessMapping,
  mappingUsable,
  csvToEntries,
  entriesFromCredentials,
  type CsvTable,
  type CsvMapping,
} from '../../lib/csv-import.js';

// Only the Electron desktop build talks to a real Chrome store; the browser popup can't (and
// shouldn't) reach the filesystem, so the direct-import button is desktop-only. See main.ts.
const IS_DESKTOP =
  typeof navigator !== 'undefined' && /\bElectron\//.test(navigator.userAgent);

interface ChromeImportResponse {
  ok: boolean;
  error?: string;
  credentials?: { url: string; username: string; password: string }[];
  undecryptable?: number;
  profiles?: number;
}
interface DesktopImportApi {
  chromeImport: () => Promise<ChromeImportResponse>;
}
function getChromeImporter(): DesktopImportApi | null {
  const api = (globalThis as { electronAPI?: Partial<DesktopImportApi> }).electronAPI;
  return api?.chromeImport ? (api as DesktopImportApi) : null;
}

/**
 * Import screen: paste or upload a password export - a browser CSV (Chrome/Edge/Firefox/Safari,
 * auto-detected by header; unknown headers get a manual column-mapping step) or a Kaspersky
 * Password Manager plaintext export - parse it client-side, dedupe against what's already in the
 * vault, then create each new item through the normal `create_login` message - same
 * encrypted-item-creation path as the manual "Add login" form. This has to happen here (inside an
 * unlocked popup session) rather than as a CLI/server script: the vault is zero-knowledge, so
 * encryption only ever happens with the vault key that lives in the background worker's memory
 * while unlocked.
 */

type Stage =
  | { name: 'input' }
  | { name: 'map'; table: CsvTable; mapping: CsvMapping }
  | { name: 'preview'; entries: ParsedImportEntry[]; dupeKeys: Set<string>; skippedBlocks: number }
  | { name: 'importing'; total: number; done: number }
  | { name: 'done'; imported: number; skippedDupes: number; failed: string[] };

/** The five mappable login fields, in UI order, for the manual column-mapping step. */
const MAP_FIELDS: { key: keyof CsvMapping; label: string }[] = [
  { key: 'name', label: 'Item name' },
  { key: 'url', label: 'Website URL' },
  { key: 'username', label: 'Username / Email' },
  { key: 'password', label: 'Password' },
  { key: 'notes', label: 'Notes' },
];

export function Import({ onDone, onCancel }: { onDone: () => void; onCancel: () => void }) {
  const [text, setText] = useState('');
  const [stage, setStage] = useState<Stage>({ name: 'input' });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => setText(String(reader.result ?? ''));
    reader.readAsText(file);
    e.target.value = ''; // allow re-selecting the same file later
  }

  /** Shared tail of both import paths: dedupe parsed entries against the vault, show preview. */
  async function toPreview(entries: ParsedImportEntry[], skipped: number) {
    if (entries.length === 0) {
      setError('No entries found - expected a browser CSV export or a Kaspersky plaintext export.');
      return;
    }
    setBusy(true);
    // Existing logins so we can skip anything already saved (same site host + same
    // username/email). `list_items` already gives us the (decrypted) uris/username we need.
    const res = await send({ kind: 'list_items' });
    const existing = res.ok && res.kind === 'items' ? res.items.filter((i) => i.type === 'login') : [];
    const existingKeys = new Set(existing.map((i) => dedupeKeyForExisting(i.uris, i.username, i.name)));
    const dupeKeys = new Set(entries.filter((e) => existingKeys.has(e.key)).map((e) => e.key));
    setBusy(false);
    setStage({ name: 'preview', entries, dupeKeys, skippedBlocks: skipped });
    setText(''); // the structured entries are all we need from here - drop the raw plaintext blob
  }

  async function parse() {
    setError(null);
    if (!text.trim()) {
      setError('Paste the export text or choose a file first.');
      return;
    }
    // CSV first: recognized headers (Chrome/Edge/Firefox/Safari & friends) go straight to
    // preview; a real CSV with unknown headers gets the manual column-mapping step instead.
    if (looksLikeCsv(text)) {
      const table = parseCsv(text);
      if (table) {
        const mapping = guessMapping(table.headers);
        if (mappingUsable(mapping)) {
          const { entries, skipped } = csvToEntries(table, mapping);
          await toPreview(entries, skipped);
        } else {
          setStage({ name: 'map', table, mapping });
          setText('');
        }
        return;
      }
    }
    const { entries, skipped } = parseKasperskyExport(text);
    await toPreview(entries, skipped);
  }

  /** Desktop-only: pull credentials straight from Chrome's encrypted store (no CSV export step). */
  async function importFromChrome() {
    setError(null);
    const importer = getChromeImporter();
    if (!importer) return;
    setBusy(true);
    try {
      const res = await importer.chromeImport();
      if (!res.ok) {
        setError(res.error ?? "Couldn't read Chrome's passwords.");
        return;
      }
      const { entries, skipped } = entriesFromCredentials(res.credentials ?? []);
      // Fold anything Chrome-encrypted-but-undecryptable (e.g. newer app-bound "v20" items) into
      // the skipped count so the preview reports them honestly rather than silently dropping them.
      await toPreview(entries, skipped + (res.undecryptable ?? 0));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chrome import failed.');
    } finally {
      setBusy(false);
    }
  }

  async function runImport() {
    if (stage.name !== 'preview') return;
    const toImport = stage.entries.filter((e) => !stage.dupeKeys.has(e.key));
    const skippedDupes = stage.entries.length - toImport.length;
    setStage({ name: 'importing', total: toImport.length, done: 0 });
    const failed: string[] = [];
    for (const entry of toImport) {
      const res = await send({ kind: 'create_login', fields: entry.fields });
      if (!res.ok) failed.push(entry.fields.name);
      setStage((s) => (s.name === 'importing' ? { ...s, done: s.done + 1 } : s));
    }
    setStage({ name: 'done', imported: toImport.length - failed.length, skippedDupes, failed });
  }

  return (
    <div className="flex h-full flex-col">
      <header className="flex items-center gap-2 border-b border-white/5 p-3">
        <Button variant="subtle" onClick={onCancel}>
          <ArrowLeft size={16} /> Cancel
        </Button>
        <span className="text-sm font-semibold">Import Passwords</span>
      </header>

      <div className="flex-1 overflow-y-auto p-4">
        {stage.name === 'input' && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-white/50">
              Import a password export from your browser - Chrome, Edge, Firefox or Safari{' '}
              <span className="font-mono text-white/70">.csv</span> (in Chrome:{' '}
              <span className="text-white/70">Settings → Passwords → Export passwords</span>) - or
              a Kaspersky Password Manager plaintext <span className="font-mono text-white/70">.txt</span>.
              Choose the file or paste its contents below. Nothing leaves your device - parsing
              happens here, and each item is saved the same way as a manually-added login.
            </p>
            <label className="mb-3 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 bg-white/[0.03] py-3 text-sm text-white/60 hover:bg-white/[0.06]">
              <Upload size={15} />
              Choose file…
              <input
                type="file"
                accept=".txt,.csv,text/plain,text/csv"
                className="hidden"
                onChange={onFile}
              />
            </label>
            {IS_DESKTOP && getChromeImporter() && (
              <div className="mb-3">
                <div className="relative mb-3 flex items-center">
                  <div className="h-px flex-1 bg-white/10" />
                  <span className="px-2 text-[10px] uppercase tracking-wider text-white/30">or</span>
                  <div className="h-px flex-1 bg-white/10" />
                </div>
                <Button
                  variant="subtle"
                  className="w-full"
                  onClick={importFromChrome}
                  disabled={busy}
                >
                  <Chrome size={15} /> {busy ? 'Reading Chrome…' : 'Import directly from Google Chrome'}
                </Button>
                <p className="mt-1.5 text-[11px] leading-relaxed text-white/40">
                  Reads your saved Chrome passwords directly - no export needed. Close Google Chrome
                  first so its password file can be read.
                </p>
              </div>
            )}
            <Textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={10}
              placeholder="Website name: …&#10;Website URL: …&#10;Login: …&#10;Password: …&#10;---"
              className="font-mono text-[11px]"
            />
            {error && <p className="mt-2 text-xs text-red-400">{error}</p>}
          </>
        )}

        {stage.name === 'map' && (
          <>
            <p className="mb-3 text-xs leading-relaxed text-white/50">
              This CSV's column names weren't recognized. Match each field to the right column
              (<span className="text-white/70">{stage.table.rows.length}</span> row
              {stage.table.rows.length === 1 ? '' : 's'} found).
            </p>
            <div className="space-y-3">
              {MAP_FIELDS.map(({ key, label }) => (
                <Field key={key} label={label}>
                  <Select<number>
                    value={stage.mapping[key] ?? -1}
                    options={[
                      { value: -1, label: '— not in this file —' },
                      ...stage.table.headers.map((h, i) => ({
                        value: i,
                        label: h || `Column ${i + 1}`,
                      })),
                    ]}
                    onChange={(v) =>
                      setStage((s) =>
                        s.name === 'map'
                          ? { ...s, mapping: { ...s.mapping, [key]: v === -1 ? null : v } }
                          : s,
                      )
                    }
                  />
                </Field>
              ))}
            </div>
            {!mappingUsable(stage.mapping) && (
              <p className="mt-3 text-xs text-amber-400">
                Select at least the Password column plus a name, URL or username column.
              </p>
            )}
          </>
        )}

        {stage.name === 'preview' && (
          <>
            <div className="mb-3 rounded-xl border border-white/[0.07] bg-white/5 p-3 text-xs text-white/60">
              <p>
                Found <span className="font-semibold text-white/90">{stage.entries.length}</span>{' '}
                logins in the export.{' '}
                {stage.dupeKeys.size > 0 && (
                  <>
                    <span className="font-semibold text-white/90">{stage.dupeKeys.size}</span> look
                    already saved and will be skipped.{' '}
                  </>
                )}
                <span className="font-semibold text-emerald-400">
                  {stage.entries.length - stage.dupeKeys.size}
                </span>{' '}
                new item{stage.entries.length - stage.dupeKeys.size === 1 ? '' : 's'} will be imported.
              </p>
              {stage.skippedBlocks > 0 && (
                <p className="mt-1 text-amber-400">
                  {stage.skippedBlocks} block{stage.skippedBlocks === 1 ? '' : 's'} in the file
                  couldn't be parsed and were skipped.
                </p>
              )}
            </div>
            <div className="space-y-1">
              {stage.entries.map((e) => {
                const dupe = stage.dupeKeys.has(e.key);
                const identifier = e.fields.username || e.fields.email || '';
                const site = e.fields.uris[0] ?? null;
                return (
                  <div
                    key={`${e.key}:${e.fields.name}`}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                      dupe ? 'opacity-40' : ''
                    }`}
                  >
                    <span className="min-w-0 flex-1 truncate text-white/80">{e.fields.name}</span>
                    {identifier && (
                      <span className="min-w-0 flex-1 truncate text-white/40">{identifier}</span>
                    )}
                    {!site && <span className="shrink-0 text-white/25">no site</span>}
                    {dupe && (
                      <span className="shrink-0 rounded-full bg-white/10 px-1.5 py-0.5 text-[10px] text-white/50">
                        already saved
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </>
        )}

        {stage.name === 'importing' && (
          <div className="flex flex-col items-center justify-center gap-3 py-10">
            <div className="h-1.5 w-full max-w-xs overflow-hidden rounded-full bg-white/10">
              <div
                className="h-full rounded-full bg-gradient-to-r from-violet-glow to-indigo-500 transition-all"
                style={{ width: `${stage.total ? (stage.done / stage.total) * 100 : 100}%` }}
              />
            </div>
            <p className="text-xs text-white/50">
              Importing {stage.done} / {stage.total}…
            </p>
          </div>
        )}

        {stage.name === 'done' && (
          <div className="flex flex-col items-center gap-3 py-8 text-center">
            <ShieldCheck size={32} className="text-emerald-400" />
            <p className="text-sm text-white/90">
              Imported <span className="font-semibold">{stage.imported}</span> login
              {stage.imported === 1 ? '' : 's'}.
            </p>
            {stage.skippedDupes > 0 && (
              <p className="text-xs text-white/40">
                {stage.skippedDupes} duplicate{stage.skippedDupes === 1 ? '' : 's'} skipped.
              </p>
            )}
            {stage.failed.length > 0 && (
              <div className="w-full rounded-xl border border-red-500/20 bg-red-500/5 p-3 text-left text-xs text-red-300">
                <p className="mb-1 font-medium">{stage.failed.length} item(s) failed to save:</p>
                <ul className="list-inside list-disc">
                  {stage.failed.map((n, i) => (
                    <li key={i}>{n}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </div>

      <footer className="flex gap-2 border-t border-white/5 p-3">
        {stage.name === 'input' && (
          <Button className="w-full" onClick={parse} disabled={busy || !text.trim()}>
            {busy ? 'Checking…' : 'Parse'}
          </Button>
        )}
        {stage.name === 'map' && (
          <>
            <Button variant="subtle" onClick={() => setStage({ name: 'input' })}>
              Back
            </Button>
            <Button
              className="flex-1"
              disabled={!mappingUsable(stage.mapping) || busy}
              onClick={() => {
                const { entries, skipped } = csvToEntries(stage.table, stage.mapping);
                void toPreview(entries, skipped);
              }}
            >
              {busy ? 'Checking…' : 'Continue'}
            </Button>
          </>
        )}
        {stage.name === 'preview' && (
          <>
            <Button variant="subtle" onClick={() => setStage({ name: 'input' })}>
              Back
            </Button>
            <Button
              className="flex-1"
              onClick={runImport}
              disabled={stage.entries.length - stage.dupeKeys.size === 0}
            >
              <Check size={15} /> Import {stage.entries.length - stage.dupeKeys.size} item
              {stage.entries.length - stage.dupeKeys.size === 1 ? '' : 's'}
            </Button>
          </>
        )}
        {stage.name === 'done' && (
          <Button className="w-full" onClick={onDone}>
            Done
          </Button>
        )}
      </footer>
    </div>
  );
}
