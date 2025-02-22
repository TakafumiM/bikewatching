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

map.on('load', () => { 
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
});

map.on('load', () => {
    // Load the nested JSON file
    const jsonurl = 'https://dsc106.com/labs/lab07/data/bluebikes-stations.json'
    d3.json(jsonurl).then(jsonData => {
        stations = jsonData.data.stations;
        // Append circles to the SVG for each station
        circles = svg.selectAll('circle')
        .data(stations)
        .enter()
        .append('circle')
        .attr('r', 5)               // Radius of the circle
        .attr('fill', 'steelblue')  // Circle fill color
        .attr('stroke', 'white')    // Circle border color
        .attr('stroke-width', 1)    // Circle border thickness
        .attr('opacity', 0.8)      // Circle opacity
        // Initial position update when map loads
        updatePositions();
        map.on('move', updatePositions);     // Update during map movement
        map.on('zoom', updatePositions);     // Update during zooming
        map.on('resize', updatePositions);   // Update on window resize
        map.on('moveend', updatePositions);  // Final adjustment after movement ends
    }).catch(error => {
        console.error('Error loading JSON:', error);  // Handle errors if JSON loading fails
    });
});

map.on('load', () => {
  const csvUrl = 'https://dsc106.com/labs/lab07/data/bluebikes-traffic-2024-03.csv';
  d3.csv(csvUrl).then(trips => {
    departures = d3.rollup(
        trips,
        (v) => v.length,
        (d) => d.start_station_id,
      );
    arrivals = d3.rollup(
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
    radiusScale = d3.scaleSqrt()
        .domain([0, d3.max(stations, (d) => d.totalTraffic)])
        .range([0, 25]);
    // Update the circle radii based on the total traffic
    circles.attr('r', d => radiusScale(d.totalTraffic))
           .each(function(d) {
              // Add <title> for browser tooltips
              d3.select(this)
              .append('title')
              .text(`${d.totalTraffic} trips (${d.departures} departures, ${d.arrivals} arrivals)`);
            });
    for (let trip of trips) {
      trip.started_at = new Date(trip.start_time);
      trip.ended_at = new Date(trip.end_time);
      }
      filterTripsbyTime(trips);
  }).catch(error => {
    console.error('Error loading CSV:', error);
  });
});

const svg = d3.select('#map').select('svg');
let circles; // Declare circles here
let stations = [];
let radiusScale;

let timeFilter = -1;
let timeSlider;
let selectedTime;
let anyTimeLabel;

function formatTime(minutes) {
  const date = new Date(0, 0, 0, 0, minutes);  // Set hours & minutes
  return date.toLocaleString('en-US', { timeStyle: 'short' }); // Format as HH:MM AM/PM
}

function updateTimeDisplay() {
  timeFilter = Number(timeSlider.value);  // Get slider value

  if (timeFilter === -1) {
    selectedTime.textContent = '';  // Clear time display
    anyTimeLabel.style.display = 'block';  // Show "(any time)"
  } else {
    selectedTime.textContent = formatTime(timeFilter);  // Display formatted time
    anyTimeLabel.style.display = 'none';  // Hide "(any time)"
  }
  // Trigger filtering logic which is implemented below
  // filterTripsbyTime();

}

function getCoords(station) {
    const point = new mapboxgl.LngLat(+station.lon, +station.lat);  // Convert lon/lat to Mapbox LngLat
    const { x, y } = map.project(point);  // Project to pixel coordinates
    return { cx: x, cy: y };  // Return as object for use in SVG attributes
  }

  function updatePositions() {
    circles
      .attr('cx', d => getCoords(d).cx)  // Set the x-position using projected coordinates
      .attr('cy', d => getCoords(d).cy); // Set the y-position using projected coordinates
  }

  let filteredTrips = [];
  let filteredArrivals = new Map();
  let filteredDepartures = new Map();
  let filteredStations = [];

  function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
  }

  function filterTripsbyTime(trips) {
    filteredTrips = timeFilter === -1
        ? trips
        : trips.filter((trip) => {
            const startedMinutes = minutesSinceMidnight(trip.started_at);
            const endedMinutes = minutesSinceMidnight(trip.ended_at);
            return (
              Math.abs(startedMinutes - timeFilter) <= 60 ||
              Math.abs(endedMinutes - timeFilter) <= 60
            );
          });
  }

  $: filteredArrivals = d3.rollup(
    filteredTrips,
    (v) => v.length,
    (d) => d.end_station_id,
  );

  $: filteredDepartures = d3.rollup(
    filteredTrips,
    (v) => v.length,
    (d) => d.start_station_id,
  );

  $: filteredStations = stations.map((station) => {
    station = { ...station };
    let id = station.short_name;
    station.arrivals = filteredArrivals.get(id) ?? 0;
    station.departures = filteredDepartures.get(id) ?? 0;
    station.totalTraffic = station.arrivals + station.departures;
    return station;
  });

document.addEventListener('DOMContentLoaded', () => {
    timeSlider = document.getElementById('time-slider');
    selectedTime = document.getElementById('selected-time');
    anyTimeLabel = document.getElementById('any-time');

    timeSlider.addEventListener('input', updateTimeDisplay);
    updateTimeDisplay();
});

