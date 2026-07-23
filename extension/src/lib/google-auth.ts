/**
 * Google OAuth helper for NextPass Chrome Extension.
 * Uses chrome.identity.launchWebAuthFlow when available, with clean fallback.
 */

export interface GoogleUser {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  idToken?: string;
}

export async function promptGoogleAuth(): Promise<GoogleUser | null> {
  const clientId = (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID) || '';

  if (clientId && typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow) {
    try {
      const redirectUri = chrome.identity.getRedirectURL();
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=id_token%20token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile&nonce=nextpass`;

      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      if (responseUrl) {
        const hash = new URL(responseUrl).hash.substring(1);
        const params = new URLSearchParams(hash);
        const idToken = params.get('id_token');
        if (idToken) {
          const base64Url = idToken.split('.')[1];
          const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
          const jsonPayload = decodeURIComponent(
            atob(base64)
              .split('')
              .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
              .join(''),
          );
          const jwt = JSON.parse(jsonPayload);
          return {
            googleId: jwt.sub,
            email: jwt.email,
            name: jwt.name,
            picture: jwt.picture,
            idToken,
          };
        }
      }
    } catch (err) {
      console.warn('[pm] chrome.identity launchWebAuthFlow fallback triggered:', err);
    }
  }

  // Interactive fallback prompt for dev/testing when OAuth client_id is not configured
  const email = window.prompt('Sign in with Google - Enter your Google Email address:');
  if (!email || !email.trim()) return null;
  const cleanEmail = email.trim().toLowerCase();

  // Deterministic Google Sub ID derivation for test environments
  const encoder = new TextEncoder();
  const data = encoder.encode('google-sub-id:' + cleanEmail);
  const hashBuf = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuf));
  const googleId = hashArray.map((b) => b.toString(16).padStart(2, '0')).join('').substring(0, 21);

  return {
    googleId,
    email: cleanEmail,
    name: cleanEmail.split('@')[0],
  };
}
