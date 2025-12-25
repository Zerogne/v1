-- AlterTable
ALTER TABLE "ai_tool_invocations" ADD COLUMN "durationMs" INTEGER;
ALTER TABLE "ai_tool_invocations" ADD COLUMN "success" BOOLEAN;

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
    "inputTokens" INTEGER,
    "outputTokens" INTEGER,
    "cacheReadTokens" INTEGER,
    "cacheWriteTokens" INTEGER,
    "toolIterations" INTEGER NOT NULL DEFAULT 0,
    "toolCallsCount" INTEGER NOT NULL DEFAULT 0,
    "patchFailures" INTEGER NOT NULL DEFAULT 0,
    "contextBytes" INTEGER,
    "contextFilesCount" INTEGER,
    "selectedFilePath" TEXT,
    "durationMs" INTEGER,
    "retries" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "ai_runs_userId_fkey" FOREIGN KEY ("userId") REFERENCES "users" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_runs_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "projects" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_runs_chatSessionId_fkey" FOREIGN KEY ("chatSessionId") REFERENCES "chat_sessions" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "ai_runs_baseSnapshotId_fkey" FOREIGN KEY ("baseSnapshotId") REFERENCES "snapshots" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_ai_runs" ("baseSnapshotId", "chatSessionId", "createdAt", "error", "id", "model", "projectId", "prompt", "provider", "responseText", "status", "updatedAt", "userId") SELECT "baseSnapshotId", "chatSessionId", "createdAt", "error", "id", "model", "projectId", "prompt", "provider", "responseText", "status", "updatedAt", "userId" FROM "ai_runs";
DROP TABLE "ai_runs";
ALTER TABLE "new_ai_runs" RENAME TO "ai_runs";
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
