# Supabase Connection Setup Guide

There are **two ways** to connect Supabase to your projects:

## Option A: Manual Connection (Existing Supabase Project)

If you already have a Supabase project:

1. Go to your project page
2. Click the Supabase connection button
3. Select "Manual Configuration"
4. Enter:
   - **Project URL**: `https://your-project-ref.supabase.co`
   - **Anon Key**: Your Supabase project's anon/public key

This will connect your existing Supabase project without provisioning a new one.

## Option B: Managed Provisioning (Option C - Automatic)

This automatically creates a new Supabase project for you. **Requires PRO or TEAM plan.**

### Required Environment Variables

Add these to your `.env` file:

```bash
# Supabase Management API Token
# Get this from: https://supabase.com/dashboard/account/tokens
SUPABASE_MGMT_TOKEN=your-management-api-token-here

# Your Supabase Organization Slug
# Find this in: https://supabase.com/dashboard/organizations
# It's the URL slug, e.g., if your org URL is /org/my-org, use "my-org"
SUPABASE_ORG_SLUG=your-org-slug

# Optional - defaults shown
SUPABASE_REGION_GROUP=apac  # or us-east, eu-west, etc.
SUPABASE_INSTANCE_SIZE=micro  # or small, medium, large

# Encryption key for storing Supabase secrets
# Generate a secure random string (32+ characters)
MASTER_KEY=your-encryption-key-here
```

### How to Get These Values:

#### 1. SUPABASE_MGMT_TOKEN
1. Go to https://supabase.com/dashboard/account/tokens
2. Click "Generate new token"
3. Give it a name (e.g., "Management API")
4. Copy the token
5. Add to `.env` as `SUPABASE_MGMT_TOKEN`

#### 2. SUPABASE_ORG_SLUG
1. Go to https://supabase.com/dashboard/organizations
2. Click on your organization
3. Look at the URL: `https://supabase.com/dashboard/org/YOUR-ORG-SLUG`
4. Copy `YOUR-ORG-SLUG` and add to `.env` as `SUPABASE_ORG_SLUG`

#### 3. MASTER_KEY
Generate a secure random key:
```bash
# Option 1: Use openssl
openssl rand -base64 32

# Option 2: Use Node.js
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

Add the output to `.env` as `MASTER_KEY`

### After Setup:

1. Restart your dev server
2. Go to a project page
3. Click "Connect Supabase"
4. Select "Create Managed Backend" (if you have PRO/TEAM plan)
5. The system will automatically:
   - Create a new Supabase project
   - Wait for it to be ready
   - Fetch API keys
   - Store them securely (encrypted)

### Plan Requirements:

- **FREE**: Can only use manual connection (existing projects)
- **PRO**: Can create 1 managed backend
- **TEAM**: Can create up to 3 managed backends per workspace

### Troubleshooting:

- **"SUPABASE_ORG_SLUG not set"**: Make sure you added it to `.env` and restarted the server
- **"Management API error"**: Check that your `SUPABASE_MGMT_TOKEN` is valid and has permissions
- **"Upgrade required"**: You need PRO or TEAM plan to create managed backends (use manual connection for FREE)

