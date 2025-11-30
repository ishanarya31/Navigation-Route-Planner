import React, { useState } from 'react';
import './RouteInput.css';

const RouteInput = ({ onCalculate, loading }) => {
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (start.trim() && end.trim()) {
      onCalculate(start.trim(), end.trim());
    }
  };

  const handleUseCurrentLocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setStart(`${latitude},${longitude}`);
        },
        (error) => {
          alert('Unable to get your location. Please enter it manually.');
          console.error('Geolocation error:', error);
        }
      );
    } else {
      alert('Geolocation is not supported by your browser.');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="route-input-form">
      <div className="input-group">
        <label htmlFor="start">Start Location</label>
        <input
          type="text"
          id="start"
          value={start}
          onChange={(e) => setStart(e.target.value)}
          placeholder="Enter address or coordinates (lat,lon)"
          disabled={loading}
        />
        <button
          type="button"
          onClick={handleUseCurrentLocation}
          className="btn-secondary"
          disabled={loading}
        >
          📍 Use Current Location
        </button>
      </div>

      <div className="input-group">
        <label htmlFor="end">End Location</label>
        <input
          type="text"
          id="end"
          value={end}
          onChange={(e) => setEnd(e.target.value)}
          placeholder="Enter destination address or coordinates (lat,lon)"
          disabled={loading}
        />
      </div>

      <button
        type="submit"
        className="btn-primary"
        disabled={loading || !start.trim() || !end.trim()}
      >
        {loading ? 'Calculating Route...' : 'Calculate Route'}
      </button>
    </form>
  );
};

export default RouteInput;

