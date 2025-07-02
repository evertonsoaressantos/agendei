import React from 'react';
import { Calendar, Users, Settings, Home, Plus, BarChart3, UserCheck } from 'lucide-react';

interface SidebarProps {
  activeView: string;
  onViewChange: (view: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activeView, onViewChange, isOpen, onClose }) => {
  const menuItems = [
    { id: 'dashboard', label: 'Painel', icon: Home },
    { id: 'calendar', label: 'Agendamentos', icon: Calendar },
    { id: 'new-appointment', label: 'Novo Agendamento', icon: Plus },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'customers', label: 'Gestão de Clientes', icon: UserCheck },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  const handleItemClick = (view: string) => {
    onViewChange(view);
    onClose();
  };

  return (
    <>
      {/* Mobile overlay - only show on mobile when sidebar is open */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 lg:hidden"
          onClick={onClose}
        />
      )}
      
      {/* Sidebar - hidden on mobile, always visible on desktop */}
      <aside className={`
        fixed left-0 top-0 h-full bg-dark-900 text-white w-64 z-50 transform transition-transform duration-300 ease-in-out
        lg:translate-x-0 lg:static lg:z-auto
        hidden lg:block
        ${isOpen ? 'translate-x-0 block' : '-translate-x-full'}
      `}>
        <div className="p-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-primary-500 rounded-xl flex items-center justify-center">
              <Calendar className="w-6 h-6 text-dark-900" />
            </div>
            <div>
              <h2 className="text-xl font-semibold">AgendaPro</h2>
              <p className="text-gray-400 text-sm">v1.0</p>
            </div>
          </div>
        </div>

        <nav className="px-3 pb-6">
          <ul className="space-y-2">
            {menuItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeView === item.id;
              
              return (
                <li key={item.id}>
                  <button
                    onClick={() => handleItemClick(item.id)}
                    className={`
                      w-full flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 text-left
                      ${isActive 
                        ? 'bg-primary-500 text-dark-900 font-semibold' 
                        : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                      }
                    `}
                  >
                    <Icon className="w-5 h-5" />
                    <span>{item.label}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>
      </aside>
    </>
  );
};

export default Sidebar;