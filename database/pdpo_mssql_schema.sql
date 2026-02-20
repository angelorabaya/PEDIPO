-- 1. Create Database
IF NOT EXISTS (SELECT * FROM sys.databases WHERE name = 'inventory_db')
BEGIN
    CREATE DATABASE inventory_db;
END
GO

USE inventory_db;
GO

-- Drop triggers if they exist (standard T-SQL cleanup)
IF OBJECT_ID('after_sale_insert', 'TR') IS NOT NULL DROP TRIGGER after_sale_insert;
IF OBJECT_ID('after_sale_delete', 'TR') IS NOT NULL DROP TRIGGER after_sale_delete;
IF OBJECT_ID('after_stock_movement_insert', 'TR') IS NOT NULL DROP TRIGGER after_stock_movement_insert;
IF OBJECT_ID('after_stock_movement_delete', 'TR') IS NOT NULL DROP TRIGGER after_stock_movement_delete;
GO

-- 2. Municipalities / Categories
CREATE TABLE municipalities (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(100) NOT NULL UNIQUE
);

-- 3. Suppliers
CREATE TABLE suppliers (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    contact_person NVARCHAR(100),
    phone_number NVARCHAR(20),
    address NVARCHAR(MAX) -- TEXT in MySQL is NVARCHAR(MAX) in SQL Server
);

-- 4. Products (Master Data)
CREATE TABLE products (
    id INT IDENTITY(1,1) PRIMARY KEY,
    name NVARCHAR(255) NOT NULL,
    municipality_id INT,
    supplier_id INT,
    unit_price DECIMAL(10, 2) DEFAULT 0.00,
    is_consignment BIT DEFAULT 0, -- MySQL TINYINT(1) -> SQL BIT
    remarks NVARCHAR(MAX),
    created_at DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Product_Municipality FOREIGN KEY (municipality_id) REFERENCES municipalities(id) ON DELETE SET NULL,
    CONSTRAINT FK_Product_Supplier FOREIGN KEY (supplier_id) REFERENCES suppliers(id) ON DELETE SET NULL
);

-- 5. Inventory (Current stock levels)
CREATE TABLE inventory (
    product_id INT PRIMARY KEY,
    quantity_on_hand INT NOT NULL DEFAULT 0,
    last_updated DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Inventory_Product FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 6. Sales (Transaction Records)
CREATE TABLE sales (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    quantity INT NOT NULL,
    unit_price DECIMAL(10, 2) NOT NULL,
    -- Computed column syntax for SQL Server
    total_amount AS (quantity * unit_price) PERSISTED, 
    sale_date DATETIME2 DEFAULT GETDATE(),
    CONSTRAINT FK_Sales_Product FOREIGN KEY (product_id) REFERENCES products(id)
);

-- 7. Stock Movements
CREATE TABLE stock_movements (
    id INT IDENTITY(1,1) PRIMARY KEY,
    product_id INT NOT NULL,
    -- SQL Server doesn't have native ENUM; we use CHECK constraints
    movement_type NVARCHAR(20) CHECK (movement_type IN ('IN', 'OUT', 'ADJUSTMENT', 'RETURN')) NOT NULL,
    quantity INT NOT NULL,
    payment_status NVARCHAR(20) DEFAULT 'N/A' CHECK (payment_status IN ('Paid', 'Consignment', 'COD', 'Payable', 'N/A')),
    movement_date DATETIME2 DEFAULT GETDATE(),
    remarks NVARCHAR(MAX),
    CONSTRAINT FK_Stock_Product FOREIGN KEY (product_id) REFERENCES products(id)
);
GO

-- 8. TRIGGERS
-- In SQL Server, triggers handle batches (the 'inserted' table can have multiple rows)

-- Deduct inventory on sale insert
CREATE TRIGGER after_sale_insert
ON sales
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE i
    SET i.quantity_on_hand = i.quantity_on_hand - ins.quantity,
        i.last_updated = GETDATE()
    FROM inventory i
    JOIN inserted ins ON i.product_id = ins.product_id;
END;
GO

-- Restore inventory on sale delete
CREATE TRIGGER after_sale_delete
ON sales
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE i
    SET i.quantity_on_hand = i.quantity_on_hand + del.quantity,
        i.last_updated = GETDATE()
    FROM inventory i
    JOIN deleted del ON i.product_id = del.product_id;
END;
GO

-- Update inventory on stock movement insert (Upsert logic)
CREATE TRIGGER after_stock_movement_insert
ON stock_movements
AFTER INSERT
AS
BEGIN
    SET NOCOUNT ON;
    
    MERGE inventory AS target
    USING (
        SELECT 
            product_id,
            CASE 
                WHEN movement_type IN ('IN', 'RETURN') THEN quantity
                WHEN movement_type IN ('OUT', 'ADJUSTMENT') THEN -quantity
                ELSE 0 
            END as movement_qty
        FROM inserted
    ) AS source
    ON (target.product_id = source.product_id)
    WHEN MATCHED THEN
        UPDATE SET 
            target.quantity_on_hand = target.quantity_on_hand + source.movement_qty,
            target.last_updated = GETDATE()
    WHEN NOT MATCHED THEN
        INSERT (product_id, quantity_on_hand, last_updated)
        VALUES (source.product_id, source.movement_qty, GETDATE());
END;
GO

-- Reverse inventory on stock movement delete
CREATE TRIGGER after_stock_movement_delete
ON stock_movements
AFTER DELETE
AS
BEGIN
    SET NOCOUNT ON;
    UPDATE i
    SET i.quantity_on_hand = i.quantity_on_hand - (
        CASE 
            WHEN del.movement_type IN ('IN', 'RETURN') THEN del.quantity
            WHEN del.movement_type IN ('OUT', 'ADJUSTMENT') THEN -del.quantity
            ELSE 0 
        END),
        i.last_updated = GETDATE()
    FROM inventory i
    JOIN deleted del ON i.product_id = del.product_id;
END;
GO

-- 9. Sample Data Inserter
-- SQL Server doesn't support INSERT IGNORE; we use a WHERE NOT EXISTS pattern
INSERT INTO municipalities (name)
SELECT name FROM (VALUES 
('Gingoog City'), ('Medina'), ('Claveria'), ('Villanueva'),
('Tagoloan'), ('Balingoan'), ('Laguindingan'), ('Opol'),
('Naawan'), ('Lagonglong'), ('Balingasag'), ('Initao'),
('El Salvador'), ('Gitagum'), ('Alubijid'), ('Jasaan'),
('Libertad'), ('Magsaysay'), ('Talisayan')) AS v(name)
WHERE NOT EXISTS (SELECT 1 FROM municipalities WHERE name = v.name);
GO

CREATE OR ALTER VIEW view_inventory_report AS
SELECT 
    m.name AS municipality,
    p.name AS product_name,
    ISNULL(i.quantity_on_hand, 0) AS quantity_on_hand,
    p.unit_price,
    (ISNULL(i.quantity_on_hand, 0) * p.unit_price) AS total_value
FROM products p
JOIN municipalities m ON p.municipality_id = m.id
LEFT JOIN inventory i ON p.id = i.product_id;
GO
