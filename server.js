import express from 'express';
import cors from 'cors';
import pg from 'pg';
import dotenv from 'dotenv';
import careerRoutes from './src/routes/career.js';

dotenv.config();

const { Pool } = pg;
const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors({ origin: process.env.FRONTEND_URL || 'http://localhost:5173' }));
app.use(express.json({ limit: '50kb' }));

const pool = new Pool({ connectionString: process.env.DATABASE_URL, max: 10 });
pool.on('error', err => console.error('Postgres pool error:', err.message));
app.locals.pool = pool;

app.use('/api', careerRoutes);
app.get('/health', (req, res) => res.json({ status: 'ok', version: '1.0.0' }));

app.listen(PORT, async () => {
  try {
    await pool.query('SELECT 1');
    console.log(`VulaCareerAI running on http://localhost:${PORT}`);
    console.log('  POST /api/analyse');
    console.log('  POST /api/tailor');
    console.log('  GET  /api/metrics');
  } catch (err) {
    console.error('DB connection failed:', err.message);
  }
});
