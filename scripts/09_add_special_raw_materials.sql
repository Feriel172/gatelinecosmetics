-- Sort existing raw materials by category
-- This script only sorts existing raw materials by updating their order in product_raw_materials

-- The sorting is done by the frontend (stock-tab.tsx) using this order:
-- 1. Toner pads (for toner products)
-- 2. Contour des yeux (for contour des yeux products)
-- 3. Masque (for masque products)
-- 4. Étiquette (for all products)
-- 5. Others (alphabetically)

-- No database changes needed - the sorting is handled in frontend
-- This script is kept for reference only

SELECT 'Sorting is handled in stock-tab.tsx frontend code' AS note;
