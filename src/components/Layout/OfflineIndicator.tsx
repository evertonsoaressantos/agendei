import React from 'react';
import { WifiOff, Wifi, Download } from 'lucide-react';
import { useServiceWorker } from '../../hooks/useServiceWorker';

const OfflineIndicator: React.FC = () => {
  const { isOnline, updateAvailable, updateServiceWorker } = useServiceWorker();

  if (isOnline && !updateAvailable) {
    return null;
  }

  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      {!isOnline && (
        <div className="bg-amber-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <WifiOff className="w-4 h-4" />
            <span>Você está offline - Dados em cache disponíveis</span>
          </div>
        </div>
      )}
      
      {isOnline && updateAvailable && (
        <div className="bg-blue-500 text-white px-4 py-2 text-center text-sm font-medium">
          <div className="flex items-center justify-center gap-2">
            <Download className="w-4 h-4" />
            <span>Nova versão disponível</span>
            <button
              onClick={updateServiceWorker}
              className="ml-2 px-3 py-1 bg-white text-blue-500 rounded text-xs font-semibold hover:bg-gray-100 transition-colors"
            >
              Atualizar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default OfflineIndicator;