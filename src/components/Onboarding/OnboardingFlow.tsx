import React, { useState, useEffect } from 'react';
import { X, ChevronRight, ChevronLeft, Building2, Scissors, DollarSign, Clock, Check, Plus, Trash2 } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';

interface OnboardingFlowProps {
  onComplete: () => void;
}

interface Service {
  id: string;
  name: string;
  price: string;
  duration: string;
}

interface FormData {
  companyName: string;
  businessType: string;
  services: Service[];
}

const OnboardingFlow: React.FC<OnboardingFlowProps> = ({ onComplete }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  
  const [formData, setFormData] = useState<FormData>({
    companyName: '',
    businessType: '',
    services: [{ id: '1', name: '', price: '', duration: '' }]
  });

  const businessTypes = [
    'Estética',
    'Extensão de Cílios',
    'Manicure',
    'Salão de Beleza',
    'Barbearia',
    'Design de Sobrancelhas',
    'Depilação',
    'Massoterapia',
    'Terapias Holísticas',
    'Spa'
  ];

  // Load saved draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem('onboarding-draft');
    if (savedDraft) {
      try {
        const parsed = JSON.parse(savedDraft);
        setFormData(parsed);
      } catch (error) {
        console.error('Error loading draft:', error);
      }
    }
  }, []);

  // Save draft whenever form data changes
  useEffect(() => {
    localStorage.setItem('onboarding-draft', JSON.stringify(formData));
  }, [formData]);

  const formatPrice = (value: string): string => {
    const numbers = value.replace(/\D/g, '');
    const amount = parseFloat(numbers) / 100;
    return amount.toLocaleString('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const handlePriceChange = (serviceId: string, value: string) => {
    const formatted = formatPrice(value);
    setFormData(prev => ({
      ...prev,
      services: prev.services.map(service =>
        service.id === serviceId ? { ...service, price: formatted } : service
      )
    }));
  };

  const addService = () => {
    const newService: Service = {
      id: Date.now().toString(),
      name: '',
      price: '',
      duration: ''
    };
    setFormData(prev => ({
      ...prev,
      services: [...prev.services, newService]
    }));
  };

  const removeService = (serviceId: string) => {
    if (formData.services.length > 1) {
      setFormData(prev => ({
        ...prev,
        services: prev.services.filter(service => service.id !== serviceId)
      }));
    }
  };

  const updateService = (serviceId: string, field: keyof Service, value: string) => {
    setFormData(prev => ({
      ...prev,
      services: prev.services.map(service =>
        service.id === serviceId ? { ...service, [field]: value } : service
      )
    }));
  };

  const validateStep1 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (!formData.companyName.trim()) {
      newErrors.companyName = 'Nome da empresa é obrigatório';
    }
    
    if (!formData.businessType) {
      newErrors.businessType = 'Ramo de atuação é obrigatório';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const validateStep2 = (): boolean => {
    const newErrors: Record<string, string> = {};
    
    if (formData.services.length === 0) {
      newErrors.services = 'Pelo menos um serviço deve ser cadastrado';
    }
    
    formData.services.forEach((service, index) => {
      if (!service.name.trim()) {
        newErrors[`service_name_${index}`] = 'Nome do serviço é obrigatório';
      }
      
      if (!service.price || parseFloat(service.price.replace(',', '.')) <= 0) {
        newErrors[`service_price_${index}`] = 'Preço deve ser maior que zero';
      }
      
      if (!service.duration || parseInt(service.duration) <= 0) {
        newErrors[`service_duration_${index}`] = 'Duração deve ser maior que zero';
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const nextStep = () => {
    if (currentStep === 1 && validateStep1()) {
      setCurrentStep(2);
    } else if (currentStep === 2 && validateStep2()) {
      setCurrentStep(3);
    }
  };

  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
    }
  };

  const saveToDatabase = async () => {
    if (!user) return false;

    try {
      setLoading(true);

      // Save user profile
      const { error: profileError } = await supabase
        .from('user_profile')
        .upsert({
          user_id: user.id,
          company_name: formData.companyName.trim(),
          business_type: formData.businessType,
          onboarding_completed: true
        });

      if (profileError) {
        console.error('Error saving profile:', profileError);
        throw profileError;
      }

      // Save services
      const servicesData = formData.services.map(service => ({
        user_id: user.id,
        service_name: service.name.trim(),
        price: parseFloat(service.price.replace(',', '.')),
        duration_minutes: parseInt(service.duration),
        is_active: true
      }));

      const { error: servicesError } = await supabase
        .from('user_services')
        .insert(servicesData);

      if (servicesError) {
        console.error('Error saving services:', servicesError);
        throw servicesError;
      }

      // Clear draft
      localStorage.removeItem('onboarding-draft');
      
      return true;
    } catch (error) {
      console.error('Error saving onboarding data:', error);
      return false;
    } finally {
      setLoading(false);
    }
  };

  const handleComplete = async () => {
    const success = await saveToDatabase();
    if (success) {
      onComplete();
    } else {
      setErrors({ submit: 'Erro ao salvar dados. Tente novamente.' });
    }
  };

  const renderStep1 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Building2 className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-semibold text-dark-900 mb-2">Dados da sua empresa</h2>
        <p className="text-gray-600">Vamos conhecer um pouco sobre seu negócio</p>
      </div>

      <div className="space-y-4">
        <div>
          <label htmlFor="companyName" className="block text-sm font-medium text-gray-700 mb-2">
            Nome da Empresa *
          </label>
          <input
            id="companyName"
            type="text"
            value={formData.companyName}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, companyName: e.target.value }));
              if (errors.companyName) setErrors(prev => ({ ...prev, companyName: '' }));
            }}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.companyName ? 'border-red-300' : 'border-gray-300'
            }`}
            placeholder="Digite o nome da sua empresa"
          />
          {errors.companyName && (
            <p className="mt-1 text-sm text-red-600">{errors.companyName}</p>
          )}
        </div>

        <div>
          <label htmlFor="businessType" className="block text-sm font-medium text-gray-700 mb-2">
            Ramo de Atuação *
          </label>
          <select
            id="businessType"
            value={formData.businessType}
            onChange={(e) => {
              setFormData(prev => ({ ...prev, businessType: e.target.value }));
              if (errors.businessType) setErrors(prev => ({ ...prev, businessType: '' }));
            }}
            className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
              errors.businessType ? 'border-red-300' : 'border-gray-300'
            }`}
          >
            <option value="">Selecione seu ramo de atuação</option>
            {businessTypes.map(type => (
              <option key={type} value={type}>{type}</option>
            ))}
            <option value="Outro">Outro</option>
          </select>
          {errors.businessType && (
            <p className="mt-1 text-sm text-red-600">{errors.businessType}</p>
          )}
        </div>

        {formData.businessType === 'Outro' && (
          <div>
            <label htmlFor="customBusinessType" className="block text-sm font-medium text-gray-700 mb-2">
              Especifique seu ramo de atuação
            </label>
            <input
              id="customBusinessType"
              type="text"
              value={formData.businessType === 'Outro' ? '' : formData.businessType}
              onChange={(e) => setFormData(prev => ({ ...prev, businessType: e.target.value }))}
              className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              placeholder="Digite seu ramo de atuação"
            />
          </div>
        )}
      </div>
    </div>
  );

  const renderStep2 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Scissors className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-2xl font-semibold text-dark-900 mb-2">Seus serviços</h2>
        <p className="text-gray-600">Cadastre os serviços que você oferece</p>
      </div>

      <div className="space-y-4">
        {formData.services.map((service, index) => (
          <div key={service.id} className="bg-gray-50 rounded-xl p-4 border border-gray-200">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-900">Serviço {index + 1}</h3>
              {formData.services.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeService(service.id)}
                  className="p-2 text-red-600 hover:bg-red-100 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              )}
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome do Serviço *
                </label>
                <input
                  type="text"
                  value={service.name}
                  onChange={(e) => {
                    updateService(service.id, 'name', e.target.value);
                    if (errors[`service_name_${index}`]) {
                      setErrors(prev => ({ ...prev, [`service_name_${index}`]: '' }));
                    }
                  }}
                  className={`w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                    errors[`service_name_${index}`] ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Ex: Corte Masculino, Design de Sobrancelha"
                />
                {errors[`service_name_${index}`] && (
                  <p className="mt-1 text-sm text-red-600">{errors[`service_name_${index}`]}</p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Preço (R$) *
                  </label>
                  <div className="relative">
                    <DollarSign className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="text"
                      value={service.price}
                      onChange={(e) => {
                        handlePriceChange(service.id, e.target.value);
                        if (errors[`service_price_${index}`]) {
                          setErrors(prev => ({ ...prev, [`service_price_${index}`]: '' }));
                        }
                      }}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors[`service_price_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="0,00"
                    />
                  </div>
                  {errors[`service_price_${index}`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`service_price_${index}`]}</p>
                  )}
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Duração (min) *
                  </label>
                  <div className="relative">
                    <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                    <input
                      type="number"
                      value={service.duration}
                      onChange={(e) => {
                        updateService(service.id, 'duration', e.target.value);
                        if (errors[`service_duration_${index}`]) {
                          setErrors(prev => ({ ...prev, [`service_duration_${index}`]: '' }));
                        }
                      }}
                      className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                        errors[`service_duration_${index}`] ? 'border-red-300' : 'border-gray-300'
                      }`}
                      placeholder="60"
                      min="1"
                    />
                  </div>
                  {errors[`service_duration_${index}`] && (
                    <p className="mt-1 text-sm text-red-600">{errors[`service_duration_${index}`]}</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}

        <button
          type="button"
          onClick={addService}
          className="w-full flex items-center justify-center gap-2 py-3 border-2 border-dashed border-gray-300 rounded-xl text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
        >
          <Plus className="w-5 h-5" />
          Adicionar Novo Serviço
        </button>

        {errors.services && (
          <p className="text-sm text-red-600">{errors.services}</p>
        )}
      </div>
    </div>
  );

  const renderStep3 = () => (
    <div className="space-y-6">
      <div className="text-center mb-8">
        <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <Check className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-2xl font-semibold text-dark-900 mb-2">Confirme seus dados</h2>
        <p className="text-gray-600">Revise as informações antes de finalizar</p>
      </div>

      <div className="space-y-6">
        {/* Company Info */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Dados da Empresa</h3>
            <button
              onClick={() => setCurrentStep(1)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Editar
            </button>
          </div>
          <div className="space-y-2">
            <p><span className="text-gray-600">Nome:</span> {formData.companyName}</p>
            <p><span className="text-gray-600">Ramo:</span> {formData.businessType}</p>
          </div>
        </div>

        {/* Services */}
        <div className="bg-gray-50 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-gray-900">Serviços ({formData.services.length})</h3>
            <button
              onClick={() => setCurrentStep(2)}
              className="text-primary-600 hover:text-primary-700 text-sm font-medium"
            >
              Editar
            </button>
          </div>
          <div className="space-y-3">
            {formData.services.map((service, index) => (
              <div key={service.id} className="bg-white rounded-lg p-3 border border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{service.name}</p>
                    <p className="text-sm text-gray-600">
                      R$ {service.price} • {service.duration} minutos
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {errors.submit && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-4">
            <p className="text-red-800">{errors.submit}</p>
          </div>
        )}
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-semibold text-dark-900">Configuração Inicial</h1>
              <p className="text-gray-600 text-sm">Passo {currentStep} de 3</p>
            </div>
            <div className="flex items-center gap-2">
              {[1, 2, 3].map((step) => (
                <div
                  key={step}
                  className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    step <= currentStep
                      ? 'bg-primary-500 text-dark-900'
                      : 'bg-gray-200 text-gray-500'
                  }`}
                >
                  {step < currentStep ? <Check className="w-4 h-4" /> : step}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {currentStep === 1 && renderStep1()}
          {currentStep === 2 && renderStep2()}
          {currentStep === 3 && renderStep3()}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-2xl">
          <div className="flex gap-3">
            {currentStep > 1 && (
              <button
                onClick={prevStep}
                disabled={loading}
                className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-100 transition-colors font-medium disabled:opacity-50"
              >
                <ChevronLeft className="w-4 h-4" />
                Voltar
              </button>
            )}
            
            {currentStep < 3 ? (
              <button
                onClick={nextStep}
                className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl transition-colors font-semibold"
              >
                Continuar
                <ChevronRight className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleComplete}
                disabled={loading}
                className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 rounded-xl transition-colors font-semibold flex items-center justify-center gap-2"
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-900"></div>
                    Salvando...
                  </>
                ) : (
                  'Ir para o calendário de agendamento'
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default OnboardingFlow;