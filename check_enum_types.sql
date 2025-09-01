-- Check what enum types exist in the database
-- Run this first to find the correct enum type name

-- List all enum types in the database
SELECT t.typname AS enum_name, e.enumlabel AS enum_value
FROM pg_type t 
JOIN pg_enum e ON t.oid = e.enumtypid  
JOIN pg_catalog.pg_namespace n ON n.oid = t.typnamespace
WHERE n.nspname = 'public'
ORDER BY t.typname, e.enumsortorder;

-- Check the structure of the chat_messages table
SELECT column_name, data_type, udt_name
FROM information_schema.columns 
WHERE table_name = 'chat_messages' 
AND column_name = 'message_type'; 