/*
  Warnings:

  - Added the required column `chatSessionId` to the `ai_runs` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_ai_runs" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "userId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "chatSessionId" TEXT NOT NULL,
    "baseSnapshotId" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "model" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "prompt" TEXT NOT NULL,
    "responseText" TEXT,
    "error" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "ai_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_runs_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_runs_baseSnapshotId_fkey" FOREIGN KEY ("baseSnapshotId") REFERENCES "snapshots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ai_runs" ("baseSnapshotId", "createdAt", "error", "id", "model", "projectId", "prompt", "provider", "responseText", "status", "updatedAt", "userId") SELECT "baseSnapshotId", "createdAt", "error", "id", "model", "projectId", "prompt", "provider", "responseText", "status", "updatedAt", "userId" FROM "ai_runs";
DROP TABLE "ai_runs";
ALTER TABLE "new_ai_runs" RENAME TO "ai_runs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
