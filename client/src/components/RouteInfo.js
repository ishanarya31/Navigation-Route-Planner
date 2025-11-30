import React from 'react';
import './RouteInfo.css';

const RouteInfo = ({ routeData }) => {
  const formatDistance = (meters) => {
    if (meters < 1000) {
      return `${Math.round(meters)} m`;
    }
    return `${(meters / 1000).toFixed(2)} km`;
  };

  const formatDuration = (seconds) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };

  return (
    <div className="route-info">
      <h2>Route Information</h2>
      <div className="info-item">
        <span className="label">Distance:</span>
        <span className="value">{formatDistance(routeData.distance)}</span>
      </div>
      <div className="info-item">
        <span className="label">Duration:</span>
        <span className="value">{formatDuration(routeData.duration)}</span>
      </div>
    </div>
  );
};

export default RouteInfo;

