# Debugging: Équipements & Services Not Saving

## Issue Description
User reports that when editing business services in the dashboard (`/dashboard/edit-profile`), the "Équipements & Services" selections are not being saved.

## Investigation

### Code Flow
1. **Client Side** (`src/app/dashboard/edit-profile/page.tsx`):
   - Lines 825-857: Amenities form field using React Hook Form
   - Lines 838-844: Checkbox onChange handler updates form state
   - Lines 224-239: Form submission converts amenities array to comma-separated string

2. **Server Action** (`src/app/actions/business.ts`):
   - Lines 262-301: `updateBusinessProfile` function
   - Lines 268-278: Parses comma-separated amenities back to array
   - Line 298: Updates database with validated data

3. **Schema** (`src/lib/types.ts`):
   - Line 225: `amenities: z.array(z.string()).optional().default([])`

## Debugging Added

### Client-Side Logging
Added to `src/app/dashboard/edit-profile/page.tsx` (lines 224-239):
- Logs form data before conversion
- Logs amenities array
- Logs amenities as comma-separated string
- Logs all FormData entries

### Server-Side Logging
Added to `src/app/actions/business.ts` (lines 262-301):
- Logs amenities received from form
- Logs parsed amenities array
- Logs raw data before validation
- Logs validated data
- Logs database update success/failure

## How to Test

1. Navigate to `/dashboard/edit-profile`
2. Go to the "Services" tab
3. Select/deselect some amenities
4. Click "Enregistrer" (Save)
5. Check browser console for client-side logs (📤 prefix)
6. Check server console/terminal for server-side logs (🔍 prefix)

## Expected Behavior
- Client logs should show amenities array being converted to comma-separated string
- Server logs should show:
  - Amenities received as comma-separated string
  - Amenities parsed back to array
  - Database update with amenities array

## Next Steps
1. Run the application and test the amenities update
2. Review console logs to identify where the data flow breaks
3. Check if the issue is:
   - Form state not updating (client-side)
   - Data not being sent correctly (serialization)
   - Server not receiving data (network)
   - Database not saving data (server-side)
   - Data being overwritten after save (race condition)

## Files Modified
- `src/app/dashboard/edit-profile/page.tsx` - Added client-side debug logs
- `src/app/actions/business.ts` - Added server-side debug logs
- `src/app/actions/claim.ts` - Fixed amenities not saving for existing businesses during claim process
