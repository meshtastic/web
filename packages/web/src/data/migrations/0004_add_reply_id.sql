-- Add replyId column to messages table for reply support
ALTER TABLE messages ADD COLUMN reply_id INTEGER;
