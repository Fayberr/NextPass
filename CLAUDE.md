# Password Manager — project rules

## Keep the extension's version + description current (standing rule)
`extension/src/manifest.config.ts` has `version` and `description` fields shown to Fabian
directly in `chrome://extensions` (see the card UI). Whenever you ship a notable change to
the extension (new feature, meaningful fix, UX rework — not tiny tweaks/typos):
- **Bump `version`** (semver-ish; still pre-1.0 so bump the minor for features, patch for
  fixes: `0.MINOR.PATCH`).
- **Update `description`** so it reflects current real capabilities in plain language (what
  it does today, not the phase/roadmap jargon) — e.g. mention autofill, generator, passkeys,
  notes/cards, TOTP, etc. as they land.
- Rebuild (`npm run build` in `extension/`) and redeploy to the WinPC
  (`C:/Users/derfa/pm-extension`, see `~/brain/projects/password-manager.md` for the deploy
  commands) so the installed extension shows the new metadata after reload.
- This applies automatically going forward — don't wait to be asked each time.
