import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, DollarSign, Clock, Scissors, Save, X } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface Service {
  id: string;
  service_name: string;
  price: number;
  duration_minutes: number;
  is_active: boolean;
  created_at: string;
}

interface ServiceFormData {
  service_name: string;
  price: string;
  duration_minutes: string;
}

const MyServices: React.FC = () => {
  const { user } = useAuth();
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState<ServiceFormData>({
    service_name: '',
    price: '',
    duration_minutes: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      loadServices();
    }
  }, [user]);

  const loadServices = async () => {
    if (!user) return;

    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('user_services')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading services:', error);
        return;
      }

      setServices(data || []);
    } catch (error) {
      console.error('Error loading services:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handlePriceChange = (value: string) => {
    const formatted = formatPrice(value);
    setFormData(prev => ({ ...prev, price: formatted }));
  };

  const openForm = (service?: Service) => {
    if (service) {
      setEditingService(service);
      setFormData({
        service_name: service.service_name,
        price: service.price.toLocaleString('pt-BR', {
          minimumFractionDigits: 2,
          maximumFractionDigits: 2
        }),
        duration_minutes: service.duration_minutes.toString()
      });
    } else {
      setEditingService(null);
      setFormData({
        service_name: '',
        price: '',
        duration_minutes: ''
      });
    }
    setShowForm(true);
    setErrors({});
  };

  const closeForm = () => {
    setShowForm(false);
    setEditingService(null);
    setFormData({
      service_name: '',
      price: '',
      duration_minutes: ''
    });
    setErrors({});
  };

  const validateForm = (): boolean => {
    const newErrors: Record<string, string> = {};

    if (!formData.service_name.trim()) {
      newErrors.service_name = 'Nome do serviço é obrigatório';
    }

    if (!formData.price || parseFloat(formData.price.replace(',', '.')) <= 0) {
      newErrors.price = 'Preço deve ser maior que zero';
    }

    if (!formData.duration_minutes || parseInt(formData.duration_minutes) <= 0) {
      newErrors.duration_minutes = 'Duração deve ser maior que zero';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateForm() || !user) return;

    try {
      setSaving(true);

      const serviceData = {
        user_id: user.id,
        service_name: formData.service_name.trim(),
        price: parseFloat(formData.price.replace(',', '.')),
        duration_minutes: parseInt(formData.duration_minutes),
        is_active: true
      };

      if (editingService) {
        // Update existing service
        const { error } = await supabase
          .from('user_services')
          .update(serviceData)
          .eq('id', editingService.id);

        if (error) throw error;
      } else {
        // Create new service
        const { error } = await supabase
          .from('user_services')
          .insert([serviceData]);

        if (error) throw error;
      }

      await loadServices();
      closeForm();
    } catch (error) {
      console.error('Error saving service:', error);
      setErrors({ submit: 'Erro ao salvar serviço. Tente novamente.' });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Tem certeza que deseja excluir este serviço?')) return;

    try {
      const { error } = await supabase
        .from('user_services')
        .delete()
        .eq('id', serviceId);

      if (error) throw error;

      await loadServices();
    } catch (error) {
      console.error('Error deleting service:', error);
    }
  };

  const toggleServiceStatus = async (service: Service) => {
    try {
      const { error } = await supabase
        .from('user_services')
        .update({ is_active: !service.is_active })
        .eq('id', service.id);

      if (error) throw error;

      await loadServices();
    } catch (error) {
      console.error('Error updating service status:', error);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando serviços...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-semibold text-dark-900">Meus Serviços</h1>
            <p className="text-gray-600">Gerencie os serviços que você oferece</p>
          </div>
          <button
            onClick={() => openForm()}
            className="flex items-center gap-2 px-4 py-2 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo Serviço
          </button>
        </div>

        {/* Services Grid */}
        {services.length === 0 ? (
          <div className="text-center py-12">
            <Scissors className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Nenhum serviço cadastrado</h3>
            <p className="text-gray-500 mb-6">Comece adicionando os serviços que você oferece</p>
            <button
              onClick={() => openForm()}
              className="flex items-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl font-medium transition-colors mx-auto"
            >
              <Plus className="w-4 h-4" />
              Adicionar Primeiro Serviço
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {services.map((service) => (
              <div
                key={service.id}
                className={`bg-white rounded-2xl p-6 border transition-all duration-200 hover:shadow-card ${
                  service.is_active ? 'border-gray-200' : 'border-gray-300 opacity-60'
                }`}
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="font-semibold text-dark-900 text-lg mb-2">
                      {service.service_name}
                    </h3>
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-gray-600">
                        <DollarSign className="w-4 h-4" />
                        <span>R$ {service.price.toLocaleString('pt-BR', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2
                        })}</span>
                      </div>
                      <div className="flex items-center gap-2 text-gray-600">
                        <Clock className="w-4 h-4" />
                        <span>{service.duration_minutes} minutos</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => openForm(service)}
                      className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Editar serviço"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(service.id)}
                      className="p-2 text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                      title="Excluir serviço"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 border-t border-gray-100">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    service.is_active 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {service.is_active ? 'Ativo' : 'Inativo'}
                  </span>
                  
                  <button
                    onClick={() => toggleServiceStatus(service)}
                    className={`px-3 py-1 rounded-lg text-sm font-medium transition-colors ${
                      service.is_active
                        ? 'text-gray-600 hover:bg-gray-100'
                        : 'text-green-600 hover:bg-green-50'
                    }`}
                  >
                    {service.is_active ? 'Desativar' : 'Ativar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Service Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl max-w-md w-full">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h2 className="text-xl font-semibold text-dark-900">
                    {editingService ? 'Editar Serviço' : 'Novo Serviço'}
                  </h2>
                  <button
                    onClick={closeForm}
                    className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
                  >
                    <X className="w-5 h-5 text-gray-500" />
                  </button>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Nome do Serviço *
                    </label>
                    <input
                      type="text"
                      value={formData.service_name}
                      onChange={(e) => {
                        setFormData(prev => ({ ...prev, service_name: e.target.value }));
                        if (errors.service_name) setErrors(prev => ({ ...prev, service_name: '' }));
                      }}
                      className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors.service_name ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="Ex: Corte Masculino, Design de Sobrancelha"
                    />
                    {errors.service_name && (
                      <p className="mt-1 text-sm text-red-600">{errors.service_name}</p>
                    )}
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Preço (R$) *
                      </label>
                      <div className="relative">
                        <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          value={formData.price}
                          onChange={(e) => {
                            handlePriceChange(e.target.value);
                            if (errors.price) setErrors(prev => ({ ...prev, price: '' }));
                          }}
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            errors.price ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="0,00"
                        />
                      </div>
                      {errors.price && (
                        <p className="mt-1 text-sm text-red-600">{errors.price}</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Duração (min) *
                      </label>
                      <div className="relative">
                        <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                        <input
                          type="number"
                          value={formData.duration_minutes}
                          onChange={(e) => {
                            setFormData(prev => ({ ...prev, duration_minutes: e.target.value }));
                            if (errors.duration_minutes) setErrors(prev => ({ ...prev, duration_minutes: '' }));
                          }}
                          className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                            errors.duration_minutes ? 'border-red-300' : 'border-gray-300'
                          }`}
                          placeholder="60"
                          min="1"
                        />
                      </div>
                      {errors.duration_minutes && (
                        <p className="mt-1 text-sm text-red-600">{errors.duration_minutes}</p>
                      )}
                    </div>
                  </div>

                  {errors.submit && (
                    <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                      <p className="text-red-600 text-sm">{errors.submit}</p>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    type="button"
                    onClick={closeForm}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={saving}
                    className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
                  >
                    {saving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-900"></div>
                        Salvando...
                      </>
                    ) : (
                      <>
                        <Save className="w-4 h-4" />
                        {editingService ? 'Atualizar' : 'Salvar'}
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default MyServices;