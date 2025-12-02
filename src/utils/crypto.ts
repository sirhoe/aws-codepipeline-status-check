// Encryption utility for sensitive data
// Uses AES-GCM encryption with a constant encryption key

const ENCRYPTION_PASSPHRASE = 'aws-codepipeline-status-extension-v1-encryption-key';

// Convert string to Uint8Array
function stringToUint8Array(str: string): Uint8Array {
  return new TextEncoder().encode(str);
}

// Convert ArrayBuffer to string
function arrayBufferToString(buffer: Uint8Array): string {
  return new TextDecoder().decode(buffer);
}

// Convert ArrayBuffer to base64
function arrayBufferToBase64(buffer: Uint8Array): string {
  return btoa(String.fromCharCode(...buffer));
}

// Convert base64 to ArrayBuffer
function base64ToArrayBuffer(base64: string): Uint8Array {
  const binaryString = atob(base64);
  const bytes = new Uint8Array(binaryString.length);
  for (let i = 0; i < binaryString.length; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
}

// Derive a cryptographic key from the passphrase
async function deriveKey(): Promise<CryptoKey> {
  const passphraseBuffer = stringToUint8Array(ENCRYPTION_PASSPHRASE);
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    passphraseBuffer as BufferSource,
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  // Use a fixed salt since we're using a constant passphrase
  const saltBuffer = stringToUint8Array('aws-cp-status-salt-v1');

  return crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: saltBuffer as BufferSource,
      iterations: 100000,
      hash: 'SHA-256'
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Encrypts a string value using AES-GCM
 * @param plaintext The string to encrypt
 * @returns Base64-encoded encrypted data with IV prepended and a prefix marker
 */
export async function encrypt(plaintext: string): Promise<string> {
  if (!plaintext) return '';

  const key = await deriveKey();
  
  // Generate a random initialization vector
  const iv = crypto.getRandomValues(new Uint8Array(12));
  
  const plaintextBuffer = stringToUint8Array(plaintext);
  const encrypted = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: iv
    },
    key,
    plaintextBuffer as BufferSource
  );

  // Combine IV and encrypted data
  const encryptedArray = new Uint8Array(encrypted);
  const combined = new Uint8Array(iv.length + encryptedArray.length);
  combined.set(iv);
  combined.set(encryptedArray, iv.length);

  // Add prefix to identify encrypted data
  return 'enc_v1:' + arrayBufferToBase64(combined);
}

/**
 * Decrypts a base64-encoded encrypted string
 * @param ciphertext Base64-encoded encrypted data with prefix, or plain text
 * @returns Decrypted plaintext string
 */
export async function decrypt(ciphertext: string): Promise<string> {
  if (!ciphertext) return '';

  // Check if data is encrypted (has our prefix)
  if (!ciphertext.startsWith('enc_v1:')) {
    // Not encrypted, return as-is (legacy plain text)
    return ciphertext;
  }

  try {
    // Remove prefix
    const encryptedData = ciphertext.substring(7);
    
    const key = await deriveKey();
    const combined = base64ToArrayBuffer(encryptedData);

    // Extract IV and encrypted data
    const iv = combined.slice(0, 12);
    const encryptedBytes = combined.slice(12);

    const decrypted = await crypto.subtle.decrypt(
      {
        name: 'AES-GCM',
        iv: iv
      },
      key,
      encryptedBytes
    );

    return arrayBufferToString(new Uint8Array(decrypted));
  } catch (error) {
    console.error('Decryption failed:', error);
    throw new Error('Failed to decrypt data');
  }
}

