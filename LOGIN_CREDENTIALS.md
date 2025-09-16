# 🔐 Welfare Tracker - Login Credentials

## Primary Login Credentials

**Username:** `ashridge`
**Password:** `Ashridge@2025!`

## Fallback Credentials (for testing)

**Username:** `admin`
**Password:** `password`

## Login URL
- Development: http://localhost:9002
- The login form will appear automatically if you're not authenticated

## Authentication Status
✅ **WORKING** - Authentication system is functioning correctly
✅ **Tested** - Login API responds with success for correct credentials
✅ **Secure** - Password is properly hashed using bcrypt

## Troubleshooting
If you still get "Invalid credentials":

1. **Check the credentials exactly:**
   - Username: `admin` (lowercase)
   - Password: `password` (lowercase)

2. **Clear browser cache/cookies:**
   - Old login attempts might be cached

3. **Try incognito/private browsing mode**

4. **Check server logs:**
   - Look for authentication errors in the terminal

## API Test
You can test the login API directly:
```bash
# Primary credentials
curl -X POST http://localhost:9002/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "ashridge", "password": "Ashridge@2025!"}'

# Fallback credentials  
curl -X POST http://localhost:9002/api/auth \
  -H "Content-Type: application/json" \
  -d '{"username": "admin", "password": "password"}'
```

Expected response:
```json
{
  "success": true,
  "user": {
    "id": 1,
    "username": "ashridge", 
    "name": "Ashridge Administrator",
    "role": "admin"
  }
}
```

## Database Setup
To enable database-based user management:
```bash
./scripts/setup-users.sh
```