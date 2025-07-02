import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, Filter, Calendar, Phone, Mail, 
  ChevronDown, ChevronUp, Plus, Eye, Edit, Trash2,
  SortAsc, SortDesc, Download, RefreshCw
} from 'lucide-react';
import { Customer, CustomerFilters, PaginationInfo } from '../../types/customer';
import { CustomerService } from '../../services/customerService';
import { AppointmentService } from '../../services/appointmentService';
import { useApp } from '../../context/AppContext';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface CustomerWithLastAppointment extends Customer {
  last_appointment_date?: string;
  last_appointment_service?: string;
  total_appointments?: number;
}

interface AdvancedFilters extends CustomerFilters {
  lastAppointmentFrom: string;
  lastAppointmentTo: string;
  phoneOrEmail: string;
  sortBy: 'name' | 'email' | 'last_appointment' | 'created_at';
  sortDirection: 'asc' | 'desc';
}

const CustomerListAdvanced: React.FC = () => {
  const [customers, setCustomers] = useState<CustomerWithLastAppointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [selectedCustomers, setSelectedCustomers] = useState<Set<number>>(new Set());
  
  const [filters, setFilters] = useState<AdvancedFilters>({
    search: '',
    status: 'all',
    country: '',
    dateRange: { start: '', end: '' },
    lastAppointmentFrom: '',
    lastAppointmentTo: '',
    phoneOrEmail: '',
    sortBy: 'name',
    sortDirection: 'asc'
  });

  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });

  const customerService = CustomerService.getInstance();
  const appointmentService = AppointmentService.getInstance();
  const { refreshCustomerCount } = useApp();

  const loadCustomersWithAppointments = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('CustomerListAdvanced: Carregando clientes com agendamentos...');

      // 1. Buscar clientes do banco
      const customerFilters: CustomerFilters = {
        search: filters.search,
        status: filters.status,
        country: filters.country,
        dateRange: filters.dateRange
      };

      const result = await customerService.getCustomers(
        pagination.currentPage, 
        pagination.itemsPerPage, 
        customerFilters
      );

      // 2. Para cada cliente, buscar último agendamento
      const customersWithAppointments: CustomerWithLastAppointment[] = [];
      
      for (const customer of result.customers) {
        try {
          // Buscar agendamentos do cliente
          const appointments = await appointmentService.getAppointments();
          const customerAppointments = appointments.filter(apt => 
            apt.clientId === customer.customer_id.toString()
          );

          // Encontrar último agendamento
          const lastAppointment = customerAppointments
            .sort((a, b) => b.date.getTime() - a.date.getTime())[0];

          const customerWithAppointment: CustomerWithLastAppointment = {
            ...customer,
            last_appointment_date: lastAppointment ? lastAppointment.date.toISOString() : undefined,
            last_appointment_service: lastAppointment ? lastAppointment.serviceName : undefined,
            total_appointments: customerAppointments.length
          };

          customersWithAppointments.push(customerWithAppointment);
        } catch (error) {
          console.warn(`Erro ao buscar agendamentos para cliente ${customer.customer_id}:`, error);
          // Adicionar cliente sem dados de agendamento
          customersWithAppointments.push({
            ...customer,
            total_appointments: 0
          });
        }
      }

      // 3. Aplicar filtros adicionais
      let filteredCustomers = customersWithAppointments;

      // Filtro por telefone ou email
      if (filters.phoneOrEmail) {
        const searchTerm = filters.phoneOrEmail.toLowerCase();
        filteredCustomers = filteredCustomers.filter(customer =>
          customer.phone_number?.toLowerCase().includes(searchTerm) ||
          customer.email.toLowerCase().includes(searchTerm)
        );
      }

      // Filtro por data do último agendamento
      if (filters.lastAppointmentFrom || filters.lastAppointmentTo) {
        filteredCustomers = filteredCustomers.filter(customer => {
          if (!customer.last_appointment_date) return false;
          
          const appointmentDate = new Date(customer.last_appointment_date);
          const fromDate = filters.lastAppointmentFrom ? new Date(filters.lastAppointmentFrom) : null;
          const toDate = filters.lastAppointmentTo ? new Date(filters.lastAppointmentTo) : null;

          if (fromDate && appointmentDate < fromDate) return false;
          if (toDate && appointmentDate > toDate) return false;
          
          return true;
        });
      }

      // 4. Aplicar ordenação
      filteredCustomers.sort((a, b) => {
        let aValue: any, bValue: any;

        switch (filters.sortBy) {
          case 'name':
            aValue = `${a.first_name} ${a.last_name}`.toLowerCase();
            bValue = `${b.first_name} ${b.last_name}`.toLowerCase();
            break;
          case 'email':
            aValue = a.email.toLowerCase();
            bValue = b.email.toLowerCase();
            break;
          case 'last_appointment':
            aValue = a.last_appointment_date ? new Date(a.last_appointment_date).getTime() : 0;
            bValue = b.last_appointment_date ? new Date(b.last_appointment_date).getTime() : 0;
            break;
          case 'created_at':
            aValue = new Date(a.created_at).getTime();
            bValue = new Date(b.created_at).getTime();
            break;
          default:
            aValue = a.first_name.toLowerCase();
            bValue = b.first_name.toLowerCase();
        }

        if (filters.sortDirection === 'asc') {
          return aValue < bValue ? -1 : aValue > bValue ? 1 : 0;
        } else {
          return aValue > bValue ? -1 : aValue < bValue ? 1 : 0;
        }
      });

      setCustomers(filteredCustomers);
      setPagination(result.pagination);
      
      console.log('CustomerListAdvanced: Clientes carregados:', filteredCustomers.length);
    } catch (err) {
      console.error('CustomerListAdvanced: Erro ao carregar clientes:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

  useEffect(() => {
    loadCustomersWithAppointments();
  }, [loadCustomersWithAppointments]);

  const handleFilterChange = (key: keyof AdvancedFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSort = (field: AdvancedFilters['sortBy']) => {
    if (filters.sortBy === field) {
      handleFilterChange('sortDirection', filters.sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      handleFilterChange('sortBy', field);
      handleFilterChange('sortDirection', 'asc');
    }
  };

  const handleSelectCustomer = (customerId: number) => {
    const newSelected = new Set(selectedCustomers);
    if (newSelected.has(customerId)) {
      newSelected.delete(customerId);
    } else {
      newSelected.add(customerId);
    }
    setSelectedCustomers(newSelected);
  };

  const handleSelectAll = () => {
    if (selectedCustomers.size === customers.length) {
      setSelectedCustomers(new Set());
    } else {
      setSelectedCustomers(new Set(customers.map(c => c.customer_id)));
    }
  };

  const createAppointmentForCustomer = (customer: CustomerWithLastAppointment) => {
    // Implementar navegação para criar agendamento com cliente pré-selecionado
    console.log('Criar agendamento para cliente:', customer);
    // Aqui você pode usar um callback ou context para navegar para o formulário de agendamento
  };

  const exportToCSV = () => {
    const headers = [
      'ID', 'Nome Completo', 'Email', 'Telefone', 'Status', 
      'Último Agendamento', 'Serviço', 'Total Agendamentos', 'Cadastrado em'
    ];

    const csvData = customers.map(customer => [
      customer.customer_id,
      `${customer.first_name} ${customer.last_name}`,
      customer.email,
      customer.phone_number || 'N/A',
      customer.status === 'active' ? 'Ativo' : 'Inativo',
      customer.last_appointment_date 
        ? format(new Date(customer.last_appointment_date), 'dd/MM/yyyy', { locale: ptBR })
        : 'Nunca',
      customer.last_appointment_service || 'N/A',
      customer.total_appointments || 0,
      format(new Date(customer.created_at), 'dd/MM/yyyy', { locale: ptBR })
    ]);

    const csvContent = [headers, ...csvData]
      .map(row => row.map(cell => `"${cell}"`).join(','))
      .join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `clientes_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
  };

  const getSortIcon = (field: AdvancedFilters['sortBy']) => {
    if (filters.sortBy !== field) return null;
    return filters.sortDirection === 'asc' 
      ? <SortAsc className="w-4 h-4 text-primary-600" />
      : <SortDesc className="w-4 h-4 text-primary-600" />;
  };

  const getStatusBadge = (status: Customer['status']) => {
    return status === 'active' 
      ? 'bg-green-100 text-green-800 border-green-200'
      : 'bg-red-100 text-red-800 border-red-200';
  };

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando lista de clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 mb-6">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-dark-900 flex items-center gap-3">
                <Users className="w-8 h-8 text-primary-500" />
                Lista Completa de Clientes
              </h1>
              <p className="text-gray-600 mt-2">
                {customers.length} clientes encontrados
                {selectedCustomers.size > 0 && (
                  <span className="ml-2 text-primary-600 font-medium">
                    • {selectedCustomers.size} selecionados
                  </span>
                )}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <button
                onClick={() => setShowFilters(!showFilters)}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl border transition-colors ${
                  showFilters 
                    ? 'bg-primary-100 border-primary-300 text-primary-800' 
                    : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                <Filter className="w-4 h-4" />
                Filtros
                {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              
              <button
                onClick={loadCustomersWithAppointments}
                disabled={loading}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                Atualizar
              </button>
              
              <button
                onClick={exportToCSV}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl font-medium transition-colors"
              >
                <Download className="w-4 h-4" />
                Exportar CSV
              </button>
            </div>
          </div>
        </div>

        {/* Filters Panel */}
        {showFilters && (
          <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 mb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Buscar por nome
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    value={filters.search}
                    onChange={(e) => handleFilterChange('search', e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="Nome do cliente..."
                  />
                </div>
              </div>

              {/* Phone or Email */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Telefone ou Email
                </label>
                <input
                  type="text"
                  value={filters.phoneOrEmail}
                  onChange={(e) => handleFilterChange('phoneOrEmail', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                  placeholder="Telefone ou email..."
                />
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="all">Todos</option>
                  <option value="active">Ativo</option>
                  <option value="inactive">Inativo</option>
                </select>
              </div>

              {/* Sort By */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Ordenar por
                </label>
                <select
                  value={filters.sortBy}
                  onChange={(e) => handleFilterChange('sortBy', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                >
                  <option value="name">Nome</option>
                  <option value="email">Email</option>
                  <option value="last_appointment">Último Agendamento</option>
                  <option value="created_at">Data de Cadastro</option>
                </select>
              </div>

              {/* Last Appointment From */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Último agendamento de
                </label>
                <input
                  type="date"
                  value={filters.lastAppointmentFrom}
                  onChange={(e) => handleFilterChange('lastAppointmentFrom', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>

              {/* Last Appointment To */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Último agendamento até
                </label>
                <input
                  type="date"
                  value={filters.lastAppointmentTo}
                  onChange={(e) => handleFilterChange('lastAppointmentTo', e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                />
              </div>
            </div>

            {/* Clear Filters */}
            <div className="mt-4 pt-4 border-t border-gray-200">
              <button
                onClick={() => setFilters({
                  search: '',
                  status: 'all',
                  country: '',
                  dateRange: { start: '', end: '' },
                  lastAppointmentFrom: '',
                  lastAppointmentTo: '',
                  phoneOrEmail: '',
                  sortBy: 'name',
                  sortDirection: 'asc'
                })}
                className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Limpar todos os filtros
              </button>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-6">
            <p className="text-red-800">{error}</p>
          </div>
        )}

        {/* Customer Table */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-4 text-left">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.size === customers.length && customers.length > 0}
                      onChange={handleSelectAll}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                    />
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('name')}
                  >
                    <div className="flex items-center gap-2">
                      Nome Completo
                      {getSortIcon('name')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('email')}
                  >
                    <div className="flex items-center gap-2">
                      Email
                      {getSortIcon('email')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Telefone</th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('last_appointment')}
                  >
                    <div className="flex items-center gap-2">
                      Último Agendamento
                      {getSortIcon('last_appointment')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Status</th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr 
                    key={customer.customer_id} 
                    className={`hover:bg-gray-50 transition-colors ${
                      selectedCustomers.has(customer.customer_id) ? 'bg-primary-50' : ''
                    }`}
                  >
                    <td className="px-6 py-4">
                      <input
                        type="checkbox"
                        checked={selectedCustomers.has(customer.customer_id)}
                        onChange={() => handleSelectCustomer(customer.customer_id)}
                        className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                      />
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          <span className="text-primary-700 font-medium text-sm">
                            {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                          </span>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {customer.first_name} {customer.last_name}
                          </p>
                          <p className="text-xs text-gray-500">ID: {customer.customer_id}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <Mail className="w-4 h-4 text-gray-400" />
                        <span className="text-sm text-gray-600">{customer.email}</span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {customer.phone_number ? (
                        <div className="flex items-center gap-2">
                          <Phone className="w-4 h-4 text-gray-400" />
                          <span className="text-sm text-gray-600">{customer.phone_number}</span>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">N/A</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      {customer.last_appointment_date ? (
                        <div>
                          <div className="flex items-center gap-2">
                            <Calendar className="w-4 h-4 text-gray-400" />
                            <span className="text-sm text-gray-900">
                              {format(new Date(customer.last_appointment_date), 'dd/MM/yyyy', { locale: ptBR })}
                            </span>
                          </div>
                          {customer.last_appointment_service && (
                            <p className="text-xs text-gray-500 mt-1">{customer.last_appointment_service}</p>
                          )}
                          <p className="text-xs text-gray-500">
                            {customer.total_appointments} agendamento{customer.total_appointments !== 1 ? 's' : ''}
                          </p>
                        </div>
                      ) : (
                        <span className="text-sm text-gray-400">Nunca agendou</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(customer.status)}`}>
                        {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => createAppointmentForCustomer(customer)}
                          className="p-2 text-primary-600 hover:text-primary-800 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Criar Agendamento"
                        >
                          <Plus className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Cards */}
          <div className="lg:hidden divide-y divide-gray-200">
            {customers.map((customer) => (
              <div 
                key={customer.customer_id} 
                className={`p-4 ${selectedCustomers.has(customer.customer_id) ? 'bg-primary-50' : ''}`}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={selectedCustomers.has(customer.customer_id)}
                      onChange={() => handleSelectCustomer(customer.customer_id)}
                      className="rounded border-gray-300 text-primary-600 focus:ring-primary-500 mt-1"
                    />
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-medium">
                        {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">ID: {customer.customer_id}</p>
                    </div>
                  </div>
                  <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium border ${getStatusBadge(customer.status)}`}>
                    {customer.status === 'active' ? 'Ativo' : 'Inativo'}
                  </span>
                </div>
                
                <div className="space-y-2 mb-4">
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Mail className="w-4 h-4" />
                    <span>{customer.email}</span>
                  </div>
                  {customer.phone_number && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Phone className="w-4 h-4" />
                      <span>{customer.phone_number}</span>
                    </div>
                  )}
                  {customer.last_appointment_date ? (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <Calendar className="w-4 h-4" />
                      <div>
                        <span>Último: {format(new Date(customer.last_appointment_date), 'dd/MM/yyyy', { locale: ptBR })}</span>
                        {customer.last_appointment_service && (
                          <p className="text-xs text-gray-500">{customer.last_appointment_service}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 text-sm text-gray-400">
                      <Calendar className="w-4 h-4" />
                      <span>Nunca agendou</span>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => createAppointmentForCustomer(customer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-primary-700 bg-primary-100 hover:bg-primary-200 rounded-lg transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Agendar
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors">
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                  <button className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors">
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Empty State */}
          {customers.length === 0 && !loading && (
            <div className="text-center py-12">
              <Users className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum cliente encontrado</h3>
              <p className="text-gray-500 mb-6">
                Tente ajustar os filtros ou verifique se há clientes cadastrados no sistema
              </p>
            </div>
          )}
        </div>

        {/* Bulk Actions */}
        {selectedCustomers.size > 0 && (
          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 bg-white rounded-2xl shadow-lg border border-gray-200 p-4 z-50">
            <div className="flex items-center gap-4">
              <span className="text-sm font-medium text-gray-700">
                {selectedCustomers.size} cliente{selectedCustomers.size !== 1 ? 's' : ''} selecionado{selectedCustomers.size !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-2">
                <button className="px-4 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl font-medium transition-colors">
                  Criar Agendamentos
                </button>
                <button className="px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-xl transition-colors">
                  Exportar Selecionados
                </button>
                <button 
                  onClick={() => setSelectedCustomers(new Set())}
                  className="px-4 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerListAdvanced;