const pool = require('../config/db');

exports.createSwapRequest = async (req, res) => {
  const { from_assignment_id, to_user_id, reason } = req.body;
  const requester_id = req.user.id;

  try {
    // Validate: only assigned user can request
    const { rows: assignment } = await pool.query('SELECT user_id FROM assignments WHERE id = $1', [from_assignment_id]);
    if (!assignment.length || assignment[0].user_id !== requester_id) {
      return res.status(403).json({ error: 'Only the assigned employee can request a swap.' });
    }

    // Validate: same dept/role unless admin
    const { rows: [user1, user2] } = await pool.query(
      `SELECT id, department, role FROM users WHERE id = $1 OR id = $2`,
      [requester_id, to_user_id]
    );
    if (req.user.role !== 'admin' && (user1.department !== user2.department || user1.role !== user2.role)) {
      return res.status(400).json({ error: 'Swap requires same department and role.' });
    }

    // Validate: not past date
    const { rows: [assignData] } = await pool.query('SELECT date FROM assignments WHERE id = $1', [from_assignment_id]);
    if (new Date(assignData.date) < new Date().setHours(0,0,0,0)) {
      return res.status(400).json({ error: 'Cannot swap past shifts.' });
    }

    const { rows } = await pool.query(
      `INSERT INTO swap_requests (from_assignment_id, to_user_id, reason, status) VALUES ($1, $2, $3, 'pending') RETURNING *`,
      [from_assignment_id, to_user_id, reason]
    );
    res.status(201).json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.handleSwap = async (req, res) => {
  const { id } = req.params;
  const { status } = req.body; // 'approved' or 'rejected'
  const decided_by = req.user.id;

  if (!['approved', 'rejected'].includes(status)) return res.status(400).json({ error: 'Invalid status' });

  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query('SET TRANSACTION ISOLATION LEVEL SERIALIZABLE');

    const { rows: [swap] } = await client.query('SELECT * FROM swap_requests WHERE id = $1 FOR UPDATE', [id]);
    if (!swap || swap.status !== 'pending') throw new Error('Swap already processed');

    if (status === 'approved') {
      // Atomic swap
      const { rows: [fromAssign] } = await client.query('SELECT * FROM assignments WHERE id = $1 FOR UPDATE', [swap.from_assignment_id]);
      // Find to_assignment (we assume target user has an assignment on same date or we create one)
      // For MVP simplicity: we swap user_ids on two existing assignments on same date
      // In full prod, you'd query to_user_id's assignment on that date
      await client.query('UPDATE assignments SET user_id = $1 WHERE id = $2', [swap.to_user_id, swap.from_assignment_id]);
      
      // Log
      await client.query(`INSERT INTO shift_history (user_id, shift_id, date, notes, created_by) VALUES ($1, $2, $3, 'Swap approved', $4)`,
        [swap.to_user_id, fromAssign.shift_id, fromAssign.date, decided_by]);
    }

    await client.query('UPDATE swap_requests SET status = $1, decided_by = $2, decided_at = NOW() WHERE id = $3', [status, decided_by, id]);
    await client.query('COMMIT');
    res.json({ message: `Swap ${status}` });
  } catch (err) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: err.message });
  } finally {
    client.release();
  }
};