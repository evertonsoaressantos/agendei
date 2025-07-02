import React, { useState, useEffect } from 'react';
import { X, User, Mail, Phone, MapPin, Globe, Save, AlertCircle } from 'lucide-react';
import { Customer, CustomerFormData } from '../../types/customer';
import { CustomerService } from '../../services/customerService';
import { CustomerValidator } from '../../utils/validation';

interface CustomerFormProps {
  customer?: Customer | null;
  onClose: () => void;
  onSuccess: () => void;
}

const CustomerForm: React.FC<CustomerFormProps> = ({ customer, onClose, onSuccess }) => {
  const [formData, setFormData] = useState<CustomerFormData>({
    first_name: '',
    last_name: '',
    email: '',
    phone_number: '',
    address: '',
    city: '',
    state_province: '',
    postal_code: '',
    country: '',
    status: 'active'
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [countries] = useState([
    'Brasil', 'Estados Unidos', 'Canadá', 'Reino Unido', 'França', 
    'Alemanha', 'Espanha', 'Itália', 'Portugal', 'Argentina'
  ]);

  const customerService = CustomerService.getInstance();
  const isEditing = !!customer;

  useEffect(() => {
    if (customer) {
      setFormData({
        first_name: customer.first_name,
        last_name: customer.last_name,
        email: customer.email,
        phone_number: customer.phone_number || '',
        address: customer.address || '',
        city: customer.city || '',
        state_province: customer.state_province || '',
        postal_code: customer.postal_code || '',
        country: customer.country || '',
        status: customer.status
      });
    }
  }, [customer]);

  const handleInputChange = (field: keyof CustomerFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    
    // Clear field error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
    
    // Clear submit error
    if (submitError) {
      setSubmitError(null);
    }
  };

  const handlePhoneChange = (value: string) => {
    // Format phone number as user types
    const formatted = CustomerValidator.formatPhoneNumber(value);
    handleInputChange('phone_number', formatted);
  };

  const handlePostalCodeChange = (value: string) => {
    // Format postal code based on country
    const formatted = CustomerValidator.formatPostalCode(value, formData.country);
    handleInputChange('postal_code', formatted);
  };

  const validateForm = (): boolean => {
    const validation = CustomerValidator.validateCustomerForm(formData);
    setErrors(validation.errors);
    return validation.isValid;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    setSubmitError(null);

    try {
      if (isEditing && customer) {
        await customerService.updateCustomer(customer.customer_id, formData);
      } else {
        await customerService.createCustomer(formData);
      }
      onSuccess();
    } catch (error) {
      setSubmitError(error instanceof Error ? error.message : 'Ocorreu um erro');
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: keyof CustomerFormData) => {
    return errors[field];
  };

  const getInputClasses = (field: keyof CustomerFormData) => {
    const baseClasses = "w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200";
    const errorClasses = "border-red-300 focus:ring-red-500";
    const normalClasses = "border-gray-300";
    
    return `${baseClasses} ${getFieldError(field) ? errorClasses : normalClasses}`;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 sticky top-0 bg-white rounded-t-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
                <User className="w-5 h-5 text-primary-600" />
              </div>
              <div>
                <h2 className="text-xl font-semibold text-dark-900">
                  {isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}
                </h2>
                <p className="text-gray-600 text-sm">
                  {isEditing ? 'Atualizar informações do cliente' : 'Digite os detalhes do cliente abaixo'}
                </p>
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6">
          {/* Submit Error */}
          {submitError && (
            <div className="mb-6 bg-red-50 border border-red-200 rounded-xl p-4">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-red-600" />
                <p className="text-red-800">{submitError}</p>
              </div>
            </div>
          )}

          <div className="space-y-6">
            {/* Personal Information */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                <User className="w-5 h-5 text-primary-600" />
                Informações Pessoais
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="first_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Primeiro Nome *
                  </label>
                  <input
                    id="first_name"
                    type="text"
                    value={formData.first_name}
                    onChange={(e) => handleInputChange('first_name', e.target.value)}
                    className={getInputClasses('first_name')}
                    placeholder="Digite o primeiro nome"
                    maxLength={50}
                    required
                  />
                  {getFieldError('first_name') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('first_name')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="last_name" className="block text-sm font-medium text-gray-700 mb-2">
                    Sobrenome *
                  </label>
                  <input
                    id="last_name"
                    type="text"
                    value={formData.last_name}
                    onChange={(e) => handleInputChange('last_name', e.target.value)}
                    className={getInputClasses('last_name')}
                    placeholder="Digite o sobrenome"
                    maxLength={50}
                    required
                  />
                  {getFieldError('last_name') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('last_name')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Contact Information */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                <Mail className="w-5 h-5 text-primary-600" />
                Informações de Contato
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço de Email *
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={formData.email}
                    onChange={(e) => handleInputChange('email', e.target.value)}
                    className={getInputClasses('email')}
                    placeholder="Digite o endereço de email"
                    maxLength={100}
                    required
                  />
                  {getFieldError('email') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('email')}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="phone_number" className="block text-sm font-medium text-gray-700 mb-2">
                    Número de Telefone
                  </label>
                  <div className="relative">
                    <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <input
                      id="phone_number"
                      type="tel"
                      value={formData.phone_number}
                      onChange={(e) => handlePhoneChange(e.target.value)}
                      className={`${getInputClasses('phone_number')} pl-10`}
                      placeholder="+XX-XXX-XXX-XXXX"
                      maxLength={20}
                    />
                  </div>
                  {getFieldError('phone_number') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('phone_number')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Address Information */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4 flex items-center gap-2">
                <MapPin className="w-5 h-5 text-primary-600" />
                Informações de Endereço
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-2">
                    Endereço
                  </label>
                  <input
                    id="address"
                    type="text"
                    value={formData.address}
                    onChange={(e) => handleInputChange('address', e.target.value)}
                    className={getInputClasses('address')}
                    placeholder="Digite o endereço"
                    maxLength={200}
                  />
                  {getFieldError('address') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('address')}</p>
                  )}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="city" className="block text-sm font-medium text-gray-700 mb-2">
                      Cidade
                    </label>
                    <input
                      id="city"
                      type="text"
                      value={formData.city}
                      onChange={(e) => handleInputChange('city', e.target.value)}
                      className={getInputClasses('city')}
                      placeholder="Digite a cidade"
                      maxLength={100}
                    />
                    {getFieldError('city') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('city')}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="state_province" className="block text-sm font-medium text-gray-700 mb-2">
                      Estado/Província
                    </label>
                    <input
                      id="state_province"
                      type="text"
                      value={formData.state_province}
                      onChange={(e) => handleInputChange('state_province', e.target.value)}
                      className={getInputClasses('state_province')}
                      placeholder="Digite o estado/província"
                      maxLength={100}
                    />
                    {getFieldError('state_province') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('state_province')}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="postal_code" className="block text-sm font-medium text-gray-700 mb-2">
                      CEP
                    </label>
                    <input
                      id="postal_code"
                      type="text"
                      value={formData.postal_code}
                      onChange={(e) => handlePostalCodeChange(e.target.value)}
                      className={getInputClasses('postal_code')}
                      placeholder="Digite o CEP"
                      maxLength={20}
                    />
                    {getFieldError('postal_code') && (
                      <p className="mt-1 text-sm text-red-600">{getFieldError('postal_code')}</p>
                    )}
                  </div>
                </div>

                <div>
                  <label htmlFor="country" className="block text-sm font-medium text-gray-700 mb-2">
                    País
                  </label>
                  <div className="relative">
                    <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                    <select
                      id="country"
                      value={formData.country}
                      onChange={(e) => handleInputChange('country', e.target.value)}
                      className={`${getInputClasses('country')} pl-10`}
                    >
                      <option value="">Selecione um país</option>
                      {countries.map(country => (
                        <option key={country} value={country}>{country}</option>
                      ))}
                    </select>
                  </div>
                  {getFieldError('country') && (
                    <p className="mt-1 text-sm text-red-600">{getFieldError('country')}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status */}
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4">Status</h3>
              <div className="flex gap-4">
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="active"
                    checked={formData.status === 'active'}
                    onChange={(e) => handleInputChange('status', e.target.value as 'active' | 'inactive')}
                    className="mr-2 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Ativo</span>
                </label>
                <label className="flex items-center">
                  <input
                    type="radio"
                    name="status"
                    value="inactive"
                    checked={formData.status === 'inactive'}
                    onChange={(e) => handleInputChange('status', e.target.value as 'active' | 'inactive')}
                    className="mr-2 text-primary-500 focus:ring-primary-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Inativo</span>
                </label>
              </div>
            </div>
          </div>

          {/* Form Actions */}
          <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={loading}
              className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-900"></div>
                  {isEditing ? 'Atualizando...' : 'Criando...'}
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  {isEditing ? 'Atualizar Cliente' : 'Criar Cliente'}
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CustomerForm;