/*
  # Optimize customers table with performance indexes

  1. Performance Indexes
    - Email and user lookup optimization
    - Search optimization for names
    - Status-based filtering
    - Country-based filtering
    - Created date range queries

  2. Query Performance
    - Composite indexes for common query patterns
    - Single column indexes for filtering
*/

-- Create optimized indexes for customers table
CREATE INDEX IF NOT EXISTS idx_customers_email_user 
  ON customers (email, user_id);

CREATE INDEX IF NOT EXISTS idx_customers_user_id 
  ON customers (user_id);

CREATE INDEX IF NOT EXISTS idx_customers_email 
  ON customers (email);

CREATE INDEX IF NOT EXISTS idx_customers_status 
  ON customers (status);

CREATE INDEX IF NOT EXISTS idx_customers_country 
  ON customers (country);

CREATE INDEX IF NOT EXISTS idx_customers_created_at 
  ON customers (created_at);

-- Composite index for name searches (first_name + last_name)
CREATE INDEX IF NOT EXISTS idx_customers_full_name 
  ON customers (first_name, last_name);

-- Index for phone number lookups
CREATE INDEX IF NOT EXISTS idx_customers_phone 
  ON customers (phone_number) WHERE phone_number IS NOT NULL;

-- Partial index for active customers only (most common queries)
CREATE INDEX IF NOT EXISTS idx_customers_active_user 
  ON customers (user_id, created_at) WHERE status = 'active';