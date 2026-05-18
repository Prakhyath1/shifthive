const pool = require('../config/db');

exports.createShift = async (req, res) => {
  const { name, start_time, end_time, break_minutes, color } = req.body;
  if (!name || !start_time || !end_time) return res.status(400).json({ error: 'Missing fields' });

  try {
    const { rows } = await pool.query(
      `INSERT INTO shifts (name, start_time, end_time, break_minutes, color) VALUES ($1, $2, $3, $4, $5) RETURNING *`,
      [name, start_time, end_time, break_minutes || 0, color || '#3b82f6']
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create shift' });
  }
};

exports.getShifts = async (req, res) => {
  try {
    const { rows } = await pool.query('SELECT * FROM shifts ORDER BY name');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch shifts' });
  }
};