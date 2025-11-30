# Navigation Route Planner

A modern web application for route planning that displays paths on a map and converts them into simple navigation commands (forward, backward, right turn, left turn, right u-turn, left u-turn).

## Features

- 🗺️ Interactive map display with route visualization
- 📍 Start and end location input (address or coordinates)
- 🧭 Automatic route calculation
- 📋 Command generation (forward, turns, u-turns)
- 📊 Route information (distance, duration)
- 📱 Responsive design

## Tech Stack

- **Frontend**: React with Leaflet.js for maps
- **Backend**: Node.js with Express
- **Routing API**: OSRM (Open Source Routing Machine) - provides road-based routing like Google Maps
  - Fallback options: Mapbox Directions API, GraphHopper

## Installation

1. Install all dependencies:
```bash
npm run install-all
```

Or manually:
```bash
npm install
cd server && npm install
cd ../client && npm install
```

## Running the Application

### Development Mode (runs both frontend and backend):
```bash
npm run dev
```

### Or run separately:

**Backend Server:**
```bash
npm run server
```
Server runs on `http://localhost:5000`

**Frontend:**
```bash
npm run client
```
Frontend runs on `http://localhost:3000`

## Usage

1. Open the application in your browser (usually `http://localhost:3000`)
2. Enter a start location (address or coordinates like `40.7128,-74.0060`)
3. Enter an end location
4. Click "Calculate Route" or use "Use Current Location" for start
5. View the route on the map and see the generated navigation commands

## API Endpoints

### POST `/api/route`
Calculate route between two points.

**Request:**
```json
{
  "start": "40.7128,-74.0060",
  "end": "40.7589,-73.9851"
}
```

**Response:**
```json
{
  "coordinates": [[lat, lon], ...],
  "commands": [
    {"type": "forward", "distance": 0.5, "angle": 0},
    {"type": "right_turn", "distance": 0.3, "angle": 90},
    ...
  ],
  "distance": 2500,
  "duration": 180
}
```

### POST `/api/geocode`
Convert address to coordinates.

**Request:**
```json
{
  "address": "New York, NY"
}
```

## Navigation Commands

The application generates the following command types:
- `forward` - Continue straight
- `backward` - Move backward
- `right_turn` - Turn right
- `left_turn` - Turn left
- `right_u_turn` - Right U-turn
- `left_u_turn` - Left U-turn

## Configuration

The application uses **OSRM** by default (free, no API key needed) which provides road-based routing similar to Google Maps.

### Optional: Enhanced Routing Services

**Mapbox Directions API** (for better routing quality):
1. Get a free API key from [Mapbox](https://www.mapbox.com/)
2. Set environment variable: `MAPBOX_ACCESS_TOKEN=your_token_here`

**GraphHopper** (alternative routing service):
1. Get a free API key from [GraphHopper](https://www.graphhopper.com/)
2. Set environment variable: `GRAPHHOPPER_API_KEY=your_key_here`

The application will automatically try OSRM first, then fall back to Mapbox or GraphHopper if configured.

## License

ISC

