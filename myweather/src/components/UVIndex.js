import React from 'react';

const UVIndex = ({ uv }) => {
  const getUvLevel = (value) => {
    if (value <= 2) return 'Low';
    if (value <= 5) return 'Moderate';
    if (value <= 7) return 'High';
    return 'Very High';
  };

  return (
    <div className="uv-card">
      <h3>UV Index</h3>
      <div className="uv-meter">
        <div 
          className="uv-level" 
          style={{ width: `${Math.min(uv * 10, 100)}%` }}
        ></div>
      </div>
      <div className="uv-value">{uv} - {getUvLevel(uv)}</div>
    </div>
  );
};

export default UVIndex;