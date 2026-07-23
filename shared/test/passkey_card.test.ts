import { describe, it, expect } from 'vitest';
import { createPasskey, signAssertion, b64url } from '../src/webauthn.js';
import { randomBytes, sha256 } from '../src/crypto.js';
import { encryptItem, decryptItem } from '../src/vault.js';
import type { CardFields } from '../src/types.js';

describe('Passkey (WebAuthn / FIDO2) & Credit Card Integration Suite', () => {
  it('1. PASSKEY: Virtual FIDO2 Authenticator Registration & Assertion Verification', async () => {
    const rpId = 'example.com';
    const origin = 'https://example.com';
    const challenge = randomBytes(32);
    const userHandle = randomBytes(16);

    // Create Passkey Attestation
    const { passkey, response } = await createPasskey({ rpId, origin, challenge, userHandle });
    expect(passkey.credentialId).toHaveLength(32);
    expect(response.attestationObject).toBeDefined();
    expect(response.clientDataJSON).toBeDefined();

    // Sign Login Assertion with Passkey
    const loginChallenge = randomBytes(32);
    const assertion = await signAssertion({ rpId, origin, challenge: loginChallenge }, passkey);

    expect(assertion.credentialId).toBeDefined();
    expect(assertion.clientDataJSON).toBeDefined();
    expect(assertion.authenticatorData).toBeDefined();
    expect(assertion.signature).toBeDefined();
    expect(assertion.newSignCount).toBe(1);
  });

  it('2. CREDIT CARD: AES-256-GCM Vault Encryption & Payment Autofill Field Round-trip', async () => {
    const vaultKey = randomBytes(32);
    const cardData: CardFields = {
      name: 'Corporate Amex Platinum',
      cardholder: 'Fabian Kolb',
      number: '378282246310005',
      expMonth: '10',
      expYear: '2029',
      cvv: '9999',
      notes: 'Primary corporate expense card',
    };

    // Encrypt Card Item
    const encryptedRecord = await encryptItem(vaultKey, 'card', cardData);
    expect(encryptedRecord.type).toBe('card');
    expect(encryptedRecord.encryptedBlob).toBeDefined();

    // Decrypt Card Item
    const decryptedFields = (await decryptItem(vaultKey, encryptedRecord)) as CardFields;
    expect(decryptedFields.cardholder).toBe('Fabian Kolb');
    expect(decryptedFields.number).toBe('378282246310005');
    expect(decryptedFields.expMonth).toBe('10');
    expect(decryptedFields.expYear).toBe('2029');
    expect(decryptedFields.cvv).toBe('9999');
  });
});
