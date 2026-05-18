const pool = require('../config/db');
const { auth } = require('../middleware/auth');
const { checkOverlap, checkWeeklyCap, calculateDurationHours } = require('../utils/overlapChecker');

exports.createAssignment = async (req, res) => {
  const { user_id, shift_id, date, status } = req.body;
  const created_by = req.user.id;

  try {
    const client = await pool.connect();
    await client.query('BEGIN');

    // Get shift times
    const { rows: shiftData } = await client.query('SELECT start_time, end_time FROM shifts WHERE id = $1', [shift_id]);
    if (!shiftData.length) throw new Error('Shift not found');
    
    const { start_time, end_time } = shiftData[0];
    const hours = calculateDurationHours(start_time, end_time);

    // 1. Overlap Check
    await checkOverlap(user_id, date, start_time, end_time);

    // 2. Weekly Cap Check
    const { currentHours, weekStart, weekEnd } = await checkWeeklyCap(user_id, date, hours);
    const { rows: userLimits } = await client.query('SELECT max_hours_per_week FROM users WHERE id = $1', [user_id]);
    if (currentHours + hours > (userLimits[0]?.max_hours_per_week || 40)) {
      throw new Error('Weekly hour cap exceeded');
    }

    // 3. Insert
    const { rows } = await client.query(
      `INSERT INTO assignments (user_id, shift_id, date, status, created_by) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [user_id, shift_id, date, status || 'scheduled', created_by]
    );

    // 4. Audit Log
    await client.query(
      `INSERT INTO shift_history (user_id, shift_id, date, notes, created_by) VALUES ($1, $2, $3, 'Assignment created', $4)`,
      [user_id, shift_id, date, created_by]
    );

    await client.query('COMMIT');
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.updateAssignment = async (req, res) => {
  const { id } = req.params;
  const { user_id, shift_id, date, status } = req.body;
  const created_by = req.user.id;

  try {
    const client = await pool.connect();
    await client.query('BEGIN');
    
    // Lock row
    await client.query('SELECT * FROM assignments WHERE id = $1 FOR UPDATE', [id]);
    
    // Fetch new shift times for overlap check if changed
    const { rows: shiftData } = await client.query('SELECT start_time, end_time FROM shifts WHERE id = $1', [shift_id]);
    const { start_time, end_time } = shiftData[0];
    
    await checkOverlap(user_id, date, start_time, end_time);

    const { rows } = await client.query(
      `UPDATE assignments SET user_id=$1, shift_id=$2, date=$3, status=$4 WHERE id=$5 RETURNING *`,
      [user_id, shift_id, date, status, id]
    );

    await client.query(
      `INSERT INTO shift_history (user_id, shift_id, date, notes, created_by) VALUES ($1, $2, $3, 'Assignment updated', $4)`,
      [user_id, shift_id, date, created_by]
    );

    await client.query('COMMIT');
    res.json(rows[0]);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

exports.deleteAssignment = async (req, res) => {
  const { id } = req.params;
  try {
    await pool.query('DELETE FROM assignments WHERE id = $1', [id]);
    res.json({ message: 'Assignment deleted' });
  } catch (err) {
    res.status(500).json({ error: 'Delete failed' });
  }
};

exports.getRoster = async (req, res) => {
  const { week } = req.query;
  if (!week) return res.status(400).json({ error: 'week=YYYY-WW required' });

  const [year, ww] = week.split('-');
  // Simple week bound calc (ISO week logic simplified for MVP)
  const jan1 = new Date(year, 0, 1);
  const dayOfWeek = jan1.getDay() || 7;
  const weekStart = new Date(jan1);
  weekStart.setDate(jan1.getDate() - dayOfWeek + 1 + (ww - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  try {
    const { rows } = await pool.query(`
      SELECT u.id as user_id, u.name, u.department, u.role,
             a.id as assignment_id, a.shift_id, a.date, a.status,
             s.name as shift_name, s.start_time, s.end_time, s.color
      FROM users u
      LEFT JOIN assignments a ON u.id = a.user_id AND a.date BETWEEN $1 AND $2
      LEFT JOIN shifts s ON a.shift_id = s.id
      ORDER BY u.department, u.name, a.date
    `, [weekStart.toISOString().split('T')[0], weekEnd.toISOString().split('T')[0]]);
    
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Roster fetch failed' });
  }
};

exports.getMyShifts = async (req, res) => {
  const { from, to } = req.query;
  const userId = req.user.id;
  try {
    const { rows } = await pool.query(`
      SELECT a.*, s.name as shift_name, s.start_time, s.end_time, s.color
      FROM assignments a
      JOIN shifts s ON a.shift_id = s.id
      WHERE a.user_id = $1 AND a.date BETWEEN $2 AND $3 AND a.status = 'scheduled'
      ORDER BY a.date, s.start_time
    `, [userId, from, to]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};