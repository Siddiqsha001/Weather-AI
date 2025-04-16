import React from 'react';

const AirQuality = ({ aqi }) => {
  const getAqiLevel = (value) => {
    if (value <= 50) return 'Good';
    if (value <= 100) return 'Moderate';
    if (value <= 150) return 'Unhealthy for Sensitive Groups';
    return 'Unhealthy';
  };

  return (
    <div className={`aqi-card ${getAqiLevel(aqi).toLowerCase().replace(/\s+/g, '-')}`}>
      <h3>Air Quality</h3>
      <div className="aqi-value">{aqi}</div>
      <div className="aqi-level">{getAqiLevel(aqi)}</div>
    </div>
  );
};

export default AirQuality;