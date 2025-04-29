import React, { useState, useEffect } from 'react';
import '../styles/Header.css';

// Mock authentication check
const isAuthenticated = () => {
  return localStorage.getItem('isLoggedIn') === 'true';
};
// Add the AuthModal component definition
const AuthModal = ({ onClose, onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);

  const handleSubmit = (e) => {
    e.preventDefault();
    localStorage.setItem('isLoggedIn', 'true');
    onLogin();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content">
        <button className="modal-close" onClick={onClose}>×</button>
        <h2>{isLogin ? 'Login' : 'Sign Up'}</h2>
        <form onSubmit={handleSubmit}>
          {!isLogin && (
            <div className="form-group">
              <label>Name</label>
              <input type="text" placeholder="Enter your name" required />
            </div>
          )}
          <div className="form-group">
            <label>Email</label>
            <input type="email" placeholder="Enter your email" required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input type="password" placeholder="Enter your password" required />
          </div>
          <button type="submit" className="primary-btn">
            {isLogin ? 'Login' : 'Create Account'}
          </button>
        </form>
        <p className="auth-toggle">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            className="text-btn" 
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Sign up' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
};
const featureImages = [
  {
    id: 1,
    title: "Personalized Recommendations",
    description: "Weather-based activity suggestions",
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#93c5fd" opacity="0.2"/>
        <path fill="#3b82f6" d="M30 30h40v40H30z"/>
        <path fill="#ffffff" d="M40 40h20v20H40z"/>
        <path fill="#1e40af" d="M45 45h10v10H45z"/>
      </svg>
    )
  },
  {
    id: 2,
    title: "Health Considerations",
    description: "Allergy & sensitivity alerts",
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#fca5a5" opacity="0.2"/>
        <path fill="#ef4444" d="M50 25l5 15h15l-12 10 5 15-13-10-13 10 5-15-12-10h15z"/>
      </svg>
    )
  },
  {
    id: 3,
    title: "Activity Planning",
    description: "Weather-optimized day plans",
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#86efac" opacity="0.2"/>
        <path fill="#10b981" d="M25 50h50v25H25z"/>
        <circle cx="50" cy="25" r="10" fill="#f59e0b"/>
      </svg>
    )
  },
  {
    id: 4,
    title: "Real-time Updates",
    description: "Weather change alerts",
    image: (
      <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
        <circle cx="50" cy="50" r="45" fill="#a5b4fc" opacity="0.2"/>
        <path fill="#6366f1" d="M50 25l-15 30h10v20h10V55h10z"/>
      </svg>
    )
  }
];

const DashboardCarousel = ({ onClose }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState('right');
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    const interval = setInterval(() => {
      handleNext();
    }, 2000);
    return () => clearInterval(interval);
  }, [currentIndex]);

  const handleNext = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('right');
    setCurrentIndex(prev => 
      prev === featureImages.length - 1 ? 0 : prev + 1
    );
    setTimeout(() => setIsAnimating(false), 1000);
  };

  const handlePrev = () => {
    if (isAnimating) return;
    setIsAnimating(true);
    setDirection('left');
    setCurrentIndex(prev => 
      prev === 0 ? featureImages.length - 1 : prev - 1
    );
    setTimeout(() => setIsAnimating(false), 500);
  };

  const goToSlide = (index) => {
    if (isAnimating || index === currentIndex) return;
    setIsAnimating(true);
    setDirection(index > currentIndex ? 'right' : 'left');
    setCurrentIndex(index);
    setTimeout(() => setIsAnimating(false), 500);
  };

  return (
    <div className="dashboard-carousel">
      <div className="carousel-container">
        <button className="carousel-nav prev" onClick={handlePrev}>‹</button>
        
        <div className={`carousel-slide ${direction}`}>
          <div className="feature-image">
            {featureImages[currentIndex].image}
          </div>
          <div className="feature-details">
            <h4>{featureImages[currentIndex].title}</h4>
            <p>{featureImages[currentIndex].description}</p>
          </div>
        </div>
        
        <button className="carousel-nav next" onClick={handleNext}>›</button>
      </div>
      <div className="carousel-dots">
        {featureImages.map((_, index) => (
          <button
            key={index}
            className={`dot ${index === currentIndex ? 'active' : ''}`}
            onClick={() => goToSlide(index)}
          />
        ))}
      </div>
    </div>
  );
};

const Header = () => {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(isAuthenticated());

  const handleGetStarted = () => {
    if (isLoggedIn) {
      setShowFeatures(true);
    } else {
      setShowAuthModal(true);
    }
  };

  const handleLogin = () => {
    setIsLoggedIn(true);
    setShowAuthModal(false);
    setShowFeatures(true);
  };

  return (
    <header className="app-header">
      <div className="header-content">
        <div className="app-logo">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100">
            <path fill="#3b82f6" d="M30 45c-8 0-15-7-15-15s7-15 15-15h5c0-8 7-15 15-15s15 7 15 15h5c8 0 15 7 15 15s-7 15-15 15H30z"/>
            <path fill="#ef4444" d="M50 25c15 0 25 5 25 15 0 8-10 15-25 25-15-10-25-17-25-25 0-10 10-15 25-15z" opacity="0.9"/>
          </svg>
        </div>
        
        <h1 className="app-title">WeatherMind AI</h1>
        <h2 className="app-subtitle">Your Personal AI Weather Assistant</h2>
        
        <p className="app-tagline">
          Get personalized activity recommendations based on weather conditions, 
          your health sensitivities, and preferences.
        </p>
        
        <div className="header-actions">
          <button className="primary-btn" onClick={handleGetStarted}>
            <span>Get Started</span>
          </button>
          <button className="secondary-btn">
            <span>Learn More</span>
          </button>
        </div>
      </div>

      {showAuthModal && (
        <AuthModal 
          onClose={() => setShowAuthModal(false)} 
          onLogin={handleLogin}
        />
      )}

      {showFeatures && (
        <DashboardCarousel onClose={() => setShowFeatures(false)} />
      )}
    </header>
  );
};

export default Header;