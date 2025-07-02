import React, { createContext, useContext, useState, useEffect } from 'react';
import { Appointment, Client, Service } from '../types';
import { CustomerService } from '../services/customerService';
import { AppointmentService } from '../services/appointmentService';
import { AppointmentMetricsService } from '../services/appointmentMetricsService';
import { useAuth } from './AuthContext';

interface AppContextType {
  appointments: Appointment[];
  clients: Client[];
  services: Service[];
  customerCount: number;
  todayVariation: number;
  loading: boolean;
  addAppointment: (appointment: Omit<Appointment, 'id' | 'createdAt'>) => Promise<boolean>;
  updateAppointment: (id: string, updates: Partial<Appointment>) => Promise<boolean>;
  deleteAppointment: (id: string) => Promise<boolean>;
  addClient: (client: Omit<Client, 'id' | 'createdAt'>) => void;
  sendWhatsAppMessage: (appointment: Appointment) => void;
  refreshCustomerCount: () => Promise<void>;
  refreshTodayVariation: () => Promise<void>;
  refreshAppointments: () => Promise<void>;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

// Mock data for services (these are business logic, not customer data)
const mockServices: Service[] = [
  { id: '1', name: 'Limpeza de Pele', duration: 60, price: 150, description: 'Limpeza profunda facial' },
  { id: '2', name: 'Massagem Relaxante', duration: 90, price: 200, description: 'Massagem corporal completa' },
  { id: '3', name: 'Tratamento Capilar', duration: 120, price: 180, description: 'Hidratação e reconstrução capilar' },
  { id: '4', name: 'Manicure', duration: 45, price: 50, description: 'Cuidados com as unhas das mãos' },
  { id: '5', name: 'Pedicure', duration: 60, price: 60, description: 'Cuidados com as unhas dos pés' },
];

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [services] = useState<Service[]>(mockServices);
  const [customerCount, setCustomerCount] = useState<number>(0);
  const [todayVariation, setTodayVariation] = useState<number>(0);
  const [loading, setLoading] = useState(true);

  const { isAuthenticated } = useAuth();
  const customerService = CustomerService.getInstance();
  const appointmentService = AppointmentService.getInstance();
  const metricsService = AppointmentMetricsService.getInstance();

  // Load initial data when authenticated
  useEffect(() => {
    if (isAuthenticated) {
      loadInitialData();
    } else {
      setLoading(false);
    }
  }, [isAuthenticated]);

