/*
  # Customer Management System Database Schema

  1. New Tables
    - `customers`
      - `customer_id` (bigint, primary key, auto-increment)
      - `first_name` (varchar(50), required)
      - `last_name` (varchar(50), required)
      - `email` (varchar(100), required, unique)
      - `phone_number` (varchar(20))
      - `address` (varchar(200))
      - `city` (varchar(100))
      - `state_province` (varchar(100))
      - `postal_code` (varchar(20))
      - `country` (varchar(100))
      - `created_at` (timestamp, default now)
      - `updated_at` (timestamp, default now)
      - `status` (enum: active/inactive, default active)

  2. Security
    - Enable RLS on `customers` table
    - Add policies for authenticated users to manage their customers
    - Add indexes for performance optimization

  3. Audit Log
    - `customer_audit_log` table for tracking changes
*/

-- Create enum type for customer status
DO $$ BEGIN
  CREATE TYPE customer_status AS ENUM ('active', 'inactive');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- Create customers table
CREATE TABLE IF NOT EXISTS customers (
  customer_id BIGSERIAL PRIMARY KEY,
  first_name VARCHAR(50) NOT NULL,
  last_name VARCHAR(50) NOT NULL,
  email VARCHAR(100) NOT NULL UNIQUE,
  phone_number VARCHAR(20),
  address VARCHAR(200),
  city VARCHAR(100),
  state_province VARCHAR(100),
  postal_code VARCHAR(20),
  country VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status customer_status DEFAULT 'active',
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE
);

-- Create customer audit log table
CREATE TABLE IF NOT EXISTS customer_audit_log (
  audit_id BIGSERIAL PRIMARY KEY,
  customer_id BIGINT REFERENCES customers(customer_id) ON DELETE CASCADE,
  action VARCHAR(20) NOT NULL, -- INSERT, UPDATE, DELETE
  old_values JSONB,
  new_values JSONB,
  changed_by UUID REFERENCES auth.users(id),
  changed_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);
CREATE INDEX IF NOT EXISTS idx_customers_status ON customers(status);
CREATE INDEX IF NOT EXISTS idx_customers_country ON customers(country);
CREATE INDEX IF NOT EXISTS idx_customers_created_at ON customers(created_at);
CREATE INDEX IF NOT EXISTS idx_customers_user_id ON customers(user_id);
CREATE INDEX IF NOT EXISTS idx_customer_audit_log_customer_id ON customer_audit_log(customer_id);

-- Enable RLS
ALTER TABLE customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE customer_audit_log ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for customers
CREATE POLICY "Users can read own customers"
  ON customers
  FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert own customers"
  ON customers
  FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own customers"
  ON customers
  FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid())
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete own customers"
  ON customers
  FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Create RLS policies for audit log
CREATE POLICY "Users can read own customer audit logs"
  ON customer_audit_log
  FOR SELECT
  TO authenticated
  USING (changed_by = auth.uid());

CREATE POLICY "System can insert audit logs"
  ON customer_audit_log
  FOR INSERT
  TO authenticated
  WITH CHECK (changed_by = auth.uid());

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_customers_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at
DROP TRIGGER IF EXISTS update_customers_updated_at_trigger ON customers;
CREATE TRIGGER update_customers_updated_at_trigger
  BEFORE UPDATE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION update_customers_updated_at();

-- Create function for audit logging
CREATE OR REPLACE FUNCTION log_customer_changes()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO customer_audit_log (customer_id, action, new_values, changed_by)
    VALUES (NEW.customer_id, 'INSERT', to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    INSERT INTO customer_audit_log (customer_id, action, old_values, new_values, changed_by)
    VALUES (NEW.customer_id, 'UPDATE', to_jsonb(OLD), to_jsonb(NEW), auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    INSERT INTO customer_audit_log (customer_id, action, old_values, changed_by)
    VALUES (OLD.customer_id, 'DELETE', to_jsonb(OLD), auth.uid());
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create audit trigger
DROP TRIGGER IF EXISTS customer_audit_trigger ON customers;
CREATE TRIGGER customer_audit_trigger
  AFTER INSERT OR UPDATE OR DELETE ON customers
  FOR EACH ROW
  EXECUTE FUNCTION log_customer_changes();