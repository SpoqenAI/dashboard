# Debug Tools Security Implementation

This document explains the security measures implemented for debug tools in the Spoqen Dashboard application.

## Overview

The debug tools (such as `/debug-profile`) contain sensitive functionality that can expose user data and database operations. To prevent unauthorized access, a multi-layered security system has been implemented.

## Security Layers

### 1. Environment-Based Access Control

Debug tools are controlled by environment settings:

- **Development**: Debug tools are enabled by default for authenticated users
- **Production**: Debug tools require explicit enablement and admin privileges

### 2. Authentication Requirement

All debug tools require user authentication:
- Users must be logged in to access any debug functionality
- Unauthenticated users are redirected with an access denied message

### 3. Admin Authorization (Production)

In production environments, debug tools require admin privileges:
- User email must be in the approved admin list
- Admin status is checked against the user's profile in the database

## Configuration

### Environment Variables

Add these environment variables to control debug tool access:

```env
# Enable debug tools in production (optional, defaults to false)
NEXT_PUBLIC_ENABLE_DEBUG=true

# Comma-separated list of admin emails (required for production debug access)
NEXT_PUBLIC_ADMIN_EMAILS=admin@spoqen.com,developer@spoqen.com,your-email@company.com
```

### Development Setup

In development (`.env.local`):
```env
# Debug tools are enabled by default in development
# No additional configuration needed for basic access
# Optionally set admin emails for testing production behavior:
NEXT_PUBLIC_ADMIN_EMAILS=your-dev-email@example.com
```

### Production Setup

In production environment:
```env
# Explicitly enable debug tools (if needed)
NEXT_PUBLIC_ENABLE_DEBUG=true

# Set admin emails who can access debug tools
NEXT_PUBLIC_ADMIN_EMAILS=admin@spoqen.com,lead-dev@spoqen.com
```

## Access Control Logic

### Development Environment
1. ✅ Debug tools enabled by default
2. ✅ Any authenticated user can access
3. ⚠️ Warning displayed about development environment

### Production Environment
1. ❌ Debug tools disabled by default
2. ✅ Can be enabled with `NEXT_PUBLIC_ENABLE_DEBUG=true`
3. ✅ Requires admin email in `NEXT_PUBLIC_ADMIN_EMAILS`
4. ✅ User must be authenticated
5. ⚠️ Production warning displayed

## Security Features

### Access Denied Scenarios

Users will see an access denied page in these cases:

1. **Debug tools disabled**: `NEXT_PUBLIC_ENABLE_DEBUG` is not set to `true` in production
2. **Not authenticated**: User is not logged in
3. **Not admin**: User email is not in the admin list (production only)

### Visual Security Indicators

- 🔧 **Development badge**: Shows when in development environment
- ⚠️ **Production warning**: Alerts users about production debug usage
- 🛡️ **Access granted indicator**: Shows when user has proper permissions
- ❌ **Access denied page**: Clear explanation of why access was denied

### Audit Trail

The system logs authorization attempts:
```javascript
console.log('Debug tool access attempt:', {
  userId: user.id,
  email: user.email,
  environment: process.env.NODE_ENV,
  debugEnabled: isDebugEnabled(),
  isAdmin: isAdmin
});
```

## Implementation Details

### Files Modified

- `app/debug-profile/page.tsx`: Main debug page with access controls
- `lib/config.ts`: Configuration utilities for admin management
- `DEBUG_TOOLS_SECURITY.md`: This documentation

### Key Functions

```typescript
// Check if debug tools are enabled
isDebugEnabled(): boolean

// Get list of admin emails
getAdminEmails(): string[]

// Check if environment is production
isProduction(): boolean

// Check if user has admin privileges
checkAdminStatus(userId: string): Promise<boolean>
```

## Best Practices

### For Developers

1. **Never hardcode admin emails** in the source code
2. **Use environment variables** for all admin configuration
3. **Test access controls** in both development and production-like environments
4. **Monitor debug tool usage** in production environments

### For System Administrators

1. **Limit admin access** to only necessary personnel
2. **Regularly review** the admin email list
3. **Disable debug tools** in production when not needed
4. **Monitor logs** for unauthorized access attempts

### For Production Deployment

1. **Set admin emails** via environment variables
2. **Only enable debug tools** when actively needed
3. **Disable debug tools** after troubleshooting is complete
4. **Use secure channels** to communicate admin credentials

## Troubleshooting

### Common Issues

1. **"Debug tools are disabled"**
   - Set `NEXT_PUBLIC_ENABLE_DEBUG=true` in production
   - Verify environment variables are properly deployed

2. **"Admin access required"**
   - Add user email to `NEXT_PUBLIC_ADMIN_EMAILS`
   - Ensure email matches exactly (case-sensitive)
   - Verify user has a profile in the database

3. **"Authentication required"**
   - User must log in before accessing debug tools
   - Check if authentication system is working properly

### Debug Access Test

To test admin access configuration:

1. **Check environment variables**:
   ```javascript
   console.log('Debug enabled:', process.env.NEXT_PUBLIC_ENABLE_DEBUG);
   console.log('Admin emails:', process.env.NEXT_PUBLIC_ADMIN_EMAILS);
   ```

2. **Test with admin user**: Log in with an email from the admin list
3. **Test with regular user**: Log in with a non-admin email
4. **Test unauthenticated**: Try accessing while logged out

## Security Considerations

### Potential Risks

- **Data exposure**: Debug tools can display sensitive user information
- **Database access**: Tools may perform direct database operations
- **Production impact**: Debug operations could affect live data

### Mitigation Strategies

- **Environment isolation**: Different access rules for dev/prod
- **Admin-only access**: Restricted to authorized personnel only
- **Audit logging**: Track all debug tool usage
- **Clear warnings**: Visual indicators about environment and risks

## Future Enhancements

### Planned Improvements

1. **Role-based access**: Database-stored user roles instead of email lists
2. **Session logging**: Detailed audit trail of debug operations
3. **Time-limited access**: Temporary debug access with expiration
4. **IP restrictions**: Additional security based on source IP
5. **Two-factor authentication**: Extra security layer for debug access

### Migration Path

When implementing role-based access:

1. Add `role` column to `profiles` table
2. Update `checkAdminStatus()` to check database roles
3. Maintain email-based fallback for backward compatibility
4. Migrate existing admin emails to database roles 