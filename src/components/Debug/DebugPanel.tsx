import React, { useState } from 'react';
import { Bug, ChevronDown, ChevronUp } from 'lucide-react';
import ConnectionStatus from './ConnectionStatus';
import { runConnectionTest } from '../../utils/supabaseTest';

const DebugPanel: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);

  const handleRunFullTest = async () => {
    console.log('🔍 Executando teste completo de conexão...');
    await runConnectionTest();
  };

  return (
    <div className="fixed bottom-4 right-4 z-50">
      {/* Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="bg-gray-900 text-white p-3 rounded-full shadow-lg hover:bg-gray-800 transition-colors flex items-center gap-2"
      >
        <Bug className="w-5 h-5" />
        {isOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
      </button>

      {/* Debug Panel */}
      {isOpen && (
        <div className="absolute bottom-16 right-0 w-96 bg-white border border-gray-200 rounded-xl shadow-xl p-4 max-h-96 overflow-y-auto">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-gray-900 flex items-center gap-2">
              <Bug className="w-4 h-4" />
              Debug Panel
            </h3>
            <button
              onClick={handleRunFullTest}
              className="text-sm bg-blue-500 text-white px-3 py-1 rounded-lg hover:bg-blue-600 transition-colors"
            >
              Teste Completo
            </button>
          </div>

          <div className="space-y-4">
            <ConnectionStatus />
            
            <div className="text-xs text-gray-500 border-t pt-2">
              <p>💡 Este painel ajuda a diagnosticar problemas de conexão</p>
              <p>🔧 Verifique o console do navegador para logs detalhados</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DebugPanel;