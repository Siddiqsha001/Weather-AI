import React from 'react';
import { Bar } from 'react-chartjs-2';
import { useWeatherContext } from '../context/WeatherContext';
import '../styles/WeatherVisualizer.css';

const WeatherVisualizer = ({ weather }) => {
  const { userPreferences } = useWeatherContext();
  
  if (!weather) return null;

  const data = {
    labels: ['Temperature (°C)', 'Feels Like (°C)', 'Humidity (%)', 'Wind (km/h)', 'Pressure (hPa)', 'UV Index'],
    datasets: [
      {
        label: 'Current Weather Metrics',
        data: [
          weather.temp,
          weather.feels_like,
          weather.humidity,
          weather.wind_speed,
          weather.pressure / 10, // Scaled down for better visualization
          weather.uv_index
        ],
        backgroundColor: [
          'rgba(255, 99, 132, 0.7)',  // Temperature
          'rgba(255, 159, 64, 0.7)',  // Feels Like
          'rgba(54, 162, 235, 0.7)',  // Humidity
          'rgba(75, 192, 192, 0.7)',  // Wind
          'rgba(153, 102, 255, 0.7)', // Pressure
          'rgba(255, 206, 86, 0.7)'   // UV Index
        ],
        borderColor: [
          'rgba(255, 99, 132, 1)',
          'rgba(255, 159, 64, 1)',
          'rgba(54, 162, 235, 1)',
          'rgba(75, 192, 192, 1)',
          'rgba(153, 102, 255, 1)',
          'rgba(255, 206, 86, 1)'
        ],
        borderWidth: 2
      }
    ]
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: `Weather in ${userPreferences?.location || 'Your Location'}`,
        font: {
          size: 16
        }
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.raw;
            const label = context.label;
            if (label.includes('Pressure')) {
              return `Pressure: ${(value * 10).toFixed(0)} hPa`;
            }
            return `${label.split(' ')[0]}: ${value}`;
          }
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      },
      x: {
        grid: {
          display: false
        }
      }
    }
  };

  return (
    <div className="weather-visualizer">
      <Bar data={data} options={options} />
    </div>
  );
};

export default WeatherVisualizer;