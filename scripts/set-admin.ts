// Load environment variables FIRST
import { config } from "dotenv"
import { fileURLToPath } from "url"
import { dirname, resolve } from "path"

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Load .env file
config({ path: resolve(__dirname, "../.env") })

// Now import prisma directly without going through the config module
import { PrismaClient } from "../lib/generated/prisma/client"
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3"
import Database from "better-sqlite3"

/**
 * Set a user as admin by email
 * Usage: npx tsx scripts/set-admin.ts <email>
 */
async function setAdmin() {
  const email = process.argv[2]

  if (!email) {
    console.error("Usage: npx tsx scripts/set-admin.ts <email>")
    process.exit(1)
  }

  // Get DATABASE_URL from env
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    console.error("DATABASE_URL environment variable is not set")
    process.exit(1)
  }

  // Extract file path from DATABASE_URL (e.g., "file:./dev.db" -> "./dev.db")
  const filePath = databaseUrl.replace(/^file:/, "")
  const db = new Database(filePath)
  const adapter = new PrismaBetterSqlite3({ url: databaseUrl })

  const prisma = new PrismaClient({ adapter })

  try {
    const user = await prisma.user.findUnique({
      where: { email },
    })

    if (!user) {
      console.error(`User with email "${email}" not found`)
      process.exit(1)
    }

    if (user.isAdmin) {
      console.log(`User "${email}" is already an admin`)
      return
    }

    const updated = await prisma.user.update({
      where: { email },
      data: { isAdmin: true },
    })

    console.log(`✅ Successfully set "${email}" as admin`)
    console.log(`   User ID: ${updated.id}`)
    console.log(`   Name: ${updated.name || "N/A"}`)
  } catch (error) {
    console.error("Error setting admin:", error)
    throw error
  } finally {
    await prisma.$disconnect()
  }
}

setAdmin()
