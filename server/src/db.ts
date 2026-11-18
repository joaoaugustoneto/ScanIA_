import { Pool } from 'pg';
import path from 'path';
import fs from 'fs';
import dotenv from 'dotenv';

dotenv.config();

export interface QueryResult<T = any> {
  rows: T[];
}

export interface UserRow {
  id: string;
  email: string;
  password_hash: string;
  full_name: string;
  created_at: string;
}

export interface ReceiptRow {
  id: string;
  user_id: string;
  image_path: string;
  status: 'pending' | 'done' | 'error';
  merchant: string | null;
  purchase_date: string | null;
  total: number | null;
  category: string | null;
  payment_method: string | null;
  error_message: string | null;
  created_at: string;
}

export interface ReceiptItemRow {
  id: string;
  receipt_id: string;
  description: string;
  quantity: number;
  unit_price: number | null;
  total_price: number;
}

interface LocalSchema {
  users: UserRow[];
  receipts: ReceiptRow[];
  receipt_items: ReceiptItemRow[];
}

class ResilientDatabase {
  private pgPool: Pool | null = null;
  private isPostgres = false;
  private dataDir: string;
  private dbFilePath: string;
  private localData: LocalSchema = {
    users: [],
    receipts: [],
    receipt_items: [],
  };

  constructor() {
    this.dataDir = path.join(__dirname, '../data');
    this.dbFilePath = path.join(this.dataDir, 'db.json');
    this.loadLocalData();
    this.tryPostgres();
  }

  private tryPostgres() {
    const pgUrl = process.env.DATABASE_URL;
    if (!pgUrl) return;

    this.pgPool = new Pool({
      connectionString: pgUrl,
      connectionTimeoutMillis: 1500,
    });

    this.pgPool.connect((err, _client, release) => {
      if (err) {
        this.isPostgres = false;
      } else {
        this.isPostgres = true;
        if (release) release();
      }
    });
  }

  private loadLocalData() {
    if (!fs.existsSync(this.dataDir)) {
      fs.mkdirSync(this.dataDir, { recursive: true });
    }
    if (fs.existsSync(this.dbFilePath)) {
      try {
        const raw = fs.readFileSync(this.dbFilePath, 'utf8');
        this.localData = JSON.parse(raw);
      } catch {
        this.localData = { users: [], receipts: [], receipt_items: [] };
      }
    } else {
      this.saveLocalData();
    }
  }

  private saveLocalData() {
    try {
      if (!fs.existsSync(this.dataDir)) {
        fs.mkdirSync(this.dataDir, { recursive: true });
      }
      fs.writeFileSync(this.dbFilePath, JSON.stringify(this.localData, null, 2), 'utf8');
    } catch (e) {
      console.error('Failed to save local db:', e);
    }
  }

  async query<T = any>(sql: string, params: any[] = []): Promise<QueryResult<T>> {
    if (this.isPostgres && this.pgPool) {
      try {
        const res = await this.pgPool.query(sql, params);
        return { rows: res.rows };
      } catch (err) {
        // Fallback to local
      }
    }

    return this.queryLocal(sql, params);
  }

