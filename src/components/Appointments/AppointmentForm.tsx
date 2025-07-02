import React, { useState } from 'react';
import { X, Calendar, Clock, User, Phone, Scissors, FileText, Check, AlertCircle } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { CustomerService } from '../../services/customerService';
import { format } from 'date-fns';

interface AppointmentFormProps {
  onClose: () => void;
  onSuccess: () => void;
}

const AppointmentForm: React.FC<AppointmentFormProps> = ({ onClose, onSuccess }) => {
  const { services, clients, addAppointment, addClient, refreshCustomerCount } = useApp();
  
  const [formData, setFormData] = useState({
    clientName: '',
    clientPhone: '',
    clientEmail: '',
    serviceId: '',
    date: format(new Date(), 'yyyy-MM-dd'),
    time: '09:00',
    notes: '',
    isNewClient: true
  });

  const [existingClientId, setExistingClientId] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [successMessage, setSuccessMessage] = useState('');
  const totalSteps = 3;

  const customerService = CustomerService.getInstance();

  // Validação de campos obrigatórios
  const validateStep = (step: number): boolean => {
    const newErrors: Record<string, string> = {};

    switch (step) {
      case 1:
        if (formData.isNewClient) {
          if (!formData.clientName.trim()) {
            newErrors.clientName = 'Nome é obrigatório';
          } else if (formData.clientName.trim().split(' ').length < 2) {
            newErrors.clientName = 'Digite o nome completo';
          }
          if (!formData.clientPhone.trim()) {
            newErrors.clientPhone = 'Telefone é obrigatório';
          }
        } else {
          if (!existingClientId) {
            newErrors.existingClient = 'Selecione um cliente';
          }
        }
        break;
      case 2:
        if (!formData.serviceId) {
          newErrors.serviceId = 'Selecione um serviço';
        }
        break;
      case 3:
        if (!formData.date) {
          newErrors.date = 'Data é obrigatória';
        }
        if (!formData.time) {
          newErrors.time = 'Horário é obrigatório';
        }
        // Verificar se a data não é no passado
        const selectedDate = new Date(`${formData.date}T${formData.time}`);
        if (selectedDate < new Date()) {
          newErrors.date = 'Não é possível agendar para datas passadas';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!validateStep(3)) {
      return;
    }

    setLoading(true);
    setSuccessMessage('');

    try {
      const selectedService = services.find(s => s.id === formData.serviceId);
      if (!selectedService) {
        setErrors({ serviceId: 'Serviço não encontrado' });
        setLoading(false);
        return;
      }

      // Create appointment date
      const appointmentDate = new Date(`${formData.date}T${formData.time}`);

      // Handle client
      let clientId = existingClientId;
      let clientName = formData.clientName;
      let clientPhone = formData.clientPhone;

      if (formData.isNewClient) {
        // Add new client to local state first
        const newClient = {
          name: formData.clientName.trim(),
          phone: formData.clientPhone.trim(),
          email: formData.clientEmail.trim() || undefined,
        };
        
        clientId = addClient(newClient) || `client_${Date.now()}`;
      } else {
        // Use existing client
        const existingClient = clients.find(c => c.id === existingClientId);
        if (existingClient) {
          clientName = existingClient.name;
          clientPhone = existingClient.phone;
        } else {
          setErrors({ existingClient: 'Cliente selecionado não encontrado' });
          setLoading(false);
          return;
        }
      }

      // Create appointment
      const appointmentData = {
        clientId,
        clientName: clientName.trim(),
        clientPhone: clientPhone.trim(),
        serviceId: formData.serviceId,
        serviceName: selectedService.name,
        date: appointmentDate,
        duration: selectedService.duration,
        status: 'pending' as const,
        notes: formData.notes.trim() || undefined,
        whatsappSent: false
      };

      console.log('AppointmentForm: Criando agendamento...', appointmentData);
      
      const success = await addAppointment(appointmentData);
      
      if (success) {
        setSuccessMessage('Agendamento criado com sucesso! ✅');
        console.log('AppointmentForm: Agendamento criado com sucesso');
        
        // Wait a bit to show success message
        setTimeout(() => {
          onSuccess();
        }, 1500);
      } else {
        setErrors({ submit: 'Erro ao criar agendamento. Tente novamente.' });
      }
    } catch (error) {
      console.error('AppointmentForm: Error creating appointment:', error);
      setErrors({ submit: 'Erro ao criar agendamento. Tente novamente.' });
    } finally {
      setLoading(false);
    }
  };

  const handleClientTypeChange = (isNew: boolean) => {
    setFormData(prev => ({ ...prev, isNewClient: isNew }));
    setExistingClientId('');
    setErrors({});
  };

  const handleExistingClientChange = (clientId: string) => {
    setExistingClientId(clientId);
    const client = clients.find(c => c.id === clientId);
    if (client) {
      setFormData(prev => ({
        ...prev,
        clientName: client.name,
        clientPhone: client.phone,
        clientEmail: client.email || ''
      }));
    }
    setErrors({});
  };

  const nextStep = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const prevStep = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
    setErrors({});
  };

  const renderStepIndicator = () => (
    <div className="flex items-center justify-center mb-6">
      {[1, 2, 3].map((step) => (
        <React.Fragment key={step}>
          <div className={`
            w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all
            ${step <= currentStep 
              ? 'bg-primary-500 text-dark-900' 
              : 'bg-gray-200 text-gray-500'
            }
          `}>
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </div>
          {step < totalSteps && (
            <div className={`w-8 h-1 mx-2 transition-all ${
              step < currentStep ? 'bg-primary-500' : 'bg-gray-200'
            }`} />
          )}
        </React.Fragment>
      ))}
    </div>
  );

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-lg font-semibold text-dark-900 mb-4">Informações do Cliente</h3>
              
              <div className="mb-4">
                <div className="flex gap-4">
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={formData.isNewClient}
                      onChange={() => handleClientTypeChange(true)}
                      className="mr-2 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">Novo Cliente</span>
                  </label>
                  <label className="flex items-center cursor-pointer">
                    <input
                      type="radio"
                      checked={!formData.isNewClient}
                      onChange={() => handleClientTypeChange(false)}
                      className="mr-2 text-primary-500 focus:ring-primary-500"
                    />
                    <span className="text-sm font-medium">Cliente Existente</span>
                  </label>
                </div>
              </div>

              {!formData.isNewClient ? (
                <div>
                  <label htmlFor="existingClient" className="block text-sm font-medium text-gray-700 mb-2">
                    Selecionar Cliente *
                  </label>
                  <select
                    id="existingClient"
                    value={existingClientId}
                    onChange={(e) => handleExistingClientChange(e.target.value)}
                    className={`w-full px-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.existingClient ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione um cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>
                        {client.name} - {client.phone}
                      </option>
                    ))}
                  </select>
                  {errors.existingClient && (
                    <p className="mt-1 text-sm text-red-600">{errors.existingClient}</p>
                  )}
                  {clients.length === 0 && (
                    <p className="mt-1 text-sm text-gray-500">Nenhum cliente cadastrado ainda</p>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                      Nome Completo *
                    </label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="clientName"
                        type="text"
                        value={formData.clientName}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, clientName: e.target.value }));
                          if (errors.clientName) setErrors(prev => ({ ...prev, clientName: '' }));
                        }}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          errors.clientName ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="Nome completo do cliente"
                      />
                    </div>
                    {errors.clientName && (
                      <p className="mt-1 text-sm text-red-600">{errors.clientName}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="clientPhone" className="block text-sm font-medium text-gray-700 mb-2">
                      WhatsApp *
                    </label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                      <input
                        id="clientPhone"
                        type="tel"
                        value={formData.clientPhone}
                        onChange={(e) => {
                          setFormData(prev => ({ ...prev, clientPhone: e.target.value }));
                          if (errors.clientPhone) setErrors(prev => ({ ...prev, clientPhone: '' }));
                        }}
                        className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                          errors.clientPhone ? 'border-red-300' : 'border-gray-300'
                        }`}
                        placeholder="+55 11 99999-9999"
                      />
                    </div>
                    {errors.clientPhone && (
                      <p className="mt-1 text-sm text-red-600">{errors.clientPhone}</p>
                    )}
                  </div>

                  <div>
                    <label htmlFor="clientEmail" className="block text-sm font-medium text-gray-700 mb-2">
                      Email (opcional)
                    </label>
                    <input
                      id="clientEmail"
                      type="email"
                      value={formData.clientEmail}
                      onChange={(e) => setFormData(prev => ({ ...prev, clientEmail: e.target.value }))}
                      className="w-full px-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                      placeholder="email@exemplo.com"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-dark-900 mb-4">Selecionar Serviço</h3>
            
            <div className="space-y-3">
              {services.map(service => (
                <label
                  key={service.id}
                  className={`
                    block p-4 border rounded-xl cursor-pointer transition-all
                    ${formData.serviceId === service.id 
                      ? 'border-primary-500 bg-primary-50' 
                      : 'border-gray-300 hover:border-gray-400'
                    }
                  `}
                >
                  <input
                    type="radio"
                    name="service"
                    value={service.id}
                    checked={formData.serviceId === service.id}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, serviceId: e.target.value }));
                      if (errors.serviceId) setErrors(prev => ({ ...prev, serviceId: '' }));
                    }}
                    className="sr-only"
                  />
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-medium text-dark-900">{service.name}</h4>
                      <p className="text-sm text-gray-600">{service.description}</p>
                      <p className="text-sm text-gray-500 mt-1">{service.duration} minutos</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-dark-900">R$ {service.price}</p>
                    </div>
                  </div>
                </label>
              ))}
            </div>
            {errors.serviceId && (
              <p className="text-sm text-red-600">{errors.serviceId}</p>
            )}
          </div>
        );

      case 3:
        return (
          <div className="space-y-6">
            <h3 className="text-lg font-semibold text-dark-900 mb-4">Data e Horário</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label htmlFor="date" className="block text-sm font-medium text-gray-700 mb-2">
                  Data *
                </label>
                <div className="relative">
                  <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <input
                    id="date"
                    type="date"
                    value={formData.date}
                    min={format(new Date(), 'yyyy-MM-dd')}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, date: e.target.value }));
                      if (errors.date) setErrors(prev => ({ ...prev, date: '' }));
                    }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.date ? 'border-red-300' : 'border-gray-300'
                    }`}
                  />
                </div>
                {errors.date && (
                  <p className="mt-1 text-sm text-red-600">{errors.date}</p>
                )}
              </div>

              <div>
                <label htmlFor="time" className="block text-sm font-medium text-gray-700 mb-2">
                  Horário *
                </label>
                <div className="relative">
                  <Clock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                  <select
                    id="time"
                    value={formData.time}
                    onChange={(e) => {
                      setFormData(prev => ({ ...prev, time: e.target.value }));
                      if (errors.time) setErrors(prev => ({ ...prev, time: '' }));
                    }}
                    className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent ${
                      errors.time ? 'border-red-300' : 'border-gray-300'
                    }`}
                  >
                    <option value="">Selecione um horário</option>
                    <option value="08:00">08:00</option>
                    <option value="09:00">09:00</option>
                    <option value="10:00">10:00</option>
                    <option value="11:00">11:00</option>
                    <option value="12:00">12:00</option>
                    <option value="13:00">13:00</option>
                    <option value="14:00">14:00</option>
                    <option value="15:00">15:00</option>
                    <option value="16:00">16:00</option>
                    <option value="17:00">17:00</option>
                    <option value="18:00">18:00</option>
                  </select>
                </div>
                {errors.time && (
                  <p className="mt-1 text-sm text-red-600">{errors.time}</p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                Observações (opcional)
              </label>
              <div className="relative">
                <FileText className="absolute left-3 top-3 w-5 h-5 text-gray-400" />
                <textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent resize-none"
                  rows={3}
                  placeholder="Observações sobre o agendamento..."
                />
              </div>
            </div>

            {/* Success Message */}
            {successMessage && (
              <div className="bg-green-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 font-medium">{successMessage}</p>
                </div>
              </div>
            )}

            {/* Error Message */}
            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-600 text-sm">{errors.submit}</p>
                </div>
              </div>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-4 md:p-6 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold text-dark-900">Novo Agendamento</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors touch-manipulation"
              aria-label="Fechar"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        <div className="p-4 md:p-6">
          {renderStepIndicator()}
          
          <form onSubmit={handleSubmit}>
            {renderStepContent()}

            {/* Navigation Buttons */}
            <div className="flex gap-3 pt-6 mt-6 border-t border-gray-100">
              {currentStep > 1 && (
                <button
                  type="button"
                  onClick={prevStep}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium touch-manipulation disabled:opacity-50"
                >
                  Voltar
                </button>
              )}
              
              {currentStep < totalSteps ? (
                <button
                  type="button"
                  onClick={nextStep}
                  disabled={loading}
                  className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 text-dark-900 rounded-xl transition-colors font-semibold touch-manipulation disabled:opacity-50"
                >
                  Continuar
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={loading || !!successMessage}
                  className="flex-1 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 rounded-xl transition-colors font-semibold touch-manipulation flex items-center justify-center gap-2"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-900"></div>
                      Salvando...
                    </>
                  ) : successMessage ? (
                    <>
                      <Check className="w-4 h-4" />
                      Salvo!
                    </>
                  ) : (
                    'Agendar'
                  )}
                </button>
              )}
              
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium touch-manipulation disabled:opacity-50"
                >
                  Cancelar
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AppointmentForm;