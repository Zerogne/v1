/**
 * Supabase migration runner with safety guardrails
 * Server-only - connects directly to PostgreSQL
 */

import "server-only"

import { decrypt } from "@/lib/crypto"
import { prisma } from "@/lib/prisma"
import { createHash } from "crypto"

// We'll use dynamic import for pg to avoid bundling in client
let pg: typeof import("pg") | null = null

async function getPg() {
  if (!pg) {
    pg = await import("pg")
  }
  return pg
}

/**
 * Allowed SQL statement patterns (whitelist approach)
 */
const ALLOWED_PATTERNS = [
  /^CREATE\s+TABLE/i,
  /^ALTER\s+TABLE/i,
  /^CREATE\s+INDEX/i,
  /^CREATE\s+UNIQUE\s+INDEX/i,
  /^CREATE\s+POLICY/i,
  /^CREATE\s+OR\s+REPLACE\s+FUNCTION/i,
  /^CREATE\s+FUNCTION/i,
  /^GRANT\s+/i,
  /^REVOKE\s+/i,
  /^COMMENT\s+ON/i,
  /^INSERT\s+INTO/i, // Allow initial data inserts
  /^UPDATE\s+/i, // Allow data updates in migrations
]

/**
 * Blocked SQL statement patterns (blacklist approach)
 */
const BLOCKED_PATTERNS = [
  /DROP\s+DATABASE/i,
  /ALTER\s+ROLE/i,
  /CREATE\s+ROLE/i,
  /DROP\s+ROLE/i,
  /CREATE\s+EXTENSION/i, // Unless explicitly allowed
  /pg_catalog\./i, // Block access to pg_catalog
  /information_schema\./i, // Block access to information_schema (for safety)
  /TRUNCATE\s+TABLE/i, // Too dangerous for automatic migrations
  /DELETE\s+FROM/i, // Too dangerous for automatic migrations
]

/**
 * Validate SQL statements for safety
 */
function validateSQL(sql: string): { valid: boolean; error?: string } {
  // Split by semicolon to check individual statements
  const statements = sql
    .split(";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0)

  for (const statement of statements) {
    // Check if statement matches any blocked pattern
    for (const blockedPattern of BLOCKED_PATTERNS) {
      if (blockedPattern.test(statement)) {
        return {
          valid: false,
          error: `Blocked SQL statement detected: ${statement.substring(0, 100)}...`,
        }
      }
    }

    // Check if statement matches any allowed pattern
    const isAllowed = ALLOWED_PATTERNS.some((pattern) => pattern.test(statement))

    if (!isAllowed) {
      // Allow comments and empty statements
      if (statement.startsWith("--") || statement.startsWith("/*")) {
        continue
      }

      return {
        valid: false,
        error: `SQL statement not in allowlist: ${statement.substring(0, 100)}...`,
      }
    }
  }

  return { valid: true }
}

/**
 * Generate hash of SQL for deduplication
 */
function hashSQL(sql: string): string {
  return createHash("sha256").update(sql).digest("hex")
}

/**
 * Run migrations on a managed Supabase project
 */
export async function runMigrations(
  managedSupabaseProjectId: string,
  migrations: Array<{ name: string; sql: string }>
): Promise<{
  success: boolean
  applied: number
  failed: number
  errors: Array<{ name: string; error: string }>
}> {
  // Get managed project
  const managedProject = await prisma.managedSupabaseProject.findUnique({
    where: { id: managedSupabaseProjectId },
  })

  if (!managedProject) {
    throw new Error("Managed Supabase project not found")
  }

  if (managedProject.status !== "READY") {
    throw new Error(`Supabase project is not ready (status: ${managedProject.status})`)
  }

  // Get database password or connection string
  let connectionString: string
  
  if (!managedProject.dbPassEncrypted || managedProject.dbPassEncrypted === "") {
    // Default Supabase project - check for environment variables
    const { config } = await import("@/src/shared/config/env")
    const defaultConnectionString = config.supabase.defaultConnectionString
    const defaultDbPassword = config.supabase.defaultDbPassword
    
    if (defaultConnectionString) {
      // Use provided connection string
      connectionString = defaultConnectionString
    } else if (defaultDbPassword) {
      // Build connection string from password
      connectionString = `postgresql://postgres:${encodeURIComponent(defaultDbPassword)}@db.${managedProject.supabaseRef}.supabase.co:5432/postgres`
    } else {
      throw new Error(
        "Database password not available for default Supabase project. " +
        "Please set SUPABASE_DEFAULT_DB_PASSWORD or SUPABASE_DEFAULT_CONNECTION_STRING environment variable. " +
        "You can find the database password in your Supabase project settings under Database > Connection string."
      )
    }
  } else {
    // Decrypt database password for managed projects
    const dbPass = decrypt(managedProject.dbPassEncrypted)
    
    // Build connection string
    // Format: postgresql://postgres:[DB_PASS]@db.[REF].supabase.co:5432/postgres
    connectionString = `postgresql://postgres:${encodeURIComponent(dbPass)}@db.${managedProject.supabaseRef}.supabase.co:5432/postgres`
  }

  const pgModule = await getPg()
  const client = new pgModule.Client({ connectionString })

  let applied = 0
  let failed = 0
  const errors: Array<{ name: string; error: string }> = []

  try {
    await client.connect()

    // Start transaction
    await client.query("BEGIN")

    try {
      for (const migration of migrations) {
        const { name, sql } = migration

        // Validate SQL
        const validation = validateSQL(sql)
        if (!validation.valid) {
          failed++
          errors.push({ name, error: validation.error || "Validation failed" })
          continue
        }

        // Generate hash
        const hash = hashSQL(sql)

        // Check if already applied
        const existing = await prisma.managedSupabaseMigration.findUnique({
          where: {
            managedSupabaseProjectId_hash: {
              managedSupabaseProjectId,
              hash,
            },
          },
        })

        if (existing && existing.status === "applied") {
          // Skip already applied migration
          continue
        }

        // If migration exists with "pending" or "failed" status, we'll retry it
        // This allows retrying failed migrations

        try {
          // Execute SQL
          await client.query(sql)

          // Record as applied
          await prisma.managedSupabaseMigration.upsert({
            where: {
              managedSupabaseProjectId_hash: {
                managedSupabaseProjectId,
                hash,
              },
            },
            update: {
              status: "applied",
              appliedAt: new Date(),
              error: null,
            },
            create: {
              managedSupabaseProjectId,
              name,
              hash,
              sql, // Store SQL for reference
              status: "applied",
              appliedAt: new Date(),
            },
          })

          applied++
        } catch (error) {
          failed++
          const errorMessage = error instanceof Error ? error.message : "Unknown error"
          errors.push({ name, error: errorMessage })

          // Record as failed
          await prisma.managedSupabaseMigration.upsert({
            where: {
              managedSupabaseProjectId_hash: {
                managedSupabaseProjectId,
                hash,
              },
            },
            update: {
              status: "failed",
              error: errorMessage,
            },
            create: {
              managedSupabaseProjectId,
              name,
              hash,
              sql,
              status: "failed",
              error: errorMessage,
            },
          })
        }
      }

      // Commit transaction
      await client.query("COMMIT")
    } catch (error) {
      // Rollback on error
      await client.query("ROLLBACK")
      throw error
    }
  } finally {
    await client.end()
  }

  return {
    success: failed === 0,
    applied,
    failed,
    errors,
  }
}

