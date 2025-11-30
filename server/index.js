const express = require('express');
const cors = require('cors');
const axios = require('axios');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Helper function to geocode address or parse coordinates
async function geocodeLocation(location) {
  // Check if it's already coordinates (format: "lat,lon" or "lat, lon")
  const coordMatch = location.match(/^(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)$/);
  if (coordMatch) {
    return {
      lat: parseFloat(coordMatch[1]),
      lon: parseFloat(coordMatch[2])
    };
  }

  // Otherwise, geocode the address
  try {
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: location,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'NavigationApp/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      return {
        lat: parseFloat(response.data[0].lat),
        lon: parseFloat(response.data[0].lon)
      };
    }
    throw new Error('Location not found');
  } catch (error) {
    throw new Error(`Failed to geocode location: ${error.message}`);
  }
}

// Route calculation endpoint
app.post('/api/route', async (req, res) => {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({ error: 'Start and end locations are required' });
    }

    // Geocode both locations
    const [startCoords, endCoords] = await Promise.all([
      geocodeLocation(start),
      geocodeLocation(end)
    ]);

    // Format coordinates for OpenRouteService (lon,lat format)
    const startPoint = `${startCoords.lon},${startCoords.lat}`;
    const endPoint = `${endCoords.lon},${endCoords.lat}`;

    try {
      // Try OSRM (Open Source Routing Machine) - free, road-based routing
      // Using public OSRM server (you can also host your own)
      const osrmUrl = `http://router.project-osrm.org/route/v1/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?overview=full&geometries=geojson&steps=true`;
      
      const response = await axios.get(osrmUrl, {
        timeout: 10000
      });

      if (!response.data || response.data.code !== 'Ok' || !response.data.routes || response.data.routes.length === 0) {
        throw new Error('No route found from OSRM');
      }

      const route = response.data.routes[0];
      const geometry = route.geometry;
      
      // Extract coordinates from GeoJSON geometry (convert [lon, lat] to [lat, lon])
      const coordinates = geometry.coordinates.map(coord => [coord[1], coord[0]]);
      
      // Get distance (in meters) and duration (in seconds)
      const totalDistance = route.distance;
      const totalDuration = route.duration;

      // Convert route to commands using step-by-step instructions from OSRM
      // OSRM returns legs array, each leg contains steps with maneuvers
      const commands = convertRouteToCommands(coordinates, route.legs);

      res.json({
        coordinates,
        commands,
        distance: totalDistance,
        duration: totalDuration
      });
    } catch (osrmError) {
      console.error('OSRM routing error:', osrmError.message);
      
      // Fallback: Try Mapbox Directions API if API key is available
      try {
        const mapboxToken = process.env.MAPBOX_ACCESS_TOKEN;
        if (mapboxToken) {
          const mapboxUrl = `https://api.mapbox.com/directions/v5/mapbox/driving/${startCoords.lon},${startCoords.lat};${endCoords.lon},${endCoords.lat}?geometries=geojson&steps=true&access_token=${mapboxToken}`;
          
          const mapboxResponse = await axios.get(mapboxUrl);
          
          if (mapboxResponse.data && mapboxResponse.data.routes && mapboxResponse.data.routes.length > 0) {
            const route = mapboxResponse.data.routes[0];
            const geometry = route.geometry;
            
            // Extract coordinates
            const coordinates = geometry.coordinates.map(coord => [coord[1], coord[0]]);
            
            const commands = convertRouteToCommands(coordinates, route.legs);
            
            res.json({
              coordinates,
              commands,
              distance: route.distance,
              duration: route.duration
            });
            return;
          }
        }
      } catch (mapboxError) {
        console.error('Mapbox routing error:', mapboxError.message);
      }
      
      // Final fallback: Use GraphHopper (free routing service)
      try {
        const graphhopperUrl = `https://graphhopper.com/api/1/route?point=${startCoords.lat},${startCoords.lon}&point=${endCoords.lat},${endCoords.lon}&vehicle=car&key=${process.env.GRAPHHOPPER_API_KEY || 'demo'}&type=json&instructions=true&points_encoded=false`;
        
        const graphhopperResponse = await axios.get(graphhopperUrl);
        
        if (graphhopperResponse.data && graphhopperResponse.data.paths && graphhopperResponse.data.paths.length > 0) {
          const path = graphhopperResponse.data.paths[0];
          const coordinates = path.points.coordinates.map(coord => [coord[1], coord[0]]);
          
          const commands = convertRouteToCommands(coordinates);
          
          res.json({
            coordinates,
            commands,
            distance: path.distance,
            duration: path.time / 1000 // Convert from milliseconds to seconds
          });
          return;
        }
      } catch (graphhopperError) {
        console.error('GraphHopper routing error:', graphhopperError.message);
      }
      
      // If all routing services fail, return error
      res.status(500).json({ 
        error: 'Failed to calculate road-based route. Please try again or check your internet connection.',
        details: 'All routing services are unavailable'
      });
    }
  } catch (error) {
    console.error('Route calculation error:', error.message);
    res.status(500).json({ error: 'Failed to calculate route', details: error.message });
  }
});

