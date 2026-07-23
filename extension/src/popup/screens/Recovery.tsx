import { useState } from 'react';
import { Button, Card } from '../ui.js';
import { Copy, Check, Download } from '../icons.js';
import { send } from '../client.js';

/**
 * One-time recovery-phrase screen. The phrase is held in the background (chrome.storage.session),
 * so this screen re-appears on popup reopen / service-worker teardown until the user confirms they
 * saved it - it can't be lost by accidentally closing the window.
 */
export function Recovery({ phrase, identifier, onAcked }: { phrase: string; identifier: string | null; onAcked: () => void }) {
  const [copied, setCopied] = useState(false);
  const [busy, setBusy] = useState(false);

  function fileContent(): string {
    const who = identifier || 'account';
    return [
      'NextPass - Recovery Phrase',
      '===================================',
      '',
      `Account: ${who}`,
      `Created: ${new Date().toISOString()}`,
      '',
      'This 12-word phrase is the ONLY way to recover your vault if you',
      'forget your master password. Anyone with this phrase can decrypt',
      'your vault. Keep it offline and secret. It is shown once and is',
      'never stored on the server.',
      '',
      'Recovery phrase:',
      phrase,
      '',
    ].join('\n');
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(phrase);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard may be blocked; ignore */
    }
  }

  function download() {
    const blob = new Blob([fileContent()], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const who = (identifier || 'account').replace(/[^a-z0-9._-]+/gi, '-');
    a.href = url;
    a.download = `pm-recovery-${who}.txt`;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  async function acknowledge() {
    setBusy(true);
    await send({ kind: 'ack_recovery' });
    onAcked();
  }

  return (
    <div className="p-5">
      <h1 className="mb-1 text-lg font-semibold">Save your recovery phrase</h1>
      <p className="mb-3 text-xs text-white/50">
        This 12-word phrase is the only way to recover your vault if you forget your master
        password. It is shown once and never stored. Write it down now.
      </p>
      <Card className="mb-4">
        <div className="grid grid-cols-3 gap-2 font-mono text-sm">
          {phrase.split(' ').map((w, i) => (
            <div key={i} className="rounded-lg bg-white/5 px-2 py-1">
              <span className="mr-1 text-white/30">{i + 1}</span>
              {w}
            </div>
          ))}
        </div>
      </Card>
      <div className="mb-3 flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={copy}>
          {copied ? <Check size={16} /> : <Copy size={16} />}
          {copied ? 'Copied' : 'Copy'}
        </Button>
        <Button variant="ghost" className="flex-1" onClick={download}>
          <Download size={16} /> Download .txt
        </Button>
      </div>
      <Button className="w-full" onClick={acknowledge} disabled={busy}>
        I've saved it - open my vault
      </Button>
    </div>
  );
}
