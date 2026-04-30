# TODO: Completed - Stock & Packaging Features

## Completed Features:

### Stock Section:
- [x] Stock tab added BEFORE Settings in navigation
- [x] Table displays: Raw Material | Product | Quantity | Status
- [x] Product filter dropdown
- [x] Status colors: Green (In Stock), Yellow (Low Stock), Red (Out of Stock)
- [x] Add/Edit quantity functionality
- [x] Summary cards showing stock counts
- [x] Database columns: quantity & status in product_raw_materials

### Special Raw Materials:
- [x] Étiquette: automatically assigned to ALL products (every product has a label)
- [x] Flacon Masque: automatically assigned to mask products

### Scripts:
- scripts/07_add_stock_quantity.sql: Add quantity & status columns
- scripts/08_add_product_packaging.sql: Add packaging columns to products (flacon, masque, etiquette)
- scripts/09_add_special_raw_materials.sql: Auto-assign special raw materials to products
