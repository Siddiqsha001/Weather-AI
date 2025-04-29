import React, { createContext, useContext, useState, useEffect } from 'react';
import { useMemory } from '../hooks/useMemory';
import { useWeather } from '../hooks/useWeather';
import { supabase } from '../services/api';

const WeatherContext = createContext();

export const useWeatherContext = () => {
  const context = useContext(WeatherContext);
  if (!context) {
    throw new Error('useWeatherContext must be used within a WeatherProvider');
  }
  return context;
};

const getAirQualityLevel = (aqi) => {
  if (aqi <= 50) return 'Good';
  if (aqi <= 100) return 'Moderate';
  if (aqi <= 150) return 'Unhealthy for Sensitive Groups';
  return 'Unhealthy';
};

export const WeatherProvider = ({ children }) => {
  const [userPreferences, setUserPreferences] = useState({
    activities: [],
    sensitivities: [],
    location: "India"  // Default location if not fetched
  });

  const { storeMemory, retrieveMemory } = useMemory();
  const {
    weatherData: originalWeatherData,
    loading,
    error,
    getWeatherData,
    getRecommendations
  } = useWeather();

  // Ensure weatherData contains a city (based on userPreferences.location or default)
  const weatherData = {
    ...originalWeatherData,
    city: originalWeatherData?.city || userPreferences.location || "India"
  };

  const fetchUserPreferences = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (error) throw error;
        if (data) {
          const location = data.location || "India";

          setUserPreferences({
            activities: [
              ...(data.preferred_outdoor_activities || []),
              ...(data.preferred_indoor_activities || [])
            ],
            sensitivities: data.weather_sensitivities || [],
            location
          });

          return data;
        }
      }
      return null;
    } catch (error) {
      console.error('Error fetching preferences:', error);
      return null;
    }
  };

  const loadUserPreferences = async () => {
    const prefs = await retrieveMemory('user_preferences');
    if (prefs) {
      setUserPreferences(prev => ({
        ...prev,
        ...prefs,
        location: prefs.location || "India"
      }));
    } else {
      await fetchUserPreferences();
    }
  };

  useEffect(() => {
    loadUserPreferences();
  }, []);

  const updatePreferences = async (newPrefs) => {
    const updated = {
      ...userPreferences,
      ...newPrefs,
      location: newPrefs.location || userPreferences.location || "India"
    };

    setUserPreferences(updated);
    await storeMemory('user_preferences', updated);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase
          .from('profiles')
          .upsert({
            id: user.id,
            ...updated,
            updated_at: new Date().toISOString()
          });
      }
    } catch (error) {
      console.error('Error updating profile:', error);
    }
  };

  const value = {
    userPreferences,
    weatherData,
    loading,
    error,
    getWeatherData,
    getRecommendations,
    fetchUserPreferences,
    updatePreferences
  };

  return (
    <WeatherContext.Provider value={value}>
      {children}
    </WeatherContext.Provider>
  );
};
