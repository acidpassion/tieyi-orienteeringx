import React, { createContext, useContext, useState, useEffect } from 'react';
import axios from '../config/axiosConfig';
import { createApiUrl } from '../config/api';

const ConfigurationContext = createContext();

export const useConfiguration = () => {
  const context = useContext(ConfigurationContext);
  if (!context) {
    throw new Error('useConfiguration must be used within a ConfigurationProvider');
  }
  return context;
};

export const ConfigurationProvider = ({ children }) => {
  const [configurations, setConfigurations] = useState({
    eventTypes: [],
    gameTypes: [],
    classes: [],
    difficultyGrades: [],
    orgs: []
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      const response = await axios.get(createApiUrl('/api/configurations'), {
        headers: token ? { Authorization: `Bearer ${token}` } : {}
      });
      
      setConfigurations(response.data);
      console.log('✅ Configuration loaded successfully:', response.data);
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      setError(error.message);
      
      // Fallback to static data if API fails
      try {
        const staticData = await import('../assets/statics.json');
        setConfigurations({
          eventTypes: staticData.default.eventTypes || [],
          gameTypes: staticData.default.gameTypes || [],
          classes: staticData.default.classes || [],
          difficultyGrades: staticData.default.difficultyGrades || [],
          orgs: staticData.default.orgs || []
        });
        console.warn('Using fallback static data due to API error');
      } catch (staticError) {
        console.error('Failed to load static fallback data:', staticError);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const refreshConfigurations = () => {
    fetchConfigurations();
  };

  const value = {
    configurations,
    loading,
    error,
    refreshConfigurations,
    // Convenience getters with safe fallbacks
    eventTypes: Array.isArray(configurations.eventTypes) ? configurations.eventTypes : [],
    gameTypes: Array.isArray(configurations.gameTypes) ? configurations.gameTypes : [],
    classes: Array.isArray(configurations.classes) ? configurations.classes : [],
    difficultyGrades: Array.isArray(configurations.difficultyGrades) ? configurations.difficultyGrades : [],
    orgs: Array.isArray(configurations.orgs) ? configurations.orgs : []
  };

  return (
    <ConfigurationContext.Provider value={value}>
      {children}
    </ConfigurationContext.Provider>
  );
};

export default ConfigurationContext;