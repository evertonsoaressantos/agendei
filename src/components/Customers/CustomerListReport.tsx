import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, MapPin, Calendar, Search, Download, FileText, AlertCircle, CheckCircle, Loader } from 'lucide-react';
import { CustomerService } from '../../services/customerService';
import { Customer } from '../../types/customer';
import { useApp } from '../../context/AppContext';

const CustomerListReport: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [localClients, setLocalClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [totalCount, setTotalCount] = useState(0);

  const { clients } = useApp();
  const customerService = CustomerService.getInstance();

  useEffect(() => {
    loadAllCustomerData();
  }, []);

  const loadAllCustomerData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('CustomerListReport: Carregando todos os dados de clientes...');

      // 1. Carregar clientes do banco de dados (Supabase)
      try {
        const result = await customerService.getCustomers(1, 1000, {
          search: '',
          status: 'all',
          country: '',
          dateRange: { start: '', end: '' }
        });
        
        setCustomers(result.customers);
        setTotalCount(result.pagination.totalItems);
        console.log('CustomerListReport: Clientes do banco carregados:', result.customers.length);
      } catch (dbError) {
        console.warn('CustomerListReport: Erro ao carregar do banco:', dbError);
        setCustomers([]);
      }

      // 2. Carregar clientes locais (localStorage)
      setLocalClients(clients);
      console.log('CustomerListReport: Clientes locais carregados:', clients.length);

      // 3. Carregar dados do localStorage diretamente
      try {
        const savedClients = localStorage.getItem('clients');
        if (savedClients) {
          const parsed = JSON.parse(savedClients);
          console.log('CustomerListReport: Dados diretos do localStorage:', parsed.length);
        }
      } catch (localError) {
        console.warn('CustomerListReport: Erro ao carregar localStorage:', localError);
      }

    } catch (error) {
      console.error('CustomerListReport: Erro geral:', error);
      setError('Erro ao carregar dados dos clientes');
    } finally {
      setLoading(false);
    }
  };

  // Combinar todos os clientes (banco + local) removendo duplicatas
  const allClients = React.useMemo(() => {
    const combined = [...customers];
    
    // Adicionar clientes locais que não existem no banco
    localClients.forEach(localClient => {
      const exists = customers.some(dbClient => 
        dbClient.phone_number === localClient.phone || 
        (dbClient.email && localClient.email && dbClient.email === localClient.email)
      );
      
      if (!exists) {
        // Converter formato local para formato do banco
        const nameParts = localClient.name.split(' ');
        combined.push({
          customer_id: parseInt(localClient.id.replace(/\D/g, '')) || Date.now(),
          first_name: nameParts[0] || 'Cliente',
          last_name: nameParts.slice(1).join(' ') || 'Local',
          email: localClient.email || `${nameParts[0]?.toLowerCase() || 'cliente'}@local.temp`,
          phone_number: localClient.phone,
          address: '',
          city: '',
          state_province: '',
          postal_code: '',
          country: '',
          status: 'active' as const,
          created_at: localClient.createdAt?.toISOString() || new Date().toISOString(),
          updated_at: localClient.createdAt?.toISOString() || new Date().toISOString(),
          user_id: 'local'
        });
      }
    });
    
    return combined;
  }, [customers, localClients]);

  // Filtrar clientes baseado na busca
  const filteredClients = allClients.filter(client => {
    const searchLower = searchTerm.toLowerCase();
    const fullName = `${client.first_name} ${client.last_name}`.toLowerCase();
    const email = client.email.toLowerCase();
    const phone = client.phone_number || '';
    
    return fullName.includes(searchLower) || 
           email.includes(searchLower) || 
           phone.includes(searchLower);
  });

  const exportToCSV = () => {
    const headers = ['ID', 'Nome Completo', 'Email', 'Telefone', 'Endereço', 'Status', 'Origem', 'Data de Cadastro'];
    
    const csvData = filteredClients.map(client => [
      client.customer_id,
      `${client.first_name} ${client.last_name}`,
      client.email,
      client.phone_number || 'N/A',
      client.address || 'N/A',
      client.status === 'active' ? 'Ativo' : 'Inativo',
      client.user_id === 'local' ? 'Local' : 'Banco de Dados',
      new Date(client.created_at).toLocaleDateString('pt-BR')
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${new Date().toISOString().split('T')[0]}.csv`;
    link.click();
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader className="w-12 h-12 animate-spin text-primary-500 mx-auto mb-4" />
          <p className="text-gray-600">Carregando dados dos clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 mb-6">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-dark-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary-500" />
                Relatório Completo de Clientes
              </h1>
              <p className="text-gray-600 mt-2">
                Lista completa de todos os clientes cadastrados no sistema
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
              <button
                onClick={loadAllCustomerData}
                className="flex items-center gap-2 px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
              >
                <FileText className="w-4 h-4" />
                Atualizar
              </button>
            </div>
          </div>
        </div>

        {/* Statistics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Total de Clientes</p>
                <p className="text-2xl font-bold text-dark-900">{allClients.length}</p>
              </div>
              <Users className="w-8 h-8 text-primary-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">No Banco de Dados</p>
                <p className="text-2xl font-bold text-green-600">{customers.length}</p>
              </div>
              <CheckCircle className="w-8 h-8 text-green-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Apenas Local</p>
                <p className="text-2xl font-bold text-yellow-600">{allClients.length - customers.length}</p>
              </div>
              <AlertCircle className="w-8 h-8 text-yellow-500" />
            </div>
          </div>
          
          <div className="bg-white rounded-2xl p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Clientes Ativos</p>
                <p className="text-2xl font-bold text-blue-600">
                  {allClients.filter(c => c.status === 'active').length}
                </p>
              </div>
              <CheckCircle className="w-8 h-8 text-blue-500" />
            </div>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes por nome, email ou telefone..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-5 h-5 text-red-600" />
              <p className="text-red-800">{error}</p>
            </div>
          </div>
        )}

        {/* Results Summary */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-dark-900">
                Resultados da Busca
              </h3>
              <p className="text-gray-600">
                {searchTerm 
                  ? `${filteredClients.length} clientes encontrados para "${searchTerm}"`
                  : `Mostrando todos os ${allClients.length} clientes cadastrados`
                }
              </p>
            </div>
          </div>
        </div>

        {/* Customer List */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 overflow-hidden">
          {filteredClients.length === 0 ? (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                {searchTerm ? 'Nenhum cliente encontrado' : 'Nenhum cliente cadastrado'}
              </h3>
              <p className="text-gray-500 mb-6">
                {searchTerm 
                  ? 'Tente alterar os termos da busca ou verificar a ortografia'
                  : 'O banco de dados está vazio. Nenhum cliente foi cadastrado ainda.'
                }
              </p>
              
              {!searchTerm && (
                <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 max-w-md mx-auto">
                  <h4 className="font-medium text-blue-900 mb-2">💡 Como cadastrar clientes:</h4>
                  <ul className="text-sm text-blue-800 text-left space-y-1">
                    <li>• Crie um novo agendamento - o cliente será registrado automaticamente</li>
                    <li>• Use a seção "Gestão de Clientes" para cadastro manual</li>
                    <li>• Os dados são sincronizados entre localStorage e banco de dados</li>
                  </ul>
                </div>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">ID</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Nome Completo</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Contato</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Localização</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Origem</th>
                    <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Cadastrado em</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredClients.map((client, index) => (
                    <tr key={`${client.customer_id}-${index}`} className="hover:bg-gray-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-medium text-gray-900">
                        #{client.customer_id}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                            <span className="text-primary-700 font-medium text-sm">
                              {client.first_name.charAt(0)}{client.last_name.charAt(0)}
                            </span>
                          </div>
                          <div>
                            <p className="text-sm font-medium text-gray-900">
                              {client.first_name} {client.last_name}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2 text-sm text-gray-600">
                            <Mail className="w-4 h-4" />
                            <span className="truncate max-w-48">{client.email}</span>
                          </div>
                          {client.phone_number && (
                            <div className="flex items-center gap-2 text-sm text-gray-600">
                              <Phone className="w-4 h-4" />
                              <span>{client.phone_number}</span>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        {client.city && client.country ? (
                          <div className="flex items-center gap-2">
                            <MapPin className="w-4 h-4" />
                            <span>{client.city}, {client.country}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400">N/A</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center gap-2 px-2 py-1 rounded-full text-xs font-medium ${
                          client.status === 'active' 
                            ? 'bg-green-100 text-green-800 border border-green-200'
                            : 'bg-red-100 text-red-800 border border-red-200'
                        }`}>
                          {client.status === 'active' ? (
                            <CheckCircle className="w-3 h-3" />
                          ) : (
                            <AlertCircle className="w-3 h-3" />
                          )}
                          {client.status === 'active' ? 'Ativo' : 'Inativo'}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                          client.user_id === 'local'
                            ? 'bg-yellow-100 text-yellow-800 border border-yellow-200'
                            : 'bg-green-100 text-green-800 border border-green-200'
                        }`}>
                          {client.user_id === 'local' ? 'Local' : 'Banco de Dados'}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-600">
                        <div className="flex items-center gap-2">
                          <Calendar className="w-4 h-4" />
                          <span>{new Date(client.created_at).toLocaleDateString('pt-BR')}</span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Debug Information */}
        <div className="mt-6 bg-gray-100 rounded-2xl p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Informações de Debug</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div className="bg-white p-4 rounded-xl">
              <h4 className="font-medium text-gray-900 mb-2">Banco de Dados (Supabase)</h4>
              <p className="text-gray-600">Clientes: {customers.length}</p>
              <p className="text-gray-600">Status: {customers.length > 0 ? '✅ Conectado' : '⚠️ Vazio ou desconectado'}</p>
            </div>
            <div className="bg-white p-4 rounded-xl">
              <h4 className="font-medium text-gray-900 mb-2">Armazenamento Local</h4>
              <p className="text-gray-600">Clientes: {localClients.length}</p>
              <p className="text-gray-600">Status: {localClients.length > 0 ? '✅ Com dados' : '⚠️ Vazio'}</p>
            </div>
            <div className="bg-white p-4 rounded-xl">
              <h4 className="font-medium text-gray-900 mb-2">Total Combinado</h4>
              <p className="text-gray-600">Clientes: {allClients.length}</p>
              <p className="text-gray-600">Únicos: {filteredClients.length} (após filtros)</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerListReport;