-- Enable Supabase Realtime for inventory_items
-- Required for useRealtimeInventory hook (postgres_changes subscription)
ALTER PUBLICATION supabase_realtime ADD TABLE inventory_items;
