# Authentication System - Ashridge Group Welfare Tracker

## Overview

The Ashridge Group Welfare Tracker includes a secure authentication system to protect sensitive employee welfare data. The system uses HTTP Basic Authentication with a custom branded login interface.

## Authentication Details

### Credentials
- **Username**: `ashridge`
- **Password**: `Ashridge@Wel!2025`

### Security Features

1. **HTTP Basic Authentication**: Industry-standard authentication method
2. **Middleware Protection**: All routes are protected by Next.js middleware
3. **Session Management**: Cookie-based session management for user convenience
4. **Branded Login Interface**: Custom Ashridge Group branded login page
5. **Secure Logout**: One-click logout functionality

## How It Works

### 1. Middleware Protection
The authentication is implemented using Next.js middleware (`src/middleware.ts`) that:
- Intercepts all requests to the application
- Checks for valid authentication credentials
- Allows access to static files without authentication
- Redirects unauthenticated users to the login interface

### 2. Login Process
1. User accesses the application
2. Middleware checks for authentication
3. If not authenticated, a branded login form is displayed
4. User enters credentials
5. Credentials are validated against the stored values
6. Session cookie is set for future requests
7. User is redirected to the main application

### 3. Session Management
- Authentication state is maintained using secure HTTP cookies
- Sessions expire after 8 hours of inactivity
- Sessions are automatically renewed on successful requests

## Files Involved

### Core Authentication Files
- `src/middleware.ts` - Main authentication logic
- `src/components/logout-button.tsx` - Logout functionality

### Optional UI Components (for reference)
- `src/components/login-page.tsx` - React-based login component
- `src/components/auth-wrapper.tsx` - Client-side authentication wrapper

## Configuration

### Environment Variables
No environment variables are required for basic operation. The credentials are currently hardcoded for security by obscurity.

### Production Considerations
For production deployment, consider:
1. Moving credentials to environment variables
2. Implementing password hashing
3. Adding rate limiting for failed attempts
4. Enabling HTTPS only
5. Setting secure cookie flags

## Usage

### Accessing the Application
1. Navigate to the application URL
2. Enter the username: `ashridge`
3. Enter the password: `Ashridge@Wel!2025`
4. Click "Sign In"

### Logging Out
- Click the "Logout" button in the application header
- This will clear the session and redirect to the login page

## Security Notes

### Current Security Measures
- Basic Authentication over HTTPS (in production)
- Session timeout (8 hours)
- Secure cookie settings
- Protection against XSS through proper cookie flags

### Recommendations for Enhanced Security
1. **Multi-Factor Authentication (MFA)**: Add second factor authentication
2. **User Management**: Implement user roles and permissions
3. **Audit Logging**: Log all authentication attempts and user actions
4. **Password Policy**: Implement password rotation policies
5. **IP Restrictions**: Limit access to specific IP ranges if needed

## Troubleshooting

### Common Issues

1. **Login Not Working**
   - Verify correct username and password
   - Check browser console for errors
   - Clear browser cookies and try again

2. **Session Expires Frequently**
   - Default session timeout is 8 hours
   - Sessions are renewed on activity
   - Check system clock if experiencing premature expiration

3. **Middleware Not Working**
   - Ensure `src/middleware.ts` is present
   - Check Next.js configuration
   - Verify middleware matcher configuration

### Development Testing

To test authentication in development:
```bash
# Start development server
npm run dev

# Access application at http://localhost:9002
# Use credentials: ashridge / Ashridge@Wel!2025
```

### Production Deployment

When deploying to production:
1. Ensure HTTPS is enabled
2. Verify middleware configuration
3. Test authentication flow
4. Check cookie security settings
5. Monitor authentication logs

## Maintenance

### Changing Credentials
To change the authentication credentials:
1. Update the values in `src/middleware.ts`
2. Update this documentation
3. Inform authorized users of the change
4. Test the new credentials

### Monitoring
Monitor the following for security:
- Failed authentication attempts
- Session duration and patterns
- Access patterns and anomalies
- System logs for authentication-related errors

## Support

For technical support or security concerns:
- Review application logs
- Check middleware configuration
- Verify Next.js version compatibility
- Contact system administrator
