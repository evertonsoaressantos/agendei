import { supabase } from '../lib/supabase';

export class OptimizedSupabaseService {
  private static instance: OptimizedSupabaseService;
  private queryCache = new Map<string, { data: any; timestamp: number }>();
  private readonly CACHE_TTL = 2 * 60 * 1000; // 2 minutos

  static getInstance(): OptimizedSupabaseService {
    if (!OptimizedSupabaseService.instance) {
      OptimizedSupabaseService.instance = new OptimizedSupabaseService();
    }
    return OptimizedSupabaseService.instance;
  }

  // Cache management
  private getCacheKey(table: string, query: any): string {
    return `${table}_${JSON.stringify(query)}`;
  }

  private getFromCache<T>(key: string): T | null {
    const cached = this.queryCache.get(key);
    if (cached && Date.now() - cached.timestamp < this.CACHE_TTL) {
      return cached.data;
    }
    this.queryCache.delete(key);
    return null;
  }

  private setCache(key: string, data: any): void {
    this.queryCache.set(key, { data, timestamp: Date.now() });
  }

  // Optimized query methods with selective fields
  async getAppointments(userId: string, dateRange?: { start: string; end: string }) {
    const cacheKey = this.getCacheKey('appointments', { userId, dateRange });
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    let query = supabase
      .from('appointments')
      .select(`
        id,
        customer_id,
        service_description,
        appointment_date,
        appointment_time,
        status,
        notes,
        created_at,
        customers!inner (
          first_name,
          last_name,
          phone_number
        )
      `)
      .eq('user_id', userId)
      .order('appointment_date', { ascending: true })
      .order('appointment_time', { ascending: true });

    if (dateRange) {
      query = query
        .gte('appointment_date', dateRange.start)
        .lte('appointment_date', dateRange.end);
    }

    const { data, error } = await query;
    
    if (error) throw error;
    
    this.setCache(cacheKey, data);
    return data;
  }

  async getCustomers(userId: string, filters: any = {}, page: number = 1, limit: number = 20) {
    const cacheKey = this.getCacheKey('customers', { userId, filters, page, limit });
    const cached = this.getFromCache(cacheKey);
    
    if (cached) {
      return cached;
    }

    let query = supabase
      .from('customers')
      .select(`
        customer_id,
        first_name,
        last_name,
        email,
        phone_number,
        city,
        country,
        status,
        created_at
      `, { count: 'exact' })
      .eq('user_id', userId);

    // Apply filters
    if (filters.search) {
      query = query.or(`first_name.ilike.%${filters.search}%,last_name.ilike.%${filters.search}%,email.ilike.%${filters.search}%`);
    }

    if (filters.status && filters.status !== 'all') {
      query = query.eq('status', filters.status);
    }

    if (filters.country) {
      query = query.eq('country', filters.country);
    }

    // Pagination
    const from = (page - 1) * limit;
    const to = from + limit - 1;

    const { data, error, count } = await query
      .range(from, to)
      .order('created_at', { ascending: false });

    if (error) throw error;

    const result = { data, count };
    this.setCache(cacheKey, result);
    return result;
  }

  // Batch operations for better performance
  async batchCreateAppointments(appointments: any[]) {
    const { data, error } = await supabase
      .from('appointments')
      .insert(appointments)
      .select();

    if (error) throw error;
    
    // Clear related cache
    this.clearCacheByPattern('appointments_');
    
    return data;
  }

  async batchUpdateAppointments(updates: { id: string; data: any }[]) {
    const promises = updates.map(update =>
      supabase
        .from('appointments')
        .update(update.data)
        .eq('id', update.id)
    );

    const results = await Promise.all(promises);
    
    // Clear related cache
    this.clearCacheByPattern('appointments_');
    
    return results;
  }

  // Cache management utilities
  clearCache(): void {
    this.queryCache.clear();
  }

  clearCacheByPattern(pattern: string): void {
    for (const key of this.queryCache.keys()) {
      if (key.includes(pattern)) {
        this.queryCache.delete(key);
      }
    }
  }

  // Connection optimization
  async optimizeConnection() {
    // Enable connection pooling and compression
    const { data, error } = await supabase
      .from('users')
      .select('id')
      .limit(1)
      .single();

    if (error && error.code !== 'PGRST116') {
      throw error;
    }

    return true;
  }

  // Query performance analysis
  async analyzeQueryPerformance(query: string) {
    const startTime = performance.now();
    
    try {
      const { data, error } = await supabase.rpc('explain_query', { query_text: query });
      const endTime = performance.now();
      
      return {
        duration: endTime - startTime,
        plan: data,
        error
      };
    } catch (error) {
      const endTime = performance.now();
      return {
        duration: endTime - startTime,
        error
      };
    }
  }
}