  const loadInitialData = async () => {
    try {
      setLoading(true);
      console.log('AppContext: Carregando dados iniciais...');

      // Load appointments from database/localStorage
      await refreshAppointments();
      
      // Load clients from localStorage
      loadClientsFromLocalStorage();
      
      // Load customer count and metrics
      await Promise.all([
        refreshCustomerCount(),
        refreshTodayVariation()
      ]);

      console.log('AppContext: Dados iniciais carregados com sucesso');
    } catch (error) {
      console.error('AppContext: Erro ao carregar dados iniciais:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAppointments = async () => {
    try {
      console.log('AppContext: Atualizando agendamentos...');
      const appointmentsData = await appointmentService.getAppointments();
      setAppointments(appointmentsData);
      console.log('AppContext: Agendamentos atualizados:', appointmentsData.length);
    } catch (error) {
      console.error('AppContext: Erro ao atualizar agendamentos:', error);
    }
  };

  const loadClientsFromLocalStorage = () => {
    try {
      const savedClients = localStorage.getItem('clients');
      if (savedClients) {
        const parsed = JSON.parse(savedClients);
        const clientsWithDates = parsed.map((client: any) => ({
          ...client,
          createdAt: new Date(client.createdAt)
        }));
        setClients(clientsWithDates);
        console.log('AppContext: Clientes carregados do localStorage:', clientsWithDates.length);
      }
    } catch (error) {
      console.error('AppContext: Erro ao carregar clientes do localStorage:', error);
    }
  };

  // Save clients to localStorage whenever clients change
  useEffect(() => {
    try {
      localStorage.setItem('clients', JSON.stringify(clients));
      console.log('AppContext: Clientes salvos no localStorage:', clients.length);
    } catch (error) {
      console.error('AppContext: Erro ao salvar clientes no localStorage:', error);
    }
  }, [clients]);

  const refreshCustomerCount = async () => {
    if (!isAuthenticated) {
      console.log('AppContext: User not authenticated, skipping customer count refresh');
      return;
    }

    try {
      const count = await customerService.getCustomerCount();
      setCustomerCount(count);
      console.log('AppContext: Customer count updated:', count);
    } catch (error) {
      console.error('AppContext: Error refreshing customer count:', error);
      setCustomerCount(0);
    }
  };

  const refreshTodayVariation = async () => {
    if (!isAuthenticated) {
      console.log('AppContext: User not authenticated, skipping today variation refresh');
      return;
    }

    try {
      const variation = await metricsService.getTodayVariation(appointments);
      setTodayVariation(variation);
      console.log('AppContext: Today variation updated:', variation);
    } catch (error) {
      console.error('AppContext: Error refreshing today variation:', error);
      setTodayVariation(0);
    }
  };

  const addAppointment = async (appointmentData: Omit<Appointment, 'id' | 'createdAt'>): Promise<boolean> => {
    try {
      console.log('AppContext: Adicionando novo agendamento...', appointmentData);

      // First, try to find or create customer in database
      let customerId: number | null = null;
      
      try {
        // Try to create customer in database
        const nameParts = appointmentData.clientName.trim().split(' ');
        const firstName = nameParts[0];
        const lastName = nameParts.slice(1).join(' ') || firstName;
        
        const customerData = {
          first_name: firstName,
          last_name: lastName,
          email: `${firstName.toLowerCase()}${Date.now()}@temp.com`, // Temporary email
          phone_number: appointmentData.clientPhone.trim(),
          address: '',
          city: '',
          state_province: '',
          postal_code: '',
          country: '',
          status: 'active' as const
        };

        const customer = await customerService.createCustomer(customerData);
        customerId = customer.customer_id;
        console.log('AppContext: Cliente criado no banco:', customerId);
        
        // Refresh customer count
        await refreshCustomerCount();
      } catch (customerError) {
        console.warn('AppContext: Erro ao criar cliente no banco, usando ID temporário:', customerError);
        customerId = Date.now(); // Use timestamp as temporary ID
      }

      // Create appointment
      const appointment = await appointmentService.createAppointment(appointmentData, customerId!);
      
      // Update local state
      setAppointments(prev => {
        const updated = [...prev, appointment];
        console.log('AppContext: Agendamento adicionado ao estado local:', appointment.id);
        return updated;
      });

      // Add client to local list if not exists
      addClient({
        name: appointmentData.clientName,
        phone: appointmentData.clientPhone,
        email: undefined
      });

      // Refresh metrics
      if (isAuthenticated) {
        await refreshTodayVariation();
      }

      console.log('AppContext: Agendamento criado com sucesso:', appointment.id);
      return true;
    } catch (error) {
      console.error('AppContext: Erro ao adicionar agendamento:', error);
      return false;
    }
  };

  const updateAppointment = async (id: string, updates: Partial<Appointment>): Promise<boolean> => {
    try {
      console.log('AppContext: Atualizando agendamento...', id, updates);
      
      const updatedAppointment = await appointmentService.updateAppointment(id, updates);
      
      setAppointments(prev => {
        const updated = prev.map(apt => apt.id === id ? { ...apt, ...updates } : apt);
        console.log('AppContext: Agendamento atualizado no estado local:', id);
        return updated;
      });

      console.log('AppContext: Agendamento atualizado com sucesso:', id);
      return true;
    } catch (error) {
      console.error('AppContext: Erro ao atualizar agendamento:', error);
      return false;
    }
  };

  const deleteAppointment = async (id: string): Promise<boolean> => {
    try {
      console.log('AppContext: Excluindo agendamento...', id);
      
      await appointmentService.deleteAppointment(id);
      
      setAppointments(prev => {
        const updated = prev.filter(apt => apt.id !== id);
        console.log('AppContext: Agendamento excluído do estado local:', id);
        return updated;
      });

      console.log('AppContext: Agendamento excluído com sucesso:', id);
      return true;
    } catch (error) {
      console.error('AppContext: Erro ao excluir agendamento:', error);
      return false;
    }
  };

  const addClient = (clientData: Omit<Client, 'id' | 'createdAt'>) => {
    try {
      // Check if client already exists (by phone or email)
      const existingClient = clients.find(client => 
        client.phone === clientData.phone || 
        (client.email && clientData.email && client.email === clientData.email)
      );

      if (existingClient) {
        console.log('AppContext: Cliente já existe:', existingClient.name);
        return existingClient.id;
      }

      const newClient: Client = {
        ...clientData,
        id: `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        createdAt: new Date()
      };
      
      setClients(prev => {
        const updated = [...prev, newClient];
        console.log('AppContext: Cliente adicionado:', newClient.name);
        return updated;
      });
      
      return newClient.id;
    } catch (error) {
      console.error('AppContext: Erro ao adicionar cliente:', error);
      return null;
    }
  };

  const sendWhatsAppMessage = (appointment: Appointment) => {
    try {
      // Mock WhatsApp integration
      const message = `Olá ${appointment.clientName}! ✨

Seu agendamento foi confirmado:
📅 Data: ${appointment.date.toLocaleDateString('pt-BR')}
🕐 Horário: ${appointment.date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
💆‍♀️ Serviço: ${appointment.serviceName}
📍 Local: Clínica Estética Ana Costa

Para cancelar ou reagendar, responda esta mensagem.

Nos vemos em breve! 💝`;

      // In a real app, this would integrate with WhatsApp Business API
      const whatsappUrl = `https://wa.me/${appointment.clientPhone.replace(/\D/g, '')}?text=${encodeURIComponent(message)}`;
      window.open(whatsappUrl, '_blank');
      
      // Update appointment as WhatsApp sent
      updateAppointment(appointment.id, { whatsappSent: true });
    } catch (error) {
      console.error('AppContext: Error sending WhatsApp message:', error);
    }
  };

  const value = {
    appointments,
    clients,
    services,
    customerCount,
    todayVariation,
    loading,
    addAppointment,
    updateAppointment,
    deleteAppointment,
    addClient,
    sendWhatsAppMessage,
    refreshCustomerCount,
    refreshTodayVariation,
    refreshAppointments
  };

  return (
    <AppContext.Provider value={value}>
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (context === undefined) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};