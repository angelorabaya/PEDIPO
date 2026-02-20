# PDPO — Local Deployment Guide

## Prerequisites

1. **Node.js** (v18 or later) — [Download here](https://nodejs.org)
2. **MS SQL Server Express** — must be installed and running on the laptop

---

## First-Time Setup

### 1. Configure the Database

Open **SQL Server Management Studio (SSMS)** and execute the schema script:

```
LOCALDEPLOYMENT\pdpo_mssql_schema.sql
```

This creates the `inventory_db` database, all tables, views, and triggers.

### 2. Configure Database Credentials

Edit `backend\.env` and update the connection details to match your SQL Server setup:

```
DB_HOST=localhost
DB_PORT=1433
DB_USER=sa
DB_PASSWORD=YourPassword123
DB_NAME=inventory_db
PORT=4000
```

> **Note:** If you use Windows Authentication instead of SQL Server Authentication,
> you will need to modify `backend\src\db.js` to set `trustedConnection: true`
> and remove the `user` / `password` fields from the config.

### 3. Run the Application

Double-click **`start.bat`**.

- On the **first run** it will automatically install Node.js dependencies (~30 seconds)
- The browser will open automatically to `http://localhost:4000`
- The console window must remain open while using the application

---

## Daily Usage

Just double-click **`start.bat`** — it will start the server and open your browser.

To stop the server, close the console window or press `Ctrl + C`.

---

## Folder Structure

```
LOCALDEPLOYMENT/
├── start.bat                  ← Double-click to launch
├── howto.md                   ← This file
├── pdpo_mssql_schema.sql      ← Database setup script
├── backend/
│   ├── .env                   ← Database credentials
│   ├── package.json           ← Node.js dependencies
│   └── src/
│       ├── server.js          ← API + static file server
│       └── db.js              ← Database connection
└── public/                    ← Built frontend (served automatically)
    ├── index.html
    └── assets/
```

---

## Troubleshooting

| Problem | Solution |
|---------|----------|
| `ELOGIN` error | Check `DB_USER` and `DB_PASSWORD` in `backend\.env`. Make sure SQL Server Authentication is enabled for the `sa` user. |
| Port 4000 already in use | Change `PORT=4000` in `backend\.env` to another port (e.g., 3000). Update `start.bat` browser URL accordingly. |
| `node` is not recognized | Install Node.js from https://nodejs.org and restart your computer. |
| Database not found | Execute `pdpo_mssql_schema.sql` in SSMS first. |