  private queryLocal<T = any>(sql: string, params: any[]): QueryResult<T> {
    const normalized = sql.replace(/\s+/g, ' ').trim();

    // 1. SELECT id FROM users WHERE email = $1
    if (/SELECT id FROM users WHERE email/i.test(normalized)) {
      const email = String(params[0]).toLowerCase().trim();
      const user = this.localData.users.find((u) => u.email.toLowerCase() === email);
      return { rows: (user ? [{ id: user.id }] : []) as any };
    }

    // 2. INSERT INTO users (id, email, password_hash, full_name)
    if (/INSERT INTO users/i.test(normalized)) {
      const [id, email, password_hash, full_name] = params;
      const newUser: UserRow = {
        id,
        email: String(email).toLowerCase().trim(),
        password_hash,
        full_name,
        created_at: new Date().toISOString(),
      };
      this.localData.users.push(newUser);
      this.saveLocalData();
      return { rows: [newUser] as any };
    }

    // 3. SELECT * FROM users WHERE email = $1
    if (/SELECT \* FROM users WHERE email/i.test(normalized)) {
      const email = String(params[0]).toLowerCase().trim();
      const user = this.localData.users.find((u) => u.email.toLowerCase() === email);
      return { rows: (user ? [user] : []) as any };
    }

    // 4. SELECT * FROM receipts
    if (/SELECT \* FROM receipts/i.test(normalized)) {
      const userId = params[0];
      const receiptId = params[1];

      let list = this.localData.receipts.filter((r) => r.user_id === userId);
      if (receiptId) {
        list = list.filter((r) => r.id === receiptId);
      }

      if (/ORDER BY created_at ASC/i.test(normalized)) {
        list.sort((a, b) => a.created_at.localeCompare(b.created_at));
      } else {
        list.sort((a, b) => b.created_at.localeCompare(a.created_at));
      }

      return { rows: list.map((r) => ({ ...r })) as any };
    }

    // 5. SELECT * FROM receipt_items WHERE receipt_id = ANY($1::uuid[]) or receipt_id = $1
    if (/SELECT \* FROM receipt_items/i.test(normalized)) {
      const ids: string[] = Array.isArray(params[0]) ? params[0] : [params[0]];
      const items = this.localData.receipt_items.filter((item) => ids.includes(item.receipt_id));
      return { rows: items.map((i) => ({ ...i })) as any };
    }

    // 6. INSERT INTO receipts
    if (/INSERT INTO receipts/i.test(normalized)) {
      const [id, user_id, image_path, merchant, purchase_date, total, category, payment_method, status] = params;
      const newReceipt: ReceiptRow = {
        id,
        user_id,
        image_path,
        merchant: merchant ?? null,
        purchase_date: purchase_date ?? null,
        total: total !== null && total !== undefined ? Number(total) : null,
        category: category ?? null,
        payment_method: payment_method ?? null,
        status: status || 'pending',
        error_message: null,
        created_at: new Date().toISOString(),
      };
      this.localData.receipts.push(newReceipt);
      this.saveLocalData();
      return { rows: [newReceipt] as any };
    }

    // 7. UPDATE receipts SET merchant = COALESCE($1, merchant)... WHERE id = $8 AND user_id = $9
    if (/UPDATE receipts/i.test(normalized)) {
      if (/SET status = 'error'/i.test(normalized)) {
        const [error_message, id] = params;
        const receipt = this.localData.receipts.find((r) => r.id === id);
        if (receipt) {
          receipt.status = 'error';
          receipt.error_message = error_message;
          this.saveLocalData();
        }
        return { rows: receipt ? [receipt] as any : [] };
      }

      if (/SET status = 'done'/i.test(normalized)) {
        const [merchant, purchase_date, total, category, payment_method, id] = params;
        const receipt = this.localData.receipts.find((r) => r.id === id);
        if (receipt) {
          receipt.status = 'done';
          receipt.error_message = null;
          receipt.merchant = merchant ?? null;
          receipt.purchase_date = purchase_date ?? null;
          receipt.total = total !== null && total !== undefined ? Number(total) : null;
          receipt.category = category ?? null;
          receipt.payment_method = payment_method ?? null;
          this.saveLocalData();
        }
        return { rows: receipt ? [receipt] as any : [] };
      }

      // General update
      const [merchant, purchase_date, total, category, payment_method, status, error_message, id, userId] = params;
      const receipt = this.localData.receipts.find((r) => r.id === id && (userId ? r.user_id === userId : true));
      if (receipt) {
        if (merchant !== null && merchant !== undefined) receipt.merchant = merchant;
        if (purchase_date !== undefined) receipt.purchase_date = purchase_date;
        if (total !== null && total !== undefined) receipt.total = Number(total);
        if (category !== null && category !== undefined) receipt.category = category;
        if (payment_method !== null && payment_method !== undefined) receipt.payment_method = payment_method;
        if (status !== null && status !== undefined) receipt.status = status;
        if (error_message !== undefined) receipt.error_message = error_message;
        this.saveLocalData();
      }
      return { rows: receipt ? [receipt] as any : [] };
    }

    // 8. DELETE FROM receipts WHERE id = $1 AND user_id = $2
    if (/DELETE FROM receipts/i.test(normalized)) {
      const id = params[0];
      const userId = params[1];
      this.localData.receipts = this.localData.receipts.filter((r) => !(r.id === id && r.user_id === userId));
      this.localData.receipt_items = this.localData.receipt_items.filter((i) => i.receipt_id !== id);
      this.saveLocalData();
      return { rows: [] };
    }

    // 9. INSERT INTO receipt_items
    if (/INSERT INTO receipt_items/i.test(normalized)) {
      const [id, receipt_id, description, quantity, unit_price, total_price] = params;
      const newItem: ReceiptItemRow = {
        id,
        receipt_id,
        description,
        quantity: Number(quantity) || 1,
        unit_price: unit_price !== null && unit_price !== undefined ? Number(unit_price) : null,
        total_price: Number(total_price),
      };
      this.localData.receipt_items.push(newItem);
      this.saveLocalData();
      return { rows: [newItem] as any };
    }

    // 10. DELETE FROM receipt_items WHERE receipt_id = $1
    if (/DELETE FROM receipt_items/i.test(normalized)) {
      const receiptId = params[0];
      this.localData.receipt_items = this.localData.receipt_items.filter((i) => i.receipt_id !== receiptId);
      this.saveLocalData();
      return { rows: [] };
    }

    return { rows: [] };
  }
}

export const pool = new ResilientDatabase();
