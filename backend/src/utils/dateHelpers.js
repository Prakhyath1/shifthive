// Get ISO week start (Monday) and end (Sunday) for a given date string
function getWeekBounds(dateStr) {
  const date = new Date(dateStr);
  const day = date.getDay() || 7;
  date.setHours(0, 0, 0, 0);
  date.setDate(date.getDate() - day + 1);
  const start = new Date(date);
  const end = new Date(date);
  end.setDate(start.getDate() + 6);
  return { start: start.toISOString().split('T')[0], end: end.toISOString().split('T')[0] };
}

function parseTimeToMinutes(timeStr) {
  const [h, m] = timeStr.split(':').map(Number);
  return h * 60 + m;
}

function calculateDurationHours(start, end) {
  let diff = parseTimeToMinutes(end) - parseTimeToMinutes(start);
  if (diff < 0) diff += 24 * 60; // overnight
  return diff / 60;
}

module.exports = { getWeekBounds, parseTimeToMinutes, calculateDurationHours };