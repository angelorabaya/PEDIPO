# PEDIPO Backend (MySQL)

Express API connected to MySQL for the schema in `database/pdpo_mysql_schema.sql`.

## 1. Setup

1. Copy env template:
   - `backend/.env.example` -> `backend/.env`
2. Fill MySQL credentials in `backend/.env`.
3. Ensure your MySQL database/tables are created (run `database/pdpo_mysql_schema.sql`).

## 2. Install and Run

From `backend`:

```bash
npm install
npm run dev
```

Default server URL: `http://localhost:4000`

## 3. API Endpoints

- Health:
  - `GET /health`
- Municipalities:
  - `GET /api/municipalities`
  - `POST /api/municipalities`
  - `PUT /api/municipalities/:id`
  - `DELETE /api/municipalities/:id`
- Suppliers:
  - `GET /api/suppliers`
  - `POST /api/suppliers`
  - `PUT /api/suppliers/:id`
  - `DELETE /api/suppliers/:id`
- Products:
  - `GET /api/products`
  - `POST /api/products`
  - `PUT /api/products/:id`
  - `DELETE /api/products/:id`
- Sales:
  - `GET /api/sales`
  - `POST /api/sales`
  - `PUT /api/sales/:id`
  - `DELETE /api/sales/:id`
- Stock Movements:
  - `GET /api/stock-movements`
  - `POST /api/stock-movements`
  - `PUT /api/stock-movements/:id`
  - `DELETE /api/stock-movements/:id`
- Inventory:
  - `GET /api/inventory`

## Notes

- CORS origin is controlled by `CORS_ORIGIN` in `.env` and supports comma-separated values (default: `http://localhost:5173,http://localhost:5174`).
- SQL constraint errors are returned as structured HTTP errors (400/409/500).
