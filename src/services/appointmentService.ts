import { supabase } from '../lib/supabase';
import { Appointment } from '../types';

interface DatabaseAppointment {
  id: string;
  user_id: string;
  customer_id: number;
  service_description: string;
  appointment_date: string;
  appointment_time: string;
  status: 'pending' | 'confirmed' | 'cancelled' | 'completed';
  notes?: string;
  created_at: string;
  updated_at: string;
}

export class AppointmentService {
  private static instance: AppointmentService;
  private isDemo = false;

  constructor() {
    this.checkSupabaseAvailability();
  }

  static getInstance(): AppointmentService {
    if (!AppointmentService.instance) {
      AppointmentService.instance = new AppointmentService();
    }
    return AppointmentService.instance;
  }

  private async checkSupabaseAvailability() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    this.isDemo = !supabaseUrl || !supabaseKey || 
      supabaseUrl === 'https://your-project.supabase.co' || 
      supabaseKey === 'your-anon-key';

    if (this.isDemo) {
      console.warn('AppointmentService: Supabase não configurado, usando modo demo');
    } else {
      console.log('AppointmentService: Conectado ao Supabase');
      // Test connection
      try {
        const { error } = await supabase.from('appointments').select('count', { count: 'exact', head: true });
        if (error) {
          console.error('AppointmentService: Erro ao conectar com Supabase:', error);
          this.isDemo = true;
        }
      } catch (err) {
        console.error('AppointmentService: Falha na conexão com Supabase:', err);
        this.isDemo = true;
      }
    }
  }

  /**
   * Converte agendamento do banco para formato da aplicação
   */
  private convertFromDatabase(dbAppointment: DatabaseAppointment): Appointment {
    const appointmentDateTime = new Date(`${dbAppointment.appointment_date}T${dbAppointment.appointment_time}`);
    
    return {
      id: dbAppointment.id,
      clientId: dbAppointment.customer_id.toString(),
      clientName: '', // Será preenchido quando buscarmos os dados do cliente
      clientPhone: '', // Será preenchido quando buscarmos os dados do cliente
      serviceId: 'service-1', // Valor padrão, pode ser melhorado
      serviceName: dbAppointment.service_description,
      date: appointmentDateTime,
      duration: 60, // Valor padrão
      status: dbAppointment.status,
      notes: dbAppointment.notes,
      createdAt: new Date(dbAppointment.created_at),
      whatsappSent: false
    };
  }

  /**
   * Converte agendamento da aplicação para formato do banco
   */
  private convertToDatabase(appointment: Omit<Appointment, 'id' | 'createdAt'>, customerId: number): Omit<DatabaseAppointment, 'id' | 'created_at' | 'updated_at'> {
    return {
      user_id: '', // Será preenchido no método de criação
      customer_id: customerId,
      service_description: appointment.serviceName,
      appointment_date: appointment.date.toISOString().split('T')[0],
      appointment_time: appointment.date.toTimeString().split(' ')[0].substring(0, 5),
      status: appointment.status,
      notes: appointment.notes || null
    };
  }

  /**
   * Busca todos os agendamentos do usuário
   */
  async getAppointments(): Promise<Appointment[]> {
    if (this.isDemo) {
      console.log('AppointmentService: Modo demo - retornando dados do localStorage');
      return this.getAppointmentsFromLocalStorage();
    }

    try {
      console.log('AppointmentService: Buscando agendamentos do banco...');
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('AppointmentService: Usuário não autenticado');
        return this.getAppointmentsFromLocalStorage();
      }

      const { data, error } = await supabase
        .from('appointments')
        .select(`
          *,
          customers (
            first_name,
            last_name,
            phone_number
          )
        `)
        .eq('user_id', user.id)
        .order('appointment_date', { ascending: true })
        .order('appointment_time', { ascending: true });

      if (error) {
        console.error('AppointmentService: Erro ao buscar agendamentos:', error);
        return this.getAppointmentsFromLocalStorage();
      }

      console.log('AppointmentService: Agendamentos encontrados:', data?.length || 0);

      // Converter dados do banco para formato da aplicação
      const appointments = (data || []).map(item => {
        const appointment = this.convertFromDatabase(item);
        
        // Preencher dados do cliente se disponível
        if (item.customers) {
          appointment.clientName = `${item.customers.first_name} ${item.customers.last_name}`;
          appointment.clientPhone = item.customers.phone_number || '';
        }
        
        return appointment;
      });

      // Salvar no localStorage como backup
      this.saveAppointmentsToLocalStorage(appointments);
      
      return appointments;
    } catch (error) {
      console.error('AppointmentService: Erro ao buscar agendamentos:', error);
      return this.getAppointmentsFromLocalStorage();
    }
  }

  /**
   * Cria um novo agendamento
   */
  async createAppointment(appointmentData: Omit<Appointment, 'id' | 'createdAt'>, customerId: number): Promise<Appointment> {
    if (this.isDemo) {
      console.log('AppointmentService: Modo demo - salvando no localStorage');
      return this.createAppointmentInLocalStorage(appointmentData);
    }

    try {
      console.log('AppointmentService: Criando agendamento no banco...', appointmentData);
      
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('AppointmentService: Usuário não autenticado');
        throw new Error('Usuário não autenticado');
      }

      const dbData = this.convertToDatabase(appointmentData, customerId);
      dbData.user_id = user.id;

      const { data, error } = await supabase
        .from('appointments')
        .insert([dbData])
        .select(`
          *,
          customers (
            first_name,
            last_name,
            phone_number
          )
        `)
        .single();

      if (error) {
        console.error('AppointmentService: Erro ao criar agendamento:', error);
        throw error;
      }

      console.log('AppointmentService: Agendamento criado com sucesso:', data);

      const appointment = this.convertFromDatabase(data);
      
      // Preencher dados do cliente
      if (data.customers) {
        appointment.clientName = `${data.customers.first_name} ${data.customers.last_name}`;
        appointment.clientPhone = data.customers.phone_number || '';
      }

      // Atualizar localStorage
      const appointments = await this.getAppointmentsFromLocalStorage();
      appointments.push(appointment);
      this.saveAppointmentsToLocalStorage(appointments);

      return appointment;
    } catch (error) {
      console.error('AppointmentService: Erro ao criar agendamento:', error);
      
      // Fallback para localStorage
      console.log('AppointmentService: Fallback - salvando no localStorage');
      return this.createAppointmentInLocalStorage(appointmentData);
    }
  }

  /**
   * Atualiza um agendamento existente
   */
  async updateAppointment(appointmentId: string, updates: Partial<Appointment>): Promise<Appointment> {
    if (this.isDemo) {
      console.log('AppointmentService: Modo demo - atualizando no localStorage');
      return this.updateAppointmentInLocalStorage(appointmentId, updates);
    }

    try {
      console.log('AppointmentService: Atualizando agendamento no banco...', appointmentId, updates);
      
      const updateData: any = {};
      
      if (updates.date) {
        updateData.appointment_date = updates.date.toISOString().split('T')[0];
        updateData.appointment_time = updates.date.toTimeString().split(' ')[0].substring(0, 5);
      }
      
      if (updates.status) {
        updateData.status = updates.status;
      }
      
      if (updates.notes !== undefined) {
        updateData.notes = updates.notes;
      }
      
      if (updates.serviceName) {
        updateData.service_description = updates.serviceName;
      }

      updateData.updated_at = new Date().toISOString();

      const { data, error } = await supabase
        .from('appointments')
        .update(updateData)
        .eq('id', appointmentId)
        .select(`
          *,
          customers (
            first_name,
            last_name,
            phone_number
          )
        `)
        .single();

      if (error) {
        console.error('AppointmentService: Erro ao atualizar agendamento:', error);
        throw error;
      }

      console.log('AppointmentService: Agendamento atualizado com sucesso:', data);

      const appointment = this.convertFromDatabase(data);
      
      // Preencher dados do cliente
      if (data.customers) {
        appointment.clientName = `${data.customers.first_name} ${data.customers.last_name}`;
        appointment.clientPhone = data.customers.phone_number || '';
      }

      // Atualizar localStorage
      this.updateAppointmentInLocalStorage(appointmentId, updates);

      return appointment;
    } catch (error) {
      console.error('AppointmentService: Erro ao atualizar agendamento:', error);
      
      // Fallback para localStorage
      console.log('AppointmentService: Fallback - atualizando no localStorage');
      return this.updateAppointmentInLocalStorage(appointmentId, updates);
    }
  }

  /**
   * Exclui um agendamento
   */
  async deleteAppointment(appointmentId: string): Promise<void> {
    if (this.isDemo) {
      console.log('AppointmentService: Modo demo - excluindo do localStorage');
      this.deleteAppointmentFromLocalStorage(appointmentId);
      return;
    }

    try {
      console.log('AppointmentService: Excluindo agendamento do banco...', appointmentId);
      
      const { error } = await supabase
        .from('appointments')
        .delete()
        .eq('id', appointmentId);

      if (error) {
        console.error('AppointmentService: Erro ao excluir agendamento:', error);
        throw error;
      }

      console.log('AppointmentService: Agendamento excluído com sucesso');

      // Atualizar localStorage
      this.deleteAppointmentFromLocalStorage(appointmentId);
    } catch (error) {
      console.error('AppointmentService: Erro ao excluir agendamento:', error);
      
      // Fallback para localStorage
      console.log('AppointmentService: Fallback - excluindo do localStorage');
      this.deleteAppointmentFromLocalStorage(appointmentId);
    }
  }

  // Métodos para localStorage (fallback e demo)
  private getAppointmentsFromLocalStorage(): Appointment[] {
    try {
      const saved = localStorage.getItem('appointments');
      if (saved) {
        const parsed = JSON.parse(saved);
        return parsed.map((apt: any) => ({
          ...apt,
          date: new Date(apt.date),
          createdAt: new Date(apt.createdAt)
        }));
      }
    } catch (error) {
      console.error('AppointmentService: Erro ao carregar do localStorage:', error);
    }
    return [];
  }

  private saveAppointmentsToLocalStorage(appointments: Appointment[]): void {
    try {
      localStorage.setItem('appointments', JSON.stringify(appointments));
      console.log('AppointmentService: Agendamentos salvos no localStorage:', appointments.length);
    } catch (error) {
      console.error('AppointmentService: Erro ao salvar no localStorage:', error);
    }
  }

  private createAppointmentInLocalStorage(appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Appointment {
    const newAppointment: Appointment = {
      ...appointmentData,
      id: `apt_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      createdAt: new Date()
    };
    
    const appointments = this.getAppointmentsFromLocalStorage();
    appointments.push(newAppointment);
    this.saveAppointmentsToLocalStorage(appointments);
    
    return newAppointment;
  }

  private updateAppointmentInLocalStorage(appointmentId: string, updates: Partial<Appointment>): Appointment {
    const appointments = this.getAppointmentsFromLocalStorage();
    const index = appointments.findIndex(apt => apt.id === appointmentId);
    
    if (index === -1) {
      throw new Error('Agendamento não encontrado');
    }
    
    appointments[index] = { ...appointments[index], ...updates };
    this.saveAppointmentsToLocalStorage(appointments);
    
    return appointments[index];
  }

  private deleteAppointmentFromLocalStorage(appointmentId: string): void {
    const appointments = this.getAppointmentsFromLocalStorage();
    const filtered = appointments.filter(apt => apt.id !== appointmentId);
    this.saveAppointmentsToLocalStorage(filtered);
  }
}