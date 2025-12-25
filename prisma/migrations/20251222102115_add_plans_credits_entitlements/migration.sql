/*
  Warnings:

  - Added the required column `ownerId` to the `managed_supabase_projects` table without a default value. This is not possible if the table is not empty.

*/
-- CreateTable
CREATE TABLE "workspaces" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "seatCount" INTEGER NOT NULL DEFAULT 1,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "workspaces_ownerId_fkey" FOREIGN KEY ("ownerId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "workspace_members" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "workspaceId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "role" TEXT NOT NULL DEFAULT 'MEMBER',
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "workspace_members_workspaceId_fkey" FOREIGN KEY ("workspaceId") REFERENCES "workspaces" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "workspace_members_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "subscription_states" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "planTier" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "currentPeriodStart" DATETIME NOT NULL,
    "currentPeriodEnd" DATETIME NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
    -- Note: ownerId foreign key handled in application code (polymorphic relation)
);

-- CreateTable
CREATE TABLE "credit_ledger_entries" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "ownerType" TEXT NOT NULL,
    "ownerId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "amountCredits" REAL NOT NULL,
    "periodKey" TEXT,
    "ref" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
    -- Note: ownerId foreign key handled in application code (polymorphic relation)
);

-- CreateTable
CREATE TABLE "ai_usage_events" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "requestId" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "projectId" TEXT,
    "workspaceId" TEXT,
    "modelUsed" TEXT NOT NULL,
    "inputTokens" INTEGER NOT NULL,
    "outputTokens" INTEGER NOT NULL,
    "vendorCostUsd" REAL NOT NULL,
    "creditsCharged" REAL NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ai_usage_events_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_managed_supabase_projects" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "projectId" TEXT NOT NULL,
    "ownerType" TEXT NOT NULL DEFAULT 'USER',
    "ownerId" TEXT NOT NULL,
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
    -- Note: ownerId foreign key to workspace handled in application code (conditional based on ownerType)
);
INSERT INTO "new_managed_supabase_projects" ("createdAt", "dbPassEncrypted", "errorMessage", "id", "ownerType", "ownerId", "ownerUserId", "projectId", "projectUrl", "publishableKey", "secretKeyEncrypted", "status", "supabaseRef", "updatedAt") SELECT "createdAt", "dbPassEncrypted", "errorMessage", "id", 'USER', "ownerUserId", "ownerUserId", "projectId", "projectUrl", "publishableKey", "secretKeyEncrypted", "status", "supabaseRef", "updatedAt" FROM "managed_supabase_projects";
DROP TABLE "managed_supabase_projects";
ALTER TABLE "new_managed_supabase_projects" RENAME TO "managed_supabase_projects";
CREATE UNIQUE INDEX "managed_supabase_projects_projectId_key" ON "managed_supabase_projects"("projectId");
CREATE INDEX "managed_supabase_projects_ownerType_ownerId_idx" ON "managed_supabase_projects"("ownerType", "ownerId");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE UNIQUE INDEX "workspace_members_workspaceId_userId_key" ON "workspace_members"("workspaceId", "userId");

-- CreateIndex
CREATE UNIQUE INDEX "subscription_states_ownerType_ownerId_key" ON "subscription_states"("ownerType", "ownerId");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_ownerType_ownerId_createdAt_idx" ON "credit_ledger_entries"("ownerType", "ownerId", "createdAt");

-- CreateIndex
CREATE INDEX "credit_ledger_entries_ownerType_ownerId_periodKey_idx" ON "credit_ledger_entries"("ownerType", "ownerId", "periodKey");

-- CreateIndex
CREATE UNIQUE INDEX "ai_usage_events_requestId_key" ON "ai_usage_events"("requestId");

-- CreateIndex
CREATE INDEX "ai_usage_events_userId_createdAt_idx" ON "ai_usage_events"("userId", "createdAt");

-- CreateIndex
CREATE INDEX "ai_usage_events_workspaceId_createdAt_idx" ON "ai_usage_events"("workspaceId", "createdAt");
