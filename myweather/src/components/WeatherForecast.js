import React from 'react';

const WeatherForecast = ({ location }) => {
  return (
    <div className="weather-forecast">
      <h3>Weekly Forecast for {location}</h3>
      {/* Forecast content will go here */}
    </div>
  );
};

export default WeatherForecast; // Default export