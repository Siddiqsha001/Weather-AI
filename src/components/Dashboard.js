import React, { useEffect, useState } from 'react';
import { Bar, Pie, Radar, Line } from 'react-chartjs-2';
import { Chart, registerables } from 'chart.js';
import { supabase } from '../services/api';
import { useWeatherContext } from '../context/WeatherContext';
import {     //feather icons
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
  FiClock,
  FiTrash2,
  FiLogOut,
  FiEye,
  FiTrendingUp
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
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
  const [travelRooms, setTravelRooms] = useState([]);
  const [roomStats, setRoomStats] = useState({
    total: 0,
    active: 0,
    completed: 0
  });
  const navigate = useNavigate();

  const fetchTravelRooms = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: rooms, error } = await supabase
        .from('room_members')
        .select(`
          travel_rooms (
            id,
            name,
            code,
            destination,
            created_at,
            created_by,
            start_date,
            end_date,
            travel_mode,
            packing_list
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;
      
      const userRooms = rooms.map(r => r.travel_rooms).filter(Boolean);
      setTravelRooms(userRooms);

      const now = new Date();
      const stats = userRooms.reduce((acc, room) => {
        acc.total++;
        if (new Date(room.end_date) < now) {
          acc.completed++;
        } else if (new Date(room.start_date) <= now && new Date(room.end_date) >= now) {
          acc.active++;
        }
        return acc;
      }, { total: 0, active: 0, completed: 0 });

      setRoomStats(stats);
    } catch (err) {
      console.error('Error fetching travel rooms:', err);
      setError('Failed to load travel rooms');
    }
  };

  const handleLeaveRoom = async (roomId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from('room_members')
        .delete()
        .eq('room_id', roomId)
        .eq('user_id', user.id);

      fetchTravelRooms();
    } catch (err) {
      setError('Failed to leave room: ' + err.message);
    }
  };

  const handleDeleteRoom = async (roomId) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: members } = await supabase
        .from('room_members')
        .select('role')
        .eq('room_id', roomId)
        .eq('user_id', user.id)
        .single();

      if (!members || members.role !== 'admin') {
        throw new Error('Only room administrators can delete rooms');
      }

      await supabase.from('travel_rooms').delete().eq('id', roomId);
      fetchTravelRooms();
    } catch (err) {
      setError('Failed to delete room: ' + err.message);
    }
  };

  const handleViewRoom = (roomId) => {
    navigate(`/travel-planner/${roomId}`);
  };

  useEffect(() => {
    const fetchProfileData = async () => {
      try {
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          const { data: profile, error: profileError } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();

          if (profileError) throw profileError;
          
          if (profile) {
            setProfileData(profile);
            await fetchTravelRooms();
            
            const complete = profile.full_name && profile.location;
            setProfileComplete(complete);
            
            if (complete) {
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
              
              const upcoming = userActivities
                ?.filter(a => new Date(a.date) > now)
                .slice(0, 3) || [];
              
              const recent = userActivities
                ?.filter(a => new Date(a.date) <= now)
                .sort((a, b) => new Date(b.date) - new Date(a.date))
                .slice(0, 3) || [];

              setUpcomingActivities(upcoming);
              setRecentActivities(recent);

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

  useEffect(() => {
    const createParticles = () => {
      const particlesContainer = document.createElement('div');
      particlesContainer.className = 'particles';
      document.body.appendChild(particlesContainer);
      
      const particleCount = 30;
      
      for (let i = 0; i < particleCount; i++) {
        const particle = document.createElement('div');
        particle.className = 'particle';
        
        const size = Math.random() * 4 + 2;
        particle.style.width = `${size}px`;
        particle.style.height = `${size}px`;
        
        particle.style.left = `${Math.random() * 100}%`;
        particle.style.top = `${Math.random() * 100}%`;
        
        const duration = Math.random() * 10 + 10;
        particle.style.animationDuration = `${duration}s`;
        
        particle.style.animationDelay = `${Math.random() * 10}s`;
        
        particlesContainer.appendChild(particle);
      }
    };

    const addTiltEffect = () => {
      const cards = document.querySelectorAll('.chart-card, .metric, .room-card, .stat-card');
      
      cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const angleX = (y - centerY) / 20;
          const angleY = (centerX - x) / 20;
          
          card.style.transform = `rotateX(${angleX}deg) rotateY(${angleY}deg) translateZ(20px)`;
        });
        
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'translateZ(10px)';
        });
      });
    };

    createParticles();
    addTiltEffect();
    
    document.querySelectorAll('.recommendations li').forEach((li, index) => {
      li.style.animationDelay = `${index * 0.1}s`;
    });
    
    document.querySelectorAll('.metric').forEach((metric, index) => {
      metric.style.animationDelay = `${index * 0.1}s`;
    });

    return () => {
      const particles = document.querySelector('.particles');
      if (particles) {
        document.body.removeChild(particles);
      }
    };
  }, []);

  useEffect(() => {
    const addTiltEffect = () => {
      const cards = document.querySelectorAll('.chart-card, .metric, .room-card, .stat-card');
      
      cards.forEach(card => {
        card.addEventListener('mousemove', (e) => {
          const rect = card.getBoundingClientRect();
          const x = e.clientX - rect.left;
          const y = e.clientY - rect.top;
          const centerX = rect.width / 2;
          const centerY = rect.height / 2;
          const angleX = (y - centerY) / 20;
          const angleY = (centerX - x) / 20;
          
          card.style.transform = `perspective(1000px) rotateX(${angleX}deg) rotateY(${angleY}deg) scale3d(1.02, 1.02, 1.02)`;
        });
        
        card.addEventListener('mouseleave', () => {
          card.style.transform = 'perspective(1000px) rotateX(0) rotateY(0) scale3d(1, 1, 1)';
        });
      });
    };

    addTiltEffect();
  }, [weatherData, profileData]);

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
        <button className="button" onClick={() => window.location.reload()}>
          Try Again
        </button>
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
        <h1>
          <span className="gradient-text">WeatherMind</span>
          <span className="ai-text">AI</span>
        </h1>
        <div className="user-info">
          <p className="welcome-message">
            <FiUser className="icon-pulse" /> 
            Welcome back, {profileData?.full_name || 'User'}
          </p>
          <p className="location-message">
            <FiMapPin className="icon-bounce" /> 
            {profileData?.location || 'Set your location'}
          </p>
        </div>
      </header>

      <div className="dashboard-content">
        <section className="weather-summary">
          <h2>
            <FiSun className="icon-rotate" />
            Current Weather in {weatherData?.location || 'your location'}
          </h2>
          <div className="weather-metrics">
            <div className="metric temperature">
              <div className="metric-icon">
                <FiSun />
              </div>
              <span>Temperature</span>
              <strong>{weatherData?.temperature || '--'}°C</strong>
            </div>
            <div className="metric conditions">
              <div className="metric-icon">
                <FiCloudRain />
              </div>
              <span>Conditions</span>
              <strong>{weatherData?.conditions || '--'}</strong>
            </div>
            <div className="metric air-quality">
              <div className="metric-icon">
                <FiWind />
              </div>
              <span>Air Quality</span>
              <strong>{weatherData?.airQuality || '--'}</strong>
            </div>
            <div className="metric uv-index">
              <div className="metric-icon">
                <FiSun />
              </div>
              <span>UV Index</span>
              <strong>{weatherData?.uvIndex || '--'}</strong>
            </div>
          </div>
        </section>

        <section className="activity-stats">
          <div className="stat-card">
            <FiActivity className="stat-icon" />
            <h3>Total Activities</h3>
            <p className="stat-value">{activityStats?.total || 0}</p>
            <div className="stat-trend positive">
              <FiTrendingUp /> +{activityStats?.increase || 0}%
            </div>
          </div>
          <div className="stat-card">
            <FiCheckCircle className="stat-icon" />
            <h3>Completed</h3>
            <p className="stat-value">{activityStats.completed || 0}</p>
          </div>
          <div className="stat-card">
            <FiClock className="stat-icon" />
            <h3>Upcoming</h3>
            <p className="stat-value">{activityStats.upcoming || 0}</p>
          </div>
        </section>

        <section className="dashboard-grid">
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

        <section className="travel-rooms-section">
          <h3><FiMapPin /> Your Travel Plans</h3>
          <div className="room-stats">
            <div className="stat-card">
              <h4>Total Trips</h4>
              <p className="stat-value">{roomStats.total}</p>
            </div>
            <div className="stat-card">
              <h4>Active Trips</h4>
              <p className="stat-value">{roomStats.active}</p>
            </div>
            <div className="stat-card">
              <h4>Completed</h4>
              <p className="stat-value">{roomStats.completed}</p>
            </div>
          </div>

          <div className="travel-rooms-list">
            {travelRooms.length > 0 ? (
              <ul>
                {travelRooms.map((room) => (
                  <li key={room.id} className="room-card">
                    <div className="room-header">
                      <h4>{room.name}</h4>
                      <span className="room-code">Code: {room.code}</span>
                    </div>
                    <div className="room-details">
                      <p><strong>Destination:</strong> {room.destination}</p>
                      <p><strong>Dates:</strong> {new Date(room.start_date).toLocaleDateString()} - {new Date(room.end_date).toLocaleDateString()}</p>
                      <p><strong>Mode:</strong> {room.travel_mode}</p>
                      <p><strong>Packing List:</strong> {room.packing_list ? `${room.packing_list.length} items` : 'No items'}</p>
                    </div>
                    <div className="room-actions">
                      <button 
                        className="action-button view"
                        onClick={() => handleViewRoom(room.id)}
                      >
                        <FiEye /> View Room
                      </button>
                      <button 
                        className="action-button leave"
                        onClick={() => {
                          if (window.confirm('Are you sure you want to leave this room?')) {
                            handleLeaveRoom(room.id);
                          }
                        }}
                      >
                        <FiLogOut /> Leave Room
                      </button>
                      {room.created_by === (supabase.auth.getUser()?.data?.user?.id || '') && (
                        <button 
                          className="action-button delete"
                          onClick={() => {
                            if (window.confirm('Are you sure you want to delete this room? This action cannot be undone.')) {
                              handleDeleteRoom(room.id);
                            }
                          }}
                        >
                          <FiTrash2 /> Delete Room
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p>No travel plans yet. Create one in the Travel Planner!</p>
            )}
          </div>
        </section>

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

function generateRecommendations(profile, weather) {
  if (!weather) return ['Loading weather recommendations...'];
  
  const recommendations = [];
  
  if (profile.health_conditions?.includes('Asthma') && weather.airQuality !== 'Good') {
    recommendations.push(`⚠️ Air quality is ${weather.airQuality} - consider limiting outdoor activities`);
  }
  
  if (profile.allergies?.includes('Pollen') && weather.pollenCount !== 'Low') {
    recommendations.push(`🌼 Pollen count is ${weather.pollenCount} - consider taking allergy medication`);
  }
  
  if (profile.weather_sensitivities?.includes('Heat') && weather.temperature > 28) {
    recommendations.push(`🔥 High temperature (${weather.temperature}°C) - stay hydrated and avoid midday sun`);
  }
  
  if (profile.weather_sensitivities?.includes('UV') && weather.uvIndex > 5) {
    recommendations.push(`☀️ High UV index (${weather.uvIndex}) - wear sunscreen and protective clothing`);
  }
  
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