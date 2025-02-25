import * as d3 from 'https://cdn.jsdelivr.net/npm/d3@7.9.0/+esm';

// Set your Mapbox access token here
mapboxgl.accessToken = 'pk.eyJ1IjoidGFrYWZ1bWltIiwiYSI6ImNtN2RucGxsbzA1bHkybHB2ZTg0ZXozdW4ifQ._GEflQrYR_5mfbGcKcdejg';

// Initialize the map
const map = new mapboxgl.Map({
  container: 'map', // ID of the div where the map will render
  style: 'mapbox://styles/mapbox/streets-v12', // Map style
  center: [-71.09415, 42.36027], // [longitude, latitude]
  zoom: 12, // Initial zoom level
  minZoom: 5, // Minimum allowed zoom
  maxZoom: 18 // Maximum allowed zoom
});

map.on('load', async () => {
  map.addSource('boston_route', {
    type: 'geojson',
    data: 'https://bostonopendata-boston.opendata.arcgis.com/datasets/boston::existing-bike-network-2022.geojson?...'
  });

  map.addSource('cambridge_route', {
    type: 'geojson',
    data: 'https://raw.githubusercontent.com/cambridgegis/cambridgegis_data/main/Recreation/Bike_Facilities/RECREATION_BikeFacilities.geojson'
  });

  map.addLayer({
    id: 'bike-lanes-boston',
    type: 'line',
    source: 'boston_route',
    paint: {
      'line-color': 'green',
      'line-width': 3,
      'line-opacity': 0.4
    }
  });

  map.addLayer({
    id: 'bike-lanes-cambridge',
    type: 'line',
    source: 'cambridge_route',
    paint: {
      'line-color': 'blue',
      'line-width': 3,
      'line-opacity': 0.4
    }
  });

  // Updated element references: remove '#' prefixes
  const timeSlider = document.getElementById('time-slider');
  const selectedTime = document.getElementById('selected-time');
  const anyTimeLabel = document.getElementById('any-time');

  let jsonData;
  try {
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json';

    // Assign JSON fetch result to outer variable (removed const)
    jsonData = await d3.json(jsonurl);

    console.log('Loaded JSON Data:', jsonData); // Log to verify structure
  } catch (error) {
    console.error('Error loading JSON:', error); // Handle errors
  }

  let trips;
  try {
    const csvUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
    trips = await d3.csv(csvUrl, (trip) => {
      trip.started_at = new Date(trip.started_at);
      trip.ended_at = new Date(trip.ended_at);
      return trip;
    },
  );
  } catch (error) {
    console.error('Error loading CSV:', error); // Handle errors
  }

  let stations = computeStationTraffic(jsonData.data.stations, trips);
  console.log('Stations Array:', stations);

  const svg = d3.select('#map').select('svg');
  const circles = svg.selectAll('circle')
    .data(stations, (d) => d.short_name)
    .enter()
    .append('circle')
    .attr('r', 5)               // Radius of the circle
    .attr('fill', 'steelblue')  // Circle fill color
    .attr('stroke', 'white')    // Circle border color
    .attr('stroke-width', 1)    // Circle border thickness
    .attr('opacity', 0.8)      // Circle opacity

  function updatePositions() {
    circles
      .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
      .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
  }

  updatePositions()

  map.on('move', updatePositions);     // Update during map movement
  map.on('zoom', updatePositions);     // Update during zooming
  map.on('resize', updatePositions);   // Update on window resize
  map.on('moveend', updatePositions);  // Final adjustment after movement ends

  console.log('trips:', trips);

  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id,
  );
  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id,
  );
  // Add arrivals, departures, totalTraffic properties to each station
  stations = stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
  // Define the radius scale
  const radiusScale = d3.scaleSqrt()
    .domain([0, d3.max(stations, (d) => d.totalTraffic)])
    .range([0, 25]);
  // Update the circle radii based on the total traffic
  circles.attr('r', d => radiusScale(d.totalTraffic))
    .each(function (d) {
      // Add <title> for browser tooltips
      d3.select(this)
        .append('title')
        .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
    });

    function updateTimeDisplay() {
      let timeFilter = Number(timeSlider.value);  // Get slider value
    
      if (timeFilter === -1) {
        selectedTime.textContent = '';  // Clear time display
        anyTimeLabel.style.display = 'block';  // Show "(any time)"
      } else {
        selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
        anyTimeLabel.style.display = 'none';  // Hide "(any time)"
      }
    
      // Trigger filtering logic which is implemented in the next step
      updateScatterPlot(timeFilter)
    }
    
    function updateScatterPlot(timeFilter) {
      // Get only the trips that match the selected time filter
      const filteredTrips = filterTripsbyTime(trips, timeFilter);
      
      // Recompute station traffic based on the filtered trips
      const filteredStations = computeStationTraffic(stations, filteredTrips);
      
      timeFilter === -1 ? radiusScale.range([0, 25]) : radiusScale.range([3, 50]);

      // Update the scatterplot by adjusting the radius of circles
      circles
        .data(filteredStations, (d) => d.short_name) // Updated key accessor from 'short_names' to 'short_name'
        .join('circle') // Ensure the data is bound correctly
        .attr('r', (d) => radiusScale(d.totalTraffic)); // Update circle sizes
  }

  // Attach event listener for slider and trigger initial update
  timeSlider.addEventListener('input', updateTimeDisplay);
  updateTimeDisplay();

});


// Load the nested JSON file
// const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
// d3.json(jsonurl).then(jsonData => {
//   const stations = computeStationTraffic(jsonData.data.stations, trips);
//   // Append circles to the SVG for each station

//   // Initial position update when map loads
//   updatePositions();

// }).catch(error => {
//     console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
// });

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

function getCoords(station) {
  const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
  const { x, y } = map.project(point);  // Project to pixel coordinates
  return { cx: x, cy: y };  // Return as object for use in SVG attributes
}

function minutesSinceMidnight(date) {
  return date.getHours() * 60 + date.getMinutes();
}

function filterTripsbyTime(trips, timeFilter) {
  return timeFilter === -1 
    ? trips // If no filter is applied (-1), return all trips
    : trips.filter((trip) => {
        // Convert trip start and end times to minutes since midnight
        const startedMinutes = minutesSinceMidnight(trip.started_at);
        const endedMinutes = minutesSinceMidnight(trip.ended_at);
        
        // Include trips that started or ended within 60 minutes of the selected time
        return (
          Math.abs(startedMinutes - timeFilter) <= 60 ||
          Math.abs(endedMinutes - timeFilter) <= 60
        );
    });
}

function computeStationTraffic(stations, trips) {
  // Compute departures
  const departures = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.start_station_id
  );

  // Computed arrivals as you did in step 4.2
  const arrivals = d3.rollup(
    trips,
    (v) => v.length,
    (d) => d.end_station_id,
  );
  // Update each station..
  return stations.map((station) => {
    let id = station.short_name;
    station.arrivals = arrivals.get(id) ?? 0;
    station.departures = departures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });
}