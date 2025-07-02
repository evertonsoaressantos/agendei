import React, { useState } from 'react';
import { X, AlertTriangle, Trash2 } from 'lucide-react';
import { Customer } from '../../types/customer';
import { CustomerService } from '../../services/customerService';

interface DeleteConfirmationProps {
  customer: Customer;
  onClose: () => void;
  onConfirm: () => void;
}

const DeleteConfirmation: React.FC<DeleteConfirmationProps> = ({ customer, onClose, onConfirm }) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const customerService = CustomerService.getInstance();

  const handleDelete = async () => {
    setLoading(true);
    setError(null);

    try {
      await customerService.deleteCustomer(customer.customer_id);
      onConfirm();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao excluir cliente');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-md w-full">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-red-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-dark-900">Excluir Cliente</h2>
                <p className="text-gray-600 text-sm">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {error && (
            <div className="mb-4 bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-red-800 text-sm">{error}</p>
            </div>
          )}

          <div className="mb-6">
            <p className="text-gray-700 mb-4">
              Tem certeza de que deseja excluir este cliente? Isso marcará o cliente como inativo e preservará seus dados para fins de auditoria.
            </p>
            
            {/* Customer Info */}
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-primary-100 rounded-full flex items-center justify-center">
                  <span className="text-primary-700 font-medium text-sm">
                    {customer.first_name.charAt(0)}{customer.last_name.charAt(0)}
                  </span>
                </div>
                <div>
                  <p className="font-medium text-gray-900">
                    {customer.first_name} {customer.last_name}
                  </p>
                  <p className="text-sm text-gray-600">{customer.email}</p>
                  <p className="text-xs text-gray-500">Cliente #{customer.customer_id}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-amber-600 mt-0.5" />
              <div>
                <h4 className="font-medium text-amber-900 mb-1">Aviso Importante</h4>
                <p className="text-sm text-amber-800">
                  Esta é uma operação de exclusão suave. O cliente será marcado como inativo, mas seus dados serão preservados para fins de auditoria e conformidade. Você pode reativar o cliente posteriormente, se necessário.
                </p>
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex gap-3">
            <button
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={loading}
              className="flex-1 px-6 py-3 bg-red-500 hover:bg-red-600 disabled:bg-gray-300 text-white rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  Excluindo...
                </>
              ) : (
                <>
                  <Trash2 className="w-4 h-4" />
                  Excluir Cliente
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DeleteConfirmation;