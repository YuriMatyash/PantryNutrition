const PBKDF2_ITERATIONS = 100_000;
const SALT_BYTES = 16;
const DERIVED_KEY_BYTES = 32;

const encoder = new TextEncoder();

function bytesToBase64(bytes: Uint8Array): string {
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary);
}

function base64ToBytes(base64: string): Uint8Array {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

function constantTimeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) diff |= a[i] ^ b[i];
  return diff === 0;
}

async function derivePasswordDigest(password: string, salt: Uint8Array): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );

  const bits = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      hash: "SHA-256",
      salt,
      iterations: PBKDF2_ITERATIONS,
    },
    keyMaterial,
    DERIVED_KEY_BYTES * 8,
  );

  return new Uint8Array(bits);
}

/**
 * Hash format intentionally matches existing FastAPI backend:
 * base64(salt)$base64(pbkdf2_sha256_digest)
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.getRandomValues(new Uint8Array(SALT_BYTES));
  const digest = await derivePasswordDigest(password, salt);
  return `${bytesToBase64(salt)}$${bytesToBase64(digest)}`;
}

export async function verifyPassword(plainPassword: string, storedHash: string): Promise<boolean> {
  try {
    const [saltB64, digestB64] = storedHash.split("$", 2);
    if (!saltB64 || !digestB64) return false;

    const salt = base64ToBytes(saltB64);
    const expectedDigest = base64ToBytes(digestB64);
    const actualDigest = await derivePasswordDigest(plainPassword, salt);

    return constantTimeEqual(actualDigest, expectedDigest);
  } catch {
    return false;
  }
}
