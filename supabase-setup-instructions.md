# Supabase Setup Instructions

Follow these steps to set up your Supabase backend for the Multi-Tenant Photo Album application.

## Step 1: Create Supabase Project

1. Go to [supabase.com](https://supabase.com) and create an account
2. Click "New Project" 
3. Choose your organization
4. Fill in project details:
   - **Name**: `family-photo-album` (or your preferred name)
   - **Database Password**: Create a strong password (save this!)
   - **Region**: Choose the region closest to your users
5. Click "Create new project" and wait for it to initialize

## Step 2: Run SQL Schema

1. In your Supabase dashboard, go to **SQL Editor** in the left sidebar
2. Click **"New query"**
3. Copy the entire contents of `supabase-schema.sql` and paste it into the editor
4. Click **"Run"** to execute the schema
5. You should see a success message confirming all tables and policies were created

## Step 3: Create Storage Bucket

1. Go to **Storage** in the left sidebar
2. Click **"New bucket"**
3. Create a bucket with these settings:
   - **Name**: `album_uploads`
   - **Public bucket**: ✅ (checked)
   - **File size limit**: `10MB`
   - **Allowed MIME types**: Leave empty (allows all types)
4. Click **"Create bucket"**

## Step 4: Configure Storage Policies (Optional)

The storage bucket is public, but you can add additional security policies if needed:

```sql
-- Example: Only allow authenticated users to upload
CREATE POLICY "Authenticated users can upload files" ON storage.objects
FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Example: Users can only access files from their family folder
CREATE POLICY "Users can view family files" ON storage.objects
FOR SELECT USING (
  auth.uid()::text = (storage.foldername(name))[1] OR
  (storage.foldername(name))[1] IN (
    SELECT family_id::text FROM profiles WHERE id = auth.uid()
  )
);
```

## Step 5: Get API Credentials

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy these values:
   - **Project URL**: `https://your-project-id.supabase.co`
   - **anon public key**: Long string starting with `eyJ...`
3. Paste these into your `.env.local` file:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://your-projecvt-id.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...your-anon-key
   ```

## Step 6: Test the Setup

1. In your Supabase dashboard, go to **Table Editor**
2. You should see these tables:
   - `families`
   - `profiles` 
   - `photos`
   - `skills`
3. Go to **Authentication** → **Users** (should be empty initially)
4. Go to **Storage** → **album_uploads** (should be empty initially)

## Step 7: Configure Next.js Image Domains

1. In your `next.config.js`, update the domains array:
   ```javascript
   images: {
     domains: ['your-project-id.supabase.co'],
   }
   ```
2. Replace `your-project-id` with your actual Supabase project ID

## Verification Checklist

✅ Supabase project created  
✅ SQL schema executed successfully  
✅ Storage bucket `album_uploads` created  
✅ API credentials copied to `.env.local`  
✅ Next.js config updated with Supabase domain  

## Troubleshooting

### Common Issues:

1. **RLS Errors**: Make sure RLS is enabled on all tables
2. **Storage Upload Fails**: Verify the bucket is public and named correctly
3. **Authentication Issues**: Check your API keys are correct
4. **CORS Errors**: Ensure your domain is allowed in Supabase settings

### Useful SQL Queries for Debugging:

```sql
-- Check if tables exist
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- Check RLS status
SELECT schemaname, tablename, rowsecurity 
FROM pg_tables 
WHERE schemaname = 'public';

-- View current policies
SELECT * FROM pg_policies WHERE schemaname = 'public';

-- Test user profile creation (after signup)
SELECT * FROM profiles;
SELECT * FROM families;
```

Your Supabase backend is now ready! You can proceed to run the Next.js application.