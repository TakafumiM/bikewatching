// Function to calculate minutes since midnight
export function minutesSinceMidnight(date) {
    return date.getHours() * 60 + date.getMinutes();
}

// Function to filter trips by time
export function filterTripsByTime(trips, timeFilter) {
    return timeFilter === -1
        ? trips
        : trips.filter((trip) => {
            const startedMinutes = minutesSinceMidnight(trip.started_at);
            const endedMinutes = minutesSinceMidnight(trip.ended_at);
            const tolerance = 60; // 60 minutes tolerance
            return (
                Math.abs(startedMinutes - timeFilter) <= tolerance ||
                Math.abs(endedMinutes - timeFilter) <= tolerance
            );
        });
}