// Geocoding endpoint (convert address to coordinates)
app.post('/api/geocode', async (req, res) => {
  try {
    const { address } = req.body;
    
    if (!address) {
      return res.status(400).json({ error: 'Address is required' });
    }

    // Using Nominatim (OpenStreetMap geocoding) - free, no API key needed
    const response = await axios.get('https://nominatim.openstreetmap.org/search', {
      params: {
        q: address,
        format: 'json',
        limit: 1
      },
      headers: {
        'User-Agent': 'NavigationApp/1.0'
      }
    });

    if (response.data && response.data.length > 0) {
      const result = response.data[0];
      res.json({
        lat: parseFloat(result.lat),
        lon: parseFloat(result.lon),
        display_name: result.display_name
      });
    } else {
      res.status(404).json({ error: 'Location not found' });
    }
  } catch (error) {
    console.error('Geocoding error:', error.message);
    res.status(500).json({ error: 'Failed to geocode address', details: error.message });
  }
});

// Convert route coordinates to navigation commands
// legs parameter is optional and contains step-by-step instructions from routing API
function convertRouteToCommands(coordinates, legs = null) {
  if (coordinates.length < 2) {
    return [];
  }

  const commands = [];
  const THRESHOLD_ANGLE = 20; // degrees - minimum angle for a turn
  const U_TURN_ANGLE = 150; // degrees - angle threshold for U-turn
  const SHARP_TURN_ANGLE = 90; // degrees - threshold for sharp turns

  // If we have step-by-step instructions from the routing API, use them for better accuracy
  if (legs && Array.isArray(legs) && legs.length > 0) {
    legs.forEach(leg => {
      if (leg.steps && Array.isArray(leg.steps)) {
        leg.steps.forEach((step, stepIndex) => {
          // Skip the first step (depart) as it's just the start
          if (stepIndex === 0 && step.maneuver && step.maneuver.type === 'depart') {
            // Add initial forward command if there's distance
            if (step.distance && step.distance > 1) {
              commands.push({
                type: 'forward',
                distance: step.distance / 1000, // Convert meters to km
                angle: 0
              });
            }
            return;
          }
          
          // Determine command type from step maneuver
          let commandType = 'forward';
          const maneuver = step.maneuver || {};
          const maneuverType = (maneuver.type || '').toLowerCase();
          const modifier = (maneuver.modifier || '').toLowerCase();
          
          // Map OSRM/Mapbox maneuver types to our command types
          if (maneuverType === 'turn' || maneuverType === 'rotary' || maneuverType === 'roundabout') {
            if (modifier.includes('right')) {
              // Check if it's a u-turn based on angle or type
              if (maneuverType.includes('uturn') || (maneuver.bearing_after && maneuver.bearing_before)) {
                const angle = Math.abs(maneuver.bearing_after - maneuver.bearing_before);
                if (angle > 150 || angle < 210) {
                  commandType = 'right_u_turn';
                } else {
                  commandType = 'right_turn';
                }
              } else {
                commandType = 'right_turn';
              }
            } else if (modifier.includes('left')) {
              if (maneuverType.includes('uturn') || (maneuver.bearing_after && maneuver.bearing_before)) {
                const angle = Math.abs(maneuver.bearing_after - maneuver.bearing_before);
                if (angle > 150 || angle < 210) {
                  commandType = 'left_u_turn';
                } else {
                  commandType = 'left_turn';
                }
              } else {
                commandType = 'left_turn';
              }
            } else if (modifier.includes('straight') || modifier === '') {
              commandType = 'forward';
            }
          } else if (maneuverType.includes('uturn') || maneuverType === 'uturn') {
            if (modifier.includes('right')) {
              commandType = 'right_u_turn';
            } else {
              commandType = 'left_u_turn';
            }
          } else if (maneuverType === 'arrive') {
            // Last step - just add forward if there's remaining distance
            if (step.distance && step.distance > 1) {
              commands.push({
                type: 'forward',
                distance: step.distance / 1000,
                angle: 0
              });
            }
            return;
          } else {
            // Default to forward for other maneuver types (new name, continue, etc.)
            commandType = 'forward';
          }
          
          // Calculate distance for this step (in km)
          const stepDistance = step.distance ? step.distance / 1000 : 0;
          
          // Only add command if there's significant distance or it's a turn
          if (stepDistance > 0.001 || commandType !== 'forward') {
            commands.push({
              type: commandType,
              distance: stepDistance,
              angle: maneuver.bearing_after && maneuver.bearing_before 
                ? maneuver.bearing_after - maneuver.bearing_before 
                : 0
            });
          }
        });
      }
    });
    
    // If we got commands from steps, return them
    if (commands.length > 0) {
      return commands;
    }
  }

  // Fallback: Calculate commands from coordinate geometry
  // This analyzes the path shape to determine turns
  let accumulatedDistance = 0;
  const MIN_SEGMENT_DISTANCE = 0.01; // Minimum 10m to consider a segment

  for (let i = 1; i < coordinates.length; i++) {
    const prev = coordinates[i - 1];
    const curr = coordinates[i];
    
    // Calculate distance for this segment
    const segmentDistance = calculateDistance(prev, curr);
    accumulatedDistance += segmentDistance;

    // Only process if we have enough points ahead to determine direction change
    if (i < coordinates.length - 1 && accumulatedDistance >= MIN_SEGMENT_DISTANCE) {
      const next = coordinates[i + 1];
      
      // Calculate bearings
      const bearing1 = calculateBearing(prev, curr);
      const bearing2 = calculateBearing(curr, next);
      
      let angle = bearing2 - bearing1;
      
      // Normalize angle to -180 to 180
      if (angle > 180) angle -= 360;
      if (angle < -180) angle += 360;

      const absAngle = Math.abs(angle);

      // Determine command based on angle
      if (absAngle < THRESHOLD_ANGLE) {
        // Continue forward - accumulate distance
        // Don't add command yet, wait for next turn
      } else {
        // We have a turn - add accumulated forward distance first
        if (accumulatedDistance - segmentDistance > MIN_SEGMENT_DISTANCE) {
          commands.push({
            type: 'forward',
            distance: accumulatedDistance - segmentDistance,
            angle: 0
          });
        }
        
        // Add the turn command
        if (absAngle >= U_TURN_ANGLE) {
          // U-turn
          if (angle > 0) {
            commands.push({
              type: 'right_u_turn',
              distance: segmentDistance,
              angle: angle
            });
          } else {
            commands.push({
              type: 'left_u_turn',
              distance: segmentDistance,
              angle: angle
            });
          }
        } else {
          // Regular turn
          if (angle > 0) {
            commands.push({
              type: 'right_turn',
              distance: segmentDistance,
              angle: angle
            });
          } else {
            commands.push({
              type: 'left_turn',
              distance: segmentDistance,
              angle: angle
            });
          }
        }
        
        accumulatedDistance = 0; // Reset accumulator
      }
    }
  }

  // Add final forward segment if there's accumulated distance
  if (accumulatedDistance > MIN_SEGMENT_DISTANCE) {
    commands.push({
      type: 'forward',
      distance: accumulatedDistance,
      angle: 0
    });
  }

  // Ensure we have at least one forward command if route is mostly straight
  if (commands.length === 0 && coordinates.length >= 2) {
    const totalDistance = calculateDistance(coordinates[0], coordinates[coordinates.length - 1]);
    commands.push({
      type: 'forward',
      distance: totalDistance,
      angle: 0
    });
  }

  return commands;
}

// Calculate bearing between two points
function calculateBearing(point1, point2) {
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const deltaLon = (point2[1] - point1[1]) * Math.PI / 180;

  const x = Math.sin(deltaLon) * Math.cos(lat2);
  const y = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(deltaLon);

  const bearing = Math.atan2(x, y);
  return (bearing * 180 / Math.PI + 360) % 360;
}

// Calculate distance between two points (in kilometers)
function calculateDistance(point1, point2) {
  const R = 6371; // Earth's radius in km
  const lat1 = point1[0] * Math.PI / 180;
  const lat2 = point2[0] * Math.PI / 180;
  const deltaLat = (point2[0] - point1[0]) * Math.PI / 180;
  const deltaLon = (point2[1] - point1[1]) * Math.PI / 180;

  const a = Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
            Math.cos(lat1) * Math.cos(lat2) *
            Math.sin(deltaLon / 2) * Math.sin(deltaLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return R * c;
}


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

