import React, { useState, useEffect } from 'react';
import { supabase } from '../services/api';
import { FiUser, FiMapPin, FiHeart, FiActivity, FiAlertCircle, FiSave, FiMail, FiPhone } from 'react-icons/fi';
import '../styles/Profile.css';

const Profile = () => {
  // Available options
  const healthOptions = ['Asthma', 'Allergies', 'Heart Condition', 'Diabetes'];
  const activityOptions = ['Hiking', 'Running', 'Swimming', 'Cycling', 'Yoga'];
  const sensitivityOptions = ['Heat', 'Cold', 'Humidity', 'Pollen', 'Air Quality'];
  const allergyOptions = ['Pollen', 'Dust', 'Food', 'Medication', 'Insect'];

  // State management
  const [profile, setProfile] = useState({
    full_name: '',
    location: '',
    email: '',
    phone: '',
    health_conditions: [],
    preferred_activities: [],
    weather_sensitivities: [],
    allergies: [],
    notification_preferences: {
      email: true,
      sms: true
    }
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState('');

  // Load profile data
  useEffect(() => {
    const fetchProfile = async () => {
      try {
        setLoading(true);
        setError(null);
        
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) throw new Error('Not authenticated');

        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', user.id)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError;

        setProfile({
          full_name: data?.full_name || '',
          location: data?.location || '',
          email: data?.email || user.email || '',
          phone: data?.phone || '',
          health_conditions: data?.health_conditions || [],
          preferred_activities: data?.preferred_activities || [],
          weather_sensitivities: data?.weather_sensitivities || [],
          allergies: data?.allergies || [],
          notification_preferences: data?.notification_preferences || {
            email: true,
            sms: true
          }
        });

      } catch (err) {
        console.error('Failed to load profile:', err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, []);

  // Save profile data
  const handleSave = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      if (authError || !user) throw new Error('Not authenticated');

      // Prepare the update data
      const updateData = {
        id: user.id,
        ...profile,
        updated_at: new Date().toISOString()
      };

      const { error: upsertError } = await supabase
        .from('profiles')
        .upsert(updateData, {
          onConflict: 'id'
        });

      if (upsertError) throw upsertError;

      setSuccess('Profile updated successfully!');
      setTimeout(() => setSuccess(''), 3000);

    } catch (err) {
      console.error('Failed to save profile:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Handle checkbox changes
  const handleCheckboxChange = (field, value) => {
    setProfile(prev => ({
      ...prev,
      [field]: prev[field].includes(value)
        ? prev[field].filter(item => item !== value)
        : [...prev[field], value]
    }));
  };

  // Handle notification preference changes
  const handleNotificationChange = (type) => {
    setProfile(prev => ({
      ...prev,
      notification_preferences: {
        ...prev.notification_preferences,
        [type]: !prev.notification_preferences[type]
      }
    }));
  };

  if (loading) return <div className="loading-spinner">Loading profile...</div>;

  return (
    <div className="profile-container">
      <h2><FiUser /> My Profile</h2>
      
      {error && (
        <div className="error-message">
          <FiAlertCircle /> {error}
        </div>
      )}
      
      {success && <div className="success-message">{success}</div>}

      <form onSubmit={handleSave}>
        {/* Basic Information */}
        <div className="profile-section">
          <h3>Basic Information</h3>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={profile.full_name}
              onChange={(e) => setProfile({...profile, full_name: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label><FiMapPin /> Location</label>
            <input
              type="text"
              value={profile.location}
              onChange={(e) => setProfile({...profile, location: e.target.value})}
            />
          </div>
        </div>

        {/* Notification Information */}
        <div className="profile-section">
          <h3>Notification Settings</h3>
          <div className="form-group">
            <label><FiMail /> Email</label>
            <input
              type="email"
              value={profile.email}
              onChange={(e) => setProfile({...profile, email: e.target.value})}
            />
          </div>
          <div className="form-group">
            <label><FiPhone /> Phone Number</label>
            <input
              type="tel"
              value={profile.phone}
              onChange={(e) => setProfile({...profile, phone: e.target.value})}
              placeholder="+1234567890"
            />
          </div>
          <div className="notification-preferences">
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={profile.notification_preferences.email}
                onChange={() => handleNotificationChange('email')}
              />
              Receive email notifications
            </label>
            <label className="checkbox-option">
              <input
                type="checkbox"
                checked={profile.notification_preferences.sms}
                onChange={() => handleNotificationChange('sms')}
              />
              Receive SMS notifications
            </label>
          </div>
        </div>

        {/* Health Conditions */}
        <div className="profile-section">
          <h3><FiHeart /> Health Conditions</h3>
          {healthOptions.map(option => (
            <label key={option} className="checkbox-option">
              <input
                type="checkbox"
                checked={profile.health_conditions.includes(option)}
                onChange={() => handleCheckboxChange('health_conditions', option)}
              />
              {option}
            </label>
          ))}
        </div>

        {/* Preferred Activities */}
        <div className="profile-section">
          <h3><FiActivity /> Preferred Activities</h3>
          {activityOptions.map(option => (
            <label key={option} className="checkbox-option">
              <input
                type="checkbox"
                checked={profile.preferred_activities.includes(option)}
                onChange={() => handleCheckboxChange('preferred_activities', option)}
              />
              {option}
            </label>
          ))}
        </div>

        {/* Weather Sensitivities */}
        <div className="profile-section">
          <h3><FiAlertCircle /> Weather Sensitivities</h3>
          {sensitivityOptions.map(option => (
            <label key={option} className="checkbox-option">
              <input
                type="checkbox"
                checked={profile.weather_sensitivities.includes(option)}
                onChange={() => handleCheckboxChange('weather_sensitivities', option)}
              />
              {option}
            </label>
          ))}
        </div>

        {/* Allergies */}
        <div className="profile-section">
          <h3>Allergies</h3>
          {allergyOptions.map(option => (
            <label key={option} className="checkbox-option">
              <input
                type="checkbox"
                checked={profile.allergies.includes(option)}
                onChange={() => handleCheckboxChange('allergies', option)}
              />
              {option}
            </label>
          ))}
        </div>

        <button type="submit" className="save-button" disabled={loading}>
          <FiSave /> {loading ? 'Saving...' : 'Save Profile'}
        </button>
      </form>
    </div>
  );
};

export default Profile;