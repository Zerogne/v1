import Database from 'better-sqlite3'
import * as path from 'path'
import * as fs from 'fs'
import type * as Prisma from './generated/prisma/internal/prismaNamespace'

/**
 * Creates a SQLite adapter for Prisma 7 using better-sqlite3
 */
export function createSqliteAdapter(): any {
  const databaseUrl = process.env.DATABASE_URL
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is not set')
  }

  // Check if it's a SQLite file URL
  if (!databaseUrl.startsWith('file:')) {
    throw new Error(
      `SQLite adapter requires a file:// URL. Got: ${databaseUrl.substring(0, 50)}...`
    )
  }

  // Extract file path from DATABASE_URL (format: "file:./dev.db" or "file:/absolute/path")
  let filePath = databaseUrl.replace(/^file:/, '')
  
  // Handle both relative and absolute paths
  // If it starts with /, it's already absolute (file:/absolute/path)
  // If it doesn't, resolve it relative to cwd (file:./dev.db or file:dev.db)
  if (filePath.startsWith('/')) {
    // Already absolute
  } else {
    // Resolve relative to current working directory
    filePath = path.resolve(process.cwd(), filePath)
  }
  
  // Ensure the directory exists
  const dir = path.dirname(filePath)
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true })
  }
  
  // Create a single database connection that will be reused
  const db = new Database(filePath)
  
  // Return adapter factory object that Prisma expects
  // The adapter needs to be callable and return a driver
  const adapterFactory = () => {
    return {
      queryRaw: async (query: string, params?: unknown[]) => {
        const stmt = db.prepare(query)
        if (params && params.length > 0) {
          return stmt.all(...params) as unknown[]
        }
        return stmt.all() as unknown[]
      },
      executeRaw: async (query: string, params?: unknown[]) => {
        const stmt = db.prepare(query)
        if (params && params.length > 0) {
          return { count: stmt.run(...params).changes }
        }
        return { count: stmt.run().changes }
      },
      findMany: async (query: { sql: string; args: unknown[] }) => {
        const stmt = db.prepare(query.sql)
        return stmt.all(...(query.args as unknown[])) as unknown[]
      },
      create: async (query: { sql: string; args: unknown[] }) => {
        const stmt = db.prepare(query.sql)
        return stmt.run(...(query.args as unknown[]))
      },
      update: async (query: { sql: string; args: unknown[] }) => {
        const stmt = db.prepare(query.sql)
        return stmt.run(...(query.args as unknown[]))
      },
      delete: async (query: { sql: string; args: unknown[] }) => {
        const stmt = db.prepare(query.sql)
        return stmt.run(...(query.args as unknown[]))
      },
      startTransaction: async () => {
        throw new Error('Transactions not implemented in this adapter')
      },
    }
  }
  
  // Add identification properties that Prisma might be looking for
  ;(adapterFactory as any).provider = 'sqlite'
  ;(adapterFactory as any).adapterName = 'better-sqlite3'
  
  return adapterFactory
}

