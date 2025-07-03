export interface PerformanceMetrics {
  timestamp: string;
  component: string;
  operation: string;
  duration: number;
  success: boolean;
  error?: string;
}

export interface DatabaseMetrics {
  connectionTime: number;
  queryTime: number;
  totalQueries: number;
  failedQueries: number;
  averageResponseTime: number;
}

export class PerformanceMonitor {
  private static instance: PerformanceMonitor;
  private metrics: PerformanceMetrics[] = [];
  private dbMetrics: DatabaseMetrics = {
    connectionTime: 0,
    queryTime: 0,
    totalQueries: 0,
    failedQueries: 0,
    averageResponseTime: 0
  };

  static getInstance(): PerformanceMonitor {
    if (!PerformanceMonitor.instance) {
      PerformanceMonitor.instance = new PerformanceMonitor();
    }
    return PerformanceMonitor.instance;
  }

  startTimer(component: string, operation: string): () => void {
    const startTime = performance.now();
    
    return (success: boolean = true, error?: string) => {
      const duration = performance.now() - startTime;
      
      this.metrics.push({
        timestamp: new Date().toISOString(),
        component,
        operation,
        duration,
        success,
        error
      });

      // Log performance issues
      if (duration > 1000) {
        console.warn(`⚠️ Operação lenta detectada: ${component}.${operation} - ${duration.toFixed(2)}ms`);
      }

      if (!success) {
        console.error(`❌ Falha na operação: ${component}.${operation} - ${error}`);
      }
    };
  }

  recordDatabaseOperation(duration: number, success: boolean): void {
    this.dbMetrics.totalQueries++;
    this.dbMetrics.queryTime += duration;
    
    if (!success) {
      this.dbMetrics.failedQueries++;
    }
    
    this.dbMetrics.averageResponseTime = this.dbMetrics.queryTime / this.dbMetrics.totalQueries;
  }

  getPerformanceReport(): {
    summary: any;
    slowOperations: PerformanceMetrics[];
    failedOperations: PerformanceMetrics[];
    databaseMetrics: DatabaseMetrics;
  } {
    const now = Date.now();
    const last5Minutes = this.metrics.filter(m => 
      now - new Date(m.timestamp).getTime() < 5 * 60 * 1000
    );

    const slowOperations = this.metrics.filter(m => m.duration > 500);
    const failedOperations = this.metrics.filter(m => !m.success);

    const summary = {
      totalOperations: this.metrics.length,
      recentOperations: last5Minutes.length,
      averageDuration: this.metrics.reduce((sum, m) => sum + m.duration, 0) / this.metrics.length,
      successRate: (this.metrics.filter(m => m.success).length / this.metrics.length) * 100,
      slowOperationsCount: slowOperations.length,
      failedOperationsCount: failedOperations.length
    };

    return {
      summary,
      slowOperations: slowOperations.slice(-10), // Last 10 slow operations
      failedOperations: failedOperations.slice(-10), // Last 10 failed operations
      databaseMetrics: this.dbMetrics
    };
  }

  clearMetrics(): void {
    this.metrics = [];
    this.dbMetrics = {
      connectionTime: 0,
      queryTime: 0,
      totalQueries: 0,
      failedQueries: 0,
      averageResponseTime: 0
    };
  }
}