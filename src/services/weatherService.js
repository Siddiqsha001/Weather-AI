const WEATHER_API_KEY = '61452e3ebe5b50da7cb06f2e232f8308';

export async function getWeather(city) {
  try {
    // First get coordinates
    const geoUrl = `http://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${WEATHER_API_KEY}`;
    const geoResponse = await fetch(geoUrl);
    
    if (!geoResponse.ok) {
      throw new Error(`Geocoding error: ${geoResponse.status}`);
    }

    const geoData = await geoResponse.json();
    if (!geoData.length) {
      throw new Error('City not found');
    }

    const { lat, lon } = geoData[0];

    // Then get weather using coordinates
    const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&units=metric&appid=${WEATHER_API_KEY}`;
    const weatherResponse = await fetch(weatherUrl);

    if (!weatherResponse.ok) {
      throw new Error(`Weather API error: ${weatherResponse.status}`);
    }

    const data = await weatherResponse.json();
    
    return {
      city: data.name,
      condition: data.weather[0].main,
      description: data.weather[0].description,
      temp: data.main.temp,
      feels_like: data.main.feels_like,
      humidity: data.main.humidity,
      wind: data.wind.speed,
      pressure: data.main.pressure,
      icon: `https://openweathermap.org/img/wn/${data.weather[0].icon}@2x.png`
    };
  } catch (error) {
    console.error('Weather service error:', error);
    throw new Error('Failed to fetch weather data. Please check the city name and try again.');
  }
}