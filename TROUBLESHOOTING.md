# Troubleshooting 500 Error During Signup

## Problem
You're getting a 500 error when trying to register a new user:
```
POST https://tbcahehcgdkbatkmevmx.supabase.co/auth/v1/signup
Status: 500
```

## Root Cause
The issue is likely caused by one or more of these problems:

1. **Missing Row Level Security (RLS) policies** - The `users` table has RLS enabled but no proper policies
2. **Table structure mismatch** - The table structure doesn't match what Supabase Auth expects
3. **Missing trigger function** - The automatic profile creation trigger is not working
4. **Code issue** - The registration form was using `supabase.auth.signUp()` directly instead of the `useAuth` hook

## Solutions

### 1. Fix the Code (Already Done)
The code has been updated to use the proper `useAuth` hook instead of calling Supabase directly.

### 2. Fix the Database (Run SQL Script)
Run the `fix-signup-500-error.sql` script in your Supabase SQL Editor. This will:

- Check and fix the table structure
- Create proper RLS policies
- Set up the trigger function for automatic profile creation
- Grant necessary permissions

### 3. Alternative: Manual Database Fix
If you prefer to fix it manually, run these commands in your Supabase SQL Editor:

```sql
-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Create RLS policies
CREATE POLICY "Users can insert own profile" ON public.users
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can view own profile" ON public.users
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON public.users
    FOR UPDATE USING (auth.uid() = id);

-- Create trigger function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.users (id, email, first_name, last_name)
    VALUES (
        NEW.id,
        NEW.email,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create trigger
CREATE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
```

## Verification Steps

After running the fix:

1. **Check the SQL Editor output** - You should see confirmation that policies and triggers were created
2. **Try signing up again** - The 500 error should be resolved
3. **Check the database** - A new user profile should be automatically created in the `users` table

## Common Issues

### "Table doesn't exist"
If the `users` table doesn't exist, the SQL script will create it with the proper structure.

### "Permission denied"
Make sure you're running the SQL as a database owner or have the necessary privileges.

### "Function already exists"
The script uses `CREATE OR REPLACE` so this won't cause errors.

## Prevention

To avoid this issue in the future:

1. **Always use the `useAuth` hook** instead of calling Supabase directly
2. **Set up RLS policies** when creating new tables
3. **Test the signup flow** after making database changes
4. **Use the provided SQL scripts** for consistent setup

## Need Help?

If you're still experiencing issues:

1. Check the Supabase logs in your dashboard
2. Verify the SQL script ran successfully
3. Check that all policies and triggers are in place
4. Ensure the `users` table has the correct structure
