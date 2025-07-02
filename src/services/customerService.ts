import { supabase } from '../lib/supabase';
import { Customer, CustomerFormData, CustomerFilters, PaginationInfo } from '../types/customer';

export class CustomerService {
  private static instance: CustomerService;
  private isDemo = false;

  constructor() {
    this.checkSupabaseAvailability();
  }

  static getInstance(): CustomerService {
    if (!CustomerService.instance) {
      CustomerService.instance = new CustomerService();
    }
    return CustomerService.instance;
  }

  private async checkSupabaseAvailability() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    this.isDemo = !supabaseUrl || !supabaseKey || 
      supabaseUrl === 'https://your-project.supabase.co' || 
      supabaseKey === 'your-anon-key';

    if (this.isDemo) {
      console.warn('CustomerService: Supabase não configurado, usando modo demo');
    } else {
      console.log('CustomerService: Conectado ao Supabase');
      // Test connection
      try {
        const { error } = await supabase.from('customers').select('count', { count: 'exact', head: true });
        if (error) {
          console.error('CustomerService: Erro ao conectar com Supabase:', error);
          this.isDemo = true;
        }
      } catch (err) {
        console.error('CustomerService: Falha na conexão com Supabase:', err);
        this.isDemo = true;
      }
    }
  }

  async getCustomers(
    page: number = 1,
    itemsPerPage: number = 20,
    filters: CustomerFilters
  ): Promise<{ customers: Customer[]; pagination: PaginationInfo }> {
    if (this.isDemo) {
      console.log('CustomerService: Retornando dados vazios (modo demo)');
      return {
        customers: [],
        pagination: {
          currentPage: page,
          totalPages: 0,
          totalItems: 0,
          itemsPerPage
        }
      };
    }

    try {
      console.log('CustomerService: Buscando clientes...', { page, itemsPerPage, filters });
      
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      // Apply filters
      if (filters.search) {
        query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
      }

      if (filters.status !== 'all') {
        query = query.eq('status', filters.status);
      }

      if (filters.country) {
        query = query.eq('country', filters.country);
      }

      if (filters.dateRange.start && filters.dateRange.end) {
        query = query
          .gte('created_at', filters.dateRange.start)
          .lte('created_at', filters.dateRange.end);
      }

      // Apply pagination and sorting
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) {
        console.error('CustomerService: Erro ao buscar clientes:', error);
        throw error;
      }

      console.log('CustomerService: Clientes encontrados:', data?.length || 0);

      const totalPages = Math.ceil((count || 0) / itemsPerPage);

      return {
        customers: data || [],
        pagination: {
          currentPage: page,
          totalPages,
          totalItems: count || 0,
          itemsPerPage
        }
      };
    } catch (error) {
      console.error('CustomerService: Erro ao buscar clientes:', error);
      throw new Error('Falha ao buscar clientes');
    }
  }

  async createCustomer(customerData: CustomerFormData): Promise<Customer> {
    if (this.isDemo) {
      throw new Error('Criação de clientes não disponível no modo demo. Configure o Supabase para usar esta funcionalidade.');
    }

    try {
      console.log('CustomerService: Criando cliente...', customerData);
      
      // Get current user
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('CustomerService: Usuário não autenticado:', userError);
        throw new Error('Usuário não autenticado');
      }

      const { data, error } = await supabase
        .from('customers')
        .insert([{
          ...customerData,
          user_id: user.id
        }])
        .select()
        .single();

      if (error) {
        console.error('CustomerService: Erro ao criar cliente:', error);
        if (error.code === '23505') {
          throw new Error('Este email já está cadastrado');
        }
        throw error;
      }

      console.log('CustomerService: Cliente criado com sucesso:', data);
      return data;
    } catch (error) {
      console.error('CustomerService: Erro ao criar cliente:', error);
      throw new Error(error instanceof Error ? error.message : 'Falha ao criar cliente');
    }
  }

  async updateCustomer(customerId: number, customerData: Partial<CustomerFormData>): Promise<Customer> {
    if (this.isDemo) {
      throw new Error('Atualização de clientes não disponível no modo demo. Configure o Supabase para usar esta funcionalidade.');
    }

    try {
      console.log('CustomerService: Atualizando cliente...', customerId, customerData);
      
      const { data, error } = await supabase
        .from('customers')
        .update({
          ...customerData,
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId)
        .select()
        .single();

      if (error) {
        console.error('CustomerService: Erro ao atualizar cliente:', error);
        if (error.code === '23505') {
          throw new Error('Este email já está cadastrado por outro cliente');
        }
        throw error;
      }

      console.log('CustomerService: Cliente atualizado com sucesso:', data);
      return data;
    } catch (error) {
      console.error('CustomerService: Erro ao atualizar cliente:', error);
      throw new Error(error instanceof Error ? error.message : 'Falha ao atualizar cliente');
    }
  }

  async deleteCustomer(customerId: number): Promise<void> {
    if (this.isDemo) {
      throw new Error('Exclusão de clientes não disponível no modo demo. Configure o Supabase para usar esta funcionalidade.');
    }

    try {
      console.log('CustomerService: Excluindo cliente (soft delete)...', customerId);
      
      // Soft delete - update status to inactive
      const { error } = await supabase
        .from('customers')
        .update({ 
          status: 'inactive',
          updated_at: new Date().toISOString()
        })
        .eq('customer_id', customerId);

      if (error) {
        console.error('CustomerService: Erro ao excluir cliente:', error);
        throw error;
      }

      console.log('CustomerService: Cliente excluído com sucesso');
    } catch (error) {
      console.error('CustomerService: Erro ao excluir cliente:', error);
      throw new Error(error instanceof Error ? error.message : 'Falha ao excluir cliente');
    }
  }

  async getCustomerById(customerId: number): Promise<Customer | null> {
    if (this.isDemo) {
      return null;
    }

    try {
      console.log('CustomerService: Buscando cliente por ID...', customerId);
      
      const { data, error } = await supabase
        .from('customers')
        .select('*')
        .eq('customer_id', customerId)
        .single();

      if (error) {
        console.error('CustomerService: Erro ao buscar cliente:', error);
        throw error;
      }

      console.log('CustomerService: Cliente encontrado:', data);
      return data;
    } catch (error) {
      console.error('CustomerService: Erro ao buscar cliente:', error);
      return null;
    }
  }

  async getCountries(): Promise<string[]> {
    if (this.isDemo) {
      return ['Brasil', 'Estados Unidos', 'Canadá', 'Reino Unido', 'França', 'Alemanha', 'Espanha', 'Itália'];
    }

    try {
      console.log('CustomerService: Buscando países...');
      
      const { data, error } = await supabase
        .from('customers')
        .select('country')
        .not('country', 'is', null);

      if (error) {
        console.error('CustomerService: Erro ao buscar países:', error);
        throw error;
      }

      const countries = [...new Set(data.map(item => item.country))].filter(Boolean);
      console.log('CustomerService: Países encontrados:', countries.length);
      return countries.sort();
    } catch (error) {
      console.error('CustomerService: Erro ao buscar países:', error);
      return [];
    }
  }

  async exportCustomers(format: 'csv' | 'pdf', filters: CustomerFilters): Promise<Blob> {
    console.log('CustomerService: Exportando clientes...', format);
    
    // Get all customers matching filters (without pagination)
    const { customers } = await this.getCustomers(1, 10000, filters);

    if (format === 'csv') {
      return this.exportToCSV(customers);
    } else {
      return this.exportToPDF(customers);
    }
  }

  private exportToCSV(customers: Customer[]): Blob {
    const headers = [
      'ID', 'Primeiro Nome', 'Sobrenome', 'Email', 'Telefone', 'Endereço', 
      'Cidade', 'Estado/Província', 'CEP', 'País', 'Status', 'Criado em'
    ];

    const csvContent = [
      headers.join(','),
      ...customers.map(customer => [
        customer.customer_id,
        `"${customer.first_name}"`,
        `"${customer.last_name}"`,
        `"${customer.email}"`,
        `"${customer.phone_number || ''}"`,
        `"${customer.address || ''}"`,
        `"${customer.city || ''}"`,
        `"${customer.state_province || ''}"`,
        `"${customer.postal_code || ''}"`,
        `"${customer.country || ''}"`,
        customer.status === 'active' ? 'Ativo' : 'Inativo',
        new Date(customer.created_at).toLocaleDateString('pt-BR')
      ].join(','))
    ].join('\n');

    return new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  }

  private exportToPDF(customers: Customer[]): Blob {
    // Simple PDF generation - in a real app, you'd use a library like jsPDF
    const pdfContent = `
Relatório de Clientes
Gerado em: ${new Date().toLocaleDateString('pt-BR')}

${customers.map(customer => `
ID: ${customer.customer_id}
Nome: ${customer.first_name} ${customer.last_name}
Email: ${customer.email}
Telefone: ${customer.phone_number || 'N/A'}
Endereço: ${customer.address || 'N/A'}, ${customer.city || 'N/A'}, ${customer.state_province || 'N/A'} ${customer.postal_code || ''}
País: ${customer.country || 'N/A'}
Status: ${customer.status === 'active' ? 'Ativo' : 'Inativo'}
Criado: ${new Date(customer.created_at).toLocaleDateString('pt-BR')}
---
`).join('')}
    `;

    return new Blob([pdfContent], { type: 'text/plain;charset=utf-8;' });
  }

  // Method to get customer count for dashboard
  async getCustomerCount(): Promise<number> {
    if (this.isDemo) {
      return 0;
    }

    try {
      console.log('CustomerService: Contando clientes...');
      
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      if (error) {
        console.error('CustomerService: Erro ao contar clientes:', error);
        return 0;
      }

      console.log('CustomerService: Total de clientes ativos:', count);
      return count || 0;
    } catch (error) {
      console.error('CustomerService: Erro ao contar clientes:', error);
      return 0;
    }
  }
}