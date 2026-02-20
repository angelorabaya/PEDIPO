import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { getPool, sql } from "./db.js";

dotenv.config();

const app = express();
const port = Number(process.env.PORT || 4000);

function parseCorsOrigins(value) {
  if (!value) {
    return ["http://localhost:5173", "http://localhost:5174"];
  }

  const origins = value
    .split(",")
    .map((origin) => origin.trim())
    .filter(Boolean);

  return origins.length > 0 ? origins : ["http://localhost:5173", "http://localhost:5174"];
}

const allowedOrigins = parseCorsOrigins(process.env.CORS_ORIGIN);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin) return callback(null, true);
      if (allowedOrigins.includes("*") || allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      return callback(new Error(`Origin ${origin} is not allowed by CORS.`));
    },
  }),
);
app.use(express.json());

function toNullableString(value) {
  if (value === undefined || value === null) return null;
  const next = String(value).trim();
  return next.length === 0 ? null : next;
}

function toNullableId(value) {
  if (value === undefined || value === null || value === "") return null;
  const next = Number(value);
  if (!Number.isInteger(next) || next <= 0) return null;
  return next;
}

function toPositiveInt(value) {
  const next = Number(value);
  if (!Number.isInteger(next) || next <= 0) return null;
  return next;
}

function toMoney(value) {
  const next = Number(value);
  if (!Number.isFinite(next) || next < 0) return null;
  return Number(next.toFixed(2));
}

const STOCK_MOVEMENT_TYPES = new Set(["IN", "OUT", "ADJUSTMENT", "RETURN"]);
const STOCK_PAYMENT_STATUSES = new Set(["Paid", "Consignment", "COD", "Payable", "N/A"]);

function toMsSqlTimestamp(value) {
  const text = toNullableString(value);
  if (!text) return null;

  const date = new Date(text);
  if (Number.isNaN(date.getTime())) return undefined;

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  const second = String(date.getSeconds()).padStart(2, "0");

  return `${year}-${month}-${day} ${hour}:${minute}:${second}`;
}

function sqlErrorResponse(error, res) {
  // MSSQL error numbers
  // 2627 = Unique constraint violation (duplicate entry)
  // 2601 = Unique index violation
  // 547  = Foreign key constraint violation
  // 8115 = Arithmetic overflow (out of range)
  const errNumber = error?.number || error?.originalError?.info?.number;

  if (errNumber === 2627 || errNumber === 2601) {
    return res.status(409).json({ error: "Duplicate entry." });
  }
  if (errNumber === 547) {
    // Check if it's a reference constraint (DELETE blocked) or FK not found (INSERT/UPDATE)
    const msg = error?.message || "";
    if (msg.includes("DELETE")) {
      return res.status(409).json({ error: "Record is still referenced by other data." });
    }
    return res.status(400).json({ error: "Referenced record does not exist." });
  }
  if (errNumber === 8115) {
    return res.status(400).json({ error: "One or more numeric values are out of range." });
  }
  console.error(error);
  return res.status(500).json({ error: "Internal server error." });
}

// ── Health ───────────────────────────────────────────────────────────────────

