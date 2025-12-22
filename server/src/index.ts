import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import cafesRouter from './routes/cafes';
import drinksRouter from './routes/drinks';
import statsRouter from './routes/stats';
import userRouter from './routes/user';
import { requireAuth } from './middleware/auth';
import './db'; // Initialize DB connection

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected routes - require authentication
app.use('/api/cafes', requireAuth, cafesRouter);
app.use('/api/drinks', requireAuth, drinksRouter);
app.use('/api/stats', requireAuth, statsRouter);
app.use('/api/user', requireAuth, userRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
