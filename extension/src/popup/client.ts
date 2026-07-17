/** Typed wrapper around chrome.runtime.sendMessage for the popup UI. */

import type { Msg, MsgResult } from '../lib/messages.js';

export async function send(msg: Msg): Promise<MsgResult> {
  return (await chrome.runtime.sendMessage(msg)) as MsgResult;
}

/** Throws on `{ ok: false }`, otherwise returns the narrowed result. */
export async function sendOrThrow(msg: Msg): Promise<MsgResult> {
  const res = await send(msg);
  if (!res.ok) throw new Error(res.error);
  return res;
}
