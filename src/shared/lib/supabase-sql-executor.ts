import { createClient } from "@supabase/supabase-js"

/**
 * Execute SQL on Supabase using service_role key
 * This uses a direct PostgreSQL connection approach via Supabase client
 */
export async function executeSupabaseSQL(
  supabaseUrl: string,
  serviceRoleKey: string,
  sql: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    if (!sql || !sql.trim()) {
      return { success: false, error: "SQL is empty" }
    }

    // Create Supabase client with service_role key
    // Service role key bypasses RLS and has full database access
    const supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })

    // Supabase REST API doesn't support arbitrary SQL execution directly
    // We need to use a workaround: execute via a PostgreSQL function
    // 
    // Option 1: Use a custom RPC function (requires setup in Supabase)
    // Option 2: Use direct PostgreSQL connection (requires connection string)
    // Option 3: Use Supabase Management API (requires PAT)
    //
    // For now, we'll try to execute via a helper function
    // If it doesn't exist, we'll create it first (one-time setup)
    
    // First, check if exec_sql function exists by trying to call it
    try {
      // Try to execute via RPC function
      // This function needs to be created in Supabase first:
      // CREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void AS $$
      // BEGIN
      //   EXECUTE query;
      // END;
      // $$ LANGUAGE plpgsql SECURITY DEFINER;
      
      const { error: rpcError } = await supabase.rpc('exec_sql', { 
        query: sql 
      })
      
      if (!rpcError) {
        return { success: true, message: "SQL executed successfully" }
      }
      
      // If function doesn't exist, try to create it
      if (rpcError.message?.includes('function') || rpcError.message?.includes('does not exist')) {
        // Create the helper function first
        const createFunctionSQL = `
          CREATE OR REPLACE FUNCTION exec_sql(query text) 
          RETURNS void 
          LANGUAGE plpgsql 
          SECURITY DEFINER
          AS $$
          BEGIN
            EXECUTE query;
          END;
          $$;
        `
        
        // Try to create the function using a direct connection
        // Since we can't execute arbitrary SQL via REST API, we'll need to use
        // a different approach - use Supabase Management API or direct PostgreSQL
        
        // For now, return an error asking user to set up the function
        return {
          success: false,
          error: "SQL execution function not set up. Please run this SQL in Supabase SQL Editor once:\n\nCREATE OR REPLACE FUNCTION exec_sql(query text) RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$ BEGIN EXECUTE query; END; $$;",
        }
      }
      
      return { success: false, error: rpcError.message }
    } catch (error) {
      // If RPC fails, try alternative approach
      // Use direct PostgreSQL connection if we can derive connection string
      return {
        success: false,
        error: `Failed to execute SQL: ${error instanceof Error ? error.message : "Unknown error"}. Please ensure the exec_sql function is set up in Supabase.`,
      }
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error executing SQL",
    }
  }
}

/**
 * Alternative: Execute SQL using Supabase Management API
 * Requires Personal Access Token (PAT) from Supabase account
 */
export async function executeSupabaseSQLViaManagementAPI(
  projectRef: string, // Project reference ID
  accessToken: string, // Personal Access Token
  sql: string
): Promise<{ success: boolean; error?: string; message?: string }> {
  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/database/execute-sql`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          query: sql,
        }),
      }
    )

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: "Unknown error" }))
      return {
        success: false,
        error: error.message || `HTTP ${response.status}`,
      }
    }

    return {
      success: true,
      message: "SQL executed successfully via Management API",
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    }
  }
}
