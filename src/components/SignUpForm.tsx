import React, { useState } from 'react';
import { 
  User, Mail, Lock, Eye, EyeOff, Check, X, 
  ChevronLeft, ChevronRight, AlertCircle 
} from 'lucide-react';
import { supabase } from '../lib/supabase';

interface SignUpFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

interface FormData {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
}

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const SignUpForm: React.FC<SignUpFormProps> = ({ onSuccess, onBack }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<FormData>({
    name: '',
    email: '',
    password: '',
    confirmPassword: ''
  });
  
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [emailChecking, setEmailChecking] = useState(false);

  const totalSteps = 5;

  // Requisitos de senha
  const passwordRequirements: PasswordRequirement[] = [
    { label: 'Mínimo de 8 caracteres', test: (pwd) => pwd.length >= 8 },
    { label: 'Uma letra maiúscula', test: (pwd) => /[A-Z]/.test(pwd) },
    { label: 'Uma letra minúscula', test: (pwd) => /[a-z]/.test(pwd) },
    { label: 'Um número', test: (pwd) => /\d/.test(pwd) },
    { label: 'Um caractere especial', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
  ];

  // Validação do nome
  const validateName = (name: string): string | null => {
    if (!name.trim()) {
      return 'Nome é obrigatório';
    }
    if (name.trim().length < 3) {
      return 'Nome deve ter pelo menos 3 caracteres';
    }
    if (!/^[a-zA-ZÀ-ÿ\s]+$/.test(name)) {
      return 'Nome deve conter apenas letras e espaços';
    }
    // Verificar se é nome completo (pelo menos 2 palavras)
    const nameParts = name.trim().split(/\s+/);
    if (nameParts.length < 2) {
      return 'Por favor, digite seu nome completo';
    }
    return null;
  };

  // Validação do email
  const validateEmail = (email: string): string | null => {
    if (!email.trim()) {
      return 'Email é obrigatório';
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return 'Por favor, digite um email válido';
    }
    return null;
  };

  // Verificar se email já existe
  const checkEmailExists = async (email: string): Promise<boolean> => {
    try {
      setEmailChecking(true);
      
      // Try to sign in with a dummy password to check if email exists
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password: 'dummy-password-for-check'
      });
      
      // If the error is about invalid credentials, the email exists
      if (error?.message?.includes('Invalid login credentials')) {
        return true;
      }
      
      // If there's no error or a different error, email might not exist
      return false;
    } catch (error: any) {
      console.error('Error checking email:', error);
      return false;
    } finally {
      setEmailChecking(false);
    }
  };

  // Calcular força da senha
  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    const metRequirements = passwordRequirements.filter(req => req.test(password)).length;
    
    if (metRequirements === 0) return { score: 0, label: '', color: '' };
    if (metRequirements <= 2) return { score: 25, label: 'Fraca', color: 'bg-red-500' };
    if (metRequirements <= 3) return { score: 50, label: 'Regular', color: 'bg-yellow-500' };
    if (metRequirements <= 4) return { score: 75, label: 'Boa', color: 'bg-blue-500' };
    return { score: 100, label: 'Forte', color: 'bg-green-500' };
  };

  // Validar passo atual
  const validateCurrentStep = (): boolean => {
    const newErrors: Record<string, string> = {};

    switch (currentStep) {
      case 1:
        const nameError = validateName(formData.name);
        if (nameError) newErrors.name = nameError;
        break;
      
      case 2:
        const emailError = validateEmail(formData.email);
        if (emailError) newErrors.email = emailError;
        break;
      
      case 3:
        const unmetRequirements = passwordRequirements.filter(req => !req.test(formData.password));
        if (unmetRequirements.length > 0) {
          newErrors.password = 'A senha não atende a todos os requisitos';
        }
        break;
      
      case 4:
        if (formData.password !== formData.confirmPassword) {
          newErrors.confirmPassword = 'As senhas não coincidem';
        }
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Navegar para próximo passo
  const nextStep = async () => {
    if (!validateCurrentStep()) return;

    // Verificar email no passo 2
    if (currentStep === 2) {
      const emailExists = await checkEmailExists(formData.email);
      if (emailExists) {
        setErrors({ email: 'Este email já está cadastrado' });
        return;
      }
    }

    if (currentStep < totalSteps) {
      setCurrentStep(currentStep + 1);
      setErrors({});
    }
  };

  // Voltar passo
  const prevStep = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1);
      setErrors({});
    }
  };

  // Ir para passo específico (apenas para trás)
  const goToStep = (step: number) => {
    if (step < currentStep) {
      setCurrentStep(step);
      setErrors({});
    }
  };

  // Submeter formulário
  const handleSubmit = async () => {
    if (!validateCurrentStep()) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name
          }
        }
      });

      if (error) {
        if (error.message.includes('User already registered')) {
          setErrors({ email: 'Este email já está cadastrado' });
          setCurrentStep(2);
        } else {
          setErrors({ submit: error.message });
        }
        return;
      }

      if (data.user) {
        // Tentar criar perfil do usuário
        const { error: profileError } = await supabase
          .from('users')
          .insert([{
            id: data.user.id,
            email: formData.email,
            name: formData.name,
            business_name: 'Meu Negócio',
            phone: '',
            address: null
          }]);

        if (profileError && profileError.code !== '23505') {
          console.error('Erro ao criar perfil:', profileError);
        }

        onSuccess();
      }
    } catch (error: any) {
      setErrors({ submit: error.message || 'Erro ao criar conta' });
    } finally {
      setLoading(false);
    }
  };

  // Renderizar indicador de progresso
  const renderProgressBar = () => (
    <div className="mb-8">
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-600">
          Passo {currentStep} de {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round((currentStep / totalSteps) * 100)}%
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <div 
          className="bg-primary-500 h-2 rounded-full transition-all duration-300"
          style={{ width: `${(currentStep / totalSteps) * 100}%` }}
        />
      </div>
      
      {/* Indicadores de passos */}
      <div className="flex justify-between mt-4">
        {Array.from({ length: totalSteps }, (_, i) => i + 1).map((step) => (
          <button
            key={step}
            onClick={() => goToStep(step)}
            disabled={step >= currentStep}
            className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all ${
              step < currentStep 
                ? 'bg-primary-500 text-dark-900 cursor-pointer hover:bg-primary-600' 
                : step === currentStep
                ? 'bg-primary-500 text-dark-900'
                : 'bg-gray-200 text-gray-500 cursor-not-allowed'
            }`}
          >
            {step < currentStep ? <Check className="w-4 h-4" /> : step}
          </button>
        ))}
      </div>
    </div>
  );

  // Renderizar conteúdo do passo
  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <User className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-dark-900 mb-2">Qual é o seu nome?</h2>
              <p className="text-gray-600">Vamos começar com seu nome completo</p>
            </div>

            <div>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, name: e.target.value }));
                  if (errors.name) setErrors(prev => ({ ...prev, name: '' }));
                }}
                className={`w-full px-4 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.name ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="Digite seu nome completo"
                autoFocus
              />
              {errors.name && (
                <div className="mt-2 flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.name}</span>
                </div>
              )}
              
              {/* Feedback em tempo real */}
              {formData.name && !errors.name && validateName(formData.name) === null && (
                <div className="mt-2 flex items-center gap-2 text-green-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Nome válido</span>
                </div>
              )}
            </div>
          </div>
        );

      case 2:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Mail className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-dark-900 mb-2">Qual é o seu email?</h2>
              <p className="text-gray-600">Usaremos este email para fazer login</p>
            </div>

            <div>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => {
                  setFormData(prev => ({ ...prev, email: e.target.value }));
                  if (errors.email) setErrors(prev => ({ ...prev, email: '' }));
                }}
                className={`w-full px-4 py-4 text-lg border rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                  errors.email ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="seu@email.com"
                autoFocus
              />
              
              {emailChecking && (
                <div className="mt-2 flex items-center gap-2 text-blue-600">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                  <span className="text-sm">Verificando disponibilidade...</span>
                </div>
              )}
              
              {errors.email && (
                <div className="mt-2 flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.email}</span>
                </div>
              )}
              
              {/* Feedback em tempo real */}
              {formData.email && !errors.email && !emailChecking && validateEmail(formData.email) === null && (
                <div className="mt-2 flex items-center gap-2 text-green-600">
                  <Check className="w-4 h-4" />
                  <span className="text-sm">Email válido</span>
                </div>
              )}
            </div>
          </div>
        );

      case 3:
        const passwordStrength = getPasswordStrength(formData.password);
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-dark-900 mb-2">Crie uma senha segura</h2>
              <p className="text-gray-600">Sua senha deve atender aos requisitos abaixo</p>
            </div>

            <div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={formData.password}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, password: e.target.value }));
                    if (errors.password) setErrors(prev => ({ ...prev, password: '' }));
                  }}
                  className={`w-full px-4 py-4 pr-12 text-lg border rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                    errors.password ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Digite sua senha"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Indicador de força da senha */}
              {formData.password && (
                <div className="mt-3">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm text-gray-600">Força da senha:</span>
                    <span className={`text-sm font-medium ${
                      passwordStrength.score >= 75 ? 'text-green-600' : 
                      passwordStrength.score >= 50 ? 'text-blue-600' :
                      passwordStrength.score >= 25 ? 'text-yellow-600' : 'text-red-600'
                    }`}>
                      {passwordStrength.label}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-300 ${passwordStrength.color}`}
                      style={{ width: `${passwordStrength.score}%` }}
                    />
                  </div>
                </div>
              )}

              {/* Requisitos da senha */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Requisitos:</p>
                {passwordRequirements.map((requirement, index) => {
                  const isMet = formData.password ? requirement.test(formData.password) : false;
                  return (
                    <div key={index} className={`flex items-center gap-2 text-sm ${
                      isMet ? 'text-green-600' : 'text-gray-500'
                    }`}>
                      {isMet ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                      <span>{requirement.label}</span>
                    </div>
                  );
                })}
              </div>

              {errors.password && (
                <div className="mt-3 flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.password}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 4:
        const passwordsMatch = formData.password === formData.confirmPassword;
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Lock className="w-8 h-8 text-primary-600" />
              </div>
              <h2 className="text-2xl font-semibold text-dark-900 mb-2">Confirme sua senha</h2>
              <p className="text-gray-600">Digite sua senha novamente para confirmar</p>
            </div>

            <div>
              <div className="relative">
                <input
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={formData.confirmPassword}
                  onChange={(e) => {
                    setFormData(prev => ({ ...prev, confirmPassword: e.target.value }));
                    if (errors.confirmPassword) setErrors(prev => ({ ...prev, confirmPassword: '' }));
                  }}
                  className={`w-full px-4 py-4 pr-12 text-lg border rounded-2xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                    errors.confirmPassword ? 'border-red-300' : 
                    formData.confirmPassword && passwordsMatch ? 'border-green-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirme sua senha"
                  autoFocus
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Feedback em tempo real */}
              {formData.confirmPassword && (
                <div className={`mt-2 flex items-center gap-2 ${
                  passwordsMatch ? 'text-green-600' : 'text-red-600'
                }`}>
                  {passwordsMatch ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span className="text-sm">
                    {passwordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem'}
                  </span>
                </div>
              )}

              {errors.confirmPassword && (
                <div className="mt-2 flex items-center gap-2 text-red-600">
                  <AlertCircle className="w-4 h-4" />
                  <span className="text-sm">{errors.confirmPassword}</span>
                </div>
              )}
            </div>
          </div>
        );

      case 5:
        return (
          <div className="space-y-6">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-dark-900 mb-2">Revisar informações</h2>
              <p className="text-gray-600">Verifique se todos os dados estão corretos</p>
            </div>

            <div className="space-y-4">
              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Nome completo</p>
                    <p className="font-medium text-gray-900">{formData.name}</p>
                  </div>
                  <button
                    onClick={() => goToStep(1)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Email</p>
                    <p className="font-medium text-gray-900">{formData.email}</p>
                  </div>
                  <button
                    onClick={() => goToStep(2)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                </div>
              </div>

              <div className="bg-gray-50 rounded-xl p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm text-gray-600">Senha</p>
                    <p className="font-medium text-gray-900">••••••••</p>
                  </div>
                  <button
                    onClick={() => goToStep(3)}
                    className="text-primary-600 hover:text-primary-700 text-sm font-medium"
                  >
                    Editar
                  </button>
                </div>
              </div>
            </div>

            {errors.submit && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-600" />
                  <p className="text-red-800">{errors.submit}</p>
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
    <div className="max-w-md w-full mx-auto">
      <div className="bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
        {renderProgressBar()}
        {renderStepContent()}

        {/* Botões de navegação */}
        <div className="flex gap-3 mt-8">
          {currentStep > 1 && (
            <button
              onClick={currentStep === 1 ? onBack : prevStep}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Voltar
            </button>
          )}
          
          {currentStep === 1 && (
            <button
              onClick={onBack}
              disabled={loading}
              className="flex items-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium disabled:opacity-50"
            >
              <ChevronLeft className="w-4 h-4" />
              Login
            </button>
          )}

          <button
            onClick={currentStep === totalSteps ? handleSubmit : nextStep}
            disabled={loading || emailChecking}
            className="flex-1 flex items-center justify-center gap-2 px-6 py-3 bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 rounded-xl transition-colors font-semibold"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-dark-900"></div>
                Criando conta...
              </>
            ) : currentStep === totalSteps ? (
              'Criar conta'
            ) : (
              <>
                Continuar
                <ChevronRight className="w-4 h-4" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SignUpForm;