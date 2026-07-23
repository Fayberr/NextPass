/**
 * Main-world priority guard for the WebAuthn shim (world: MAIN, document_start).
 *
 * The actual interception is done at the browser level by chrome.webAuthenticationProxy in the
 * background. But a competing extension (e.g. Kaspersky) can monkey-patch navigator.credentials in
 * the page, which would run BEFORE the native path and steal the ceremony from our proxy.
 *
 * To keep authority, we bind create/get/isUvpaa to the native implementations and lock the
 * properties (non-writable, non-configurable) so nothing can replace them afterwards. All calls
 * then flow through the native path -> our proxy. Best-effort: whoever runs first at document_start
 * wins the lock; try/catch keeps us from ever breaking the page.
 */
(() => {
  try {
    const creds = navigator.credentials as CredentialsContainer | undefined;
    if (!creds) return;

    const nativeCreate = creds.create.bind(creds);
    const nativeGet = creds.get.bind(creds);
    Object.defineProperty(creds, 'create', { value: nativeCreate, writable: false, configurable: false, enumerable: true });
    Object.defineProperty(creds, 'get', { value: nativeGet, writable: false, configurable: false, enumerable: true });

    const PKC = (window as unknown as { PublicKeyCredential?: { isUserVerifyingPlatformAuthenticatorAvailable?: () => Promise<boolean> } }).PublicKeyCredential;
    if (PKC?.isUserVerifyingPlatformAuthenticatorAvailable) {
      const nativeUvpaa = PKC.isUserVerifyingPlatformAuthenticatorAvailable.bind(PKC);
      Object.defineProperty(PKC, 'isUserVerifyingPlatformAuthenticatorAvailable', {
        value: nativeUvpaa,
        writable: false,
        configurable: false,
      });
    }
  } catch {
    /* another guard already locked these, or the engine disallows it - nothing to do. */
  }
})();
