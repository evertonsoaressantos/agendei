/*
  # Criar tabela de métricas de agendamentos

  1. Nova Tabela
    - `appointment_metrics`
      - `id` (uuid, primary key)
      - `date` (date, unique)
      - `daily_total` (integer) - Total de agendamentos do dia
      - `moving_average` (decimal) - Média móvel dos últimos 30 dias
      - `percentage_variation` (decimal) - Variação percentual em relação à média
      - `created_at` (timestamp)
      - `updated_at` (timestamp)
      - `user_id` (uuid, foreign key)

  2. Segurança
    - Enable RLS na tabela `appointment_metrics`
    - Adicionar políticas para usuários autenticados lerem/escreverem seus próprios dados

  3. Índices
    - Índice na coluna `date` para consultas rápidas
    - Índice na coluna `user_id` para filtros por usuário
*/

CREATE TABLE IF NOT EXISTS appointment_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  date date NOT NULL,
  daily_total integer NOT NULL DEFAULT 0,
  moving_average decimal(10,2),
  percentage_variation decimal(10,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  UNIQUE(date, user_id)
);

ALTER TABLE appointment_metrics ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can read own appointment metrics"
  ON appointment_metrics
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own appointment metrics"
  ON appointment_metrics
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own appointment metrics"
  ON appointment_metrics
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Índices para performance
CREATE INDEX IF NOT EXISTS idx_appointment_metrics_date ON appointment_metrics(date);
CREATE INDEX IF NOT EXISTS idx_appointment_metrics_user_id ON appointment_metrics(user_id);
CREATE INDEX IF NOT EXISTS idx_appointment_metrics_date_user ON appointment_metrics(date, user_id);

-- Trigger para atualizar updated_at
CREATE OR REPLACE FUNCTION update_appointment_metrics_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_appointment_metrics_updated_at_trigger
  BEFORE UPDATE ON appointment_metrics
  FOR EACH ROW
  EXECUTE FUNCTION update_appointment_metrics_updated_at();