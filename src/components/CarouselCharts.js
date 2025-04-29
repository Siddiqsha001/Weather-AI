import React, { useState } from 'react';
import { Bar, Pie, Radar } from 'react-chartjs-2';
import { FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const CarouselCharts = ({ activitiesData, sensitivitiesData, healthData, activityTypeData }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const charts = [
    {
      title: "Your Preferred Activities",
      component: <Bar data={activitiesData} options={{ responsive: true }} />,
      icon: "🏃‍♂️"
    },
    {
      title: "Weather Sensitivities",
      component: <Pie data={sensitivitiesData} options={{ responsive: true }} />,
      icon: "🌡️"
    },
    {
      title: "Health Conditions",
      component: <Radar data={healthData} options={{ responsive: true }} />,
      icon: "❤️"
    },
    {
      title: "Activity Types",
      component: <Pie data={activityTypeData} options={{ responsive: true }} />,
      icon: "📊"
    }
  ];

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev + 1) % charts.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  const handlePrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setCurrentIndex((prev) => (prev - 1 + charts.length) % charts.length);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className="carousel-container">
      <button 
        className="carousel-button prev" 
        onClick={handlePrev}
        disabled={isAnimating}
      >
        <FiChevronLeft />
      </button>

      <div className="carousel-charts">
        <div 
          className={`chart-slide ${isAnimating ? 'sliding' : ''}`}
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {charts.map((chart, index) => (
            <div key={index} className="chart-card">
              <h3>
                <span className="chart-icon">{chart.icon}</span>
                {chart.title}
              </h3>
              <div className="chart-wrapper">
                {chart.component}
              </div>
            </div>
          ))}
        </div>
      </div>

      <button 
        className="carousel-button next" 
        onClick={handleNext}
        disabled={isAnimating}
      >
        <FiChevronRight />
      </button>
    </div>
  );
};

export default CarouselCharts;