import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "crypto"

/**
 * Encryption utilities for sensitive data
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = "aes-256-gcm"
const IV_LENGTH = 16 // 16 bytes for AES
const SALT_LENGTH = 32 // 32 bytes for salt
const TAG_LENGTH = 16 // 16 bytes for GCM auth tag
const KEY_LENGTH = 32 // 32 bytes for AES-256

/**
 * Get encryption key from MASTER_KEY env var
 * MASTER_KEY should be a base64-encoded 32-byte key
 */
function getMasterKey(): Buffer {
  const masterKeyBase64 = process.env.MASTER_KEY
  if (!masterKeyBase64) {
    throw new Error(
      "MASTER_KEY environment variable is not set. Please configure encryption in your environment variables."
    )
  }

  try {
    const key = Buffer.from(masterKeyBase64, "base64")
    if (key.length !== KEY_LENGTH) {
      throw new Error(`MASTER_KEY must be exactly ${KEY_LENGTH} bytes (base64 encoded)`)
    }
    return key
  } catch (error) {
    throw new Error(`Invalid MASTER_KEY format: ${error instanceof Error ? error.message : "unknown error"}`)
  }
}

/**
 * Encrypt a plaintext string
 * Returns base64-encoded string: salt + iv + encrypted + tag
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    throw new Error("Cannot encrypt empty string")
  }

  const masterKey = getMasterKey()
  
  // Generate random salt and IV
  const salt = randomBytes(SALT_LENGTH)
  const iv = randomBytes(IV_LENGTH)
  
  // Derive key from master key using salt (for key stretching)
  const key = scryptSync(masterKey, salt, KEY_LENGTH)
  
  // Create cipher
  const cipher = createCipheriv(ALGORITHM, key, iv)
  
  // Encrypt
  let encrypted = cipher.update(plaintext, "utf8")
  encrypted = Buffer.concat([encrypted, cipher.final()])
  
  // Get auth tag
  const tag = cipher.getAuthTag()
  
  // Combine: salt + iv + encrypted + tag
  const combined = Buffer.concat([salt, iv, encrypted, tag])
  
  // Return as base64
  return combined.toString("base64")
}

/**
 * Decrypt a base64-encoded encrypted string
 * Expects format: salt + iv + encrypted + tag
 */
export function decrypt(encryptedBase64: string): string {
  if (!encryptedBase64) {
    throw new Error("Cannot decrypt empty string")
  }

  const masterKey = getMasterKey()
  
  try {
    // Decode from base64
    const combined = Buffer.from(encryptedBase64, "base64")
    
    // Extract components
    const salt = combined.subarray(0, SALT_LENGTH)
    const iv = combined.subarray(SALT_LENGTH, SALT_LENGTH + IV_LENGTH)
    const encrypted = combined.subarray(
      SALT_LENGTH + IV_LENGTH,
      combined.length - TAG_LENGTH
    )
    const tag = combined.subarray(combined.length - TAG_LENGTH)
    
    // Derive key from master key using salt
    const key = scryptSync(masterKey, salt, KEY_LENGTH)
    
    // Create decipher
    const decipher = createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(tag)
    
    // Decrypt
    let decrypted = decipher.update(encrypted)
    decrypted = Buffer.concat([decrypted, decipher.final()])
    
    return decrypted.toString("utf8")
  } catch (error) {
    throw new Error(`Decryption failed: ${error instanceof Error ? error.message : "unknown error"}`)
  }
}

/**
 * Generate a secure random password for database
 * Returns a base64-encoded string suitable for PostgreSQL passwords
 */
export function generateSecurePassword(length: number = 32): string {
  const bytes = randomBytes(length)
  // Use base64 but replace characters that might cause issues in URLs/connection strings
  return bytes.toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=/g, "")
    .substring(0, length)
}