app.get("/health", async (_req, res) => {
  try {
    const pool = await getPool();
    await pool.request().query("SELECT 1 AS ok");
    res.json({ ok: true });
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Municipalities ───────────────────────────────────────────────────────────

app.get("/api/municipalities", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      "SELECT id, name FROM municipalities ORDER BY name ASC",
    );
    res.json(result.recordset);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.post("/api/municipalities", async (req, res) => {
  const name = toNullableString(req.body?.name);
  if (!name) return res.status(400).json({ error: "Name is required." });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("name", sql.NVarChar, name)
      .query(
        `INSERT INTO municipalities (name) VALUES (@name);
         SELECT * FROM municipalities WHERE id = SCOPE_IDENTITY()`,
      );
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.put("/api/municipalities/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  const name = toNullableString(req.body?.name);
  if (!id) return res.status(400).json({ error: "Invalid id." });
  if (!name) return res.status(400).json({ error: "Name is required." });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar, name)
      .query("UPDATE municipalities SET name = @name WHERE id = @id");
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });

    const rows = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT id, name FROM municipalities WHERE id = @id");
    res.json(rows.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.delete("/api/municipalities/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id." });

  try {
    const pool = await getPool();

    // Check if municipality is referenced by any products
    const refs = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT COUNT(*) AS product_count FROM products WHERE municipality_id = @id");

    const { product_count } = refs.recordset[0];
    if (product_count > 0) {
      return res.status(409).json({
        error: `Cannot delete: this municipality is referenced by ${product_count} product(s). Remove or reassign those products first.`,
      });
    }

    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM municipalities WHERE id = @id");
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });
    res.status(204).send();
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Suppliers ────────────────────────────────────────────────────────────────

app.get("/api/suppliers", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      "SELECT id, name, contact_person, phone_number, address FROM suppliers ORDER BY name ASC",
    );
    res.json(result.recordset);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.post("/api/suppliers", async (req, res) => {
  const name = toNullableString(req.body?.name);
  if (!name) return res.status(400).json({ error: "Name is required." });

  const contact_person = toNullableString(req.body?.contact_person);
  const phone_number = toNullableString(req.body?.phone_number);
  const address = toNullableString(req.body?.address);

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("name", sql.NVarChar, name)
      .input("contact_person", sql.NVarChar, contact_person)
      .input("phone_number", sql.NVarChar, phone_number)
      .input("address", sql.NVarChar, address)
      .query(
        `INSERT INTO suppliers (name, contact_person, phone_number, address)
         VALUES (@name, @contact_person, @phone_number, @address);
         SELECT * FROM suppliers WHERE id = SCOPE_IDENTITY()`,
      );
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.put("/api/suppliers/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  const name = toNullableString(req.body?.name);
  if (!id) return res.status(400).json({ error: "Invalid id." });
  if (!name) return res.status(400).json({ error: "Name is required." });

  const contact_person = toNullableString(req.body?.contact_person);
  const phone_number = toNullableString(req.body?.phone_number);
  const address = toNullableString(req.body?.address);

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar, name)
      .input("contact_person", sql.NVarChar, contact_person)
      .input("phone_number", sql.NVarChar, phone_number)
      .input("address", sql.NVarChar, address)
      .query(
        `UPDATE suppliers
         SET name = @name, contact_person = @contact_person, phone_number = @phone_number, address = @address
         WHERE id = @id`,
      );
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });

    const rows = await pool.request()
      .input("id", sql.Int, id)
      .query("SELECT id, name, contact_person, phone_number, address FROM suppliers WHERE id = @id");
    res.json(rows.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.delete("/api/suppliers/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id." });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM suppliers WHERE id = @id");
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });
    res.status(204).send();
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Products ─────────────────────────────────────────────────────────────────

