import { Router, Response } from 'express';
import crypto from 'crypto';
import { authMiddleware, AuthenticatedRequest } from './auth';
import { pool } from './db';

export const restRouter = Router();

restRouter.use(authMiddleware);

// Helper to extract id from eq filter like id=eq.xxx
function parseEqParam(param?: any): string | null {
  if (!param) return null;
  const str = String(param);
  if (str.startsWith('eq.')) return str.slice(3);
  return str;
}

// GET /rest/v1/receipts
restRouter.get('/receipts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = parseEqParam(req.query.id);
    const select = String(req.query.select || '*');
    const isSingle = (req.headers.accept || '').includes('application/vnd.pgrst.object+json');

    let query = 'SELECT * FROM receipts WHERE user_id = $1';
    const params: any[] = [userId];

    if (id) {
      params.push(id);
      query += ` AND id = $${params.length}`;
    }

    if (String(req.query.order || '').includes('created_at.desc')) {
      query += ' ORDER BY created_at DESC';
    } else if (String(req.query.order || '').includes('created_at.asc')) {
      query += ' ORDER BY created_at ASC';
    } else {
      query += ' ORDER BY created_at DESC';
    }

    const { rows: receipts } = await pool.query(query, params);

    // If items were requested in select (e.g. *, items:receipt_items(*))
    const wantsItems = select.includes('receipt_items');
    if (wantsItems && receipts.length > 0) {
      const receiptIds = receipts.map((r) => r.id);
      const { rows: allItems } = await pool.query(
        'SELECT * FROM receipt_items WHERE receipt_id = ANY($1::uuid[])',
        [receiptIds]
      );
      const itemsByReceipt = new Map<string, any[]>();
      for (const item of allItems) {
        if (!itemsByReceipt.has(item.receipt_id)) {
          itemsByReceipt.set(item.receipt_id, []);
        }
        itemsByReceipt.get(item.receipt_id)!.push({
          ...item,
          quantity: Number(item.quantity),
          unit_price: item.unit_price !== null && item.unit_price !== undefined ? Number(item.unit_price) : null,
          total_price: Number(item.total_price),
        });
      }
      for (const r of receipts) {
        r.items = itemsByReceipt.get(r.id) || [];
      }
    }

    // Convert numeric fields to number
    for (const r of receipts) {
      if (r.total !== null && r.total !== undefined) {
        r.total = Number(r.total);
      }
    }

    if (isSingle) {
      if (receipts.length === 0) {
        res.status(406).json({ message: 'JSON object requested, multiple (or no) rows returned', details: 'The result contains 0 rows' });
        return;
      }
      res.json(receipts[0]);
      return;
    }

    res.json(receipts);
  } catch (error: any) {
    console.error('GET /receipts error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /rest/v1/receipts
restRouter.post('/receipts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const body = req.body;
    const isSingle = (req.headers.accept || '').includes('application/vnd.pgrst.object+json');

    const receiptId = crypto.randomUUID();
    const imagePath = body.image_path;
    const merchant = body.merchant || null;
    const purchaseDate = body.purchase_date || null;
    const total = body.total || null;
    const category = body.category || null;
    const paymentMethod = body.payment_method || null;
    const status = body.status || 'pending';

    await pool.query(
      `INSERT INTO receipts (id, user_id, image_path, merchant, purchase_date, total, category, payment_method, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
      [receiptId, userId, imagePath, merchant, purchaseDate, total, category, paymentMethod, status]
    );

    const created = {
      id: receiptId,
      user_id: userId,
      image_path: imagePath,
      merchant,
      purchase_date: purchaseDate,
      total: total !== null ? Number(total) : null,
      category,
      payment_method: paymentMethod,
      status,
      created_at: new Date().toISOString(),
    };

    if (isSingle) {
      res.status(201).json(created);
      return;
    }
    res.status(201).json([created]);
  } catch (error: any) {
    console.error('POST /receipts error:', error);
    res.status(500).json({ message: error.message });
  }
});

// PATCH /rest/v1/receipts
restRouter.patch('/receipts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = parseEqParam(req.query.id);
    if (!id) {
      res.status(400).json({ message: 'Missing id query param' });
      return;
    }

    const { merchant, purchase_date, total, category, payment_method, status, error_message } = req.body;

    await pool.query(
      `UPDATE receipts
       SET merchant = COALESCE($1, merchant),
           purchase_date = $2,
           total = COALESCE($3, total),
           category = COALESCE($4, category),
           payment_method = COALESCE($5, payment_method),
           status = COALESCE($6, status),
           error_message = $7
       WHERE id = $8 AND user_id = $9`,
      [
        merchant ?? null,
        purchase_date ?? null,
        total ?? null,
        category ?? null,
        payment_method ?? null,
        status ?? null,
        error_message ?? null,
        id,
        userId,
      ]
    );

    const { rows } = await pool.query('SELECT * FROM receipts WHERE id = $1', [id]);
    res.status(200).json(rows);
  } catch (error: any) {
    console.error('PATCH /receipts error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /rest/v1/receipts
restRouter.delete('/receipts', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const userId = req.user!.id;
    const id = parseEqParam(req.query.id);
    if (!id) {
      res.status(400).json({ message: 'Missing id query param' });
      return;
    }

    await pool.query('DELETE FROM receipt_items WHERE receipt_id = $1', [id]);
    await pool.query('DELETE FROM receipts WHERE id = $1 AND user_id = $2', [id, userId]);
    res.status(200).json([]);
  } catch (error: any) {
    console.error('DELETE /receipts error:', error);
    res.status(500).json({ message: error.message });
  }
});

// POST /rest/v1/receipt_items
restRouter.post('/receipt_items', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const items = Array.isArray(req.body) ? req.body : [req.body];
    const inserted: any[] = [];

    for (const item of items) {
      const itemId = crypto.randomUUID();
      await pool.query(
        `INSERT INTO receipt_items (id, receipt_id, description, quantity, unit_price, total_price)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [itemId, item.receipt_id, item.description, item.quantity || 1, item.unit_price, item.total_price]
      );
      inserted.push({
        id: itemId,
        receipt_id: item.receipt_id,
        description: item.description,
        quantity: item.quantity || 1,
        unit_price: item.unit_price,
        total_price: item.total_price,
      });
    }

    res.status(201).json(inserted);
  } catch (error: any) {
    console.error('POST /receipt_items error:', error);
    res.status(500).json({ message: error.message });
  }
});

// DELETE /rest/v1/receipt_items
restRouter.delete('/receipt_items', async (req: AuthenticatedRequest, res: Response): Promise<void> => {
  try {
    const receiptId = parseEqParam(req.query.receipt_id);
    if (!receiptId) {
      res.status(400).json({ message: 'Missing receipt_id query param' });
      return;
    }

    await pool.query('DELETE FROM receipt_items WHERE receipt_id = $1', [receiptId]);
    res.status(200).json([]);
  } catch (error: any) {
    console.error('DELETE /receipt_items error:', error);
    res.status(500).json({ message: error.message });
  }
});
