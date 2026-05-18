require('dotenv').config();
const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');

const app = express();
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/shifts', require('./routes/shiftRoutes'));
app.use('/api/assignments', require('./routes/assignmentRoutes'));
app.use('/api/swaps', require('./routes/swapRoutes'));
app.use('/api/reports', require('./routes/reportRoutes'));

// Quick auth for hackathon testing (remove in prod)
app.post('/auth/login', (req, res) => {
  const { email, role, department } = req.body;
  const token = jwt.sign({ id: 1, email, role: role || 'admin', department: department || 'ops' }, process.env.JWT_SECRET, { expiresIn: '7d' });
  res.json({ token, user: { id: 1, email, role, department } });
});

// Error Handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal Server Error' });
});

const PORT = process.env.PORT || 3001;
app.listen(PORT, () => console.log(`🚀 Backend running on http://localhost:${PORT}`));