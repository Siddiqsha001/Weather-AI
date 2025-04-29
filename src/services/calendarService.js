import { supabase } from './api';

/**
 * Get personalized activity recommendations based on weather, user preferences, health conditions, and allergies
 */
const getActivityRecommendations = async (weather, userPreferences, healthConditions = [], allergies = []) => {
  try {
    const { temperature, conditions, uv_index, air_quality, humidity, pressure, pollen } = weather || {};
    const { preferred_outdoor_activities = [], preferred_indoor_activities = [], weather_sensitivities = [] } = userPreferences || {};

    // Combine all possible activities
    const allActivities = [...new Set([...preferred_outdoor_activities, ...preferred_indoor_activities])];
    const recommendations = [];

    // Check if weather is safe based on user sensitivities
    const isSafe = !(
      (weather_sensitivities.includes('UV Sensitivity') && uv_index > 5) ||
      (weather_sensitivities.includes('Heat Sensitivity') && temperature > 30) ||
      (weather_sensitivities.includes('Air Quality Sensitivity') && air_quality > 100)
    );

    // Evaluate each activity
    for (const activity of allActivities) {
      const recommendation = {
        activity,
        suitable: true,
        reason: '',
        healthNote: '',
        allergyWarning: ''
      };

      // Check for allergy conflicts
      for (const allergy of allergies) {
        const allergyLower = allergy.toLowerCase();
        
        // Pollen-related activities
        if (pollen && pollen[allergyLower] > 7) {
          if (activity.toLowerCase().includes('hiking') || 
              activity.toLowerCase().includes('gardening') ||
              activity.toLowerCase().includes('outdoor')) {
            recommendation.suitable = false;
            recommendation.allergyWarning = `High ${allergy} pollen level`;
          }
        }
        
        // Food-related activities
        if (activity.toLowerCase().includes('eating') || 
            activity.toLowerCase().includes('cooking')) {
          recommendation.healthNote = `Check ingredients for ${allergy} allergens`;
        }
      }

      // Check for health condition conflicts if still suitable
      if (recommendation.suitable) {
        for (const condition of healthConditions) {
          const conditionLower = condition.toLowerCase();
          
          switch(conditionLower) {
            case 'asthma':
              if (activity.toLowerCase().includes('running') && air_quality > 50) {
                recommendation.suitable = false;
                recommendation.reason = 'Poor air quality';
                recommendation.healthNote = 'Not recommended for asthma when air quality is poor';
              }
              break;
            case 'arthritis':
              if ((activity.toLowerCase().includes('swimming') || 
                  activity.toLowerCase().includes('water')) && temperature < 22) {
                recommendation.healthNote = 'Cold water may worsen arthritis symptoms';
              }
              break;
            case 'heart disease':
              if (activity.toLowerCase().includes('intense') && 
                  (temperature > 28 || temperature < 10)) {
                recommendation.healthNote = 'Extreme temperatures may strain cardiovascular system';
              }
              break;
            default:
              break;
          }
        }
      }

      // Check weather suitability if still suitable
      if (recommendation.suitable) {
        const activityLower = activity.toLowerCase();
        
        if (activityLower.includes('hiking') || 
            activityLower.includes('cycling') || 
            activityLower.includes('running')) {
          if (!isSafe || conditions?.toLowerCase().includes('rain')) {
            recommendation.suitable = false;
            recommendation.reason = 'Weather conditions not ideal for outdoor activities';
          }
        } else if (activityLower.includes('swimming')) {
          if (temperature < 20) {
            recommendation.suitable = false;
            recommendation.reason = 'Temperature too low for swimming';
          }
        } else if (activityLower.includes('yoga') || 
                  activityLower.includes('meditation')) {
          if (humidity > 80) {
            recommendation.healthNote = 'High humidity may make breathing exercises uncomfortable';
          }
        }
      }

      recommendations.push(recommendation);
    }

    return recommendations;
  } catch (error) {
    console.error('Error generating recommendations:', error);
    throw error;
  }
};

/**
 * Save a new activity to the database
 */
const saveActivity = async (userId, activity) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .insert([
        {
          user_id: userId,
          activity_name: activity.name,
          date: activity.date,
          location: activity.location,
          notes: activity.notes,
          weather_conditions: activity.weatherConditions,
          status: activity.status || 'scheduled'
        }
      ])
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error saving activity:', error);
    throw error;
  }
};

/**
 * Get user activities within a date range
 */
const getUserActivities = async (userId, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching activities:', error);
    throw error;
  }
};

/**
 * Mark an activity as completed
 */
const markActivityAsDone = async (activityId) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .update({ 
        status: 'completed',
        completed_at: new Date().toISOString()
      })
      .eq('id', activityId)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error marking activity as done:', error);
    throw error;
  }
};

/**
 * Add a reminder for an activity
 */
const addReminder = async (reminderData) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .insert(reminderData)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error adding reminder:', error);
    throw error;
  }
};

/**
 * Get user reminders within a date range
 */
