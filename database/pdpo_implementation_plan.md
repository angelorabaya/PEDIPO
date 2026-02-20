Key Features of the Schema:
Master Data: Tables for municipalities (categories), suppliers, and products.

Inventory Management: A dedicated inventory table to track current stock levels.

Sales Tracking: A sales table to record every transaction, with a calculated total_amount field.

Stock Movements (Incoming/Adjustments): A stock_movements table designed for your "additional stocks" form. It supports types like 'IN' (restock), 'OUT', and 'ADJUSTMENT'.

Automation: Includes SQL triggers that automatically update the inventory levels whenever a sale or a stock movement is recorded.