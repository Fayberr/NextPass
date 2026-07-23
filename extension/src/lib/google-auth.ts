/**
 * Google OAuth helper for NextPass Chrome Extension & Desktop app.
 * Uses chrome.identity.launchWebAuthFlow in Extension, and electronAPI.googleOAuth in Desktop app.
 */

export interface GoogleUser {
  googleId: string;
  email: string;
  name?: string;
  picture?: string;
  idToken?: string;
}

export async function promptGoogleAuth(): Promise<GoogleUser | null> {
  const clientId =
    (typeof process !== 'undefined' && process.env?.GOOGLE_CLIENT_ID) ||
    '103728403142-enre6hvcqo9palkbqgu3499d2uks1nfm.apps.googleusercontent.com';

  // 1. Chrome Extension Environment
  if (typeof chrome !== 'undefined' && chrome.identity?.launchWebAuthFlow) {
    try {
      const redirectUri = chrome.identity.getRedirectURL();
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&response_type=id_token%20token&redirect_uri=${encodeURIComponent(redirectUri)}&scope=openid%20email%20profile&prompt=select_account&nonce=nextpass`;

      const responseUrl = await chrome.identity.launchWebAuthFlow({
        url: authUrl,
        interactive: true,
      });

      if (responseUrl) {
        return parseGoogleIdToken(responseUrl);
      }
    } catch (err) {
      console.warn('[pm] chrome.identity launchWebAuthFlow cancelled or failed:', err);
      return null;
    }
  }

  // 2. Electron Desktop App Environment (Real Google Auth Popup Window)
  if (typeof window !== 'undefined' && (window as any).electronAPI?.googleOAuth) {
    try {
      const res = await (window as any).electronAPI.googleOAuth();
      if (res && res.email) {
        return res as GoogleUser;
      }
    } catch (err) {
      console.warn('[pm] Electron googleOAuth window cancelled or failed:', err);
    }
  }

  return null;
}

function parseGoogleIdToken(responseUrl: string): GoogleUser | null {
  try {
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
  } catch {}
  return null;
}
