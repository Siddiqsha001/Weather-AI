import React from 'react';
import { Doughnut } from 'react-chartjs-2';
import '../styles/ProfileSummary.css';

const ProfileSummary = ({ preferences }) => {
  const activityData = {
    labels: preferences?.activities || [],
    datasets: [
      {
        data: new Array(preferences?.activities?.length || 0).fill(1),
        backgroundColor: [
          '#FF6384', '#36A2EB', '#FFCE56', 
          '#4BC0C0', '#9966FF', '#FF9F40'
        ]
      }
    ]
  };

  return (
    <div className="profile-summary">
      <h2>Your Profile</h2>
      <div className="profile-grid">
        <div className="profile-item">
          <h4>Preferred Activities</h4>
          {preferences?.activities?.length > 0 ? (
            <Doughnut data={activityData} />
          ) : (
            <p>No activities selected</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfileSummary;