# HTTP Interceptor Configuration

## JWT Token Expiry Handling

This application implements automatic JWT token expiry detection and handling through axios interceptors.

### How it works:

1. **Request Interceptor**: Automatically adds the JWT token from localStorage to all API requests
2. **Response Interceptor**: Monitors all API responses for 401 (Unauthorized) status codes
3. **Automatic Logout**: When a 401 response is detected:
   - Clears stored authentication data (token and user info)
   - Shows a user-friendly notification about session expiry
   - Automatically redirects to the login page
   - Preserves the current page URL as a redirect parameter for seamless return after re-login

### Files involved:

- `axiosConfig.js`: Contains the configured axios instance with interceptors
- `AuthContext.jsx`: Updated to use the configured axios instance and register logout callback

### Benefits:

- **Seamless UX**: Users are automatically redirected without manual intervention
- **Security**: Expired tokens are immediately cleared from storage
- **User-friendly**: Clear notification explains what happened
- **Smart redirect**: Users return to their intended page after re-login
- **Centralized**: All HTTP requests benefit from this protection

### Usage:

All components should import axios from `../config/axiosConfig` instead of the default axios package:

```javascript
// ✅ Correct
import axios from '../config/axiosConfig';

// ❌ Avoid
import axios from 'axios';
```

### Testing:

To test the token expiry handling:
1. Log in to the application
2. Manually expire or remove the token from localStorage
3. Make any API request (navigate to a page that loads data)
4. Observe the automatic logout and redirect behavior