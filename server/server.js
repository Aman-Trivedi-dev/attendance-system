const dotenv = require('dotenv');
dotenv.config();

const express   = require('express');
const cors      = require('cors');
const connectDB = require('./config/db');

connectDB();

const app = express();

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Test route — visit http://localhost:5000/test to confirm server works
app.get('/test', (req, res) => res.json({ ok: true }));

app.use('/api/auth',       require('./routes/auth'));
app.use('/api/students',   require('./routes/students'));
app.use('/api/attendance', require('./routes/attendance'));

// Verification routes — wrapped in try/catch so crash doesn't break other routes
try {
  app.use('/api/verification', require('./routes/verification'));
  console.log('✅ Verification routes loaded');
} catch (e) {
  console.log('⚠️ Verification routes failed to load:', e.message);
}

app.get('/', (req, res) => {
  res.json({ message: 'Attendance System API is running!' });
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});