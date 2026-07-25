/**
 * Standard RFC 6238 TOTP (Time-Based One-Time Password) Generator and Validator
 * Compatible with Google Authenticator, Authy, Microsoft Authenticator.
 */

const BASE32_ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';

/**
 * Encode Uint8Array to Base32 string
 */
export function base32Encode(bytes: Uint8Array): string {
  let result = '';
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < bytes.length; i++) {
    buffer = (buffer << 8) | bytes[i];
    bitsLeft += 8;

    while (bitsLeft >= 5) {
      bitsLeft -= 5;
      const index = (buffer >> bitsLeft) & 31;
      result += BASE32_ALPHABET[index];
    }
  }

  if (bitsLeft > 0) {
    const index = (buffer << (5 - bitsLeft)) & 31;
    result += BASE32_ALPHABET[index];
  }

  return result;
}

/**
 * Decode Base32 string to Uint8Array
 */
export function base32Decode(base32: string): Uint8Array {
  const cleanBase32 = base32.toUpperCase().replace(/[^A-Z2-7]/g, '');
  const bytes: number[] = [];
  let buffer = 0;
  let bitsLeft = 0;

  for (let i = 0; i < cleanBase32.length; i++) {
    const value = BASE32_ALPHABET.indexOf(cleanBase32[i]);
    if (value === -1) continue;

    buffer = (buffer << 5) | value;
    bitsLeft += 5;

    if (bitsLeft >= 8) {
      bitsLeft -= 8;
      bytes.push((buffer >> bitsLeft) & 255);
    }
  }

  return new Uint8Array(bytes);
}

/**
 * Generate a random 16-character Base32 TOTP secret key
 */
export function generateTotpSecret(): string {
  const randomBytes = new Uint8Array(10);
  window.crypto.getRandomValues(randomBytes);
  return base32Encode(randomBytes).slice(0, 16);
}

/**
 * Compute HMAC-SHA1 using Web Crypto API
 */
async function hmacSha1(keyBytes: Uint8Array, messageBytes: Uint8Array): Promise<Uint8Array> {
  const key = await window.crypto.subtle.importKey(
    'raw',
    keyBytes,
    { name: 'HMAC', hash: 'SHA-1' },
    false,
    ['sign']
  );

  const signature = await window.crypto.subtle.sign('HMAC', key, messageBytes);
  return new Uint8Array(signature);
}

/**
 * Generate 6-digit TOTP code for a secret at a given timestamp
 */
export async function generateTOTP(secretBase32: string, timestamp: number = Date.now()): Promise<string> {
  try {
    const keyBytes = base32Decode(secretBase32);
    if (keyBytes.length === 0) return '000000';

    // 30-second time window
    const epoch = Math.floor(timestamp / 1000);
    const timeStep = Math.floor(epoch / 30);

    // Convert timeStep to 8-byte big-endian buffer
    const msgBytes = new Uint8Array(8);
    let temp = timeStep;
    for (let i = 7; i >= 0; i--) {
      msgBytes[i] = temp & 0xff;
      temp = Math.floor(temp / 256);
    }

    const hmac = await hmacSha1(keyBytes, msgBytes);

    // Dynamic Truncation
    const offset = hmac[hmac.length - 1] & 0x0f;
    const codeBinary =
      ((hmac[offset] & 0x7f) << 24) |
      ((hmac[offset + 1] & 0xff) << 16) |
      ((hmac[offset + 2] & 0xff) << 8) |
      (hmac[offset + 3] & 0xff);

    const otp = codeBinary % 1000000;
    return otp.toString().padStart(6, '0');
  } catch (err) {
    console.error('TOTP Generation error:', err);
    return '000000';
  }
}

/**
 * Verify TOTP code allowing +/- 1 timestep window for clock drift
 */
export async function verifyTOTP(
  secretBase32: string,
  userCode: string,
  timestamp: number = Date.now()
): Promise<boolean> {
  const cleanCode = userCode.trim().replace(/\s+/g, '');
  if (!cleanCode || cleanCode.length !== 6) return false;

  const currentStep = Math.floor(timestamp / 1000);

  // Check windows: -30s, 0s, +30s
  for (let delta = -1; delta <= 1; delta++) {
    const targetTimestamp = (currentStep + delta * 30) * 1000;
    const validCode = await generateTOTP(secretBase32, targetTimestamp);
    if (validCode === cleanCode) {
      return true;
    }
  }

  return false;
}

/**
 * Get remaining seconds in current 30s TOTP cycle (1..30)
 */
export function getTotpRemainingSeconds(): number {
  const epoch = Math.floor(Date.now() / 1000);
  return 30 - (epoch % 30);
}

/**
 * Generate standard OTPAuth URI for QR Code generators (Google Authenticator)
 */
export function getTotpAuthUri(
  secretBase32: string,
  accountName: string = 'usuario@cofre.local',
  issuer: string = 'VaultSecure'
): string {
  const encAccount = encodeURIComponent(accountName);
  const encIssuer = encodeURIComponent(issuer);
  return `otpauth://totp/${encIssuer}:${encAccount}?secret=${secretBase32}&issuer=${encIssuer}&algorithm=SHA1&digits=6&period=30`;
}
