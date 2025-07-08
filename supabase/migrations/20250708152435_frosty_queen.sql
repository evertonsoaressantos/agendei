/*
  # Criar tabelas para onboarding de profissionais da beleza

  1. Novas Tabelas
    - `user_profile`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para auth.users)
      - `company_name` (text, nome da empresa)
      - `business_type` (text, ramo de atuação)
      - `onboarding_completed` (boolean, se completou o onboarding)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
    
    - `user_services`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key para auth.users)
      - `service_name` (text, nome do serviço)
      - `price` (numeric, preço do serviço)
      - `duration_minutes` (integer, duração em minutos)
      - `is_active` (boolean, se o serviço está ativo)
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Habilitar RLS em ambas as tabelas
    - Políticas para usuários acessarem apenas seus próprios dados

  3. Índices
    - Índices para otimizar consultas por user_id
*/

-- Criar função para atualizar updated_at se não existir
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Tabela user_profile
CREATE TABLE IF NOT EXISTS user_profile (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name text NOT NULL,
  business_type text NOT NULL,
  onboarding_completed boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

-- Tabela user_services
CREATE TABLE IF NOT EXISTS user_services (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  service_name text NOT NULL,
  price numeric(10,2) NOT NULL CHECK (price > 0),
  duration_minutes integer NOT NULL CHECK (duration_minutes > 0),
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Habilitar RLS
ALTER TABLE user_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_services ENABLE ROW LEVEL SECURITY;

-- Políticas para user_profile
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own profile" ON user_profile;
  DROP POLICY IF EXISTS "Users can insert own profile" ON user_profile;
  DROP POLICY IF EXISTS "Users can update own profile" ON user_profile;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can read own profile"
  ON user_profile
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own profile"
  ON user_profile
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own profile"
  ON user_profile
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Políticas para user_services
DO $$ 
BEGIN
  DROP POLICY IF EXISTS "Users can read own services" ON user_services;
  DROP POLICY IF EXISTS "Users can insert own services" ON user_services;
  DROP POLICY IF EXISTS "Users can update own services" ON user_services;
  DROP POLICY IF EXISTS "Users can delete own services" ON user_services;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE POLICY "Users can read own services"
  ON user_services
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own services"
  ON user_services
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own services"
  ON user_services
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own services"
  ON user_services
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_user_profile_user_id ON user_profile(user_id);
CREATE INDEX IF NOT EXISTS idx_user_services_user_id ON user_services(user_id);
CREATE INDEX IF NOT EXISTS idx_user_services_active ON user_services(user_id, is_active);

-- Triggers para updated_at
DO $$ 
BEGIN
  DROP TRIGGER IF EXISTS update_user_profile_updated_at ON user_profile;
  DROP TRIGGER IF EXISTS update_user_services_updated_at ON user_services;
EXCEPTION
  WHEN undefined_object THEN NULL;
END $$;

CREATE TRIGGER update_user_profile_updated_at
  BEFORE UPDATE ON user_profile
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_services_updated_at
  BEFORE UPDATE ON user_services
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();