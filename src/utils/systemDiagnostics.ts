import { supabase } from '../lib/supabase';
import { PerformanceMonitor } from '../services/performanceMonitor';

export interface SystemDiagnostics {
  timestamp: string;
  database: {
    connectionStatus: 'connected' | 'disconnected' | 'error';
    responseTime: number;
    tablesAccessible: string[];
    tablesInaccessible: string[];
    totalQueries: number;
    failedQueries: number;
    averageQueryTime: number;
  };
  performance: {
    slowOperations: any[];
    failedOperations: any[];
    averageResponseTime: number;
    memoryUsage?: number;
  };
  errors: string[];
  recommendations: string[];
}

export class SystemDiagnosticsService {
  private static instance: SystemDiagnosticsService;
  private performanceMonitor = PerformanceMonitor.getInstance();

  static getInstance(): SystemDiagnosticsService {
    if (!SystemDiagnosticsService.instance) {
      SystemDiagnosticsService.instance = new SystemDiagnosticsService();
    }
    return SystemDiagnosticsService.instance;
  }

  async runCompleteDiagnostics(): Promise<SystemDiagnostics> {
    console.log('🔍 Iniciando diagnóstico completo do sistema...');
    
    const startTime = performance.now();
    const errors: string[] = [];
    const recommendations: string[] = [];

    // 1. Diagnóstico do banco de dados
    const databaseDiagnostics = await this.diagnoseDatabaseConnection();
    
    // 2. Análise de performance
    const performanceReport = this.performanceMonitor.getPerformanceReport();
    
    // 3. Verificação de memória (se disponível)
    let memoryUsage: number | undefined;
    if ('memory' in performance) {
      memoryUsage = (performance as any).memory.usedJSHeapSize / 1024 / 1024; // MB
    }

    // 4. Gerar recomendações
    if (databaseDiagnostics.responseTime > 1000) {
      recommendations.push('Conexão com banco de dados lenta (>1s). Considere otimizar queries ou verificar conectividade.');
    }

    if (performanceReport.summary.averageDuration > 500) {
      recommendations.push('Operações da aplicação estão lentas. Considere implementar cache ou otimizar componentes.');
    }

    if (performanceReport.summary.successRate < 95) {
      recommendations.push('Taxa de sucesso baixa. Verifique tratamento de erros e conectividade.');
    }

    if (databaseDiagnostics.failedQueries > 0) {
      recommendations.push('Queries falhando no banco de dados. Verifique logs e políticas RLS.');
    }

    if (memoryUsage && memoryUsage > 100) {
      recommendations.push('Alto uso de memória detectado. Considere otimizar componentes e limpar cache.');
    }

    const totalTime = performance.now() - startTime;
    console.log(`✅ Diagnóstico completo finalizado em ${totalTime.toFixed(2)}ms`);

    return {
      timestamp: new Date().toISOString(),
      database: databaseDiagnostics,
      performance: {
        ...performanceReport,
        memoryUsage
      },
      errors,
      recommendations
    };
  }

  private async diagnoseDatabaseConnection(): Promise<SystemDiagnostics['database']> {
    const startTime = performance.now();
    const tablesAccessible: string[] = [];
    const tablesInaccessible: string[] = [];
    
    const tables = ['users', 'customers', 'appointments', 'appointment_metrics'];
    
    let connectionStatus: 'connected' | 'disconnected' | 'error' = 'disconnected';
    
    try {
      // Test each table
      for (const table of tables) {
        try {
          const { error } = await supabase
            .from(table)
            .select('count', { count: 'exact', head: true });
          
          if (error) {
            tablesInaccessible.push(table);
            console.warn(`⚠️ Tabela ${table} inacessível:`, error.message);
          } else {
            tablesAccessible.push(table);
          }
        } catch (err) {
          tablesInaccessible.push(table);
          console.error(`❌ Erro ao acessar tabela ${table}:`, err);
        }
      }

      connectionStatus = tablesAccessible.length > 0 ? 'connected' : 'error';
    } catch (error) {
      connectionStatus = 'error';
      console.error('❌ Erro crítico na conexão com banco:', error);
    }

    const responseTime = performance.now() - startTime;
    const performanceReport = this.performanceMonitor.getPerformanceReport();

    return {
      connectionStatus,
      responseTime,
      tablesAccessible,
      tablesInaccessible,
      totalQueries: performanceReport.databaseMetrics.totalQueries,
      failedQueries: performanceReport.databaseMetrics.failedQueries,
      averageQueryTime: performanceReport.databaseMetrics.averageResponseTime
    };
  }

  async generatePerformanceReport(): Promise<string> {
    const diagnostics = await this.runCompleteDiagnostics();
    
    return `
# RELATÓRIO DE DIAGNÓSTICO DO SISTEMA
Gerado em: ${new Date(diagnostics.timestamp).toLocaleString('pt-BR')}

## 📊 STATUS DO BANCO DE DADOS
- **Status da Conexão:** ${diagnostics.database.connectionStatus}
- **Tempo de Resposta:** ${diagnostics.database.responseTime.toFixed(2)}ms
- **Tabelas Acessíveis:** ${diagnostics.database.tablesAccessible.length}/4
  - ✅ ${diagnostics.database.tablesAccessible.join(', ')}
  ${diagnostics.database.tablesInaccessible.length > 0 ? `- ❌ ${diagnostics.database.tablesInaccessible.join(', ')}` : ''}
- **Total de Queries:** ${diagnostics.database.totalQueries}
- **Queries Falharam:** ${diagnostics.database.failedQueries}
- **Tempo Médio de Query:** ${diagnostics.database.averageQueryTime.toFixed(2)}ms

## ⚡ MÉTRICAS DE PERFORMANCE
- **Operações Totais:** ${diagnostics.performance.summary.totalOperations}
- **Tempo Médio de Operação:** ${diagnostics.performance.summary.averageDuration.toFixed(2)}ms
- **Taxa de Sucesso:** ${diagnostics.performance.summary.successRate.toFixed(1)}%
- **Operações Lentas:** ${diagnostics.performance.summary.slowOperationsCount}
- **Operações Falharam:** ${diagnostics.performance.summary.failedOperationsCount}
${diagnostics.performance.memoryUsage ? `- **Uso de Memória:** ${diagnostics.performance.memoryUsage.toFixed(1)}MB` : ''}

## 🔧 RECOMENDAÇÕES
${diagnostics.recommendations.map(rec => `- ${rec}`).join('\n')}

## 📈 OPERAÇÕES MAIS LENTAS
${diagnostics.performance.slowOperations.slice(0, 5).map(op => 
  `- ${op.component}.${op.operation}: ${op.duration.toFixed(2)}ms`
).join('\n')}

## ❌ OPERAÇÕES COM FALHA
${diagnostics.performance.failedOperations.slice(0, 5).map(op => 
  `- ${op.component}.${op.operation}: ${op.error || 'Erro desconhecido'}`
).join('\n')}
    `.trim();
  }
}