-- Auto-update stock when customer orders are confirmed
-- This function will be called when order status changes to "confirmée"

-- Create function to update stock quantities
CREATE OR REPLACE FUNCTION update_stock_on_order_confirm()
RETURNS TRIGGER AS $$
DECLARE
  order_item JSONB;
  product_id_text TEXT;
  order_quantity NUMERIC;
  prm_record RECORD;
BEGIN
  -- Only proceed if status changed to "confirmée"
  IF NEW.status = 'confirmée' AND OLD.status != 'confirmée' THEN
    -- Loop through each item in the order
    FOR order_item IN SELECT jsonb_array_elements(NEW.order_items) LOOP
      product_id_text := order_item->>'product_id';
      order_quantity := (order_item->>'quantity')::NUMERIC;
      
      -- Update stock for all raw materials associated with this product
      FOR prm_record IN 
        SELECT id, quantity 
        FROM product_raw_materials 
        WHERE product_id = product_id_text
      LOOP
        UPDATE product_raw_materials 
        SET quantity = GREATEST(0, prm_record.quantity - order_quantity),
            status = CASE 
              WHEN GREATEST(0, prm_record.quantity - order_quantity) < 20 THEN 'out_of_stock'
              WHEN GREATEST(0, prm_record.quantity - order_quantity) <= 50 THEN 'low_stock'
              ELSE 'in_stock'
            END
        WHERE id = prm_record.id;
      END LOOP;
    END LOOP;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger on customer_orders
DROP TRIGGER IF EXISTS trigger_update_stock_on_confirm ON customer_orders;
CREATE TRIGGER trigger_update_stock_on_confirm
  AFTER UPDATE ON customer_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_order_confirm();

COMMENT ON FUNCTION update_stock_on_order_confirm() IS 
'Automatically decreases raw material stock when a customer order is confirmed';
