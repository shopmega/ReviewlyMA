# Admin Business Assignment Functions

## Overview
This provides comprehensive admin tools for assigning businesses to users, handling both legacy and new business ownership systems.

## Available Functions

### 1. Server Actions (TypeScript)
Located in: `src/app/actions/admin-business-assignment.ts`

- `assignBusinessToUser(userId, businessId, role?, isPrimary?)` - Assign a business to a user
- `removeBusinessFromUser(userId, businessId)` - Remove a business assignment from a user
- `getUserBusinessAssignments(userId)` - Get all business assignments for a user

### 2. CLI Script (JavaScript)
Located in: `scripts/admin-assign-business.js`

## Usage Examples

### Command Line Usage:
```bash
# Basic assignment
node scripts/admin-assign-business.js user@example.com business-123

# With specific role and primary status
node scripts/admin-assign-business.js user@example.com business-123 owner true

# Assign as manager (non-primary)
node scripts/admin-assign-business.js user@example.com business-123 manager false
```

### Server Action Usage:
```typescript
// In your admin component
'use server'

import { assignBusinessToUser, removeBusinessFromUser } from '@/app/actions/admin-business-assignment'

// Assign business
const result = await assignBusinessToUser(
  'user-uuid-here',
  'business-id-here',
  'owner',  // role
  true      // is_primary
)

if (result.status === 'success') {
  console.log('Assignment successful:', result.message)
} else {
  console.error('Assignment failed:', result.message)
}

// Remove assignment
const removeResult = await removeBusinessFromUser(
  'user-uuid-here',
  'business-id-here'
)
```

## Features

### ✅ Handles Both Systems
- Updates legacy `profiles.business_id` for backward compatibility
- Manages new `user_businesses` table for multi-business support
- Properly handles role escalation (user → pro)

### ✅ Safety Checks
- Verifies admin access
- Confirms business and user existence
- Checks for conflicting assignments
- Prevents non-premium users from having multiple primary businesses
- Logs all actions for audit trail

### ✅ Conflict Detection
- Warns about businesses owned by other users
- Identifies conflicting approved business claims
- Preserves data integrity

### ✅ Flexible Roles
- `owner` - Full ownership rights
- `manager` - Management rights
- `employee` - Limited access
- Custom roles as needed

## How It Works

1. **User Identification** - Finds user by email or UUID
2. **Business Verification** - Confirms business exists
3. **Conflict Checking** - Looks for existing assignments/claims
4. **System Updates** - Updates both legacy and new systems
5. **Verification** - Confirms changes were applied
6. **Logging** - Records action in audit log

## Error Handling

The functions provide comprehensive error handling:
- Invalid user/business IDs
- Permission issues
- Database conflicts
- Premium user limitations
- System inconsistencies

## Best Practices

### When to Use Each Role:
- **`owner`**: For business owners/managers who should have full control
- **`manager`**: For staff members with management permissions
- **`employee`**: For regular employees with limited access

### Primary vs Non-Primary:
- **Primary** (`isPrimary: true`): Used for the user's main business (premium feature for multiple)
- **Non-Primary** (`isPrimary: false`): For additional businesses

## Security Notes

- All actions require admin authentication
- Operations are logged in `admin_audit_log`
- Function verifies user permissions before proceeding
- Protected against orphaned data through proper cascading

## Example Scenarios

### Scenario 1: New Business Owner
```bash
# User just signed up and needs their business
node scripts/admin-assign-business.js newuser@example.com their-business owner true
```

### Scenario 2: Team Member Assignment
```bash
# Adding a manager to an existing business
node scripts/admin-assign-business.js manager@example.com company-abc manager false
```

### Scenario 3: Fixing Ownership Issues
```bash
# When a user loses access to their business (like the original issue)
node scripts/admin-assign-business.js user@example.com business-xyz owner true
```

## Troubleshooting

### Common Issues:

1. **"User not found"** - Verify the email address is correct
2. **"Business not found"** - Check the business ID exists in the database
3. **"Admin access required"** - Ensure you're logged in as an admin user
4. **"Business limit reached"** - Non-premium users can only have one primary business

### Debug Information:
The scripts provide detailed output showing:
- Current user/business status
- Conflicting assignments
- System updates performed
- Final verification results

## Future Enhancements

Potential improvements:
- Bulk assignment operations
- Assignment templates/roles
- Automated conflict resolution
- Integration with business claims system
- Email notifications to affected users