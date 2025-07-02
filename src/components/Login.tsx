import React, { useState } from 'react';
import { Lock, Mail, Calendar, AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import SignUpForm from './SignUpForm';

const Login: React.FC = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showSignUp, setShowSignUp] = useState(false);
  const { login } = useAuth();

  // Check if Supabase is configured
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
  const isSupabaseConfigured = supabaseUrl && supabaseKey && 
    supabaseUrl !== 'https://your-project.supabase.co' && 
    supabaseKey !== 'your-anon-key';

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    const success = await login(email, password);
    
    if (!success) {
      setError('Email ou senha incorretos');
    }
    
    setLoading(false);
  };

  const handleSignUpSuccess = () => {
    setShowSignUp(false);
    setError('');
    alert('Conta criada com sucesso! Você pode fazer login agora.');
  };

  if (showSignUp) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
        <SignUpForm 
          onSuccess={handleSignUpSuccess}
          onBack={() => setShowSignUp(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-accent-50 flex items-center justify-center p-4">
      <div className="max-w-md w-full">
        <div className="bg-white rounded-3xl shadow-soft p-8 border border-gray-100">
          {/* Logo/Header */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 bg-primary-500 rounded-2xl mb-4">
              <Calendar className="w-8 h-8 text-dark-900" />
            </div>
            <h1 className="text-2xl font-semibold text-dark-900 mb-2">AgendaPro</h1>
            <p className="text-gray-600">Sistema de Agendamento Profissional</p>
          </div>

          {/* Demo mode warning */}
          {!isSupabaseConfigured && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
              <div className="flex items-center gap-2 mb-2">
                <AlertCircle className="w-4 h-4 text-amber-600" />
                <span className="text-sm font-medium text-amber-800">Modo Demonstração</span>
              </div>
              <p className="text-sm text-amber-700">
                A aplicação está rodando em modo demo. Para usar todas as funcionalidades, configure o Supabase.
              </p>
            </div>
          )}

          {/* Toggle between Login and Sign Up */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            <button
              onClick={() => setShowSignUp(false)}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors bg-white text-dark-900 shadow-sm"
            >
              Entrar
            </button>
            <button
              onClick={() => setShowSignUp(true)}
              disabled={!isSupabaseConfigured}
              className="flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-colors text-gray-600 hover:text-gray-800 disabled:text-gray-400 disabled:cursor-not-allowed"
            >
              Criar Conta
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                Email
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="seu@email.com"
                  required
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent transition-all duration-200"
                  placeholder="••••••••"
                  minLength={6}
                  required
                />
              </div>
            </div>

            {error && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-3">
                <p className="text-red-600 text-sm">{error}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-primary-500 hover:bg-primary-600 disabled:bg-gray-300 text-dark-900 font-semibold py-3 px-4 rounded-xl transition-all duration-200 transform hover:scale-[1.02] active:scale-[0.98]"
            >
              {loading ? 'Entrando...' : 'Entrar'}
            </button>
          </form>

          {/* Demo credentials */}
          {!isSupabaseConfigured && (
            <div className="mt-6 bg-primary-50 rounded-xl p-4 border border-primary-200">
              <div className="text-center">
                <p className="text-sm font-medium text-primary-800 mb-2">Credenciais de Demonstração</p>
                <div className="text-sm text-primary-700">
                  <p><strong>Email:</strong> admin@exemplo.com</p>
                  <p><strong>Senha:</strong> admin123</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Login;