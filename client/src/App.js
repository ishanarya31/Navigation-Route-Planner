import React, { useState } from 'react';
import './App.css';
import MapComponent from './components/MapComponent';
import RouteInput from './components/RouteInput';
import CommandsDisplay from './components/CommandsDisplay';
import RouteInfo from './components/RouteInfo';

function App() {
  const [routeData, setRouteData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleRouteCalculate = async (start, end) => {
    setLoading(true);
    setError(null);
    setRouteData(null);

    try {
      const response = await fetch('/api/route', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ start, end }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to calculate route');
      }

      const data = await response.json();
      setRouteData(data);
    } catch (err) {
      setError(err.message);
      console.error('Route calculation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="App">
      <header className="app-header">
        <h1>🗺️ Navigation Route Planner</h1>
        <p>Enter your start and end destinations to get directions</p>
      </header>

      <div className="app-container">
        <div className="input-section">
          <RouteInput onCalculate={handleRouteCalculate} loading={loading} />
          {error && <div className="error-message">{error}</div>}
        </div>

        <div className="content-wrapper">
          <div className="map-section">
            <MapComponent routeData={routeData} />
          </div>

          <div className="sidebar">
            {routeData && (
              <>
                <RouteInfo routeData={routeData} />
                <CommandsDisplay commands={routeData.commands} />
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;

