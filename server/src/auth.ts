import { Router, Request, Response, NextFunction } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import { pool } from './db';

export const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-jwt-token-scania-2026';

export interface AuthUser {
  id: string;
  email: string;
  user_metadata: {
    full_name?: string;
  };
}

export interface AuthenticatedRequest extends Request {
  user?: AuthUser;
}

export function authMiddleware(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ message: 'Não autenticado.', error: 'Unauthorized' });
    return;
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as any;
    req.user = {
      id: decoded.sub || decoded.id,
      email: decoded.email,
      user_metadata: decoded.user_metadata || {},
    };
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token inválido ou expirado.', error: 'Unauthorized' });
  }
}

export const authRouter = Router();

function generateSession(user: AuthUser) {
  const payload = {
    sub: user.id,
    id: user.id,
    email: user.email,
    user_metadata: user.user_metadata,
    role: 'authenticated',
  };
  const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' });
  return {
    access_token: token,
    token_type: 'bearer',
    expires_in: 604800,
    refresh_token: token,
    user: {
      id: user.id,
      email: user.email,
      app_metadata: { provider: 'email', providers: ['email'] },
      user_metadata: user.user_metadata,
      aud: 'authenticated',
      role: 'authenticated',
      created_at: new Date().toISOString(),
    },
  };
}

// POST /auth/v1/signup
authRouter.post('/signup', async (req: Request, res: Response) => {
  try {
    const { email, password, data } = req.body;
    const fullName = data?.full_name || '';

    if (!email || !password) {
      res.status(400).json({ message: 'Email e senha são obrigatórios.' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const existing = await pool.query('SELECT id FROM users WHERE email = $1', [cleanEmail]);
    if (existing.rows.length > 0) {
      res.status(400).json({ message: 'User already registered' });
      return;
    }

    const userId = crypto.randomUUID();
    const hash = await bcrypt.hash(password, 10);
    await pool.query(
      'INSERT INTO users (id, email, password_hash, full_name) VALUES ($1, $2, $3, $4)',
      [userId, cleanEmail, hash, fullName.trim()]
    );

    const user: AuthUser = {
      id: userId,
      email: cleanEmail,
      user_metadata: { full_name: fullName.trim() },
    };

    const session = generateSession(user);
    res.status(200).json(session);
  } catch (error: any) {
    console.error('Signup error:', error);
    res.status(500).json({ message: error.message || 'Erro interno no cadastro.' });
  }
});

// POST /auth/v1/token?grant_type=password
authRouter.post('/token', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' });
      return;
    }

    const cleanEmail = email.toLowerCase().trim();
    const userRes = await pool.query('SELECT * FROM users WHERE email = $1', [cleanEmail]);
    if (userRes.rows.length === 0) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' });
      return;
    }

    const dbUser = userRes.rows[0];
    const match = await bcrypt.compare(password, dbUser.password_hash);
    if (!match) {
      res.status(400).json({ error: 'invalid_grant', error_description: 'Invalid login credentials', message: 'Invalid login credentials' });
      return;
    }

    const user: AuthUser = {
      id: dbUser.id,
      email: dbUser.email,
      user_metadata: { full_name: dbUser.full_name },
    };

    const session = generateSession(user);
    res.status(200).json(session);
  } catch (error: any) {
    console.error('Token error:', error);
    res.status(500).json({ message: error.message || 'Erro ao autenticar.' });
  }
});

// GET /auth/v1/user
authRouter.get('/user', authMiddleware, (req: AuthenticatedRequest, res: Response) => {
  res.json(req.user);
});

// POST /auth/v1/logout
authRouter.post('/logout', (_req: Request, res: Response) => {
  res.status(200).json({});
});
