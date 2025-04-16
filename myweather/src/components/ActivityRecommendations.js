import React from 'react';

const ActivityRecommendations = ({ recommendations = [] }) => {
  return (
    <div className="activity-recommendations">
      <h3>Activity Recommendations</h3>
      
      {recommendations?.length > 0 ? (
        <ul>
          {recommendations.map((rec, index) => (
            <li key={index}>
              <strong>{rec.activity}</strong> - {rec.description}
            </li>
          ))}
        </ul>
      ) : (
        <p>No recommendations available. Please set your preferences.</p>
      )}
    </div>
  );
};

export default ActivityRecommendations;