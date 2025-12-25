import { z } from "zod"

/**
 * Environment variable schema
 * Validates all required env vars at startup (server-only)
 */
const envSchema = z.object({
  // Database
  DATABASE_URL: z.string().url("DATABASE_URL must be a valid URL"),
  
  // AI Provider
  ANTHROPIC_API_KEY: z.string().min(1, "ANTHROPIC_API_KEY is required"),
  
  // Rate Limiting
  AI_RATE_LIMIT_PER_MIN: z
    .string()
    .default("20")
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().positive()),
  
  // Node Environment
  NODE_ENV: z
    .enum(["development", "production", "test"])
    .default("development"),
  
  // Supabase Management API (for managed Supabase provisioning)
  // Optional - only required when provisioning Supabase projects
  SUPABASE_MGMT_TOKEN: z
    .union([z.string().min(1), z.literal(""), z.undefined()])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  SUPABASE_ORG_SLUG: z
    .union([z.string().min(1), z.literal(""), z.undefined()])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  SUPABASE_REGION_GROUP: z.string().default("apac"),
  SUPABASE_INSTANCE_SIZE: z.string().default("micro"),
  
  // Default Supabase project (if set, all backends will use this instead of provisioning new ones)
  SUPABASE_DEFAULT_URL: z
    .string()
    .optional()
    .transform((val) => {
      if (!val || val === "") return undefined
      try {
        new URL(val) // Validate URL
        return val
      } catch {
        return undefined // Invalid URL, treat as undefined
      }
    }),
  SUPABASE_DEFAULT_ANON_KEY: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  // Database password for default Supabase project (required for migrations)
  SUPABASE_DEFAULT_DB_PASSWORD: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  // Full connection string for default Supabase project (alternative to password)
  SUPABASE_DEFAULT_CONNECTION_STRING: z
    .string()
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
  
  // Encryption
  // Optional - only required when using managed Supabase features
  MASTER_KEY: z
    .union([z.string().min(1), z.literal(""), z.undefined()])
    .optional()
    .transform((val) => (val === "" ? undefined : val)),
})

/**
 * Validated environment variables
 * Uses lazy validation - only validates when config is accessed
 * This allows the build to complete even if env vars aren't set yet
 */
let env: z.infer<typeof envSchema> | null = null
let validationError: Error | null = null

function getEnv(): z.infer<typeof envSchema> {
  // Return cached env if already validated
  if (env) {
    return env
  }
  
  // Return cached error if validation already failed
  if (validationError) {
    throw validationError
  }
  
  // Perform validation
  try {
    env = envSchema.parse({
      DATABASE_URL: process.env.DATABASE_URL,
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      AI_RATE_LIMIT_PER_MIN: process.env.AI_RATE_LIMIT_PER_MIN,
      NODE_ENV: process.env.NODE_ENV,
      SUPABASE_MGMT_TOKEN: process.env.SUPABASE_MGMT_TOKEN,
      SUPABASE_ORG_SLUG: process.env.SUPABASE_ORG_SLUG,
      SUPABASE_REGION_GROUP: process.env.SUPABASE_REGION_GROUP,
      SUPABASE_INSTANCE_SIZE: process.env.SUPABASE_INSTANCE_SIZE,
      SUPABASE_DEFAULT_URL: process.env.SUPABASE_DEFAULT_URL,
      SUPABASE_DEFAULT_ANON_KEY: process.env.SUPABASE_DEFAULT_ANON_KEY,
      SUPABASE_DEFAULT_DB_PASSWORD: process.env.SUPABASE_DEFAULT_DB_PASSWORD,
      SUPABASE_DEFAULT_CONNECTION_STRING: process.env.SUPABASE_DEFAULT_CONNECTION_STRING,
      MASTER_KEY: process.env.MASTER_KEY,
    })
    return env
  } catch (error) {
    if (error instanceof z.ZodError) {
      const missing = error.issues.map((e) => `${e.path.join(".")}: ${e.message}`).join("\n")
      validationError = new Error(`Environment validation failed:\n${missing}`)
      throw validationError
    }
    validationError = error instanceof Error ? error : new Error(String(error))
    throw validationError
  }
}

/**
 * Typed config object
 * Use this instead of process.env directly
 * Uses lazy validation - only validates when accessed
 */
export const config = {
  get database() {
    const e = getEnv()
    return {
      url: e.DATABASE_URL,
    }
  },
  get ai() {
    const e = getEnv()
    return {
      anthropicApiKey: e.ANTHROPIC_API_KEY,
    }
  },
  get rateLimit() {
    const e = getEnv()
    return {
      aiPerMin: e.AI_RATE_LIMIT_PER_MIN,
    }
  },
  get nodeEnv() {
    return getEnv().NODE_ENV
  },
  get isDevelopment() {
    return getEnv().NODE_ENV === "development"
  },
  get isProduction() {
    return getEnv().NODE_ENV === "production"
  },
  get isTest() {
    return getEnv().NODE_ENV === "test"
  },
  get supabase() {
    const e = getEnv()
    return {
      mgmtToken: e.SUPABASE_MGMT_TOKEN,
      orgSlug: e.SUPABASE_ORG_SLUG,
      regionGroup: e.SUPABASE_REGION_GROUP,
      instanceSize: e.SUPABASE_INSTANCE_SIZE,
      defaultUrl: e.SUPABASE_DEFAULT_URL,
      defaultAnonKey: e.SUPABASE_DEFAULT_ANON_KEY,
      defaultDbPassword: e.SUPABASE_DEFAULT_DB_PASSWORD,
      defaultConnectionString: e.SUPABASE_DEFAULT_CONNECTION_STRING,
    }
  },
  get encryption() {
    const e = getEnv()
    return {
      masterKey: e.MASTER_KEY,
    }
  },
} as const

/**
 * Helper to check if Supabase provisioning is configured
 */
export function isSupabaseProvisioningConfigured(): boolean {
  return !!(
    config.supabase.mgmtToken &&
    config.supabase.orgSlug &&
    config.encryption.masterKey
  )
}

/**
 * Helper to mask sensitive values in logs
 */
export function maskSecret(value: string, visibleChars = 4): string {
  if (value.length <= visibleChars) {
    return "*".repeat(value.length)
  }
  return value.slice(0, visibleChars) + "*".repeat(value.length - visibleChars)
}

