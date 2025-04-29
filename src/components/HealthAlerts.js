import React from 'react';
import '../styles/Dashboard.css';

const HealthAlerts = ({ alerts = [] }) => {
  return (
    <div className="health-alerts">
      <h3>Health Alerts</h3>
      {alerts?.length > 0 ? (
        <ul className="alerts-list">
          {alerts.map((alert, index) => (
            <li key={index} className={`alert-item ${alert.severity.toLowerCase()}`}>
              <span className="alert-title">{alert.title}</span>
              <p className="alert-description">{alert.description}</p>
            </li>
          ))}
        </ul>
      ) : (
        <p className="no-alerts">No health alerts at this time.</p>
      )}
    </div>
  );
};

export default HealthAlerts;