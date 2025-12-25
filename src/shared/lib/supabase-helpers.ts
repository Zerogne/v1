/**
 * Helper functions for Supabase integration
 */

/**
 * Normalize Supabase URL (trim, remove trailing slash)
 */
export function normalizeSupabaseUrl(url: string): string {
  return url.trim().replace(/\/+$/, "")
}

/**
 * Mask anon key for display (show last 6 chars)
 */
export function maskAnonKey(key: string): string {
  if (key.length <= 6) {
    return "*".repeat(key.length)
  }
  return "*".repeat(key.length - 6) + key.slice(-6)
}

/**
 * Generate migration file path
 * Format: supabase/migrations/YYYYMMDD_HHMMSS_slug.sql
 */
export function makeMigrationPath(title: string): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, "0")
  const day = String(now.getDate()).padStart(2, "0")
  const hours = String(now.getHours()).padStart(2, "0")
  const minutes = String(now.getMinutes()).padStart(2, "0")
  const seconds = String(now.getSeconds()).padStart(2, "0")
  
  // Create slug from title
  const slug = title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .substring(0, 50) // Limit length
  
  const timestamp = `${year}${month}${day}_${hours}${minutes}${seconds}`
  return `supabase/migrations/${timestamp}_${slug}.sql`
}

/**
 * Validate Supabase URL format
 */
export function isValidSupabaseUrl(url: string): boolean {
  try {
    const normalized = normalizeSupabaseUrl(url)
    const urlObj = new URL(normalized)
    return urlObj.protocol === "https:" || urlObj.protocol === "http:"
  } catch {
    return false
  }
}

/**
 * Validate Supabase anon key format (basic check)
 */
export function isValidAnonKey(key: string): boolean {
  // Supabase anon keys are typically long base64-like strings
  // Minimum length is usually around 100+ chars, but we'll be lenient
  // Allow at least 20 chars and base64-like characters
  if (key.length < 20) {
    return false
  }
  // Allow base64 characters: A-Z, a-z, 0-9, +, /, =, -, _
  return /^[A-Za-z0-9+\/=\-_]+$/.test(key)
}

/**
 * Validate service role key format (same as anon key)
 */
export function isValidServiceRoleKey(key: string): boolean {
  return isValidAnonKey(key)
}

/**
 * Mask service role key for display (same as anon key)
 */
export function maskServiceRoleKey(key: string): string {
  return maskAnonKey(key)
}

