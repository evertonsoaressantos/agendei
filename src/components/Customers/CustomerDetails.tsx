import React from 'react';
import { X, Edit, Mail, Phone, MapPin, Calendar, User, Globe, CheckCircle, AlertCircle } from 'lucide-react';
import { Customer } from '../../types/customer';

interface CustomerDetailsProps {
  customer: Customer;
  onClose: () => void;
  onEdit: () => void;
}

const CustomerDetails: React.FC<CustomerDetailsProps> = ({ customer, onClose, onEdit }) => {
  const getStatusBadge = (status: Customer['status']) => {
    const baseClasses = "inline-flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium";
    if (status === 'active') {
      return `${baseClasses} bg-green-100 text-green-800 border border-green-200`;
    }
    return `${baseClasses} bg-red-100 text-red-800 border border-red-200`;
  };

  const getStatusIcon = (status: Customer['status']) => {
    return status === 'active' 
      ? <CheckCircle className="w-4 h-4 text-green-600" />
      : <AlertCircle className="w-4 h-4 text-red-600" />;
  };

  const getStatusText = (status: Customer['status']) => {
    return status === 'active' ? 'Ativo' : 'Inativo';
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center">
                <span className="text-primary-700 font-semibold text-xl">
                  {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-dark-900">
                  {customer.first_name} {customer.last_name}
                </h2>
                <p className="text-gray-600">Cliente #{customer.customer_id}</p>
                <div className="mt-2">
                  <span className={getStatusBadge(customer.status)}>
                    {getStatusIcon(customer.status)}
                    {getStatusText(customer.status)}
                  </span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={onEdit}
                className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl font-medium transition-colors"
              >
                <Edit className="w-4 h-4" />
                Editar
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                aria-label="Fechar"
              >
                <X className="w-5 h-5 text-gray-500" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          <div className="space-y-8">
            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary-600" />
                Informações de Contato
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Endereço de Email</p>
                    <p className="font-medium text-gray-900">{customer.email}</p>
                  </div>
                </div>
                {customer.phone_number && (
                  <div className="flex items-center gap-3">
                    <Phone className="w-5 h-5 text-gray-400" />
                    <div>
                      <p className="text-sm text-gray-600">Número de Telefone</p>
                      <p className="font-medium text-gray-900">{customer.phone_number}</p>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Address Information */}
            {(customer.address || customer.city || customer.state_province || customer.postal_code || customer.country) && (
              <div>
                <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-primary-600" />
                  Informações de Endereço
                </h3>
                <div className="bg-gray-50 rounded-xl p-4">
                  <div className="flex items-start gap-3">
                    <MapPin className="w-5 h-5 text-gray-400 mt-1" />
                    <div className="space-y-1">
                      {customer.address && (
                        <p className="font-medium text-gray-900">{customer.address}</p>
                      )}
                      <div className="text-gray-700">
                        {customer.city && <span>{customer.city}</span>}
                        {customer.city && customer.state_province && <span>, </span>}
                        {customer.state_province && <span>{customer.state_province}</span>}
                        {(customer.city || customer.state_province) && customer.postal_code && <span> </span>}
                        {customer.postal_code && <span>{customer.postal_code}</span>}
                      </div>
                      {customer.country && (
                        <div className="flex items-center gap-2 mt-2">
                          <Globe className="w-4 h-4 text-gray-400" />
                          <span className="text-gray-700">{customer.country}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Account Information */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                Informações da Conta
              </h3>
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Criado em</p>
                    <p className="font-medium text-gray-900">{formatDate(customer.created_at)}</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <div>
                    <p className="text-sm text-gray-600">Última Atualização</p>
                    <p className="font-medium text-gray-900">{formatDate(customer.updated_at)}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4">Ações Rápidas</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <a
                  href={`mailto:${customer.email}`}
                  className="flex items-center gap-3 p-4 bg-blue-50 hover:bg-blue-100 rounded-xl transition-colors border border-blue-200"
                >
                  <Mail className="w-5 h-5 text-blue-600" />
                  <div>
                    <p className="font-medium text-blue-900">Enviar Email</p>
                    <p className="text-sm text-blue-700">Abrir cliente de email</p>
                  </div>
                </a>
                {customer.phone_number && (
                  <a
                    href={`tel:${customer.phone_number}`}
                    className="flex items-center gap-3 p-4 bg-green-50 hover:bg-green-100 rounded-xl transition-colors border border-green-200"
                  >
                    <Phone className="w-5 h-5 text-green-600" />
                    <div>
                      <p className="font-medium text-green-900">Ligar para Cliente</p>
                      <p className="text-sm text-green-700">Abrir aplicativo de telefone</p>
                    </div>
                  </a>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex justify-end gap-3">
            <button
              onClick={onClose}
              className="px-6 py-2 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium"
            >
              Fechar
            </button>
            <button
              onClick={onEdit}
              className="px-6 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl transition-colors font-medium flex items-center gap-2"
            >
              <Edit className="w-4 h-4" />
              Editar Cliente
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CustomerDetails;