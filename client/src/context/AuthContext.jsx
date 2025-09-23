import { createContext, useContext, useState, useEffect } from 'react';
import axios from '../config/axiosConfig';
import { setLogoutCallback } from '../config/axiosConfig';
import { createApiUrl } from '../config/api';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  // Function to fetch complete user profile
  const fetchUserProfile = async (userId, role) => {
    try {
      let response;
      if (role === 'student') {
        response = await axios.get(createApiUrl(`/api/students/${userId}/profile`));
      } else if (role === 'coach') {
        response = await axios.get(createApiUrl(`/api/students/${userId}/profile`));
      }
      
      if (response?.data?.success) {
        const profileData = response.data.data || response.data.student;
        return {
          id: userId,
          role: role,
          name: profileData.name,
          avatar: profileData.avatar,
          grade: profileData.grade,
          gender: profileData.gender,
          birthday: profileData.birthday
        };
      }
    } catch (error) {
      console.error('Failed to fetch user profile:', error);
    }
    
    // Return basic user info if profile fetch fails
    return {
      id: userId,
      role: role
    };
  };

  useEffect(() => {
    const initializeAuth = async () => {
      const token = localStorage.getItem('token');
      const savedUser = localStorage.getItem('user');
      
      if (token) {
        try {
          const payload = JSON.parse(atob(token.split('.')[1]));
          
          // Check if we have saved user data
          if (savedUser) {
            try {
              const userData = JSON.parse(savedUser);
              setUser(userData);
              setLoading(false);
              return;
            } catch (error) {
              console.error('Failed to parse saved user data:', error);
            }
          }
          
          // Fetch complete user profile
          const completeUser = await fetchUserProfile(payload.userId, payload.role);
          setUser(completeUser);
          
          // Save complete user data to localStorage
          localStorage.setItem('user', JSON.stringify(completeUser));
          
        } catch (error) {
          console.error('Token validation failed:', error);
          localStorage.removeItem('token');
          localStorage.removeItem('user');
        }
      }
      
      setLoading(false);
    };
    
    initializeAuth();
  }, []);

  const login = async (name, password) => {
    try {
      const response = await axios.post(createApiUrl('/api/auth/login'), {
        name,
        password
      });

      const { token, user } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      setUser(user);
      
      return { success: true };
    } catch (error) {
      return { 
        success: false, 
        message: error.response?.data?.message || 'Login failed' 
      };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setUser(null);
  };

  // Set up logout callback for axios interceptor
  useEffect(() => {
    setLogoutCallback(logout);
  }, []);

  const value = {
    user,
    login,
    logout,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};