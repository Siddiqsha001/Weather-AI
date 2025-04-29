import { useState } from 'react';

export const useWeather = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // development fallback data, to be used when the API is not available
  const devFallback = {
    current: {
      temp: 22,
      feels_like: 24,
      condition: "Partly cloudy",
      humidity: 65,
      wind_speed: 12,
      pressure: 1012,
      uv_index: 5,
      air_quality: 32,
      icon: "//cdn.weatherapi.com/weather/64x64/day/116.png"
    },
    location: "London",
    forecast: {
      forecastday: []
    }
  };
  const getWeatherData = async (location) => {
    if (!location) {
      setError('Please provide a location');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // environment variable for API key
      const ACTIVE_API_KEY = process.env.REACT_APP_WEATHER_API_KEY || "e65e53675e7f4a6c9b0164154251104";
      
      if (process.env.NODE_ENV === 'development') {
        console.warn("Using development weather data fallback");
        setWeatherData(devFallback);
        return devFallback;
      }

      const response = await fetch(
        `https://api.weatherapi.com/v1/forecast.json?key=${ACTIVE_API_KEY}&q=${location}&days=2&aqi=yes&alerts=no`
      );

      if (!response.ok) {
        const errorData = await response.json();  //fetches the error data
        throw new Error(errorData.error?.message || 'Weather API request failed');
      }

      const data = await response.json();
      
      // Add console log to verify response
      console.log("API Response:", data);

      const formattedData = {
        current: {
          temp: data.current.temp_c,    //temp in celsius
          feels_like: data.current.feelslike_c, //feels like in celsius
          condition: data.current.condition.text,  //sunny,windy
          humidity: data.current.humidity,
          wind_speed: data.current.wind_kph,
          pressure: data.current.pressure_mb,
          uv_index: data.current.uv,
          air_quality: data.current.air_quality?.pm2_5 || 0,
          icon: data.current.condition.icon
        },
        location: data.location.name,
        forecast: data.forecast // Include full forecast data
      };

      setWeatherData(formattedData);
      return formattedData;
    } catch (error) {
      console.error('Full error details:', error);
      setError(error.message);
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { weatherData, loading, error, getWeatherData };
};