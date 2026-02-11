# Storage Setup for Avis.ma

This document explains how to set up Supabase Storage buckets for the application.

## Required Storage Buckets

The application requires 3 storage buckets:

1. **`claim-proofs`** - For document/video proof uploads during claim verification
2. **`business-images`** - For business logos, cover images, and gallery photos
3. **`carousel-images`** - For homepage carousel images

## Setup Instructions

### Method 1: SQL Commands (Recommended)
1. Go to your Supabase Dashboard
2. Navigate to **SQL Editor**
3. Copy and paste the contents of `supabase/storage-config.sql`
4. Click **Run** to execute the commands

### Method 2: Manual Setup
If you prefer to set up buckets manually:

#### 1. `claim-proofs` bucket
- **ID**: `claim-proofs`
- **Public**: No (private)
- **File size limit**: 100MB (104857600 bytes)
- **Allowed MIME types**: 
  - `application/pdf`
  - `image/jpeg`
  - `image/png`
  - `image/webp`

#### 2. `business-images` bucket
- **ID**: `business-images`
- **Public**: Yes (public)
- **File size limit**: 100MB (104857600 bytes)
- **Allowed MIME types**:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
  - `image/svg+xml`

#### 3. `carousel-images` bucket
- **ID**: `carousel-images`
- **Public**: Yes (public)
- **File size limit**: 100MB (104857600 bytes)
- **Allowed MIME types**:
  - `image/jpeg`
  - `image/png`
  - `image/webp`
  - `image/gif`
  - `image/svg+xml`

## Security Policies

The SQL configuration includes appropriate Row Level Security (RLS) policies:

- **claim-proofs**: Authenticated users can upload, but access is controlled via signed URLs
- **business-images**: Public read access for displaying images, authenticated write access for business owners
- **carousel-images**: Public read access, authenticated write access for admins

## Usage in Application

### Document/Video Uploads (claim-proofs)
- Used during the claim verification process
- Files stored with path: `claims/[claimId]/[type]-[timestamp].[ext]`

### Business Images (business-images)
- Used for business logos, cover photos, and galleries
- Files stored with path: `businesses/[businessId]/[type]/[filename]`

### Carousel Images (carousel-images)
- Used for homepage carousel images
- Files stored with path: `carousel/[collectionId]/[filename]`

## Environment Variables

Make sure your environment variables include:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

The service role key is needed for bypassing RLS in server actions.

## Next Steps

After setting up the storage buckets:

1. Test document upload functionality in the claim form
2. Verify business image uploads work in the dashboard
3. Test carousel image uploads in the admin panel
4. Ensure signed URLs work properly for admin access to proof documents