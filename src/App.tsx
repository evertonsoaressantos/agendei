import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import ResetPasswordForm from './components/ResetPasswordForm';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import MobileNavBar from './components/Layout/MobileNavBar';
import OfflineIndicator from './components/Layout/OfflineIndicator';
import DashboardStats from './components/Dashboard/DashboardStats';
import TodaySchedule from './components/Dashboard/TodaySchedule';
import ClientList from './components/Clients/ClientList';
import CustomerListReport from './components/Customers/CustomerListReport';
import DebugPanel from './components/Debug/DebugPanel';
import MyServices from './components/Services/MyServices';

// Lazy loaded components
import {
  WeeklyCalendarWithSuspense,
  AppointmentFormWithSuspense,
  CustomerListWithSuspense
} from './components/LazyComponents';

const Dashboard: React.FC<{ onNavigate: (view: string) => void }> = ({ onNavigate }) => {
  return (
    <div className="space-y-8">
      <DashboardStats onNavigate={onNavigate} />
      <TodaySchedule />
    </div>
  );
};

const MainApp: React.FC = () => {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const { loading: appLoading, refreshAppointments } = useApp();
  const [activeView, setActiveView] = useState('dashboard');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showAppointmentForm, setShowAppointmentForm] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  // Check if we're on the reset password page
  const [isResetPasswordPage, setIsResetPasswordPage] = useState(false);

  useEffect(() => {
    // Check URL for reset password route
    const urlParams = new URLSearchParams(window.location.search);
    const isReset = window.location.pathname === '/reset-password' || 
                   urlParams.has('type') && urlParams.get('type') === 'recovery';
    setIsResetPasswordPage(isReset);
  }, []);

  const handleViewChange = (view: string) => {
    setActiveView(view);
    if (view === 'new-appointment') {
      setShowAppointmentForm(true);
    } else {
      setShowAppointmentForm(false);
    }
  };

  const handleAppointmentSuccess = async () => {
    console.log('App: Agendamento criado com sucesso, atualizando dados...');
    setShowAppointmentForm(false);
    setActiveView('dashboard');
    
    await refreshAppointments();
  };

  // Show reset password form if on reset password page
  if (isResetPasswordPage) {
    return <ResetPasswordForm />;
  }

  if (authLoading || (isAuthenticated && appLoading)) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-500 mx-auto mb-4"></div>
          <p className="text-gray-600">
            {authLoading ? 'Carregando...' : 'Sincronizando agendamentos...'}
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <Login />
        <DebugPanel />
      </>
    );
  }

  const getPageTitle = () => {
    switch (activeView) {
      case 'dashboard': return 'Painel';
      case 'calendar': return 'Agendamentos';
      case 'new-appointment': return 'Novo Agendamento';
      case 'clients': return 'Clientes';
      case 'customers': return 'Gestão de Clientes';
      case 'customer-report': return 'Relatórios';
      case 'reports': return 'Relatórios';
      case 'settings': return 'Configurações';
      default: return 'Painel';
    }
  };

  const renderContent = () => {
    switch (activeView) {
      case 'dashboard':
        return <Dashboard onNavigate={handleViewChange} />;
      case 'calendar':
        return (
          <WeeklyCalendarWithSuspense 
            currentDate={currentDate}
            onDateChange={setCurrentDate}
            onNewAppointment={() => setShowAppointmentForm(true)}
          />
        );
      case 'new-appointment':
        return <Dashboard onNavigate={handleViewChange} />;
      case 'clients':
        return <ClientList />;
      case 'customers':
        return <CustomerListWithSuspense />;
      case 'customer-report':
      case 'reports':
        return <CustomerListReport />;
      case 'my-services':
        return <MyServices />;
      case 'settings':
        return (
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-dark-900 mb-4">Configurações</h2>
            <p className="text-gray-600">Funcionalidade em desenvolvimento</p>
          </div>
        );
      default:
        return <Dashboard onNavigate={handleViewChange} />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      <OfflineIndicator />
      
      <Sidebar 
        activeView={activeView}
        onViewChange={handleViewChange}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />
      
      <div className="flex-1 lg:ml-64">
        <Header title={getPageTitle()} />
        
        <main className="p-6 pb-24 md:pb-6">
          {renderContent()}
        </main>
      </div>

      <MobileNavBar 
        activeView={activeView}
        onViewChange={handleViewChange}
      />

      {showAppointmentForm && (
        <AppointmentFormWithSuspense
          onClose={() => setShowAppointmentForm(false)}
          onSuccess={handleAppointmentSuccess}
        />
      )}

      <DebugPanel />
    </div>
  );
};

function App() {
  return (
    <AuthProvider>
      <AppProvider>
        <MainApp />
      </AppProvider>
    </AuthProvider>
  );
}

export default App;