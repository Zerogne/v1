-- Drop old Supabase connection tables
DROP TABLE IF EXISTS "supabase_migration_states";
DROP TABLE IF EXISTS "supabase_connections";

-- CreateTable
CREATE TABLE "managed_supabase_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "supabaseRef" TEXT NOT NULL,
    "projectUrl" TEXT NOT NULL,
    "publishableKey" TEXT NOT NULL,
    "secretKeyEncrypted" TEXT NOT NULL,
    "dbPassEncrypted" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PROVISIONING',
    "errorMessage" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "managed_supabase_projects_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "managed_supabase_projects_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "managed_supabase_migrations" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "managedSupabaseProjectId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "hash" TEXT NOT NULL,
    "sql" TEXT,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "appliedAt" DATETIME,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "managed_supabase_migrations_managedSupabaseProjectId_fkey" FOREIGN KEY ("managedSupabaseProjectId") REFERENCES "managed_supabase_projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "managed_supabase_projects_projectId_key" ON "managed_supabase_projects"("projectId");

-- CreateIndex
CREATE UNIQUE INDEX "managed_supabase_migrations_managedSupabaseProjectId_hash_key" ON "managed_supabase_migrations"("managedSupabaseProjectId", "hash");

-- CreateIndex
CREATE INDEX "managed_supabase_migrations_managedSupabaseProjectId_createdAt_idx" ON "managed_supabase_migrations"("managedSupabaseProjectId", "createdAt");

