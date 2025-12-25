# Supabase SQL Execution Setup

This guide explains how to set up automatic SQL execution for Supabase migrations.

## Overview

The system can automatically execute SQL migrations on your Supabase database when the AI creates them. This requires:

1. **Service Role Key** (optional but recommended for automatic execution)
2. **SQL Execution Function** (one-time setup in Supabase)

## Setup Steps

### Step 1: Add Service Role Key (Optional)

1. Open your Supabase project dashboard
2. Go to **Settings** → **API**
3. Copy your **service_role** key (⚠️ Keep this secret - it has full database access)
4. In the Supabase connection modal, click **"Show Advanced"**
5. Paste the service_role key in the **"Service Role Key"** field
6. Click **"Validate & Save"**

### Step 2: Create SQL Execution Function (One-Time Setup)

To enable automatic SQL execution, you need to create a helper function in your Supabase database:

1. Open your Supabase project dashboard
2. Go to **SQL Editor**
3. Run this SQL:

```sql
CREATE OR REPLACE FUNCTION exec_sql(query text) 
RETURNS void 
LANGUAGE plpgsql 
SECURITY DEFINER
AS $$
BEGIN
  EXECUTE query;
END;
$$;
```

This function allows the system to execute arbitrary SQL statements via the Supabase REST API.

**Security Note:** The `SECURITY DEFINER` flag means this function runs with the privileges of the function creator. Only create this function if you trust the service that will call it.

### Step 3: Verify Setup

After setup, when the AI creates a migration:

1. The migration file is created in `supabase/migrations/`
2. The SQL is automatically executed on your Supabase database
3. The migration is marked as "applied"
4. The AI proceeds to generate application code

## How It Works

1. **With Service Role Key + Function**: SQL is executed automatically via RPC call
2. **Without Service Role Key**: Migration is created and marked as applied, but SQL must be run manually
3. **If Function Missing**: You'll get an error message with setup instructions

## Troubleshooting

### "SQL execution function not set up"

Run the SQL function creation script in Step 2 above.

### "Service role key is required"

Add your service_role key in the Supabase connection settings (Advanced section).

### "Failed to execute SQL"

- Check that the `exec_sql` function exists in your Supabase database
- Verify your service_role key is correct
- Check Supabase logs for detailed error messages

## Alternative: Manual Execution

If you prefer not to set up automatic execution:

1. Don't add the service_role key
2. When migrations are created, they'll be marked as "applied" automatically
3. Run the SQL manually in Supabase SQL Editor
4. The migration file contains the SQL for reference

## Security Considerations

- **Service Role Key**: Has full database access. Never expose it in client-side code or public repositories.
- **exec_sql Function**: Can execute arbitrary SQL. Only create it if you trust the calling service.
- **RLS Policies**: The service_role key bypasses Row Level Security. Ensure your migrations set up proper RLS policies.

