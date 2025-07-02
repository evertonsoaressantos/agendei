import React from 'react';
import { Calendar, Users, Settings, Home, Plus, BarChart3, UserCheck } from 'lucide-react';

interface MobileNavBarProps {
  activeView: string;
  onViewChange: (view: string) => void;
}

const MobileNavBar: React.FC<MobileNavBarProps> = ({ activeView, onViewChange }) => {
  const leftItems = [
    { id: 'dashboard', label: 'Início', icon: Home },
    { id: 'calendar', label: 'Agendamentos', icon: Calendar },
  ];

  const rightItems = [
    { id: 'customers', label: 'Clientes', icon: UserCheck },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
  ];

  const NavItem: React.FC<{ item: any; isActive: boolean }> = ({ item, isActive }) => {
    const Icon = item.icon;
    return (
      <button
        onClick={() => onViewChange(item.id)}
        className={`flex flex-col items-center justify-center py-2 px-3 rounded-xl transition-all duration-200 ${
          isActive 
            ? 'text-primary-500' 
            : 'text-gray-400 hover:text-gray-300'
        }`}
      >
        <Icon className={`w-5 h-5 mb-1 ${isActive ? 'text-primary-500' : ''}`} />
        <span className="text-xs font-medium">{item.label}</span>
      </button>
    );
  };

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-50">
      {/* Background with blur effect */}
      <div className="bg-dark-900/95 backdrop-blur-lg border-t border-gray-700">
        <div className="relative px-4 py-2">
          {/* Navigation items container */}
          <div className="flex items-center justify-between">
            {/* Left items */}
            <div className="flex items-center space-x-2">
              {leftItems.map((item) => (
                <NavItem 
                  key={item.id} 
                  item={item} 
                  isActive={activeView === item.id} 
                />
              ))}
            </div>

            {/* Center floating action button */}
            <div className="absolute left-1/2 transform -translate-x-1/2 -top-6">
              <button
                onClick={() => onViewChange('new-appointment')}
                className="w-14 h-14 bg-primary-500 hover:bg-primary-600 rounded-full flex items-center justify-center shadow-lg transition-all duration-200 transform hover:scale-105 active:scale-95"
              >
                <Plus className="w-6 h-6 text-dark-900" />
              </button>
            </div>

            {/* Right items */}
            <div className="flex items-center space-x-2">
              {rightItems.map((item) => (
                <NavItem 
                  key={item.id} 
                  item={item} 
                  isActive={activeView === item.id} 
                />
              ))}
            </div>
          </div>

          {/* Home indicator */}
          <div className="flex justify-center mt-2">
            <div className="w-32 h-1 bg-gray-600 rounded-full"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MobileNavBar;