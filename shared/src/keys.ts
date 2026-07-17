/**
 * Embedded RSA-3072 PUBLIC keys (SPKI, base64/DER).
 *
 * These are safe to ship in client code — they are public keys. The matching PRIVATE keys
 * live OUTSIDE this repo (git-ignored, `../password-manager-secrets/`) and are never sent to
 * the server:
 *
 *   - ADMIN key   → held only by Fabian. Wrapping happens invisibly during every self-service
 *                   registration (see `register.ts`) so the admin retains one-way read access
 *                   to every vault created. Fabian's OWN account skips this wrap (he is admin).
 *   - AUTOMATION  → the single shared automation identity (CCOS / Claude). Only used to wrap
 *                   the per-item key of items explicitly flagged "exposed to automation".
 *
 * Rotating a key = generate a new pair, swap the constant below, and re-wrap affected vaults
 * / items with the new public key.
 */

export const ADMIN_PUBKEY_SPKI_B64 =
  'MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAg2Xoo4NrK16FOxl0zr3Tn7T0H3eN6edkBD6yJzNWlNuBrP+1QuIAEyX7tF4kkXTlFPRRoaMD2fmKcwT+yv0Kl61iTe5WAZFpAh4oHIr7KapSwPWiaFfyAjRjvHhMBQm61bOHmNhm0ho0Knbn29bx6DUmkd7ret3i3wwvSqdsNB6WZRWn0bIvMdhjxfrLHQRBzBRerYij+8cDnBkFnEqB2+T2xiz/atcQ1TVosTUVZv2h5HoRIazZCmpljU3CvNgFW6dn+EunOJrC5tSkcBm1wlf3nLlvxBbkvNcckLtDVvELrf+ie7nGKxuRpg9FJFws6SuLdDTArgqZxMdooNAPXOvhNxzruRcORkJFv9nPr5VPnyxe627hiftykGPp+Y4cd0NyuB9mYogD2gxIxa/Ys6RzLkAEsp6DjFlFUJepYqVUKyT71vLeYXI+qDQQWYPfv6DxH5XkUuCYhEnVUi4jcIapRw08idyXkqcLIqO5r4fZrTaX78hsGcuuzkHRx5oTAgMBAAE=';

export const AUTOMATION_PUBKEY_SPKI_B64 =
  'MIIBojANBgkqhkiG9w0BAQEFAAOCAY8AMIIBigKCAYEAsYN7+VV8rAuoF2tm+1OxtmU4CHRwALTdQW01ZwTRNAgEgOaOpYSLac3KjRkwLCeIFYKwvavV7qZ0jqvw7FeAs/Mp//hJRJ8kWXQujHHVUJsIOQ0gy05vU5XBQohS13Nv34qTbmoqMOi4sGhyODbrGIdxk/ln6CGOgnWTmalrSMq/WS4rSHZkDvDDA68sN92P4Cptcf3FULh8XvPgFreIzLFKR3c5cuxl/9xFht0mvd6XNq52v1sdu6oRZhQcF77EARla757Wb4ZRgDDMDbKqYlwgRt+o9rVWvv2s5jqcWCoGlmef2XVCY2vwm4+N9sy6BaHWQXhG0k9XiQnTvBRsVKntxNISbCMEp4nl9/XwdDW4hz+QLmjATCNcCZgrCYhTo+A+OC8EqjHI1gcE2HzVCeiRwns+rbYRbJxhBKpv2pKuKsOR2CidmclV0eTr5GYoNMU8ues/KkSom90luvSbmgC074+tfx+MlvQWJmPdrLUpznV4pySRSdhFol9XpctVAgMBAAE=';