app.get("/api/products", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT id, name, municipality_id, supplier_id, unit_price, is_consignment, remarks, created_at
       FROM products
       ORDER BY created_at DESC`,
    );
    res.json(result.recordset);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.post("/api/products", async (req, res) => {
  const name = toNullableString(req.body?.name);
  if (!name) return res.status(400).json({ error: "Name is required." });

  const municipality_id = toNullableId(req.body?.municipality_id);
  const supplier_id = toNullableId(req.body?.supplier_id);
  const unit_price = toMoney(req.body?.unit_price ?? 0);
  const is_consignment = req.body?.is_consignment ? 1 : 0;
  const remarks = toNullableString(req.body?.remarks);

  if (unit_price === null) {
    return res.status(400).json({ error: "Unit price must be non-negative." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("name", sql.NVarChar, name)
      .input("municipality_id", sql.Int, municipality_id)
      .input("supplier_id", sql.Int, supplier_id)
      .input("unit_price", sql.Decimal(18, 2), unit_price)
      .input("is_consignment", sql.Bit, is_consignment)
      .input("remarks", sql.NVarChar, remarks)
      .query(
        `INSERT INTO products (name, municipality_id, supplier_id, unit_price, is_consignment, remarks)
         VALUES (@name, @municipality_id, @supplier_id, @unit_price, @is_consignment, @remarks);
         SELECT * FROM products WHERE id = SCOPE_IDENTITY()`,
      );
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.put("/api/products/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  const name = toNullableString(req.body?.name);
  if (!id) return res.status(400).json({ error: "Invalid id." });
  if (!name) return res.status(400).json({ error: "Name is required." });

  const municipality_id = toNullableId(req.body?.municipality_id);
  const supplier_id = toNullableId(req.body?.supplier_id);
  const unit_price = toMoney(req.body?.unit_price ?? 0);
  const is_consignment = req.body?.is_consignment ? 1 : 0;
  const remarks = toNullableString(req.body?.remarks);

  if (unit_price === null) {
    return res.status(400).json({ error: "Unit price must be non-negative." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("name", sql.NVarChar, name)
      .input("municipality_id", sql.Int, municipality_id)
      .input("supplier_id", sql.Int, supplier_id)
      .input("unit_price", sql.Decimal(18, 2), unit_price)
      .input("is_consignment", sql.Bit, is_consignment)
      .input("remarks", sql.NVarChar, remarks)
      .query(
        `UPDATE products
         SET name = @name, municipality_id = @municipality_id, supplier_id = @supplier_id,
             unit_price = @unit_price, is_consignment = @is_consignment, remarks = @remarks
         WHERE id = @id`,
      );
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });

    const rows = await pool.request()
      .input("id", sql.Int, id)
      .query(
        `SELECT id, name, municipality_id, supplier_id, unit_price, is_consignment, remarks, created_at
         FROM products WHERE id = @id`,
      );
    res.json(rows.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.delete("/api/products/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id." });

  try {
    const pool = await getPool();

    // Check if product is referenced in sales or stock_movements
    const refs = await pool.request()
      .input("id", sql.Int, id)
      .query(
        `SELECT
           (SELECT COUNT(*) FROM sales WHERE product_id = @id) AS sales_count,
           (SELECT COUNT(*) FROM stock_movements WHERE product_id = @id) AS movements_count`,
      );

    const { sales_count, movements_count } = refs.recordset[0];
    const usedIn = [];
    if (sales_count > 0) usedIn.push(`${sales_count} sale(s)`);
    if (movements_count > 0) usedIn.push(`${movements_count} stock movement(s)`);

    if (usedIn.length > 0) {
      return res.status(409).json({
        error: `Cannot delete: this product is referenced by ${usedIn.join(" and ")}. Remove those records first.`,
      });
    }

    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM products WHERE id = @id");
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });
    res.status(204).send();
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Sales ────────────────────────────────────────────────────────────────────

app.get("/api/sales", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT id, product_id, quantity, unit_price, total_amount, sale_date
       FROM sales
       ORDER BY sale_date DESC`,
    );
    res.json(result.recordset);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.post("/api/sales", async (req, res) => {
  const product_id = toPositiveInt(req.body?.product_id);
  const quantity = toPositiveInt(req.body?.quantity);
  const unit_price = toMoney(req.body?.unit_price);
  const sale_date = toMsSqlTimestamp(req.body?.sale_date);

  if (!product_id) return res.status(400).json({ error: "Valid product_id is required." });
  if (!quantity) return res.status(400).json({ error: "Quantity must be a positive integer." });
  if (unit_price === null) return res.status(400).json({ error: "Valid unit_price is required." });
  if (sale_date === undefined) {
    return res.status(400).json({ error: "sale_date must be a valid date/time." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("product_id", sql.Int, product_id)
      .input("quantity", sql.Int, quantity)
      .input("unit_price", sql.Decimal(18, 2), unit_price)
      .input("sale_date", sql.DateTime, sale_date ? new Date(sale_date) : new Date())
      .query(
        `INSERT INTO sales (product_id, quantity, unit_price, sale_date)
         VALUES (@product_id, @quantity, @unit_price, @sale_date);
         SELECT * FROM sales WHERE id = SCOPE_IDENTITY()`,
      );
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.put("/api/sales/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  const product_id = toPositiveInt(req.body?.product_id);
  const quantity = toPositiveInt(req.body?.quantity);
  const unit_price = toMoney(req.body?.unit_price);
  const sale_date = toMsSqlTimestamp(req.body?.sale_date);

  if (!id) return res.status(400).json({ error: "Invalid id." });
  if (!product_id) return res.status(400).json({ error: "Valid product_id is required." });
  if (!quantity) return res.status(400).json({ error: "Quantity must be a positive integer." });
  if (unit_price === null) return res.status(400).json({ error: "Valid unit_price is required." });
  if (sale_date === undefined) {
    return res.status(400).json({ error: "sale_date must be a valid date/time." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("product_id", sql.Int, product_id)
      .input("quantity", sql.Int, quantity)
      .input("unit_price", sql.Decimal(18, 2), unit_price)
      .input("sale_date", sql.DateTime, sale_date ? new Date(sale_date) : null)
      .query(
        `UPDATE sales
         SET product_id = @product_id, quantity = @quantity, unit_price = @unit_price,
             sale_date = COALESCE(@sale_date, sale_date)
         WHERE id = @id`,
      );
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });

    const rows = await pool.request()
      .input("id", sql.Int, id)
      .query(
        `SELECT id, product_id, quantity, unit_price, total_amount, sale_date
         FROM sales WHERE id = @id`,
      );
    res.json(rows.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.delete("/api/sales/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id." });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM sales WHERE id = @id");
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });
    res.status(204).send();
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Stock Movements ──────────────────────────────────────────────────────────

app.get("/api/stock-movements", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT id, product_id, movement_type, quantity, payment_status, movement_date, remarks
       FROM stock_movements
       ORDER BY movement_date DESC`,
    );
    res.json(result.recordset);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.post("/api/stock-movements", async (req, res) => {
  const product_id = toPositiveInt(req.body?.product_id);
  const movement_type = toNullableString(req.body?.movement_type);
  const quantity = toPositiveInt(req.body?.quantity);
  const payment_status = toNullableString(req.body?.payment_status) || "N/A";
  const movement_date = toMsSqlTimestamp(req.body?.movement_date);
  const remarks = toNullableString(req.body?.remarks);

  if (!product_id) return res.status(400).json({ error: "Valid product_id is required." });
  if (!movement_type) return res.status(400).json({ error: "movement_type is required." });
  if (!STOCK_MOVEMENT_TYPES.has(movement_type)) {
    return res.status(400).json({ error: "movement_type is invalid." });
  }
  if (!quantity) return res.status(400).json({ error: "Quantity must be a positive integer." });
  if (!STOCK_PAYMENT_STATUSES.has(payment_status)) {
    return res.status(400).json({ error: "payment_status is invalid." });
  }
  if (movement_date === undefined) {
    return res.status(400).json({ error: "movement_date must be a valid date/time." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("product_id", sql.Int, product_id)
      .input("movement_type", sql.NVarChar, movement_type)
      .input("quantity", sql.Int, quantity)
      .input("payment_status", sql.NVarChar, payment_status)
      .input("movement_date", sql.DateTime, movement_date ? new Date(movement_date) : new Date())
      .input("remarks", sql.NVarChar, remarks)
      .query(
        `INSERT INTO stock_movements (product_id, movement_type, quantity, payment_status, movement_date, remarks)
         VALUES (@product_id, @movement_type, @quantity, @payment_status, @movement_date, @remarks);
         SELECT * FROM stock_movements WHERE id = SCOPE_IDENTITY()`,
      );
    res.status(201).json(result.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.put("/api/stock-movements/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  const product_id = toPositiveInt(req.body?.product_id);
  const movement_type = toNullableString(req.body?.movement_type);
  const quantity = toPositiveInt(req.body?.quantity);
  const payment_status = toNullableString(req.body?.payment_status) || "N/A";
  const movement_date = toMsSqlTimestamp(req.body?.movement_date);
  const remarks = toNullableString(req.body?.remarks);

  if (!id) return res.status(400).json({ error: "Invalid id." });
  if (!product_id) return res.status(400).json({ error: "Valid product_id is required." });
  if (!movement_type) return res.status(400).json({ error: "movement_type is required." });
  if (!STOCK_MOVEMENT_TYPES.has(movement_type)) {
    return res.status(400).json({ error: "movement_type is invalid." });
  }
  if (!quantity) return res.status(400).json({ error: "Quantity must be a positive integer." });
  if (!STOCK_PAYMENT_STATUSES.has(payment_status)) {
    return res.status(400).json({ error: "payment_status is invalid." });
  }
  if (movement_date === undefined) {
    return res.status(400).json({ error: "movement_date must be a valid date/time." });
  }

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .input("product_id", sql.Int, product_id)
      .input("movement_type", sql.NVarChar, movement_type)
      .input("quantity", sql.Int, quantity)
      .input("payment_status", sql.NVarChar, payment_status)
      .input("movement_date", sql.DateTime, movement_date ? new Date(movement_date) : null)
      .input("remarks", sql.NVarChar, remarks)
      .query(
        `UPDATE stock_movements
         SET product_id = @product_id, movement_type = @movement_type, quantity = @quantity,
             payment_status = @payment_status, movement_date = COALESCE(@movement_date, movement_date),
             remarks = @remarks
         WHERE id = @id`,
      );
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });

    const rows = await pool.request()
      .input("id", sql.Int, id)
      .query(
        `SELECT id, product_id, movement_type, quantity, payment_status, movement_date, remarks
         FROM stock_movements WHERE id = @id`,
      );
    res.json(rows.recordset[0]);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

app.delete("/api/stock-movements/:id", async (req, res) => {
  const id = toPositiveInt(req.params.id);
  if (!id) return res.status(400).json({ error: "Invalid id." });

  try {
    const pool = await getPool();
    const result = await pool.request()
      .input("id", sql.Int, id)
      .query("DELETE FROM stock_movements WHERE id = @id");
    if (result.rowsAffected[0] === 0) return res.status(404).json({ error: "Not found." });
    res.status(204).send();
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Inventory ────────────────────────────────────────────────────────────────

app.get("/api/inventory", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT i.product_id, p.name AS product_name, i.quantity_on_hand, i.last_updated
       FROM inventory i
       INNER JOIN products p ON p.id = i.product_id
       ORDER BY p.name ASC`,
    );
    res.json(result.recordset);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Reports ──────────────────────────────────────────────────────────────────

app.get("/api/reports/inventory", async (_req, res) => {
  try {
    const pool = await getPool();
    const result = await pool.request().query(
      `SELECT municipality, product_name, quantity_on_hand, unit_price, total_value
       FROM view_inventory_report
       ORDER BY municipality, product_name`,
    );
    res.json(result.recordset);
  } catch (error) {
    sqlErrorResponse(error, res);
  }
});

// ── Serve Frontend (production) ─────────────────────────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const publicDir = path.resolve(__dirname, "..", "..", "public");

app.use(express.static(publicDir));

// SPA catch-all: any non-API route falls back to index.html
app.get("*", (_req, res) => {
  res.sendFile(path.join(publicDir, "index.html"));
});

// ── Start ────────────────────────────────────────────────────────────────────

app.listen(port, () => {
  console.log(`PDPO running on http://localhost:${port}`);
});
