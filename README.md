# Bikewatching

An interactive map of bicycle-share activity in the Boston–Cambridge area, built with **D3.js** and **Mapbox GL JS**.

## What it shows

- **Station activity:** Marker size represents the number of trips; color reflects the balance between departures and arrivals.
- **Time-of-day filtering:** A slider explores how station activity varies throughout the day.
- **Bike infrastructure:** Overlays for Boston and Cambridge bicycle routes.

## Data and tools

- Bluebikes station and trip data from the UC San Diego DSC 106 course dataset (March 2024 sample).
- Boston and Cambridge bicycle-lane GeoJSON data.
- JavaScript, D3.js, Mapbox GL JS, HTML, and CSS.

This is a historical data visualization, **not a live traffic feed**. It loads some datasets from external URLs and requires access to Mapbox; those dependencies may change over time.

## Running locally

Serve the repository as a static website (rather than opening `index.html` directly):

```bash
python -m http.server 8000
```

Then open `http://localhost:8000/` in a browser.

## Notes

Created as a student visualization project. The code is preserved as a learning artifact.
