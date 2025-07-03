import { supabase } from '../lib/supabase';
import { Customer, CustomerFormData, CustomerFilters, PaginationInfo } from '../types/customer';
import { PerformanceMonitor } from './performanceMonitor';

export class OptimizedCustomerService {
  private static instance: OptimizedCustomerService;
  private isDemo = false;
  private cache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 5 * 60 * 1000; // 5 minutes
  private performanceMonitor = PerformanceMonitor.getInstance();

  constructor() {
    this.checkSupabaseAvailability();
  }

  static getInstance(): OptimizedCustomerService {
    if (!OptimizedCustomerService.instance) {
      OptimizedCustomerService.instance = new OptimizedCustomerService();
    }
    return OptimizedCustomerService.instance;
  }

  private async checkSupabaseAvailability() {
    const timer = this.performanceMonitor.startTimer('CustomerService', 'checkAvailability');
    
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      this.isDemo = !supabaseUrl || !supabaseKey || 
        supabaseUrl === 'https://your-project.supabase.co' || 
        supabaseKey === 'your-anon-key';

      if (!this.isDemo) {
        // Test connection with timeout
        const connectionTest = Promise.race([
          supabase.from('customers').select('count', { count: 'exact', head: true }),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Connection timeout')), 5000))
        ]);

        await connectionTest;
        timer(true);
        console.log('✅ CustomerService: Conectado ao Supabase');
      } else {
        timer(true);
        console.warn('⚠️ CustomerService: Modo demo ativo');
      }
    } catch (error) {
      timer(false, error instanceof Error ? error.message : 'Connection failed');
      this.isDemo = true;
      console.error('❌ CustomerService: Falha na conexão:', error);
    }
  }

  private getCacheKey(operation: string, params?: any): string {
    return `${operation}_${JSON.stringify(params || {})}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.cache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.cache.set(key, { data, timestamp: Date.now() });
  }

  async getCustomers(
    page: number = 1,
    itemsPerPage: number = 20,
    filters: CustomerFilters
  ): Promise<{ customers: Customer[]; pagination: PaginationInfo }> {
    const timer = this.performanceMonitor.startTimer('CustomerService', 'getCustomers');
    
    if (this.isDemo) {
      timer(true);
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
      // Check cache first
      const cacheKey = this.getCacheKey('getCustomers', { page, itemsPerPage, filters });
      const cached = this.getFromCache<{ customers: Customer[]; pagination: PaginationInfo }>(cacheKey);
      
      if (cached) {
        timer(true);
        console.log('📦 CustomerService: Dados retornados do cache');
        return cached;
      }

      console.log('🔍 CustomerService: Buscando clientes no banco...', { page, itemsPerPage, filters });
      
      let query = supabase
        .from('customers')
        .select('*', { count: 'exact' });

      // Optimized filters
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

      // Optimized pagination
      const from = (page - 1) * itemsPerPage;
      const to = from + itemsPerPage - 1;

      const { data, error, count } = await query
        .order('created_at', { ascending: false })
        .range(from, to);

      this.performanceMonitor.recordDatabaseOperation(
        performance.now(),
        !error
      );

      if (error) {
        timer(false, error.message);
        throw error;
      }

      const result = {
        customers: data || [],
        pagination: {
          currentPage: page,
          totalPages: Math.ceil((count || 0) / itemsPerPage),
          totalItems: count || 0,
          itemsPerPage
        }
      };

      // Cache the result
      this.setCache(cacheKey, result);
      
      timer(true);
      console.log('✅ CustomerService: Clientes encontrados:', data?.length || 0);
      return result;
    } catch (error) {
      timer(false, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ CustomerService: Erro ao buscar clientes:', error);
      throw new Error('Falha ao buscar clientes');
    }
  }

  async getCustomerCount(): Promise<number> {
    const timer = this.performanceMonitor.startTimer('CustomerService', 'getCustomerCount');
    
    if (this.isDemo) {
      timer(true);
      return 0;
    }

    try {
      // Check cache first
      const cacheKey = this.getCacheKey('customerCount');
      const cached = this.getFromCache<number>(cacheKey);
      
      if (cached !== null) {
        timer(true);
        return cached;
      }

      console.log('📊 CustomerService: Contando clientes...');
      
      const { count, error } = await supabase
        .from('customers')
        .select('*', { count: 'exact', head: true })
        .eq('status', 'active');

      this.performanceMonitor.recordDatabaseOperation(
        performance.now(),
        !error
      );

      if (error) {
        timer(false, error.message);
        console.error('❌ CustomerService: Erro ao contar clientes:', error);
        return 0;
      }

      const result = count || 0;
      this.setCache(cacheKey, result);
      
      timer(true);
      console.log('✅ CustomerService: Total de clientes ativos:', result);
      return result;
    } catch (error) {
      timer(false, error instanceof Error ? error.message : 'Unknown error');
      console.error('❌ CustomerService: Erro ao contar clientes:', error);
      return 0;
    }
  }

  clearCache(): void {
    this.cache.clear();
    console.log('🧹 CustomerService: Cache limpo');
  }

  getPerformanceMetrics() {
    return this.performanceMonitor.getPerformanceReport();
  }
}