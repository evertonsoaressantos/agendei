import React, { useState, useEffect, useCallback } from 'react';
import { 
  Users, Search, Edit, Trash2, Eye, 
  ChevronLeft, ChevronRight, AlertCircle, CheckCircle,
  Calendar, MapPin, Mail, Phone, SortAsc, SortDesc
} from 'lucide-react';
import { Customer, CustomerFilters, PaginationInfo } from '../../types/customer';
import { CustomerService } from '../../services/customerService';
import { useApp } from '../../context/AppContext';
import CustomerForm from './CustomerForm';
import CustomerDetails from './CustomerDetails';
import DeleteConfirmation from './DeleteConfirmation';

const CustomerList: React.FC = () => {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pagination, setPagination] = useState<PaginationInfo>({
    currentPage: 1,
    totalPages: 1,
    totalItems: 0,
    itemsPerPage: 20
  });

  const [filters, setFilters] = useState<CustomerFilters>({
    search: '',
    status: 'all',
    country: '',
    dateRange: { start: '', end: '' }
  });

  const [sortField, setSortField] = useState<keyof Customer>('created_at');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('desc');
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const customerService = CustomerService.getInstance();
  const { refreshCustomerCount } = useApp();

  const loadCustomers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('CustomerList: Carregando clientes...');
      
      const result = await customerService.getCustomers(pagination.currentPage, pagination.itemsPerPage, filters);
      setCustomers(result.customers);
      setPagination(result.pagination);
      
      console.log('CustomerList: Clientes carregados:', result.customers.length);
    } catch (err) {
      console.error('CustomerList: Erro ao carregar clientes:', err);
      setError(err instanceof Error ? err.message : 'Falha ao carregar clientes');
    } finally {
      setLoading(false);
    }
  }, [pagination.currentPage, pagination.itemsPerPage, filters]);

  useEffect(() => {
    loadCustomers();
  }, [loadCustomers]);

  const handleSearch = (searchTerm: string) => {
    console.log('CustomerList: Pesquisando:', searchTerm);
    setFilters(prev => ({ ...prev, search: searchTerm }));
    setPagination(prev => ({ ...prev, currentPage: 1 }));
  };

  const handleSort = (field: keyof Customer) => {
    if (sortField === field) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const handlePageChange = (page: number) => {
    setPagination(prev => ({ ...prev, currentPage: page }));
  };

  const handleEdit = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowForm(true);
  };

  const handleDelete = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDeleteConfirm(true);
  };

  const handleView = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowDetails(true);
  };

  const handleFormSuccess = async () => {
    console.log('CustomerList: Formulário salvo com sucesso');
    setShowForm(false);
    setSelectedCustomer(null);
    await loadCustomers();
    await refreshCustomerCount();
  };

  const handleDeleteSuccess = async () => {
    console.log('CustomerList: Cliente excluído com sucesso');
    setShowDeleteConfirm(false);
    setSelectedCustomer(null);
    await loadCustomers();
    await refreshCustomerCount();
  };

  const getStatusBadge = (status: Customer['status']) => {
    const baseClasses = "px-2 py-1 rounded-full text-xs font-medium";
    if (status === 'active') {
      return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
    }
    return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
  };

  const getStatusIcon = (status: Customer['status']) => {
    return status === 'active' 
      ? <CheckCircle className="w-3 h-3 text-green-600" />
      : <AlertCircle className="w-3 h-3 text-red-600" />;
  };

  const getStatusText = (status: Customer['status']) => {
    return status === 'active' ? 'Ativo' : 'Inativo';
  };

  const getSortIcon = (field: keyof Customer) => {
    if (sortField !== field) return null;
    return sortDirection === 'asc' 
      ? <SortAsc className="w-4 h-4 text-primary-600" />
      : <SortDesc className="w-4 h-4 text-primary-600" />;
  };

  if (loading && customers.length === 0) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando clientes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-0">
      <div className="max-w-7xl mx-auto">
        {/* Search Only */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-6 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar clientes"
              value={filters.search}
              onChange={(e) => handleSearch(e.target.value)}
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

        {/* Customer Table */}
        <div className="bg-white rounded-2xl shadow-soft border border-gray-200 overflow-hidden">
          {/* Desktop Table */}
          <div className="hidden lg:block overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('customer_id')}
                  >
                    <div className="flex items-center gap-2">
                      ID
                      {getSortIcon('customer_id')}
                    </div>
                  </th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('first_name')}
                  >
                    <div className="flex items-center gap-2">
                      Nome Completo
                      {getSortIcon('first_name')}
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
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Localização</th>
                  <th 
                    className="px-6 py-4 text-left text-sm font-medium text-gray-700 cursor-pointer hover:bg-gray-100 transition-colors"
                    onClick={() => handleSort('status')}
                  >
                    <div className="flex items-center gap-2">
                      Status
                      {getSortIcon('status')}
                    </div>
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-700">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {customers.map((customer) => (
                  <tr key={customer.customer_id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-medium text-gray-900">
                      #{customer.customer_id}
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
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.email}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">{customer.phone_number || 'N/A'}</td>
                    <td className="px-6 py-4 text-sm text-gray-600">
                      {customer.city && customer.country ? `${customer.city}, ${customer.country}` : 'N/A'}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        {getStatusIcon(customer.status)}
                        <span className={getStatusBadge(customer.status)}>
                          {getStatusText(customer.status)}
                        </span>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleView(customer)}
                          className="p-2 text-gray-600 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"
                          title="Ver Detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleEdit(customer)}
                          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                          title="Editar Cliente"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(customer)}
                          className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                          title="Excluir Cliente"
                        >
                          <Trash2 className="w-4 h-4" />
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
              <div key={customer.customer_id} className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                      <span className="text-primary-700 font-medium">
                        {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-medium text-gray-900">
                        {customer.first_name} {customer.last_name}
                      </h3>
                      <p className="text-sm text-gray-600">#{customer.customer_id}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    {getStatusIcon(customer.status)}
                    <span className={getStatusBadge(customer.status)}>
                      {getStatusText(customer.status)}
                    </span>
                  </div>
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
                  {customer.city && customer.country && (
                    <div className="flex items-center gap-2 text-sm text-gray-600">
                      <MapPin className="w-4 h-4" />
                      <span>{customer.city}, {customer.country}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2 text-sm text-gray-600">
                    <Calendar className="w-4 h-4" />
                    <span>{new Date(customer.created_at).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleView(customer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-lg transition-colors"
                  >
                    <Eye className="w-4 h-4" />
                    Ver
                  </button>
                  <button
                    onClick={() => handleEdit(customer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-blue-700 bg-blue-100 hover:bg-blue-200 rounded-lg transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Editar
                  </button>
                  <button
                    onClick={() => handleDelete(customer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-red-700 bg-red-100 hover:bg-red-200 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                    Excluir
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
                {filters.search
                  ? 'Tente ajustar sua busca'
                  : 'Nenhum cliente cadastrado no sistema'
                }
              </p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="bg-white rounded-2xl shadow-soft border border-gray-200 p-4 mt-6">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-600">
                Mostrando {((pagination.currentPage - 1) * pagination.itemsPerPage) + 1} até{' '}
                {Math.min(pagination.currentPage * pagination.itemsPerPage, pagination.totalItems)} de{' '}
                {pagination.totalItems} clientes
              </div>
              
              <div className="flex items-center gap-2">
                <button
                  onClick={() => handlePageChange(pagination.currentPage - 1)}
                  disabled={pagination.currentPage === 1}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                
                <div className="flex items-center gap-1">
                  {Array.from({ length: Math.min(5, pagination.totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                          pagination.currentPage === page
                            ? 'bg-primary-500 text-dark-900'
                            : 'text-gray-600 hover:text-gray-900 hover:bg-gray-100'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  })}
                </div>
                
                <button
                  onClick={() => handlePageChange(pagination.currentPage + 1)}
                  disabled={pagination.currentPage === pagination.totalPages}
                  className="p-2 text-gray-600 hover:text-gray-900 disabled:text-gray-400 disabled:cursor-not-allowed rounded-lg hover:bg-gray-100 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {showForm && (
        <CustomerForm
          customer={selectedCustomer}
          onClose={() => {
            setShowForm(false);
            setSelectedCustomer(null);
          }}
          onSuccess={handleFormSuccess}
        />
      )}

      {showDetails && selectedCustomer && (
        <CustomerDetails
          customer={selectedCustomer}
          onClose={() => {
            setShowDetails(false);
            setSelectedCustomer(null);
          }}
          onEdit={() => {
            setShowDetails(false);
            setShowForm(true);
          }}
        />
      )}

      {showDeleteConfirm && selectedCustomer && (
        <DeleteConfirmation
          customer={selectedCustomer}
          onClose={() => {
            setShowDeleteConfirm(false);
            setSelectedCustomer(null);
          }}
          onConfirm={handleDeleteSuccess}
        />
      )}
    </div>
  );
};

export default CustomerList;