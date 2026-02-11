# Storage Implementation - Complete Setup Guide

## Overview

The Avis.ma application now has a complete storage system configured for:
1. **Claim proofs** - Document and video uploads during claim verification
2. **Business images** - Logos, cover photos, and galleries for businesses
3. **Carousel images** - Homepage carousel images

## Setup Instructions

### Step 1: Create Storage Buckets

Run the SQL script in your Supabase Dashboard:

```bash
# Navigate to Supabase Dashboard → SQL Editor
# Copy and paste the contents of: supabase/storage-config.sql
# Click "Run"
```

The script creates 3 buckets with proper RLS policies:

**Buckets Created:**
- `claim-proofs` - Private bucket for claim verification documents
- `business-images` - Public bucket for business images
- `carousel-images` - Public bucket for carousel images

### Step 2: Verify Environment Variables

Ensure your `.env.local` file has:

```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

## Implementation Details

### Claim Proof Uploads

**Flow:**
1. User selects proof method (email, phone, document, video)
2. Document/video files uploaded to `claim-proofs` bucket
3. File path stored in `business_claims.proof_data`
4. Admin accesses via signed URL endpoint: `/api/proofs/[claimId]`

**Storage Path:** `claims/[claimId]/[type]-[timestamp].[ext]`

**Files Modified:**
- `src/app/claim/new/page.tsx` - Form with proof verification UI
- `src/app/actions/claim.ts` - File upload to Supabase Storage
- `src/app/api/proofs/[claimId]/route.ts` - Admin access with signed URLs

### Business Image Uploads

**Flow:**
1. During claim creation, user uploads business images
2. Logo and cover images stored in `business-images` bucket
3. Gallery images also stored in `business-images` bucket
4. URLs saved to `businesses` table (`logo_url`, `cover_url`)

**Storage Paths:**
- Logo: `businesses/[businessId]/logo-[timestamp].[ext]`
- Cover: `businesses/[businessId]/cover-[timestamp].[ext]`
- Gallery: `businesses/[businessId]/gallery-[index]-[timestamp].[ext]`

**Files Modified:**
- `src/app/claim/new/page.tsx` - Business image upload handlers
- `src/app/actions/claim.ts` - Business image upload to storage

### Database Schema Updates

The `businesses` table already has fields for:
- `logo_url` - Path to business logo
- `cover_url` - Path to cover photo
- Gallery support can be added as JSON field if needed

The `business_claims` table has:
- `proof_data` (JSONB) - Stores proof metadata including file URLs

## File Upload Handlers

### In Claim Form (`src/app/claim/new/page.tsx`)

**Business Image Handlers:**
```typescript
// Logo upload handler
const handlePhotoUpload = (type: 'logo' | 'cover' | 'gallery', file: File) => {
  // Validates file size and type
  // Updates UI state with preview
  // Stores file in businessImages state
}

// Photo removal handler
const handleRemovePhoto = (type: 'logo' | 'cover' | 'gallery', index?: number) => {
  // Removes from UI and file state
}
```

**Form Submission:**
```typescript
// Pass files to server action
if (businessImages.logoFile) {
  formDataObj.set('logoFile', businessImages.logoFile);
}
if (businessImages.coverFile) {
  formDataObj.set('coverFile', businessImages.coverFile);
}
businessImages.galleryFiles.forEach((file) => {
  formDataObj.append('galleryFiles', file);
});
```

### In Claim Action (`src/app/actions/claim.ts`)

**File Upload Process:**
```typescript
// Extract files from FormData
const logoFile = formData.get('logoFile') as File | null;
const coverFile = formData.get('coverFile') as File | null;
const galleryFiles = formData.getAll('galleryFiles') as File[];

// Upload each file to Supabase Storage
await supabaseService.storage
  .from('business-images')
  .upload(logoPath, logoBuffer, {
    contentType: logoFile.type,
    upsert: false,
  });

// Update business record with URLs
await supabaseService
  .from('businesses')
  .update({ logo_url: logoPath, cover_url: coverPath })
  .eq('id', businessId);
```

## Proof File Access

### Admin API Endpoint

**Location:** `src/app/api/proofs/[claimId]/route.ts`

**Features:**
- Admin role verification
- Generates signed URLs with 1-hour expiry
- Returns proof metadata and contact information
- Secure file access without public exposure

**Response Format:**
```json
{
  "proofMethods": ["email", "phone", "document", "video"],
  "proofData": {
    "email_verified": true,
    "phone_verified": true,
    "document_uploaded": true,
    "video_uploaded": true,
    "verified_at": "2026-01-03T02:24:00Z"
  },
  "signedUrls": {
    "document": "https://...",
    "video": "https://..."
  },
  "contactInfo": { "email": "...", "phone": "..." }
}
```

## Validation & Limits

### File Size Limits
- **Logo/Cover:** 10MB
- **Gallery Images:** 10MB
- **Documents:** 10MB
- **Videos:** 100MB

### Accepted File Types
- **Images:** JPG, PNG, WebP, GIF, SVG
- **Documents:** PDF
- **Videos:** MP4, WebM

## Error Handling

All file uploads have try-catch blocks that:
1. Log errors to console
2. Don't fail the entire submission
3. Proceed with next step
4. User gets toast notification of status

Example:
```typescript
try {
  await supabaseService.storage
    .from('business-images')
    .upload(logoPath, logoBuffer, {...});
  console.log(`✅ Logo uploaded: ${logoPath}`);
} catch (error) {
  console.error('Error uploading logo:', error);
  // Continue with claim submission
}
```

## Testing Checklist

- [ ] Create storage buckets using SQL script
- [ ] Upload claim proof documents
- [ ] Verify document accessible to admin
- [ ] Upload business logo during claim
- [ ] Upload business cover photo during claim
- [ ] Upload gallery images
- [ ] Verify URLs saved to database
- [ ] Test admin access to proofs via API
- [ ] Test file removal/replacement
- [ ] Verify draft saving doesn't break with files

## Carousel Images (Future)

The `carousel-images` bucket is ready for:
- Homepage carousel image uploads
- Admin dashboard carousel management
- Public access for displaying on homepage

Integration point: Admin panel at `/admin/homepage`

## Security Notes

- Claim proofs are in **private bucket** - only accessible via signed URLs
- Business images are in **public bucket** - accessible directly
- RLS policies enforce user authentication for uploads
- Service role key used for server-side operations
- Signed URLs expire after 1 hour for security

## Troubleshooting

**"Bucket not found" error:**
- Verify SQL script was executed successfully
- Check bucket names match exactly (case-sensitive)

**"Permission denied" error:**
- Ensure SUPABASE_SERVICE_ROLE_KEY is set
- Verify RLS policies were created
- Check user authentication status

**Files not uploading:**
- Check file size limits
- Verify MIME types are correct
- Review console for specific error messages

## Files Modified

✅ `supabase/storage-config.sql` - NEW: Bucket creation and RLS policies
✅ `src/app/claim/new/page.tsx` - Updated: Business image handlers and state
✅ `src/app/actions/claim.ts` - Updated: Business image upload logic
✅ `docs/STORAGE_SETUP.md` - NEW: Initial setup guide
✅ `docs/STORAGE_IMPLEMENTATION_COMPLETE.md` - NEW: This comprehensive guide
