import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import { authRouter } from './auth';
import { restRouter } from './rest';
import { storageRouter } from './storage';
import { functionsRouter } from './scanReceipt';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;

app.use(
  cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  })
);
app.options('*', cors());

// Raw body parser for storage uploads ONLY
app.use((req, res, next) => {
  if (req.method === 'POST' && req.path.startsWith('/storage/v1/object/receipts/')) {
    return next();
  }
  express.json({ limit: '10mb' })(req, res, next);
});

app.use('/storage/v1', storageRouter);
app.use('/auth/v1', authRouter);
app.use('/rest/v1', restRouter);
app.use('/functions/v1', functionsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ScanIA Backend Server', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`ScanIA Backend Server running on port ${PORT}`);
});
