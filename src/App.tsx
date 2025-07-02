import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AppProvider, useApp } from './context/AppContext';
import Login from './components/Login';
import Header from './components/Layout/Header';
import Sidebar from './components/Layout/Sidebar';
import MobileNavBar from './components/Layout/MobileNavBar';
import DashboardStats from './components/Dashboard/DashboardStats';
import TodaySchedule from './components/Dashboard/TodaySchedule';
import WeeklyCalendar from './components/Calendar/WeeklyCalendar';
import AppointmentForm from './components/Appointments/AppointmentForm';
import ClientList from './components/Clients/ClientList';
import CustomerList from './components/Customers/CustomerList';
import CustomerListReport from './components/Customers/CustomerListReport';
import CustomerListAdvanced from './components/Customers/CustomerListAdvanced';
import DebugPanel from './components/Debug/DebugPanel';

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
    
    // Refresh appointments to show the new one
    await refreshAppointments();
  };

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
      case 'customer-report': return 'Relatório de Clientes';
      case 'customer-list-advanced': return 'Lista Completa de Clientes';
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
          <WeeklyCalendar 
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
        return <CustomerList />;
      case 'customer-report':
        return <CustomerListReport />;
      case 'customer-list-advanced':
        return <CustomerListAdvanced />;
      case 'reports':
        return (
          <div className="bg-white rounded-2xl p-8 border border-gray-200">
            <h2 className="text-xl font-semibold text-dark-900 mb-4">Relatórios</h2>
            <div className="space-y-4">
              <button
                onClick={() => setActiveView('customer-report')}
                className="w-full p-4 bg-primary-50 hover:bg-primary-100 border border-primary-200 rounded-xl text-left transition-colors"
              >
                <h3 className="font-semibold text-primary-800">Relatório Completo de Clientes</h3>
                <p className="text-primary-600 text-sm mt-1">
                  Lista detalhada de todos os clientes cadastrados no sistema
                </p>
              </button>
              <button
                onClick={() => setActiveView('customer-list-advanced')}
                className="w-full p-4 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl text-left transition-colors"
              >
                <h3 className="font-semibold text-blue-800">Lista Avançada de Clientes</h3>
                <p className="text-blue-600 text-sm mt-1">
                  Lista completa com filtros avançados e histórico de agendamentos
                </p>
              </button>
              <p className="text-gray-600">Outras funcionalidades em desenvolvimento</p>
            </div>
          </div>
        );
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
      {/* Desktop Sidebar */}
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

      {/* Mobile Navigation Bar */}
      <MobileNavBar 
        activeView={activeView}
        onViewChange={handleViewChange}
      />

      {showAppointmentForm && (
        <AppointmentForm
          onClose={() => setShowAppointmentForm(false)}
          onSuccess={handleAppointmentSuccess}
        />
      )}

      {/* Debug Panel */}
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