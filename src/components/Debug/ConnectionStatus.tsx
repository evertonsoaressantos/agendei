import React, { useState, useEffect } from 'react';
import { Wifi, WifiOff, RefreshCw, CheckCircle, AlertCircle, Database } from 'lucide-react';
import { testSupabaseConnection, ConnectionTestResult } from '../../utils/supabaseTest';

const ConnectionStatus: React.FC = () => {
  const [connectionResult, setConnectionResult] = useState<ConnectionTestResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showDetails, setShowDetails] = useState(false);

  const runTest = async () => {
    setIsLoading(true);
    try {
      const result = await testSupabaseConnection();
      setConnectionResult(result);
      console.log('Resultado do teste de conexão:', result);
    } catch (error) {
      console.error('Erro ao executar teste:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Executar teste inicial
    runTest();
  }, []);

  const getStatusIcon = () => {
    if (isLoading) {
      return <RefreshCw className="w-5 h-5 animate-spin text-blue-500" />;
    }
    
    if (!connectionResult) {
      return <WifiOff className="w-5 h-5 text-gray-400" />;
    }
    
    return connectionResult.success 
      ? <Wifi className="w-5 h-5 text-green-500" />
      : <WifiOff className="w-5 h-5 text-red-500" />;
  };

  const getStatusColor = () => {
    if (isLoading) return 'border-blue-200 bg-blue-50';
    if (!connectionResult) return 'border-gray-200 bg-gray-50';
    return connectionResult.success 
      ? 'border-green-200 bg-green-50' 
      : 'border-red-200 bg-red-50';
  };

  const getStatusText = () => {
    if (isLoading) return 'Testando conexão...';
    if (!connectionResult) return 'Status desconhecido';
    return connectionResult.success ? 'Conectado' : 'Desconectado';
  };

  return (
    <div className={`border rounded-xl p-4 ${getStatusColor()}`}>
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          {getStatusIcon()}
          <div>
            <h3 className="font-semibold text-gray-900">Status do Supabase</h3>
            <p className="text-sm text-gray-600">{getStatusText()}</p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="px-3 py-1 text-sm bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {showDetails ? 'Ocultar' : 'Detalhes'}
          </button>
          <button
            onClick={runTest}
            disabled={isLoading}
            className="px-3 py-1 text-sm bg-primary-500 text-dark-900 rounded-lg hover:bg-primary-600 disabled:opacity-50 transition-colors flex items-center gap-1"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            Testar
          </button>
        </div>
      </div>

      {connectionResult && (
        <div className="text-sm">
          <p className={`font-medium ${connectionResult.success ? 'text-green-700' : 'text-red-700'}`}>
            {connectionResult.message}
          </p>
          
          {connectionResult.details && (
            <div className="mt-2 text-xs text-gray-600">
              <p>Testado em: {new Date(connectionResult.timestamp).toLocaleString('pt-BR')}</p>
              
              {connectionResult.details.tables && (
                <p>Tabelas acessíveis: {connectionResult.details.tables.total}/4</p>
              )}
              
              {connectionResult.details.session && (
                <p>
                  Autenticado: {connectionResult.details.session.isAuthenticated ? 'Sim' : 'Não'}
                  {connectionResult.details.session.email && ` (${connectionResult.details.session.email})`}
                </p>
              )}
            </div>
          )}
        </div>
      )}

      {showDetails && connectionResult?.details && (
        <div className="mt-4 p-3 bg-white rounded-lg border border-gray-200">
          <h4 className="font-medium text-gray-900 mb-2 flex items-center gap-2">
            <Database className="w-4 h-4" />
            Detalhes Técnicos
          </h4>
          
          <div className="space-y-3 text-xs">
            {/* Environment */}
            {connectionResult.details.environment && (
              <div>
                <h5 className="font-medium text-gray-700">Ambiente:</h5>
                <div className="ml-2 space-y-1">
                  <p>URL: {connectionResult.details.environment.url}</p>
                  <p>Chave: {connectionResult.details.environment.keyPrefix}</p>
                </div>
              </div>
            )}

            {/* Tables */}
            {connectionResult.details.tables && (
              <div>
                <h5 className="font-medium text-gray-700">Tabelas:</h5>
                <div className="ml-2 space-y-1">
                  {connectionResult.details.tables.accessible.length > 0 && (
                    <div>
                      <span className="text-green-600">✅ Acessíveis:</span>
                      <span className="ml-1">{connectionResult.details.tables.accessible.join(', ')}</span>
                    </div>
                  )}
                  {connectionResult.details.tables.failed.length > 0 && (
                    <div>
                      <span className="text-red-600">❌ Falhas:</span>
                      <span className="ml-1">{connectionResult.details.tables.failed.join(', ')}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Errors */}
            {connectionResult.details.errors && connectionResult.details.errors.length > 0 && (
              <div>
                <h5 className="font-medium text-gray-700">Erros:</h5>
                <div className="ml-2 space-y-1">
                  {connectionResult.details.errors.map((error: any, index: number) => (
                    <div key={index} className="text-red-600">
                      <span className="font-medium">{error.table}:</span>
                      <span className="ml-1">{error.error?.message || 'Erro desconhecido'}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* RLS Test */}
            {connectionResult.details.rls && (
              <div>
                <h5 className="font-medium text-gray-700">Teste RLS:</h5>
                <div className="ml-2">
                  <span className={connectionResult.details.rls.success ? 'text-green-600' : 'text-red-600'}>
                    {connectionResult.details.rls.success ? '✅ Funcionando' : '❌ Falha'}
                  </span>
                  {connectionResult.details.rls.error && (
                    <p className="text-red-600 mt-1">{connectionResult.details.rls.error}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Configuration Help */}
      {connectionResult && !connectionResult.success && (
        <div className="mt-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-yellow-600 mt-0.5" />
            <div className="text-sm">
              <h5 className="font-medium text-yellow-800">Como configurar:</h5>
              <ol className="mt-1 text-yellow-700 space-y-1 list-decimal list-inside">
                <li>Acesse <a href="https://supabase.com/dashboard" target="_blank" rel="noopener noreferrer" className="underline">supabase.com/dashboard</a></li>
                <li>Crie um projeto ou selecione um existente</li>
                <li>Vá em Settings → API</li>
                <li>Copie a URL e a chave anon para o arquivo .env</li>
                <li>Execute as migrações no SQL Editor</li>
              </ol>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ConnectionStatus;