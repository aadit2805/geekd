import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import dotenv from 'dotenv';
import cafesRouter from './routes/cafes';
import drinksRouter from './routes/drinks';
import statsRouter from './routes/stats';
import userRouter from './routes/user';
import wishlistRouter from './routes/wishlist';
import { requireAuth } from './middleware/auth';
import './db'; // Initialize DB connection

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3001;

// Security middleware
app.use(helmet());

// CORS configuration - restrict to frontend origin
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:3000',
  credentials: true
}));

// Rate limiting - prevent abuse
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.'
});

app.use(express.json({ limit: '10mb' }));

// Public routes
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Protected routes - require authentication + rate limiting
app.use('/api/cafes', limiter, requireAuth, cafesRouter);
app.use('/api/drinks', limiter, requireAuth, drinksRouter);
app.use('/api/stats', limiter, requireAuth, statsRouter);
app.use('/api/user', limiter, requireAuth, userRouter);
app.use('/api/wishlist', limiter, requireAuth, wishlistRouter);

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
