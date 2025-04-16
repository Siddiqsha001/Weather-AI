import React from 'react';
import '../styles/WeatherCard.css';

const WeatherCard = ({ weather }) => {
  return (
    <div className="weather-card">
      <div className="weather-header">
        <h3>{weather.city}</h3>
        <img 
          src={`https:${weather.icon}`} 
          alt={weather.condition} 
          className="weather-icon"
        />
      </div>
      <div className="weather-grid">
        <div className="weather-item">
          <span className="weather-label">Condition</span>
          <span className="weather-value">{weather.condition}</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Temperature</span>
          <span className="weather-value">{weather.temp}°C</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Humidity</span>
          <span className="weather-value">{weather.humidity}%</span>
        </div>
        <div className="weather-item">
          <span className="weather-label">Wind Speed</span>
          <span className="weather-value">{weather.wind} km/h</span>
        </div>
      </div>
    </div>
  );
};

export default WeatherCard;