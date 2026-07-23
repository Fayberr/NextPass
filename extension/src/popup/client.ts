/** Typed wrapper around chrome.runtime.sendMessage for the popup UI. */

import type { Msg, MsgResult } from '../lib/messages.js';
import { handleMessage } from '../lib/handler.js';

export async function send(msg: Msg): Promise<MsgResult> {
  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    return (await chrome.runtime.sendMessage(msg)) as MsgResult;
  }
  return await handleMessage(msg);
}

/** Throws on `{ ok: false }`, otherwise returns the narrowed result. */
export async function sendOrThrow(msg: Msg): Promise<MsgResult> {
  const res = await send(msg);
  if (!res.ok) throw new Error(res.error);
  return res;
}
