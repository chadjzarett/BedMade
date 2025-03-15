# Supabase Database Fixes

This directory contains SQL scripts to fix issues with the Supabase database.

## Fix RLS Policies for user_profiles Table

The `fix_rls_policies.sql` script fixes the Row Level Security (RLS) policies for the `user_profiles` table. This addresses the error:

```
"new row violates row-level security policy for table \"user_profiles\""
```

### How to Apply the Fix

1. Log in to your Supabase dashboard at https://app.supabase.com
2. Select your project
3. Go to the SQL Editor
4. Create a new query
5. Copy and paste the contents of `fix_rls_policies.sql` into the query editor
6. Run the query

### What This Fix Does

This script:

1. Drops existing RLS policies for the `user_profiles` table
2. Enables RLS on the table (in case it's not already enabled)
3. Creates new policies that allow users to:
   - View their own profiles
   - Update their own profiles
   - Insert their own profiles
   - Perform upsert operations on their own profiles

### Verifying the Fix

After applying the fix, the app should no longer show errors like:

```
Insert failed, trying upsert instead: {"code": "42501", "details": null, "hint": null, "message": "new row violates row-level security policy for table \"user_profiles\""}
```

The app should now be able to create and update user profiles in the database without errors. 