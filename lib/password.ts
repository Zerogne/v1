import bcrypt from "bcryptjs"

/**
 * Password hashing and verification utilities
 * Uses bcrypt with salt rounds for secure password storage
 */

const SALT_ROUNDS = 12 // Higher rounds = more secure but slower

/**
 * Hash a plaintext password
 * @param password - Plaintext password to hash
 * @returns Hashed password string
 */
export async function hashPassword(password: string): Promise<string> {
  if (!password || password.length === 0) {
    throw new Error("Password cannot be empty")
  }
  
  if (password.length < 6) {
    throw new Error("Password must be at least 6 characters")
  }
  
  return bcrypt.hash(password, SALT_ROUNDS)
}

/**
 * Verify a password against a hash
 * @param password - Plaintext password to verify
 * @param hash - Hashed password to compare against
 * @returns True if password matches, false otherwise
 */
export async function verifyPassword(
  password: string,
  hash: string
): Promise<boolean> {
  if (!password || !hash) {
    return false
  }
  
  try {
    return await bcrypt.compare(password, hash)
  } catch (error) {
    console.error("Error verifying password:", error)
    return false
  }
}

/**
 * Check if a string is a bcrypt hash
 * Useful for migration scenarios
 */
export function isBcryptHash(str: string): boolean {
  // Bcrypt hashes start with $2a$, $2b$, or $2y$ and are 60 characters long
  return /^\$2[ayb]\$\d{2}\$[./A-Za-z0-9]{53}$/.test(str)
}

