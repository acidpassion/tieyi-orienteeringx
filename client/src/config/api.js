// API configuration for different environments
const getApiBaseUrl = () => {
  // In development, use relative paths (handled by Vite proxy)
  if (import.meta.env.DEV) {
    return '';
  }
  
  // In production, use the actual API domain
  return 'https://api.orienteeringx.cn';
};

export const API_BASE_URL = getApiBaseUrl();

// Helper function to create full API URLs
export const createApiUrl = (endpoint) => {
  // Remove leading slash if present to avoid double slashes
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint.slice(1) : endpoint;
  return `${API_BASE_URL}/${cleanEndpoint}`;
};

// Export for use in axios configuration
export default {
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
};