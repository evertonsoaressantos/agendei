import { supabase } from '../lib/supabase';

export interface ConnectionTestResult {
  success: boolean;
  message: string;
  details?: any;
  timestamp: string;
}

/**
 * Testa a conexão com o Supabase
 */
export async function testSupabaseConnection(): Promise<ConnectionTestResult> {
  const timestamp = new Date().toISOString();
  
  try {
    console.log('🔄 Testando conexão com Supabase...');
    
    // Verificar se as variáveis de ambiente estão configuradas
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
    
    if (!supabaseUrl || !supabaseKey) {
      return {
        success: false,
        message: 'Variáveis de ambiente não configuradas',
        details: {
          hasUrl: !!supabaseUrl,
          hasKey: !!supabaseKey,
          urlValue: supabaseUrl,
          keyValue: supabaseKey ? `${supabaseKey.substring(0, 10)}...` : 'undefined'
        },
        timestamp
      };
    }
    
    if (supabaseUrl === 'https://your-project.supabase.co' || supabaseKey === 'your-anon-key') {
      return {
        success: false,
        message: 'Variáveis de ambiente contêm valores padrão. Configure com suas credenciais reais.',
        details: {
          needsConfiguration: true,
          currentUrl: supabaseUrl,
          currentKey: supabaseKey.substring(0, 10) + '...'
        },
        timestamp
      };
    }

    // Teste 1: Verificar se o cliente foi inicializado
    if (!supabase) {
      return {
        success: false,
        message: 'Cliente Supabase não foi inicializado',
        timestamp
      };
    }

    // Teste 2: Verificar autenticação (obter sessão atual)
    console.log('📡 Verificando sessão de autenticação...');
    const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
    
    if (sessionError) {
      console.warn('⚠️ Erro na verificação de sessão:', sessionError);
    }

    // Teste 3: Fazer uma consulta simples às tabelas (verificar se existem)
    console.log('🗄️ Testando acesso às tabelas...');
    
    const tableTests = await Promise.allSettled([
      // Testar tabela users
      supabase.from('users').select('count', { count: 'exact', head: true }),
      // Testar tabela customers
      supabase.from('customers').select('count', { count: 'exact', head: true }),
      // Testar tabela appointments
      supabase.from('appointments').select('count', { count: 'exact', head: true }),
      // Testar tabela appointment_metrics
      supabase.from('appointment_metrics').select('count', { count: 'exact', head: true })
    ]);

    const tableResults = {
      users: tableTests[0],
      customers: tableTests[1], 
      appointments: tableTests[2],
      appointment_metrics: tableTests[3]
    };

    // Verificar quais tabelas estão acessíveis
    const accessibleTables: string[] = [];
    const failedTables: string[] = [];

    Object.entries(tableResults).forEach(([tableName, result]) => {
      if (result.status === 'fulfilled' && !result.value.error) {
        accessibleTables.push(tableName);
      } else {
        failedTables.push(tableName);
        console.warn(`❌ Erro ao acessar tabela ${tableName}:`, 
          result.status === 'rejected' ? result.reason : result.value.error);
      }
    });

    // Teste 4: Verificar políticas RLS (se usuário estiver autenticado)
    let rlsTest = null;
    if (sessionData.session?.user) {
      console.log('🔐 Testando políticas RLS...');
      try {
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('id, name')
          .eq('id', sessionData.session.user.id)
          .maybeSingle();
        
        rlsTest = {
          success: !userError,
          error: userError?.message,
          hasUserData: !!userData
        };
      } catch (error) {
        rlsTest = {
          success: false,
          error: error instanceof Error ? error.message : 'Erro desconhecido'
        };
      }
    }

    const allTablesAccessible = accessibleTables.length === 4;
    const hasConnection = accessibleTables.length > 0;

    return {
      success: hasConnection,
      message: hasConnection 
        ? allTablesAccessible 
          ? '✅ Conexão com Supabase estabelecida com sucesso! Todas as tabelas estão acessíveis.'
          : `⚠️ Conexão parcial com Supabase. ${accessibleTables.length}/4 tabelas acessíveis.`
        : '❌ Falha na conexão com Supabase. Nenhuma tabela acessível.',
      details: {
        environment: {
          url: supabaseUrl,
          keyPrefix: supabaseKey.substring(0, 10) + '...'
        },
        session: {
          isAuthenticated: !!sessionData.session?.user,
          userId: sessionData.session?.user?.id,
          email: sessionData.session?.user?.email
        },
        tables: {
          accessible: accessibleTables,
          failed: failedTables,
          total: accessibleTables.length
        },
        rls: rlsTest,
        errors: failedTables.map(table => {
          const result = tableResults[table as keyof typeof tableResults];
          return {
            table,
            error: result.status === 'rejected' 
              ? result.reason 
              : (result as any).value?.error
          };
        })
      },
      timestamp
    };

  } catch (error) {
    console.error('💥 Erro crítico no teste de conexão:', error);
    
    return {
      success: false,
      message: `Erro crítico na conexão: ${error instanceof Error ? error.message : 'Erro desconhecido'}`,
      details: {
        error: error instanceof Error ? {
          name: error.name,
          message: error.message,
          stack: error.stack
        } : error
      },
      timestamp
    };
  }
}

/**
 * Executa teste de conexão e exibe logs detalhados
 */
export async function runConnectionTest(): Promise<void> {
  console.log('\n🚀 Iniciando teste de conexão com Supabase...\n');
  
  const result = await testSupabaseConnection();
  
  // Exibir resultado principal
  console.log(`\n${result.success ? '✅' : '❌'} ${result.message}\n`);
  
  // Exibir detalhes se disponíveis
  if (result.details) {
    console.log('📋 Detalhes da conexão:');
    console.log(JSON.stringify(result.details, null, 2));
  }
  
  console.log(`\n⏰ Teste realizado em: ${result.timestamp}\n`);
  
  // Exibir próximos passos se necessário
  if (!result.success) {
    console.log('🔧 Próximos passos para resolver:');
    console.log('1. Verifique se as variáveis de ambiente estão configuradas corretamente no arquivo .env');
    console.log('2. Confirme se o projeto Supabase está ativo e acessível');
    console.log('3. Verifique se as migrações foram executadas no banco de dados');
    console.log('4. Confirme se as políticas RLS estão configuradas corretamente');
  }
}