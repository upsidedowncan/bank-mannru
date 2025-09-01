-- Add market item columns to chat_messages table
-- Run this in your Supabase SQL editor

-- Add the market item columns to the chat_messages table
ALTER TABLE chat_messages 
ADD COLUMN IF NOT EXISTS market_item_id UUID REFERENCES marketplace_items(id),
ADD COLUMN IF NOT EXISTS market_item_title TEXT,
ADD COLUMN IF NOT EXISTS market_item_price DECIMAL(10,2),
ADD COLUMN IF NOT EXISTS market_item_currency TEXT DEFAULT 'MR',
ADD COLUMN IF NOT EXISTS market_item_image TEXT; 