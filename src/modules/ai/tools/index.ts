import { createFile } from "./executors/createFile"
import { updateFile } from "./executors/updateFile"
import { applyPatchToFile } from "./executors/applyPatch"
import { deleteFile } from "./executors/deleteFile"
import { renameFile } from "./executors/renameFile"
import { supabaseRequireConnection } from "./executors/supabaseRequireConnection"
import { supabaseCreateMigration } from "./executors/supabaseCreateMigration"
import { supabaseListMigrations } from "./executors/supabaseListMigrations"
import { supabaseIsMigrationApplied } from "./executors/supabaseIsMigrationApplied"
import { supabaseExecuteMigration } from "./executors/supabaseExecuteMigration"
import { supabaseExecutePendingMigrations } from "./executors/supabaseExecutePendingMigrations"
import { ToolResult } from "../providers/types"

export type ToolExecutor = (
  projectId: string,
  args: unknown
) => Promise<ToolResult>

export const toolExecutors: Record<string, ToolExecutor> = {
  create_file: createFile,
  update_file: updateFile,
  apply_patch: applyPatchToFile,
  delete_file: deleteFile,
  rename_file: renameFile,
  supabase_require_connection: supabaseRequireConnection,
  supabase_create_migration: supabaseCreateMigration,
  supabase_list_migrations: supabaseListMigrations,
  supabase_is_migration_applied: supabaseIsMigrationApplied,
  supabase_execute_migration: supabaseExecuteMigration,
  supabase_execute_pending_migrations: supabaseExecutePendingMigrations,
}

export async function executeTool(
  projectId: string,
  toolName: string,
  args: unknown
): Promise<ToolResult> {
  const executor = toolExecutors[toolName]
  if (!executor) {
    return {
      ok: false,
      error: `Unknown tool: ${toolName}`,
    }
  }

  return executor(projectId, args)
}

