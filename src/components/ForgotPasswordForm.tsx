import React, { useState } from 'react';
import { Mail, ArrowLeft, Check, AlertCircle, Loader } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ForgotPasswordFormProps {
  onSuccess: () => void;
  onBack: () => void;
}

const ForgotPasswordForm: React.FC<ForgotPasswordFormProps> = ({ onSuccess, onBack }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/reset-password`,
      });

      if (error) {
        setError(error.message);
      } else {
        setSuccess(true);
        setTimeout(() => {
          onSuccess();
        }, 3000);
      }
    } catch (err) {
      setError('Erro ao enviar email de recuperação. Tente novamente.');
    } finally {
      setLoading(false);
    }
  };

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  if (success) {
    return (
      <div className="max-w-md w-full mx-auto">
        <div className="bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
          <div className="text-center">
            <div className="w-16 h-16 bg-green-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <Check className="w-8 h-8 text-green-600" />
            </div>
            <h2 className="text-2xl font-semibold text-dark-900 mb-2">Email Enviado!</h2>
            <p className="text-gray-600 mb-6">
              Enviamos um link de recuperação para <strong>{email}</strong>. 
              Verifique sua caixa de entrada e spam.
            </p>
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-medium mb-1">Instruções:</p>
                  <ul className="space-y-1 text-left">
                    <li>• O link é válido por 1 hora</li>
                    <li>• Clique no link para redefinir sua senha</li>
                    <li>• Se não receber o email, verifique a pasta de spam</li>
                  </ul>
                </div>
              </div>
            </div>
            <button
              onClick={onBack}
              className="w-full bg-primary-500 hover:bg-primary-600 text-dark-900 font-semibold py-3 px-4 rounded-xl transition-colors"
            >
              Voltar ao Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-md w-full mx-auto">
      <div className="bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-primary-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Mail className="w-8 h-8 text-primary-600" />
          </div>
          <h2 className="text-2xl font-semibold text-dark-900 mb-2">Esqueceu sua senha?</h2>
          <p className="text-gray-600">
            Digite seu email e enviaremos um link para redefinir sua senha
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
              Endereço de Email
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value);
                  if (error) setError('');
                }}
                className={`w-full pl-10 pr-4 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all ${
                  error ? 'border-red-300' : 'border-gray-300'
                }`}
                placeholder="seu@email.com"
                required
              />
            </div>
            
            {/* Real-time validation feedback */}
            {email && !validateEmail(email) && (
              <div className="mt-2 flex items-center gap-2 text-red-600">
                <AlertCircle className="w-4 h-4" />
                <span className="text-sm">Por favor, digite um email válido</span>
              </div>
            )}
            
            {email && validateEmail(email) && (
              <div className="mt-2 flex items-center gap-2 text-green-600">
                <Check className="w-4 h-4" />
                <span className="text-sm">Email válido</span>
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

          <div className="space-y-3">
            <button
              type="submit"
              disabled={loading || !email || !validateEmail(email)}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 font-semibold py-3 px-4 rounded-xl transition-colors flex items-center justify-center gap-2"
            >
              {loading ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  Enviando...
                </>
              ) : (
                'Enviar Link de Recuperação'
              )}
            </button>
            
            <button
              type="button"
              onClick={onBack}
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 px-6 py-3 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 transition-colors font-medium"
            >
              <ArrowLeft className="w-4 h-4" />
              Voltar ao Login
            </button>
          </div>
        </form>

        {/* Information box */}
        <div className="mt-6 bg-blue-50 border border-blue-200 rounded-xl p-4">
          <div className="flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5" />
            <div className="text-sm text-blue-800">
              <p className="font-medium mb-1">Sobre a recuperação de senha:</p>
              <ul className="space-y-1">
                <li>• O link de recuperação expira em 1 hora</li>
                <li>• Você pode solicitar um novo link a qualquer momento</li>
                <li>• Verifique sua pasta de spam se não receber o email</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPasswordForm;