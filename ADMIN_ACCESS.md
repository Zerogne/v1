# Admin Access Guide

There are **two ways** to access the admin panel at `/admin`:

## Method 1: User with `isAdmin = true` (Recommended)

Set a user as admin using the script:

```bash
npx tsx scripts/set-admin.ts your-email@example.com
```

Then log in as that user and navigate to `/admin`.

## Method 2: ADMIN_SECRET Header (Emergency/Dev Only)

If you set the `ADMIN_SECRET` environment variable, you can access admin routes by including the header:

```bash
# In your .env file:
ADMIN_SECRET=your-secret-key-here
```

Then make requests with the header:
```bash
curl -H "x-admin-secret: your-secret-key-here" http://localhost:3000/api/admin/stats
```

Or in your browser, you can use a browser extension to add the header, or access via API client.

## First-Time Setup

If you don't have any admin users yet:

1. **Option A: Use the script**
   ```bash
   npx tsx scripts/set-admin.ts your-email@example.com
   ```

2. **Option B: Direct database update** (if using SQLite)
   ```sql
   UPDATE users SET isAdmin = 1 WHERE email = 'your-email@example.com';
   ```

3. **Option C: Use ADMIN_SECRET** (temporary, for initial setup)
   - Set `ADMIN_SECRET` in `.env`
   - Access `/admin` with the header
   - Use the admin panel to toggle admin status for your user
   - Then remove the ADMIN_SECRET (or keep it as emergency backup)

## Admin Panel Features

Once you have admin access, you can:
- View system statistics
- Manage users (set plans, toggle admin status)
- Monitor AI usage
- Manage backends
- Top up credits
- Adjust credits

All admin actions are logged in the `AdminAuditLog` table.

