import React, { useState, useEffect } from 'react';
import { Lock, Eye, EyeOff, Check, X, AlertCircle, ArrowLeft } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';

interface PasswordRequirement {
  label: string;
  test: (password: string) => boolean;
}

const ResetPasswordForm: React.FC = () => {
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [isValidSession, setIsValidSession] = useState(false);
  const { login } = useAuth();

  // Password requirements
  const passwordRequirements: PasswordRequirement[] = [
    { label: 'Mínimo de 8 caracteres', test: (pwd) => pwd.length >= 8 },
    { label: 'Uma letra maiúscula', test: (pwd) => /[A-Z]/.test(pwd) },
    { label: 'Uma letra minúscula', test: (pwd) => /[a-z]/.test(pwd) },
    { label: 'Um número', test: (pwd) => /\d/.test(pwd) },
    { label: 'Um caractere especial', test: (pwd) => /[!@#$%^&*(),.?":{}|<>]/.test(pwd) }
  ];

  useEffect(() => {
    // Check if we have a valid session from password reset
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        setIsValidSession(true);
      } else {
        setError('Link de recuperação inválido ou expirado');
      }
    };

    checkSession();
  }, []);

  const getPasswordStrength = (password: string): { score: number; label: string; color: string } => {
    const metRequirements = passwordRequirements.filter(req => req.test(password)).length;
    
    if (metRequirements === 0) return { score: 0, label: '', color: '' };
    if (metRequirements <= 2) return { score: 25, label: 'Fraca', color: 'bg-red-500' };
    if (metRequirements <= 3) return { score: 50, label: 'Regular', color: 'bg-yellow-500' };
    if (metRequirements <= 4) return { score: 75, label: 'Boa', color: 'bg-blue-500' };
    return { score: 100, label: 'Forte', color: 'bg-green-500' };
  };

  const isPasswordValid = (): boolean => {
    return passwordRequirements.every(req => req.test(password));
  };

  const passwordsMatch = password === confirmPassword;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!isPasswordValid()) {
      setError('A senha não atende a todos os requisitos');
      return;
    }

    if (!passwordsMatch) {
      setError('As senhas não coincidem');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.updateUser({
        password: password
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        // Auto redirect to login after 3 seconds
        setTimeout(() => {
          window.location.href = '/';
        }, 3000);
      }
    } catch (err) {
      setError('Erro ao redefinir senha. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const passwordStrength = getPasswordStrength(password);

  if (!isValidSession) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <AlertCircle className="w-8 h-8 text-red-600" />
              </div>
              <h2 className="text-2xl font-semibold text-dark-900 mb-2">Link Inválido</h2>
              <p className="text-gray-600 mb-6">
                O link de recuperação é inválido ou expirou. Solicite um novo link de recuperação.
              </p>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-primary-500 hover:bg-primary-600 text-dark-900 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" />
                Voltar ao Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
        <div className="max-w-md w-full">
          <div className="bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
            <div className="text-center">
              <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <Check className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-2xl font-semibold text-dark-900 mb-2">Senha Redefinida!</h2>
              <p className="text-gray-600 mb-6">
                Sua senha foi redefinida com sucesso. Você será redirecionado para a página de login em alguns segundos.
              </p>
              <div className="bg-green-50 border border-green-200 rounded-xl p-4 mb-6">
                <div className="flex items-center gap-2">
                  <Check className="w-5 h-5 text-green-600" />
                  <p className="text-green-800 font-medium">Redefinição concluída com sucesso!</p>
                </div>
              </div>
              <button
                onClick={() => window.location.href = '/'}
                className="w-full bg-primary-500 hover:bg-primary-600 text-dark-900 font-semibold py-3 px-4 rounded-xl transition-colors"
              >
                Ir para Login
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Lock className="w-8 h-8 text-primary-600" />
            </div>
            <h2 className="text-2xl font-semibold text-dark-900 mb-2">Redefinir Senha</h2>
            <p className="text-gray-600">
              Crie uma nova senha segura para sua conta
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* New Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Nova Senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all"
                  placeholder="Digite sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password strength indicator */}
              {password && (
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

              {/* Password requirements */}
              <div className="mt-4 space-y-2">
                <p className="text-sm font-medium text-gray-700">Requisitos da senha:</p>
                {passwordRequirements.map((requirement, index) => {
                  const isMet = password ? requirement.test(password) : false;
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
            </div>

            {/* Confirm Password */}
            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-2">
                Confirmar Nova Senha *
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="confirmPassword"
                  type={showConfirmPassword ? 'text' : 'password'}
                  value={confirmPassword}
                  onChange={(e) => {
                    setConfirmPassword(e.target.value);
                    if (error) setError('');
                  }}
                  className={`w-full pl-10 pr-12 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                    confirmPassword && !passwordsMatch ? 'border-red-300' : 'border-gray-300'
                  }`}
                  placeholder="Confirme sua nova senha"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 p-1 text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>

              {/* Password match feedback */}
              {confirmPassword && (
                <div className={`mt-2 flex items-center gap-2 ${
                  passwordsMatch ? 'text-green-600' : 'text-red-600'
                }`}>
                  {passwordsMatch ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                  <span className="text-sm">
                    {passwordsMatch ? 'As senhas coincidem' : 'As senhas não coincidem'}
                  </span>
                </div>
              )}
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-red-600" />
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || !isPasswordValid() || !passwordsMatch}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              {loading ? 'Redefinindo...' : 'Redefinir Senha'}
            </button>
          </form>

          {/* Security notice */}
          <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
              <div className="text-sm text-blue-800">
                <p className="font-medium mb-1">Dicas de segurança:</p>
                <ul className="space-y-1">
                  <li>• Use uma senha única que você não usa em outros sites</li>
                  <li>• Considere usar um gerenciador de senhas</li>
                  <li>• Não compartilhe sua senha com ninguém</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPasswordForm;