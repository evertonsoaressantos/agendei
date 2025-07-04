import React from 'react';
import { BarChart3, Clock } from 'lucide-react';

const CustomerListReport: React.FC = () => {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-8 text-center">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <BarChart3 className="w-8 h-8 text-primary-600" />
          </div>
          
          <h2 className="text-2xl font-semibold text-dark-900 mb-3">
            Relatórios
          </h2>
          
          <div className="flex items-center justify-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-gray-500" />
            <p className="text-gray-600 font-medium">
              Funcionalidades em breve!
            </p>
          </div>
          
          <p className="text-gray-500 text-sm leading-relaxed">
            Estamos trabalhando em relatórios avançados para ajudar você a analisar 
            seus dados de clientes e agendamentos de forma mais eficiente.
          </p>
          
          <div className="mt-6 bg-primary-50 border border-primary-200 rounded-xl p-4">
            <p className="text-primary-800 text-sm font-medium">
              💡 Em breve você poderá gerar relatórios detalhados sobre:
            </p>
            <ul className="text-primary-700 text-sm mt-2 space-y-1 text-left">
              <li>• Análise de clientes por período</li>
              <li>• Relatórios de agendamentos</li>
              <li>• Métricas de crescimento</li>
              <li>• Exportação em PDF e Excel</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerListReport;