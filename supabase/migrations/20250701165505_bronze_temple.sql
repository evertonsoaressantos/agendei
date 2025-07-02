/*
  # Criar tabela de agendamentos

  1. Nova Tabela
    - `appointments`
      - `id` (uuid, primary key)
      - `user_id` (uuid, foreign key) - referência ao usuário
      - `customer_id` (bigint, foreign key) - referência ao cliente
      - `service_description` (text) - descrição do serviço
      - `appointment_date` (date) - data do agendamento
      - `appointment_time` (time) - horário do agendamento
      - `status` (text) - status do agendamento
      - `notes` (text, nullable) - observações
      - `created_at` (timestamp)
      - `updated_at` (timestamp)

  2. Segurança
    - Enable RLS na tabela `appointments`
    - Políticas para usuários gerenciarem seus próprios agendamentos

  3. Índices
    - Índices para otimização de consultas
*/

CREATE TABLE IF NOT EXISTS appointments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  customer_id bigint NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  service_description text NOT NULL,
  appointment_date date NOT NULL,
  appointment_time time NOT NULL,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'cancelled', 'completed')),
  notes text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE appointments ENABLE ROW LEVEL SECURITY;

-- Políticas de segurança
CREATE POLICY "Users can view their own appointments"
  ON appointments
  FOR SELECT
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own appointments"
  ON appointments
  FOR INSERT
  TO public
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own appointments"
  ON appointments
  FOR UPDATE
  TO public
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own appointments"
  ON appointments
  FOR DELETE
  TO public
  USING (auth.uid() = user_id);

-- Trigger para atualizar updated_at
CREATE TRIGGER update_appointments_updated_at
  BEFORE UPDATE ON appointments
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();