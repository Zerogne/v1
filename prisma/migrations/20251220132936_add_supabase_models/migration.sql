-- CreateTable
CREATE TABLE "supabase_connections" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerUserId" TEXT NOT NULL,
    "supabaseUrl" TEXT NOT NULL,
    "anonKeyMasked" TEXT NOT NULL,
    "anonKeyEncrypted" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'disconnected',
    "lastValidatedAt" DATETIME,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "supabase_connections_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "supabase_connections_ownerUserId_fkey" FOREIGN KEY ("ownerUserId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "supabase_migration_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'draft',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "appliedAt" DATETIME,
    CONSTRAINT "supabase_migration_states_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "supabase_connections_projectId_key" ON "supabase_connections"("projectId");

-- CreateIndex
CREATE INDEX "supabase_migration_states_projectId_createdAt_idx" ON "supabase_migration_states"("projectId", "createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "supabase_migration_states_projectId_path_key" ON "supabase_migration_states"("projectId", "path");