const getReminders = async (userId, startDate, endDate) => {
  try {
    const { data, error } = await supabase
      .from('reminders')
      .select('*')
      .eq('user_id', userId)
      .gte('reminder_time', startDate)
      .lte('reminder_time', endDate)
      .order('reminder_time', { ascending: true });

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error('Error fetching reminders:', error);
    throw error;
  }
};

/**
 * Update an existing activity
 */
const updateActivity = async (activityId, updates) => {
  try {
    const { data, error } = await supabase
      .from('activities')
      .update(updates)
      .eq('id', activityId)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Error updating activity:', error);
    throw error;
  }
};

const deleteActivity = async (activityId) => {
  try {
    // Debug: List all tables first
    const { data: tables, error: tablesError } = await supabase
      .from('information_schema.tables')
      .select('table_name')
      .eq('table_schema', 'public');
    
    console.log('Available tables:', tables);

    // Debug: Check if reminders exists
    const remindersCheck = await supabase
      .from('reminders')
      .select('*')
      .limit(1);
    
    console.log('Reminders check:', remindersCheck);

    // Proceed with deletion
    const { data, error } = await supabase
      .from('activities')
      .delete()
      .eq('id', activityId)
      .select();

    if (error) throw error;
    return data?.[0] || null;
  } catch (error) {
    console.error('Full error object:', error);
    throw new Error(`Delete failed: ${error.message} (Code: ${error.code})`);
  }
};
/**
 * Get weather data for a specific location and time
 */
const getLocationWeather = async (location, date) => {
  try {
    if (!location || location === 'current') {
      // For current location, we'd typically use a weather API
      return null;
    }
    
    // In a real app, this would call a weather API like OpenWeatherMap
    // For demo purposes, we'll return mock data
    const weatherConditions = ['Sunny', 'Cloudy', 'Rainy', 'Partly Cloudy', 'Thunderstorms'];
    const randomCondition = weatherConditions[Math.floor(Math.random() * weatherConditions.length)];
    
    return {
      location,
      temperature: Math.round(15 + Math.random() * 20), // 15-35°C
      conditions: randomCondition,
      humidity: Math.round(30 + Math.random() * 60), // 30-90%
      air_quality: Math.round(10 + Math.random() * 150), // 10-160
      uv_index: Math.round(1 + Math.random() * 11), // 1-11
      pressure: Math.round(980 + Math.random() * 50), // 980-1030 hPa
      wind_speed: Math.round(1 + Math.random() * 20), // 1-20 km/h
      precipitation: randomCondition === 'Rainy' || randomCondition === 'Thunderstorms' 
        ? Math.round(Math.random() * 10) 
        : 0 // 0-10mm
    };
  } catch (error) {
    console.error('Error fetching location weather:', error);
    throw error;
  }
};

/**
 * Suggest alternative times for an activity based on weather
 */
const suggestAlternativeTimes = async (location, originalTime, activityType) => {
  try {
    const alternatives = [];
    const daysToCheck = 3; // Check next 3 days
    
    for (let i = 1; i <= daysToCheck; i++) {
      const newDate = new Date(originalTime);
      newDate.setDate(newDate.getDate() + i);
      
      // Get weather for the alternative date
      const weather = await getLocationWeather(location, newDate);
      if (weather) {
        let suitability = 'good';
        let reason = '';
        
        // Evaluate suitability based on activity type
        const isOutdoor = activityType.toLowerCase().includes('outdoor') || 
                         ['hiking', 'running', 'cycling', 'gardening'].some(a => 
                           activityType.toLowerCase().includes(a));
        
        if (isOutdoor) {
          if (weather.conditions.toLowerCase().includes('rain') || 
              weather.conditions.toLowerCase().includes('thunder')) {
            suitability = 'poor';
            reason = 'Rain expected';
          } else if (weather.temperature > 30) {
            suitability = 'fair';
            reason = 'High temperature';
          } else if (weather.uv_index > 7) {
            suitability = 'fair';
            reason = 'High UV index';
          }
        } else if (activityType.toLowerCase().includes('swimming')) {
          if (weather.temperature < 20) {
            suitability = 'poor';
            reason = 'Low temperature';
          }
        }
        
        alternatives.push({
          date: newDate,
          weather,
          suitability,
          reason,
          timeSlots: [
            { time: 'Morning', temp: weather.temperature - 2 },
            { time: 'Afternoon', temp: weather.temperature },
            { time: 'Evening', temp: weather.temperature - 3 }
          ]
        });
      }
    }
    
    // Sort by suitability then by date
    return alternatives.sort((a, b) => {
      if (a.suitability === b.suitability) {
        return new Date(a.date) - new Date(b.date);
      }
      return a.suitability === 'good' ? -1 : b.suitability === 'good' ? 1 : 
             a.suitability === 'fair' ? -1 : 1;
    });
  } catch (error) {
    console.error('Error suggesting alternative times:', error);
    throw error;
  }
};


export {
  getActivityRecommendations,
  saveActivity,
  getUserActivities,
  markActivityAsDone,
  addReminder,
  getReminders,
  updateActivity,
  deleteActivity,
  getLocationWeather,
  suggestAlternativeTimes
};