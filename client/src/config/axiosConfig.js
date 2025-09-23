import axios from 'axios';
import { toast } from 'react-toastify';

// Create axios instance
const axiosInstance = axios.create();

// Store reference to logout function
let logoutFunction = null;

// Function to set logout callback
export const setLogoutCallback = (logout) => {
  logoutFunction = logout;
};

// Request interceptor to add token to requests
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle token expiry
axiosInstance.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    const { response } = error;
    
    // Handle 401 Unauthorized responses (token expired or invalid)
    if (response && response.status === 401) {
      const token = localStorage.getItem('token');
      
      // Only handle automatic logout if we have a token (user was logged in)
      if (token) {
        // Clear stored data
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        delete axiosInstance.defaults.headers.common['Authorization'];
        
        // Show notification
        toast.error('Your session has expired. Please log in again.', {
          position: 'top-right',
          autoClose: 5000,
          hideProgressBar: false,
          closeOnClick: true,
          pauseOnHover: true,
          draggable: true,
        });
        
        // Call logout function if available
        if (logoutFunction) {
          logoutFunction();
        }
        
        // Redirect to login page with current location as redirect parameter
        const currentPath = window.location.pathname + window.location.search;
        const redirectUrl = encodeURIComponent(currentPath);
        
        // Use setTimeout to avoid potential issues with immediate navigation
        setTimeout(() => {
          window.location.href = `/login?redirect=${redirectUrl}`;
        }, 100);
      }
    }
    
    return Promise.reject(error);
  }
);

export default axiosInstance;