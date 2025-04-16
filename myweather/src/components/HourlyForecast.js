import React from 'react';
import { Line } from 'react-chartjs-2';

const HourlyForecast = ({ forecast }) => {
  // Ensure forecast is an array before processing
  const hourlyData = Array.isArray(forecast) ? forecast : [];

  const data = {
    labels: hourlyData.map((_, i) => `${i}:00`),
    datasets: [{
      label: 'Temperature (°C)',
      data: hourlyData.map(h => h?.temp || 0),
      borderColor: '#FF6384',
      fill: false
    }]
  };

  return (
    <div className="hourly-forecast">
      <h3>24-Hour Forecast</h3>
      <Line data={data} options={{ responsive: true }} />
    </div>
  );
};

export default HourlyForecast;