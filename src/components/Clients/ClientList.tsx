import React, { useState, useEffect } from 'react';
import { Users, Phone, Mail, Plus, Search, Calendar } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CustomerService } from '../../services/customerService';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const ClientList: React.FC = () => {
  const { clients, appointments } = useApp();
  const [searchTerm, setSearchTerm] = useState('');
  const [realTimeClients, setRealTimeClients] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lastSync, setLastSync] = useState<Date | null>(null);

  const customerService = CustomerService.getInstance();

  // Load real-time clients from database
  useEffect(() => {
    const loadRealTimeClients = async () => {
      try {
        setLoading(true);
        const result = await customerService.getCustomers(1, 1000, {
          search: '',
          status: 'active',
          country: '',
          dateRange: { start: '', end: '' }
        });
        
        // Convert customer format to client format for compatibility
        const convertedClients = result.customers.map(customer => ({
          id: customer.customer_id.toString(),
          name: `${customer.first_name} ${customer.last_name}`,
          phone: customer.phone_number || '',
          email: customer.email,
          createdAt: new Date(customer.created_at)
        }));
        
        setRealTimeClients(convertedClients);
        setLastSync(new Date());
        console.log('ClientList: Clientes carregados do banco:', convertedClients.length);
      } catch (error) {
        console.error('Erro ao carregar clientes em tempo real:', error);
        setRealTimeClients([]);
      } finally {
        setLoading(false);
      }
    };

    loadRealTimeClients();
    
    // Refresh every 30 seconds to keep data synchronized
    const interval = setInterval(loadRealTimeClients, 30000);
    
    return () => clearInterval(interval);
  }, []);

  // Combine local clients with real-time clients, avoiding duplicates
  const allClients = React.useMemo(() => {
    const combined = [...clients];
    
    // Add real-time clients that don't exist in local clients
    realTimeClients.forEach(rtClient => {
      const exists = clients.some(localClient => 
        localClient.phone === rtClient.phone || 
        (localClient.email && rtClient.email && localClient.email === rtClient.email)
      );
      
      if (!exists) {
        combined.push(rtClient);
      }
    });
    
    console.log('ClientList: Total de clientes combinados:', combined.length);
    return combined;
  }, [clients, realTimeClients]);

  const filteredClients = allClients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.phone.includes(searchTerm)
  );

  const getClientAppointments = (clientId: string) => {
    return appointments.filter(apt => apt.clientId === clientId);
  };

  const getLastAppointment = (clientId: string) => {
    const clientAppointments = getClientAppointments(clientId);
    return clientAppointments
      .filter(apt => apt.date < new Date())
      .sort((a, b) => b.date.getTime() - a.date.getTime())[0];
  };

  const getNextAppointment = (clientId: string) => {
    const clientAppointments = getClientAppointments(clientId);
    return clientAppointments
      .filter(apt => apt.date >= new Date())
      .sort((a, b) => a.date.getTime() - b.date.getTime())[0];
  };

  if (loading) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-500">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  if (filteredClients.length === 0 && !searchTerm) {
    return (
      <div className="bg-white rounded-2xl p-8 border border-gray-200">
        <div className="text-center">
          <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cliente cadastrado</h3>
          <p className="text-gray-500 mb-6">Os clientes aparecerão aqui automaticamente quando você criar agendamentos</p>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-left">
            <h4 className="font-medium text-blue-900 mb-2">💡 Como funciona o cadastro automático:</h4>
            <ul className="text-sm text-blue-800 space-y-1">
              <li>• Ao criar um novo agendamento, o cliente é automaticamente registrado</li>
              <li>• As informações são sincronizadas em tempo real</li>
              <li>• Você pode gerenciar todos os clientes na seção "Gestão de Clientes"</li>
            </ul>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row gap-4 justify-between items-start sm:items-center">
        <div>
          <h1 className="text-2xl font-semibold text-dark-900">Clientes</h1>
          <p className="text-gray-600">
            {filteredClients.length} clientes cadastrados
            {lastSync && (
              <span className="ml-2 text-green-600 text-sm">
                • Última sincronização: {format(lastSync, 'HH:mm')}
              </span>
            )}
          </p>
        </div>
        
        <div className="relative w-full sm:w-auto">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="Buscar clientes..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Client Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredClients.map((client) => {
          const lastAppointment = getLastAppointment(client.id);
          const nextAppointment = getNextAppointment(client.id);
          const totalAppointments = getClientAppointments(client.id).length;

          return (
            <div 
              key={client.id}
              className="bg-white rounded-2xl p-6 border border-gray-200 hover:shadow-card transition-all duration-200"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <h3 className="font-semibold text-dark-900 text-lg mb-1">{client.name}</h3>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span className="text-sm">{client.phone}</span>
                    </div>
                    {client.email && (
                      <div className="flex items-center gap-2 text-gray-600">
                        <Mail className="w-4 h-4" />
                        <span className="text-sm">{client.email}</span>
                      </div>
                    )}
                  </div>
                </div>
                <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center">
                  <span className="text-primary-800 font-semibold">
                    {client.name.charAt(0).toUpperCase()}
                  </span>
                </div>
              </div>

              <div className="space-y-3 pt-4 border-t border-gray-100">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-600">Total de agendamentos:</span>
                  <span className="font-semibold text-dark-900">{totalAppointments}</span>
                </div>

                {lastAppointment && (
                  <div className="text-sm">
                    <span className="text-gray-600">Último agendamento:</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4 text-gray-400" />
                      <span className="text-gray-800">
                        {format(lastAppointment.date, 'dd/MM/yyyy', { locale: ptBR })} - {lastAppointment.serviceName}
                      </span>
                    </div>
                  </div>
                )}

                {nextAppointment && (
                  <div className="text-sm">
                    <span className="text-gray-600">Próximo agendamento:</span>
                    <div className="flex items-center gap-1 mt-1">
                      <Calendar className="w-4 h-4 text-primary-500" />
                      <span className="text-primary-700 font-medium">
                        {format(nextAppointment.date, 'dd/MM/yyyy HH:mm', { locale: ptBR })}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 pt-4 border-t border-gray-100">
                <button className="w-full bg-primary-100 hover:bg-primary-200 text-primary-800 py-2 rounded-xl font-medium transition-colors text-sm">
                  Ver Histórico
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {filteredClients.length === 0 && searchTerm && (
        <div className="text-center py-12">
          <Search className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cliente encontrado</h3>
          <p className="text-gray-500">Tente alterar os termos da busca</p>
        </div>
      )}
    </div>
  );
};

export default ClientList;