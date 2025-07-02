import { supabase } from '../lib/supabase';

export interface AppointmentMetric {
  id: string;
  date: string;
  daily_total: number;
  moving_average: number | null;
  percentage_variation: number | null;
  created_at: string;
  updated_at: string;
  user_id: string;
}

export interface DailyMetricsCalculation {
  date: string;
  dailyTotal: number;
  movingAverage: number;
  percentageVariation: number;
}

export class AppointmentMetricsService {
  private static instance: AppointmentMetricsService;
  private isDemo = false;

  constructor() {
    this.checkSupabaseAvailability();
  }

  static getInstance(): AppointmentMetricsService {
    if (!AppointmentMetricsService.instance) {
      AppointmentMetricsService.instance = new AppointmentMetricsService();
    }
    return AppointmentMetricsService.instance;
  }

  private async checkSupabaseAvailability() {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    this.isDemo = !supabaseUrl || !supabaseKey || 
      supabaseUrl === 'https://your-project.supabase.co' || 
      supabaseKey === 'your-anon-key';

    if (this.isDemo) {
      console.warn('AppointmentMetricsService: Supabase não configurado, usando modo demo');
    }
  }

  /**
   * Calcula as métricas diárias de agendamentos
   * @param appointments Array de agendamentos
   * @param targetDate Data para calcular as métricas (padrão: hoje)
   * @returns Objeto com as métricas calculadas
   */
  calculateDailyMetrics(appointments: any[], targetDate: Date = new Date()): DailyMetricsCalculation {
    const today = new Date(targetDate);
    today.setHours(0, 0, 0, 0);

    // 1. Obter total de agendamentos do dia atual
    const dailyTotal = appointments.filter(apt => {
      const aptDate = new Date(apt.date);
      aptDate.setHours(0, 0, 0, 0);
      return aptDate.getTime() === today.getTime();
    }).length;

    // 2. Calcular média diária dos últimos 30 dias
    const thirtyDaysAgo = new Date(today);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    // Agrupar agendamentos por dia nos últimos 30 dias
    const dailyCounts: { [key: string]: number } = {};
    
    // Inicializar todos os dias com 0
    for (let i = 0; i < 30; i++) {
      const date = new Date(thirtyDaysAgo);
      date.setDate(date.getDate() + i);
      const dateKey = date.toISOString().split('T')[0];
      dailyCounts[dateKey] = 0;
    }

    // Contar agendamentos por dia
    appointments.forEach(apt => {
      const aptDate = new Date(apt.date);
      const dateKey = aptDate.toISOString().split('T')[0];
      
      if (aptDate >= thirtyDaysAgo && aptDate < today) {
        if (dailyCounts[dateKey] !== undefined) {
          dailyCounts[dateKey]++;
        }
      }
    });

    // Calcular média móvel
    const totalAppointments = Object.values(dailyCounts).reduce((sum, count) => sum + count, 0);
    const movingAverage = totalAppointments / 30;

    // 3. Calcular variação percentual
    // Fórmula: ((total_hoje - média_diária) / média_diária) * 100
    let percentageVariation = 0;
    if (movingAverage > 0) {
      percentageVariation = ((dailyTotal - movingAverage) / movingAverage) * 100;
    } else if (dailyTotal > 0) {
      percentageVariation = 100; // Se não há histórico mas há agendamentos hoje, é 100% de aumento
    }

    console.log('AppointmentMetricsService: Métricas calculadas', {
      date: today.toISOString().split('T')[0],
      dailyTotal,
      movingAverage: Number(movingAverage.toFixed(2)),
      percentageVariation: Number(percentageVariation.toFixed(2))
    });

    return {
      date: today.toISOString().split('T')[0],
      dailyTotal,
      movingAverage: Number(movingAverage.toFixed(2)),
      percentageVariation: Number(percentageVariation.toFixed(2))
    };
  }

  /**
   * Salva as métricas calculadas no banco de dados
   */
  async saveMetrics(metrics: DailyMetricsCalculation): Promise<AppointmentMetric | null> {
    if (this.isDemo) {
      console.log('AppointmentMetricsService: Modo demo - métricas não salvas no banco');
      return null;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        console.error('AppointmentMetricsService: Usuário não autenticado');
        return null;
      }

      // Usar upsert para inserir ou atualizar
      const { data, error } = await supabase
        .from('appointment_metrics')
        .upsert({
          date: metrics.date,
          daily_total: metrics.dailyTotal,
          moving_average: metrics.movingAverage,
          percentage_variation: metrics.percentageVariation,
          user_id: user.id,
          updated_at: new Date().toISOString()
        }, {
          onConflict: 'date,user_id'
        })
        .select()
        .single();

      if (error) {
        console.error('AppointmentMetricsService: Erro ao salvar métricas:', error);
        return null;
      }

      console.log('AppointmentMetricsService: Métricas salvas com sucesso');
      return data;
    } catch (error) {
      console.error('AppointmentMetricsService: Erro ao salvar métricas:', error);
      return null;
    }
  }

  /**
   * Obtém as métricas de uma data específica
   */
  async getMetricsByDate(date: string): Promise<AppointmentMetric | null> {
    if (this.isDemo) {
      return null;
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return null;
      }

      const { data, error } = await supabase
        .from('appointment_metrics')
        .select('*')
        .eq('date', date)
        .eq('user_id', user.id)
        .maybeSingle();

      if (error) {
        console.error('AppointmentMetricsService: Erro ao buscar métricas:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('AppointmentMetricsService: Erro ao buscar métricas:', error);
      return null;
    }
  }

  /**
   * Obtém as métricas dos últimos N dias
   */
  async getRecentMetrics(days: number = 30): Promise<AppointmentMetric[]> {
    if (this.isDemo) {
      return [];
    }

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) {
        return [];
      }

      const startDate = new Date();
      startDate.setDate(startDate.getDate() - days);

      const { data, error } = await supabase
        .from('appointment_metrics')
        .select('*')
        .eq('user_id', user.id)
        .gte('date', startDate.toISOString().split('T')[0])
        .order('date', { ascending: false });

      if (error) {
        console.error('AppointmentMetricsService: Erro ao buscar métricas recentes:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('AppointmentMetricsService: Erro ao buscar métricas recentes:', error);
      return [];
    }
  }

  /**
   * Calcula e salva as métricas para uma data específica
   */
  async calculateAndSaveMetrics(appointments: any[], targetDate: Date = new Date()): Promise<DailyMetricsCalculation> {
    const metrics = this.calculateDailyMetrics(appointments, targetDate);
    
    // Salvar no banco de dados (se não estiver em modo demo)
    await this.saveMetrics(metrics);
    
    return metrics;
  }

  /**
   * Obtém a variação percentual do dia atual
   */
  async getTodayVariation(appointments: any[]): Promise<number> {
    const today = new Date();
    const todayKey = today.toISOString().split('T')[0];
    
    // Primeiro, tentar buscar do banco de dados
    const savedMetrics = await this.getMetricsByDate(todayKey);
    
    if (savedMetrics && savedMetrics.percentage_variation !== null) {
      return savedMetrics.percentage_variation;
    }
    
    // Se não encontrou no banco, calcular
    const metrics = await this.calculateAndSaveMetrics(appointments, today);
    return metrics.percentageVariation;
  }
}