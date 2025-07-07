export interface User {
  id: string;
  name: string;
  email: string;
  businessName: string;
  phone: string;
  address: string;
}

export interface Client {
  id: string;
  name: string;
  phone: string;
  email?: string;
  notes?: string;
  createdAt: Date;
}

export interface Service {
  id: string;
  name: string;
  duration: number; // in minutes
  price: number;
  description?: string;
}

export interface Appointment {
  id: string;
  clientId: string;
  clientName: string;
  clientPhone: string;
  serviceId: string;
  serviceName: string;
  date: Date;
  duration: number;
  status: 'confirmed' | 'pending' | 'cancelled' | 'completed';
  notes?: string;
  createdAt: Date;
  whatsappSent?: boolean;
}

interface TimeSlot {
  time: string;
  available: boolean;
  appointmentId?: string;
}