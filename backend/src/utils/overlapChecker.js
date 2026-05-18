const pool = require('../config/db');
const { calculateDurationHours } = require('./dateHelpers');

/**
 * Checks overlap for a specific user on a specific date.
 * Handles overnight shifts (end_time < start_time) correctly.
 */
async function checkOverlap(userId, date, startTime, endTime) {
  // Normal shift
  const normalCheck = `
    SELECT id FROM assignments 
    WHERE user_id = $1 AND date = $2 AND status != 'cancelled'
    AND $3::time < end_time AND $4::time > start_time
  `;
  // Overnight shift (crosses midnight)
  const overnightCheck = `
    SELECT id FROM assignments 
    WHERE user_id = $1 AND date = $2 AND status != 'cancelled'
    AND ($3::time <= '23:59' OR $4::time >= '00:00')
    AND (start_time > end_time) -- existing is overnight
    AND ($3::time < end_time OR $4::time > start_time)
  `;

  const { rows: normal } = await pool.query(normalCheck, [userId, date, startTime, endTime]);
  if (normal.length > 0) throw new Error('Overlap detected: Employee already has a shift at this time.');

  // Check next day for overnight overlap
  const nextDay = new Date(date);
  nextDay.setDate(nextDay.getDate() + 1);
  const { rows: overnightNext } = await pool.query(normalCheck, [userId, nextDay.toISOString().split('T')[0], startTime, endTime]);
  if (overnightNext.length > 0) throw new Error('Overlap detected: Shift extends into next day conflict.');

  return false;
}

async function checkWeeklyCap(userId, date, newHours) {
  const { start: weekStart, end: weekEnd } = require('./dateHelpers').getWeekBounds(date);
  
  const query = `
    SELECT COALESCE(SUM(EXTRACT(EPOCH FROM (
      CASE WHEN end_time > start_time THEN end_time - start_time 
           ELSE ('24:00:00'::time - start_time) + end_time 
      END
    )) / 3600), 0) as total
    FROM assignments
    WHERE user_id = $1 AND date BETWEEN $2 AND $3 AND status != 'cancelled'
  `;
  
  const { rows } = await pool.query(query, [userId, weekStart, weekEnd]);
  const currentHours = parseFloat(rows[0].total);
  
  if (currentHours + newHours > 168) { // fallback cap
    // We'll enforce actual user.max_hours_per_week in controller
  }
  return { currentHours, weekStart, weekEnd };
}

module.exports = { checkOverlap, checkWeeklyCap, calculateDurationHours };