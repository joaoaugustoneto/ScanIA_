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
    allowedHeaders: [
      'authorization',
      'x-client-info',
      'apikey',
      'content-type',
      'prefer',
      'accept',
    ],
  })
);

// Storage upload routes need raw / streaming bodies before json parser
app.use('/storage/v1', storageRouter);

// Standard JSON parsing for other routes
app.use(express.json({ limit: '10mb' }));

app.use('/auth/v1', authRouter);
app.use('/rest/v1', restRouter);
app.use('/functions/v1', functionsRouter);

app.get('/health', (_req, res) => {
  res.json({ status: 'ok', service: 'ScanIA Backend Server', timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`ScanIA Backend Server running on port ${PORT}`);
});
