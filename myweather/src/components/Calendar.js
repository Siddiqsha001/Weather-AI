import React, { useState, useEffect } from 'react';
import { supabase } from '../services/api';
import { useWeatherContext } from '../context/WeatherContext';
import { FiSun, FiCloudRain, FiWind, FiAlertTriangle, FiCheck, FiX, FiEdit } from 'react-icons/fi';
import '../styles/Calendar.css';
import {
  getActivityRecommendations,
  getUserActivities,
  markActivityAsDone,
  addReminder,
  getReminders,
  updateActivity,
  deleteActivity,
  getLocationWeather
} from '../services/calendarService';
const Calendar = () => {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [activities, setActivities] = useState([]);
  const [reminders, setReminders] = useState([]);
  const [recommendations, setRecommendations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [goalStats, setGoalStats] = useState([]);
  const [healthConditions, setHealthConditions] = useState([]);
  const [allergies, setAllergies] = useState([]);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newActivity, setNewActivity] = useState({
    name: '',
    date: new Date(),
    location: '',
    notes: ''
  });
  const [editingActivity, setEditingActivity] = useState(null);
  const [locationWeather, setLocationWeather] = useState(null);
  const [notificationSettings, setNotificationSettings] = useState({
    reminderTimes: [30] // Default 30 minutes before
  });
  
  const { weatherData, userPreferences } = useWeatherContext();

  // Utility functions
  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    return new Date(date.getFullYear(), date.getMonth(), 1).getDay();
  };

  const getActivityStats = () => {
    const goals = {
      Walk: 10,
      Yoga: 8,
      Meditation: 12,
      Swimming: 5,
      Cycling: 6
    };

    const counts = {};
    activities.forEach((a) => {
      const name = a.activity_name;
      counts[name] = (counts[name] || 0) + 1;
    });

    const stats = Object.entries(goals).map(([activity, goal]) => ({
      activity,
      completed: counts[activity] || 0,
      goal,
      progress: Math.min(100, Math.round(((counts[activity] || 0) / goal) * 100))
    }));
    
    setGoalStats(stats);
  };

  const sendNotification = async (activity, message) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
  
      const { data: profile } = await supabase
        .from('profiles')
        .select('email, phone, notification_preferences')
        .eq('id', user.id)
        .single();
  
      if (!profile) return;
  
      const notificationPromises = [];
  
      if (profile.notification_preferences?.email && profile.email) {
        notificationPromises.push(
          supabase.functions.invoke('send-email', {
            body: JSON.stringify({
              to: profile.email,
              subject: `Activity Reminder: ${activity.activity_name}`,
              text: message
            })
          })
        );
      }
  
      if (profile.notification_preferences?.sms && profile.phone) {
        notificationPromises.push(
          supabase.functions.invoke('send-sms', {
            body: JSON.stringify({
              to: profile.phone,
              message: `WeatherMind: ${message}`
            })
          })
        );
      }
  
      await Promise.all(notificationPromises);
    } catch (error) {
      console.error('Error sending notifications:', error);
    }
  };
  
  const scheduleReminders = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const now = new Date();
    const upcomingActivities = activities.filter(a => new Date(a.date) > now && a.status !== 'completed');
    
    // Clear existing reminders for completed activities
    const completedActivities = activities.filter(a => a.status === 'completed');
    for (const activity of completedActivities) {
      await supabase
        .from('reminders')
        .delete()
        .eq('activity_id', activity.id);
    }

    // Schedule new reminders
    for (const activity of upcomingActivities) {
      const activityTime = new Date(activity.date);
      const weatherAtTime = await getLocationWeather(activity.location || 'current', activityTime);
      
      for (const minutesBefore of notificationSettings.reminderTimes) {
        const reminderTime = new Date(activityTime.getTime() - (minutesBefore * 60 * 1000));
        
        if (reminderTime < now) continue;

        const { data: existingReminder } = await supabase
          .from('reminders')
          .select('*')
          .eq('activity_id', activity.id)
          .eq('reminder_time', reminderTime.toISOString())
          .single();

        if (!existingReminder) {
          let message = `Reminder: ${activity.activity_name} at ${activityTime.toLocaleTimeString()}`;
          
          if (weatherAtTime) {
            if (activity.activity_name.toLowerCase().includes('outdoor') || 
                activity.activity_name.toLowerCase().includes('walk') ||
                activity.activity_name.toLowerCase().includes('run')) {
              if (weatherAtTime.conditions.toLowerCase().includes('rain')) {
                message += ` - Rain expected, consider rescheduling`;
              } else if (weatherAtTime.temperature > 30) {
                message += ` - High temperature (${weatherAtTime.temperature}°C)`;
              }
            }
          }

          await addReminder({
            user_id: user.id,
            activity_id: activity.id,
            reminder_time: reminderTime.toISOString(),
            message: message
          });

          // Set timeout for actual notification
          setTimeout(async () => {
            await sendNotification(activity, message);
          }, reminderTime.getTime() - now.getTime());
        }
      }
    }

    // Refresh reminders list
    const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
    const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
    const { data: freshReminders } = await getReminders(user.id, start.toISOString(), end.toISOString());
    setReminders(freshReminders || []);
  };

  const getHealthWarnings = (date) => {
    if (!healthConditions.length) return null;
    
    const todayWeather = weatherData[date.toDateString()] || locationWeather;
    if (!todayWeather) return null;

    const warnings = [];
    
    healthConditions.forEach(condition => {
      switch(condition.toLowerCase()) {
        case 'asthma':
          if (todayWeather.air_quality > 100) {
            warnings.push({
              message: `High pollution (${todayWeather.air_quality}) may trigger asthma`,
              icon: <FiWind />
            });
          }
          break;
        case 'arthritis':
        case 'joint pain':
          if (todayWeather.humidity > 70) {
            warnings.push({
              message: `High humidity (${todayWeather.humidity}%) may worsen arthritis`,
              icon: <FiCloudRain />
            });
          }
          break;
        case 'heart disease':
          if (todayWeather.temperature > 32 || todayWeather.temperature < 5) {
            warnings.push({
              message: `Extreme temperatures (${todayWeather.temperature}°C) may affect heart condition`,
              icon: <FiAlertTriangle />
            });
          }
          break;
        case 'migraine':
          if (todayWeather.pressure < 1000 || todayWeather.pressure > 1020) {
            warnings.push({
              message: `Pressure changes (${todayWeather.pressure}hPa) may trigger migraines`,
              icon: <FiWind />
            });
          }
          break;
        case 'skin sensitivity':
          if (todayWeather.uv_index > 5) {
            warnings.push({
              message: `High UV index (${todayWeather.uv_index}) - wear sunscreen`,
              icon: <FiSun />
            });
          }
          break;
        default:
          break;
      }
    });

    return warnings.length > 0 ? warnings : null;
  };

  const handleEditActivity = (activity) => {
    setEditingActivity(activity);
    setNewActivity({
      name: activity.activity_name,
      date: new Date(activity.date),
      location: activity.location || '',
      notes: activity.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDeleteActivity = async (activityId) => {
    const confirmDelete = window.confirm("Are you sure you want to delete this activity?");
    if (!confirmDelete) return;
  
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("User not authenticated");
  
      setLoading(true);
      
      // Delete the activity and its reminders
      await Promise.all([
        deleteActivity(activityId),
        supabase.from('reminders').delete().eq('activity_id', activityId)
      ]);
      
      // Refresh data
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      const [userActivities, userReminders] = await Promise.all([
        getUserActivities(user.id, start.toISOString(), end.toISOString()),
        getReminders(user.id, start.toISOString(), end.toISOString())
      ]);
      
      setActivities(userActivities || []);
      setReminders(userReminders || []);
      getActivityStats();
      
      alert("Activity and its reminders deleted successfully");
    } catch (error) {
      console.error('Error deleting activity:', error);
      alert(`Failed to delete activity: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };
  
  const handleAddActivity = async () => {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      if (!newActivity.name.trim()) {
        alert('Activity name is required');
        return;
      }

      const activityData = {
        user_id: user.id,
        activity_name: newActivity.name.trim(),
        date: newActivity.date.toISOString(),
        location: newActivity.location?.trim() || null,
        notes: newActivity.notes?.trim() || null,
        status: 'scheduled'
      };

      const { data, error } = await supabase
        .from('activities')
        .insert(activityData)
        .select();

      if (error) throw error;
      if (!data) throw new Error('No data returned');

      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      
      const { data: freshActivities, error: fetchError } = await supabase
        .from('activities')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', start.toISOString())
        .lte('date', end.toISOString())
        .order('date', { ascending: true });

      if (fetchError) throw fetchError;

      setActivities(freshActivities || []);
      setShowAddForm(false);
      setNewActivity({
        name: '',
        date: selectedDate,
        location: '',
        notes: ''
      });

      await scheduleReminders();
    } catch (error) {
      console.error('Error saving activity:', error);
      alert(`Failed to save activity: ${error.message}`);
    }
  };

  const handleUpdateActivity = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user && editingActivity) {
        let locationWeather = null;
        if (editingActivity.location !== newActivity.location) {
          locationWeather = await getLocationWeather(newActivity.location, newActivity.date);
        }
        
        const updatedData = {
          activity_name: newActivity.name,
          date: newActivity.date.toISOString(),
          location: newActivity.location,
          notes: newActivity.notes,
          weather_conditions: locationWeather ? locationWeather.conditions : editingActivity.weather_conditions
        };

        await updateActivity(editingActivity.id, updatedData);
        
        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        const [userActivities, userReminders] = await Promise.all([
          getUserActivities(user.id, start.toISOString(), end.toISOString()),
          getReminders(user.id, start.toISOString(), end.toISOString())
        ]);
        
        setActivities(userActivities);
        setReminders(userReminders);
        getActivityStats();
        
        setEditingActivity(null);
        setNewActivity({
          name: '',
          date: new Date(),
          location: '',
          notes: ''
        });
        setShowAddForm(false);

        await scheduleReminders();
      }
    } catch (error) {
      console.error('Error updating activity:', error);
    }
  };

  const handleMarkAsDone = async (activityId) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      // Mark as done and delete reminders
      await Promise.all([
        markActivityAsDone(activityId),
        supabase.from('reminders').delete().eq('activity_id', activityId)
      ]);
      
      // Refresh data
      const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
      const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
      const [updatedActivities, freshReminders] = await Promise.all([
        getUserActivities(user.id, start.toISOString(), end.toISOString()),
        getReminders(user.id, start.toISOString(), end.toISOString())
      ]);
      
      setActivities(updatedActivities);
      setReminders(freshReminders);
      getActivityStats();
      
      alert("Activity marked as done and reminders cleared!");
    } catch (error) {
      console.error('Error marking activity as done:', error);
      alert('Failed to mark activity as done');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let mounted = true;
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_OUT') {
        setActivities([]);
        setRecommendations([]);
        setReminders([]);
      }
    });

    const fetchData = async () => {
      try {
        if (!mounted) return;
        setLoading(true);
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return;

        const { data: profile } = await supabase
          .from('profiles')
          .select('preferred_outdoor_activities, preferred_indoor_activities, weather_sensitivities, health_conditions, allergies')
          .eq('id', user.id)
          .single();

        if (profile?.health_conditions) {
          setHealthConditions(profile.health_conditions);
        }

        if (profile?.allergies) {
          setAllergies(profile.allergies);
        }

        const start = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), 1);
        const end = new Date(selectedDate.getFullYear(), selectedDate.getMonth() + 1, 0);
        
        const [userActivities, userReminders] = await Promise.all([
          getUserActivities(user.id, start.toISOString(), end.toISOString()),
          getReminders(user.id, start.toISOString(), end.toISOString())
        ]);
        
        setActivities(userActivities);
        setReminders(userReminders);

        if (weatherData) {
          const activityRecommendations = await getActivityRecommendations(
            weatherData, 
            profile,
            profile?.health_conditions || [],
            profile?.allergies || []
          );
          setRecommendations(activityRecommendations);
        }

        setLoading(false);
        getActivityStats();
        scheduleReminders();
      } catch (error) {
        console.error('Error fetching calendar data:', error);
        setLoading(false);
      }
    };

    fetchData();
    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, [selectedDate, weatherData, userPreferences]);

  useEffect(() => {
    const fetchLocationWeather = async () => {
      if (activities.length > 0) {
        const activitiesOnDate = activities.filter(a => 
          new Date(a.date).toDateString() === selectedDate.toDateString() && 
          a.location
        );
        
        if (activitiesOnDate.length > 0) {
          const weather = await getLocationWeather(activitiesOnDate[0].location, selectedDate);
          setLocationWeather(weather);
        } else {
          setLocationWeather(null);
        }
      }
    };
    
    fetchLocationWeather();
  }, [selectedDate, activities]);

  if (loading) {
    return <div className="loading-spinner">Loading calendar...</div>;
  }

  const healthWarnings = getHealthWarnings(selectedDate);
  const daysInMonth = getDaysInMonth(selectedDate);
  const firstDay = getFirstDayOfMonth(selectedDate);
  const blankDays = Array(firstDay).fill(null);

  const activitiesForSelectedDate = activities.filter(a =>
    new Date(a.date).toDateString() === selectedDate.toDateString()
  );

  return (
    <div className="calendar-container">
      <div className="calendar-header">
        <h2>Smart Activity Calendar</h2>
        <div className="calendar-controls">
          <div className="month-selector">
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() - 1)))}>
              Previous
            </button>
            <span>{selectedDate.toLocaleString('default', { month: 'long', year: 'numeric' })}</span>
            <button onClick={() => setSelectedDate(new Date(selectedDate.setMonth(selectedDate.getMonth() + 1)))}>
              Next
            </button>
          </div>
          <button 
            className="add-activity-button"
            onClick={() => {
              setShowAddForm(true);
              setEditingActivity(null);
              setNewActivity({
                name: '',
                date: selectedDate,
                location: '',
                notes: ''
              });
            }}
          >
            + Add Activity
          </button>
        </div>
      </div>

      <div className="calendar-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(day => (
          <div key={day} className="calendar-day header">{day}</div>
        ))}
        
        {blankDays.map((_, index) => (
          <div key={`blank-${index}`} className="calendar-day empty"></div>
        ))}
        
        {Array.from({ length: daysInMonth }).map((_, i) => {
          const date = new Date(selectedDate.getFullYear(), selectedDate.getMonth(), i + 1);
          const dayActivities = activities.filter(a =>
            new Date(a.date).toDateString() === date.toDateString()
          );
          const isToday = date.toDateString() === new Date().toDateString();
          const isSelected = date.toDateString() === selectedDate.toDateString();
          
          return (
            <div
              key={date.toISOString()}
              className={`calendar-day 
                ${isToday ? 'today' : ''} 
                ${isSelected ? 'selected' : ''}
                ${dayActivities.length > 0 ? 'has-activity' : ''}`}
              onClick={() => setSelectedDate(date)}
            >
              <span>{date.getDate()}</span>
              {dayActivities.length > 0 && (
                <div className="activity-indicator">
                  {dayActivities.length > 3 ? '...' : dayActivities.map((a, i) => (
                    <div key={i} className="activity-dot" title={a.activity_name}></div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="calendar-details">
        <div className="details-left">
          <div className="selected-date-header">
            <h3>{selectedDate.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}</h3>
            {locationWeather && (
              <div className="location-weather">
                <span>{locationWeather.location}: {locationWeather.temperature}°C, {locationWeather.conditions}</span>
              </div>
            )}
          </div>

          {healthWarnings && (
            <div className="health-warnings">
              <h4>Health Advisory</h4>
              {healthWarnings.map((warning, index) => (
                <div key={index} className="warning-message">
                  {warning.icon} {warning.message}
                </div>
              ))}
            </div>
          )}

          <div className="activity-list">
            <h4>Scheduled Activities</h4>
            {activitiesForSelectedDate.length > 0 ? (
              activitiesForSelectedDate
                .sort((a, b) => new Date(a.date) - new Date(b.date))
                .map((activity, index) => (
                <div key={index} className={`activity-item ${activity.status === 'completed' ? 'completed' : ''}`}>
                  <div className="activity-info">
                    <div className="activity-time">
                      {new Date(activity.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div className="activity-main">
                      <div className="activity-name">
                        {activity.activity_name}
                        {activity.status === 'completed' ? (
                          <span className="completed-badge">
                            <FiCheck /> Completed
                          </span>
                        ) : (
                          <button 
                            onClick={() => handleMarkAsDone(activity.id)} 
                            className="mark-done-btn"
                          >
                            <FiCheck /> Mark Done
                          </button>
                        )}
                      </div>
                      {activity.location && (
                        <div className="activity-location">📍 {activity.location}</div>
                      )}
                    </div>
                  </div>
                  <div className="activity-actions">
                    <button 
                      onClick={() => handleEditActivity(activity)}
                      className="edit-btn"
                    >
                      <FiEdit /> Edit
                    </button>
                    <button 
                      onClick={() => handleDeleteActivity(activity.id)}
                      className="delete-btn"
                    >
                      <FiX /> Delete
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <p>No activities scheduled for this day.</p>
            )}
          </div>
        </div>

        <div className="details-right">
          {showAddForm && (
            <div className="add-activity-form">
              <h4>{editingActivity ? 'Edit Activity' : 'Add New Activity'}</h4>
              <div className="form-group">
                <label>Activity Name *</label>
                <input
                  type="text"
                  value={newActivity.name}
                  onChange={(e) => setNewActivity({...newActivity, name: e.target.value})}
                  placeholder="e.g. Morning Walk"
                  required
                />
              </div>
              <div className="form-group">
                <label>Date & Time *</label>
                <input
                  type="datetime-local"
                  value={newActivity.date.toISOString().slice(0, 16)}
                  onChange={(e) => setNewActivity({...newActivity, date: new Date(e.target.value)})}
                  required
                />
              </div>
              <div className="form-group">
                <label>Location (optional)</label>
                <input
                  type="text"
                  value={newActivity.location}
                  onChange={(e) => setNewActivity({...newActivity, location: e.target.value})}
                  placeholder="e.g. Central Park"
                />
                {newActivity.location && (
                  <button 
                    className="check-weather-btn"
                    onClick={async () => {
                      const weather = await getLocationWeather(newActivity.location, newActivity.date);
                      if (weather) {
                        alert(`Weather at ${newActivity.location}: ${weather.temperature}°C, ${weather.conditions}`);
                      }
                    }}
                  >
                    Check Weather
                  </button>
                )}
              </div>
              <div className="form-group">
                <label>Notes (optional)</label>
                <textarea
                  value={newActivity.notes}
                  onChange={(e) => setNewActivity({...newActivity, notes: e.target.value})}
                  placeholder="Any additional details..."
                />
              </div>
              <div className="form-group">
                <label>Reminder Times (minutes before)</label>
                <select
                  multiple
                  value={notificationSettings.reminderTimes}
                  onChange={(e) => {
                    const options = Array.from(e.target.selectedOptions, option => parseInt(option.value));
                    setNotificationSettings({...notificationSettings, reminderTimes: options});
                  }}
                  className="reminder-time-select"
                >
                  <option value="15">15 minutes</option>
                  <option value="30">30 minutes</option>
                  <option value="60">1 hour</option>
                  <option value="1440">1 day</option>
                </select>
              </div>
              <div className="form-actions">
                <button 
                  onClick={editingActivity ? handleUpdateActivity : handleAddActivity}
                  className="save-btn"
                >
                  {editingActivity ? 'Update Activity' : 'Save Activity'}
                </button>
                <button 
                  onClick={() => {
                    setShowAddForm(false);
                    setEditingActivity(null);
                  }}
                  className="cancel-btn"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          <div className="ai-suggestion">
            <h4>Personalized Recommendations</h4>
            {recommendations.length > 0 ? (
              <div className="recommendations-list">
                {recommendations.map((rec, index) => (
                  <div key={index} className="activity-item">
                    <span>{rec.activity}</span>
                    <div className="recommendation-details">
                      {rec.suitable ? (
                        <span className="recommended">✓ Recommended</span>
                      ) : (
                        <span className="not-recommended">✗ {rec.reason}</span>
                      )}
                      {rec.healthNote && <div className="health-note">Note: {rec.healthNote}</div>}
                      {rec.allergyWarning && <div className="allergy-warning">⚠️ {rec.allergyWarning}</div>}
                    </div>
                    {rec.suitable && (
                      <button 
                        onClick={() => {
                          setNewActivity({
                            name: rec.activity,
                            date: selectedDate,
                            location: '',
                            notes: rec.healthNote || ''
                          });
                          setShowAddForm(true);
                        }} 
                        className="add-activity-btn"
                      >
                        Add to Calendar
                      </button>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p>No recommendations available. Please update your profile with health information.</p>
            )}
          </div>

          <div className="goal-stats">
            <h4>Monthly Goals Progress</h4>
            {goalStats.map((goal, idx) => (
              <div key={idx} className="goal-item">
                <div className="goal-label">{goal.activity}</div>
                <div className="goal-progress">
                  <div 
                    className="progress-bar" 
                    style={{ width: `${goal.progress}%` }}
                  ></div>
                </div>
                <div className="goal-count">{goal.completed}/{goal.goal}</div>
              </div>
            ))}
          </div>

          {reminders.length > 0 && (
            <div className="reminders-list">
              <h4>Upcoming Reminders</h4>
              {reminders
                .sort((a, b) => new Date(a.reminder_time) - new Date(b.reminder_time))
                .map((reminder, index) => (
                <div key={index} className="reminder-item">
                  <div className="reminder-time">
                    {new Date(reminder.reminder_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                  <div className="reminder-message">{reminder.message}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Calendar;