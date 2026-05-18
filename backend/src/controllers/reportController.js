const pool = require('../config/db');

exports.getShiftHistory = async (req, res) => {
  const { userId, from, to } = req.query;
  try {
    const { rows } = await pool.query(`
      SELECT sh.*, u.name as employee_name, s.name as shift_name
      FROM shift_history sh
      JOIN users u ON sh.user_id = u.id
      JOIN shifts s ON sh.shift_id = s.id
      WHERE ($1 IS NULL OR sh.user_id = $1)
      AND ($2 IS NULL OR sh.date >= $2)
      AND ($3 IS NULL OR sh.date <= $3)
      ORDER BY sh.created_at DESC
    `, [userId || null, from || null, to || null]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Report fetch failed' });
  }
};