import React, { useEffect, useState } from 'react';
import { Bar, Pie, Radar, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { supabase } from '../services/api';
import { useWeatherContext } from '../context/WeatherContext';
import { 
  FiUser, 
  FiMapPin, 
  FiHeart, 
  FiActivity, 
  FiAlertCircle, 
  FiSun, 
  FiCloudRain,
  FiWind,
  FiCalendar,
  FiCheckCircle,
  FiClock
} from 'react-icons/fi';
import '../styles/Dashboard.css';

Chart.register(...registerables);

const Dashboard = () => {
  const [weatherData, setWeatherData] = useState(null);
  const [profileData, setProfileData] = useState(null);
  const [activities, setActivities] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [profileComplete, setProfileComplete] = useState(false);
  const [upcomingActivities, setUpcomingActivities] = useState([]);
  const [recentActivities, setRecentActivities] = useState([]);
  const [activityStats, setActivityStats] = useState({});
  const { userPreferences } = useWeatherContext();

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Fetch profile data
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          
          if (profile) {
            setProfileData(profile);
            // Check if profile is complete (at least name and location)
            const complete = profile.full_name && profile.location;
            setProfileComplete(complete);
            
            if (complete) {
              // Fetch weather data
              const mockWeatherData = {
                temperature: 22,
                humidity: 65,
                pollenCount: 'Moderate',
                uvIndex: 5,
                airQuality: 'Good',
                location: profile.location || 'Unknown',
                conditions: 'Partly Cloudy'
              };
              setWeatherData(mockWeatherData);

              // Fetch activities
              const now = new Date();
              const startDate = new Date(now.getFullYear(), now.getMonth(), 1);
              const endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0);
              
              const { data: userActivities, error: activitiesError } = await supabase
                .from('activities')
                .select('*')
                .eq('user_id', user.id)
                .gte('date', startDate.toISOString())
                .lte('date', endDate.toISOString())
                .order('date', { ascending: true });

              if (activitiesError) throw activitiesError;

              setActivities(userActivities || []);
              
              // Process activities
              const upcoming = userActivities
                ?.filter(a => new Date(a.date) > now)
                .slice(0, 3) || [];
              
              const recent = userActivities
                ?.filter(a => new Date(a.date) <= now)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3) || [];

              setUpcomingActivities(upcoming);
              setRecentActivities(recent);

              // Calculate activity stats
              const stats = {
                total: userActivities?.length || 0,
                completed: userActivities?.filter(a => a.status === 'completed').length || 0,
                upcoming: upcoming.length,
                byType: {}
              };

              userActivities?.forEach(activity => {
                const type = activity.activity_name;
                stats.byType[type] = (stats.byType[type] || 0) + 1;
              });

              setActivityStats(stats);
            }
          }
        }
      } catch (err) {
        setError(err.message);
        console.error('Error fetching dashboard data:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchProfileData();
  }, []);

  if (loading) {
    return (
      <div className="dashboard-loading">
        <h2>Loading your personalized dashboard...</h2>
        <div className="spinner"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-error">
        <h2>Error loading dashboard</h2>
        <p>{error}</p>
        <button onClick={() => window.location.reload()}>Try Again</button>
      </div>
    );
  }

  if (!profileData || !profileComplete) {
    return (
      <div className="dashboard-empty">
        <h2>Welcome to WeatherMind AI</h2>
        <p>Please complete your profile to see personalized recommendations</p>
        <div className="missing-fields">
          {!profileData?.full_name && <p><FiUser /> Missing your name</p>}
          {!profileData?.location && <p><FiMapPin /> Missing your location</p>}
        </div>
        <a href="/profile" className="button">Complete Your Profile</a>
      </div>
    );
  }

  // Prepare chart data based on profile
  const activitiesData = {
    labels: profileData.preferred_activities?.length > 0 
      ? profileData.preferred_activities 
      : ['No activities selected'],
    datasets: [{
      label: 'Your Activities',
      data: profileData.preferred_activities?.length > 0 
        ? profileData.preferred_activities.map(activity => 1)
        : [0],
      backgroundColor: 'rgba(54, 162, 235, 0.6)',
      borderColor: 'rgba(54, 162, 235, 1)',
      borderWidth: 1
    }]
  };

  const sensitivitiesData = {
    labels: profileData.weather_sensitivities?.length > 0 
      ? profileData.weather_sensitivities 
      : ['No sensitivities selected'],
    datasets: [{
      label: 'Your Sensitivities',
      data: profileData.weather_sensitivities?.length > 0 
        ? profileData.weather_sensitivities.map(sensitivity => 1)
        : [0],
      backgroundColor: 'rgba(255, 99, 132, 0.6)',
      borderColor: 'rgba(255, 99, 132, 1)',
      borderWidth: 1
    }]
  };

  const healthData = {
    labels: profileData.health_conditions?.length > 0 
      ? profileData.health_conditions 
      : ['No health conditions'],
    datasets: [{
      label: 'Health Conditions',
      data: profileData.health_conditions?.length > 0 
        ? profileData.health_conditions.map(condition => 1)
        : [0],
      backgroundColor: 'rgba(75, 192, 192, 0.6)',
      borderColor: 'rgba(75, 192, 192, 1)',
      borderWidth: 1
    }]
  };

  const activityTypeData = {
    labels: Object.keys(activityStats.byType || {}),
    datasets: [{
      label: 'Activities This Month',
      data: Object.values(activityStats.byType || {}),
      backgroundColor: 'rgba(153, 102, 255, 0.6)',
      borderColor: 'rgba(153, 102, 255, 1)',
      borderWidth: 1
    }]
  };

  const completionData = {
    labels: ['Completed', 'Upcoming'],
    datasets: [{
      data: [
        activityStats.completed || 0,
        activityStats.upcoming || 0
      ],
      backgroundColor: [
        'rgba(75, 192, 192, 0.6)',
        'rgba(255, 159, 64, 0.6)'
      ],
      borderColor: [
        'rgba(75, 192, 192, 1)',
        'rgba(255, 159, 64, 1)'
      ],
      borderWidth: 1
    }]
  };

  return (
    <div className="dashboard-container">
      <header className="dashboard-header">
        <h1>WeatherMind AI Dashboard</h1>
        <div className="user-info">
          <p className="welcome-message"><FiUser /> Welcome back, {profileData.full_name}!</p>
          <p className="location-message"><FiMapPin /> {profileData.location}</p>
        </div>
      </header>

      <div className="dashboard-content">
        {/* Weather Summary Section */}
        <section className="weather-summary">
          <h2>Current Weather in {weatherData?.location || 'your location'}</h2>
          <div className="weather-metrics">
            <div className="metric">
              <span>Temperature</span>
              <strong>{weatherData?.temperature || '--'}°C</strong>
            </div>
            <div className="metric">
              <span>Conditions</span>
              <strong>{weatherData?.conditions || '--'}</strong>
            </div>
            <div className="metric">
              <span>Air Quality</span>
              <strong>{weatherData?.airQuality || '--'}</strong>
            </div>
            <div className="metric">
              <span>UV Index</span>
              <strong>{weatherData?.uvIndex || '--'}</strong>
            </div>
          </div>
        </section>

        {/* Activity Overview Section */}
        <section className="activity-overview">
          <div className="activity-stats">
            <div className="stat-card">
              <h3>Total Activities</h3>
              <p className="stat-value">{activityStats.total || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Completed</h3>
              <p className="stat-value">{activityStats.completed || 0}</p>
            </div>
            <div className="stat-card">
              <h3>Upcoming</h3>
              <p className="stat-value">{activityStats.upcoming || 0}</p>
            </div>
          </div>
        </section>

        {/* Main Dashboard Grid */}
        <section className="dashboard-grid">
          {/* Profile Charts */}
          <div className="chart-card wide">
            <h3><FiActivity /> Your Preferred Activities</h3>
            <div className="chart-wrapper">
              <Bar
                data={activitiesData}
                options={{
                  responsive: true,
                  scales: {
                    y: {
                      beginAtZero: true,
                      max: 1,
                      ticks: {
                        stepSize: 1
                      }
                    }
                  }
                }}
              />
            </div>
          </div>

          <div className="chart-card">
            <h3><FiAlertCircle /> Weather Sensitivities</h3>
            <div className="chart-wrapper">
              <Pie
                data={sensitivitiesData}
                options={{ responsive: true }}
              />
            </div>
          </div>

          <div className="chart-card">
            <h3><FiHeart /> Health Conditions</h3>
            <div className="chart-wrapper">
              <Radar
                data={healthData}
                options={{ responsive: true }}
              />
            </div>
          </div>

          {/* Activity Charts */}
          <div className="chart-card">
            <h3><FiCalendar /> Activity Types</h3>
            <div className="chart-wrapper">
              <Pie
                data={activityTypeData}
                options={{ responsive: true }}
              />
            </div>
          </div>

          <div className="chart-card">
            <h3><FiCheckCircle /> Completion Status</h3>
            <div className="chart-wrapper">
              <Pie
                data={completionData}
                options={{ responsive: true }}
              />
            </div>
          </div>
        </section>

        {/* Upcoming and Recent Activities */}
        <section className="activities-section">
          <div className="upcoming-activities">
            <h3><FiClock /> Upcoming Activities</h3>
            {upcomingActivities.length > 0 ? (
              <ul>
                {upcomingActivities.map((activity, index) => (
                  <li key={index}>
                    <div className="activity-time">
                      {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="activity-details">
                      <strong>{activity.activity_name}</strong>
                      {activity.location && <span>📍 {activity.location}</span>}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No upcoming activities scheduled.</p>
            )}
          </div>

          <div className="recent-activities">
            <h3>Recent Activities</h3>
            {recentActivities.length > 0 ? (
              <ul>
                {recentActivities.map((activity, index) => (
                  <li key={index}>
                    <div className="activity-time">
                      {new Date(activity.date).toLocaleDateString()}
                    </div>
                    <div className="activity-details">
                      <strong>{activity.activity_name}</strong>
                      <span className={`status ${activity.status}`}>{activity.status}</span>
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No recent activities.</p>
            )}
          </div>
        </section>

        {/* Health Recommendations */}
        <section className="recommendations">
          <h3>Personalized Recommendations</h3>
          <ul>
            {generateRecommendations(profileData, weatherData).map((rec, i) => (
              <li key={i}>{rec}</li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
};

// Enhanced recommendation generator
function generateRecommendations(profile, weather) {
  if (!weather) return ['Loading weather recommendations...'];
  
  const recommendations = [];
  
  // Health conditions recommendations
  if (profile.health_conditions?.includes('Asthma') && weather.airQuality !== 'Good') {
    recommendations.push(`⚠️ Air quality is ${weather.airQuality} - consider limiting outdoor activities`);
  }
  
  // Allergy recommendations
  if (profile.allergies?.includes('Pollen') && weather.pollenCount !== 'Low') {
    recommendations.push(`🌼 Pollen count is ${weather.pollenCount} - consider taking allergy medication`);
  }
  
  // Weather sensitivity recommendations
  if (profile.weather_sensitivities?.includes('Heat') && weather.temperature > 28) {
    recommendations.push(`🔥 High temperature (${weather.temperature}°C) - stay hydrated and avoid midday sun`);
  }
  
  if (profile.weather_sensitivities?.includes('UV') && weather.uvIndex > 5) {
    recommendations.push(`☀️ High UV index (${weather.uvIndex}) - wear sunscreen and protective clothing`);
  }
  
  // Activity-specific recommendations
  if (profile.preferred_activities?.includes('Running') && weather.temperature > 25) {
    recommendations.push('🏃 Consider running in the early morning or evening when it\'s cooler');
  }
  
  if (profile.preferred_activities?.includes('Hiking') && weather.uvIndex > 6) {
    recommendations.push('🥾 If hiking today, wear a hat and bring plenty of water');
  }

  if (profile.preferred_activities?.includes('Swimming') && weather.temperature < 20) {
    recommendations.push('🏊 Water might be cold - consider indoor swimming instead');
  }

  if (profile.weather_sensitivities?.includes('Humidity') && weather.humidity > 70) {
    recommendations.push('💧 High humidity - stay hydrated and wear breathable clothing');
  }

  if (profile.health_conditions?.includes('Heart Condition') && weather.temperature > 30) {
    recommendations.push('❤️ Extreme heat may affect cardiovascular health - limit strenuous activities');
  }
  
  if (recommendations.length === 0) {
    recommendations.push('✅ Weather conditions are good for your usual activities!');
  }
  
  return recommendations;
}

export default Dashboard;