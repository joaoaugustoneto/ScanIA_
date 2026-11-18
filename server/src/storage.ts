import { Router, Request, Response } from 'express';
import fs from 'fs';
import path from 'path';
import { authMiddleware, AuthenticatedRequest } from './auth';

export const storageRouter = Router();

const UPLOADS_DIR = process.env.STORAGE_DIR || path.join(__dirname, '../uploads');

function ensureDir(dirPath: string) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

// POST /storage/v1/object/receipts/* (Upload)
storageRouter.post('/object/receipts/*', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const relativePath = decodeURIComponent(req.params[0] || req.path.replace(/^\/object\/receipts\//, ''));
    
    // Check if user is uploading to their own folder (RLS rule)
    if (!relativePath.startsWith(`${userId}/`)) {
      res.status(403).json({
        statusCode: '403',
        error: 'Unauthorized',
        message: 'new row violates row-level security policy ao enviar a foto',
      });
      return;
    }

    const fullPath = path.join(UPLOADS_DIR, 'receipts', relativePath);
    ensureDir(path.dirname(fullPath));

    const chunks: Buffer[] = [];
    req.on('data', (chunk) => chunks.push(chunk));
    req.on('end', () => {
      const buffer = Buffer.concat(chunks);
      fs.writeFileSync(fullPath, buffer);
      res.status(200).json({
        Key: `receipts/${relativePath}`,
        Id: relativePath,
      });
    });
  } catch (error: any) {
    console.error('Storage upload error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /storage/v1/object/sign/receipts/* (Create Signed URL)
storageRouter.post('/object/sign/receipts/*', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const relativePath = decodeURIComponent(req.params[0] || req.path.replace(/^\/object\/sign\/receipts\//, ''));
    const relativeSignedUrl = `/object/public/receipts/${relativePath}`;

    res.status(200).json({
      signedURL: relativeSignedUrl,
      signedUrl: relativeSignedUrl,
    });
  } catch (error: any) {
    console.error('Create signed URL error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /storage/v1/object/public/receipts/* (Download/View)
storageRouter.get('/object/public/receipts/*', (req: Request, res: Response): void => {
  try {
    const relativePath = decodeURIComponent(req.params[0] || req.path.replace(/^\/object\/public\/receipts\//, ''));
    const fullPath = path.join(UPLOADS_DIR, 'receipts', relativePath);

    if (!fs.existsSync(fullPath)) {
      res.status(404).json({ message: 'Arquivo não encontrado' });
      return;
    }

    res.setHeader('Content-Type', 'image/jpeg');
    fs.createReadStream(fullPath).pipe(res);
  } catch (error: any) {
    console.error('Storage view error:', error);
    res.status(500).json({ message: error.message });
  }
});

// GET /storage/v1/object/authenticated/receipts/*
storageRouter.get('/object/authenticated/receipts/*', (req: Request, res: Response): void => {
  const relativePath = decodeURIComponent(req.params[0] || req.path.replace(/^\/object\/authenticated\/receipts\//, ''));
  const fullPath = path.join(UPLOADS_DIR, 'receipts', relativePath);

  if (!fs.existsSync(fullPath)) {
    res.status(404).json({ message: 'Arquivo não encontrado' });
    return;
  }

  res.setHeader('Content-Type', 'image/jpeg');
  fs.createReadStream(fullPath).pipe(res);
});

// DELETE /storage/v1/object/receipts (Remove file)
storageRouter.delete('/object/receipts', authMiddleware, (req: AuthenticatedRequest, res: Response): void => {
  try {
    const userId = req.user!.id;
    const prefixes = req.body?.prefixes || [];
    if (Array.isArray(prefixes)) {
      for (const prefix of prefixes) {
        if (prefix.startsWith(`${userId}/`)) {
          const fullPath = path.join(UPLOADS_DIR, 'receipts', prefix);
          if (fs.existsSync(fullPath)) {
            fs.unlinkSync(fullPath);
          }
        }
      }
    }
    res.status(200).json({ message: 'Deleted successfully' });
  } catch (error: any) {
    console.error('Storage delete error:', error);
    res.status(500).json({ message: error.message });
  }
});
