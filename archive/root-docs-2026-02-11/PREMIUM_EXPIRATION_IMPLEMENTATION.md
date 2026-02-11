# Premium Expiration Implementation Guide

## Overview

This document describes the implementation of the premium expiration functionality for the Avis application. The system now includes mechanisms to handle expired premium subscriptions, check for upcoming expirations, and update user status accordingly.

## Components Implemented

### 1. Database Functions

Two SQL functions were created to handle premium expiration:

#### `handle_expired_premium_accounts()`
- Updates profiles and businesses with expired premium status
- Sets `is_premium` to `false` and `tier` to `'none'` for expired accounts
- Returns statistics about affected users and businesses
- Logs expiration events in the audit log

#### `get_upcoming_premium_expirations(days_ahead)`
- Identifies premium accounts that will expire within the specified number of days
- Returns user information for sending reminder notifications

#### `send_premium_expiration_reminders(days_ahead)`
- Creates notification records for users with upcoming expirations
- Prevents duplicate notifications by checking recent notification history

### 2. Frontend Updates

#### `getUserPremiumStatus(userId)` function
- **Location**: `src/app/actions/premium.ts`
- **Enhancement**: Now properly checks for expired premium subscriptions
- **Logic**: 
  - Checks `premium_expires_at` field against current date
  - Returns `isPremium: false` for expired accounts regardless of `tier` value
  - Handles both legacy and modern premium systems
  - Maintains backward compatibility

### 3. Server-Side Actions

#### `handleExpiredPremiumAccounts()` function
- **Location**: `src/app/actions/handle-expired-premium.ts`
- **Purpose**: Server action to update expired premium accounts in the database
- **Functionality**:
  - Identifies profiles with expired premium subscriptions
  - Updates both user profiles and associated businesses
  - Returns statistics about affected accounts

#### `getUpcomingPremiumExpirations(daysAhead)` function
- **Purpose**: Retrieves upcoming premium expirations for sending notifications
- **Parameter**: Number of days ahead to check for expirations

## Implementation Details

### Expiration Checking Logic

The system now properly validates premium status by considering expiration dates:

1. For legacy `premium_users` table: Checks `subscription_expires_at`
2. For modern system: Checks `premium_expires_at` in the `profiles` table
3. If expiration date exists and is in the past, the user is treated as non-premium regardless of other fields

### Database Schema

The following columns are used for expiration tracking:
- `profiles.premium_expires_at`: Timestamp when premium status expires
- `premium_payments.expires_at`: Expiration date for specific payments
- `premium_audit_log.expires_at`: Expiration date for audit purposes

## Scheduled Execution

To automatically handle expired accounts, the system should run the `handle_expired_premium_accounts()` function periodically. This can be achieved by:

1. Using Supabase's pg_cron extension (uncommented in the SQL file)
2. Setting up a cron job on your server
3. Calling the server action `handleExpiredPremiumAccounts()` from a scheduled task

## Usage Examples

### Check Current User's Premium Status
```typescript
const premiumStatus = await getUserPremiumStatus(userId);
// Returns { isPremium: boolean, maxBusinesses: number, subscriptionTier: string, expiresAt?: string }
// Will return isPremium: false for expired accounts
```

### Handle Expired Accounts (Server Action)
```typescript
const result = await handleExpiredPremiumAccounts();
// Returns { status: 'success'|'error', message: string, data?: { usersAffected: number, businessesAffected: number } }
```

### Get Upcoming Expirations
```typescript
const expirations = await getUpcomingPremiumExpirations(7); // Next 7 days
// Returns user data for sending notifications
```

## Testing

The implementation ensures that:
- Expired premium users are treated as non-premium in all parts of the application
- Associated businesses lose premium status when user subscription expires
- Upcoming expirations can be identified for proactive notifications
- The system maintains data consistency across profiles and businesses

## Migration Steps

To implement this functionality:

1. Execute the SQL functions in your Supabase database:
   - `supabase/handle-expired-premium.sql`
   - `supabase/check-upcoming-expirations.sql`

2. Deploy the updated code including:
   - Modified `getUserPremiumStatus` function
   - New server actions in `handle-expired-premium.ts`

3. Optionally set up scheduled execution for automatic expiration handling

## Security Considerations

- The system uses admin-level database access to update premium status
- Proper audit logging ensures compliance and traceability
- Expiration checks happen at the application level to prevent bypassing