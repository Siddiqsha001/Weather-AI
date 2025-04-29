const WEATHER_API_KEY = process.env.REACT_APP_WEATHERAPI_KEY;

export async function getWeather(city) {
  if (!WEATHER_API_KEY) {
    throw new Error('Weather API key not configured');
  }

  try {
    const response = await fetch(
      `https://api.weatherapi.com/v1/current.json?key=${WEATHER_API_KEY}&q=${encodeURIComponent(city)}&aqi=no`
    );

    if (!response.ok) {
      throw new Error(`Weather API error: ${response.status}`);
    }

    const data = await response.json();
    return {
      city: data.location.name,
      condition: data.current.condition.text,
      temp: data.current.temp_c,
      humidity: data.current.humidity,
      wind: data.current.wind_kph,
      icon: data.current.condition.icon
    };
  } catch (error) {
    console.error('Weather service error:', error);
    throw new Error('Failed to fetch weather data. Please check the city name and try again.');
  }
}