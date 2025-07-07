import { useEffect, useState } from 'react';

interface ServiceWorkerState {
  isSupported: boolean;
  isRegistered: boolean;
  isOnline: boolean;
  updateAvailable: boolean;
}

export const useServiceWorker = () => {
  const [state, setState] = useState<ServiceWorkerState>({
    isSupported: 'serviceWorker' in navigator,
    isRegistered: false,
    isOnline: navigator.onLine,
    updateAvailable: false
  });

  useEffect(() => {
    if (!state.isSupported) {
      console.log('Service Worker não é suportado neste navegador');
      return;
    }

    // Check if we're in a StackBlitz/WebContainer environment
    const isStackBlitz = window.location.hostname.includes('stackblitz') || 
                        window.location.hostname.includes('webcontainer') ||
                        window.location.hostname === 'localhost';

    if (isStackBlitz) {
      console.log('Service Worker não é suportado no ambiente StackBlitz/WebContainer');
      return;
    }

    registerServiceWorker();
    setupOnlineOfflineListeners();
    setupServiceWorkerListeners();
  }, [state.isSupported]);

  const registerServiceWorker = async () => {
    try {
      const registration = await navigator.serviceWorker.register('/sw.js');
      
      setState(prev => ({ ...prev, isRegistered: true }));
      console.log('Service Worker registrado com sucesso:', registration);

      // Verificar se há uma atualização disponível
      registration.addEventListener('updatefound', () => {
        const newWorker = registration.installing;
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              setState(prev => ({ ...prev, updateAvailable: true }));
              console.log('Nova versão do Service Worker disponível');
            }
          });
        }
      });

    } catch (error) {
      // Handle StackBlitz/WebContainer specific error gracefully
      if (error instanceof Error && error.message.includes('StackBlitz')) {
        console.log('Service Worker não é suportado no ambiente StackBlitz/WebContainer');
        return;
      }
      console.error('Falha ao registrar Service Worker:', error);
    }
  };

  const setupOnlineOfflineListeners = () => {
    const handleOnline = () => {
      setState(prev => ({ ...prev, isOnline: true }));
      console.log('Aplicação voltou online');
      
      // Registrar sincronização em background
      if ('serviceWorker' in navigator && 'sync' in window.ServiceWorkerRegistration.prototype) {
        navigator.serviceWorker.ready.then(registration => {
          return registration.sync.register('background-sync');
        }).catch(error => {
          // Silently handle sync registration errors in unsupported environments
          console.log('Background sync não é suportado neste ambiente');
        });
      }
    };

    const handleOffline = () => {
      setState(prev => ({ ...prev, isOnline: false }));
      console.log('Aplicação ficou offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  };

  const setupServiceWorkerListeners = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.addEventListener('message', (event) => {
        if (event.data && event.data.type === 'SYNC_COMPLETE') {
          console.log('Sincronização completa');
          // Aqui você pode atualizar o estado da aplicação
        }
      });
    }
  };

  const updateServiceWorker = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration && registration.waiting) {
          registration.waiting.postMessage({ type: 'SKIP_WAITING' });
          window.location.reload();
        }
      }).catch(error => {
        console.log('Atualização do Service Worker não é suportada neste ambiente');
      });
    }
  };

  return {
    ...state,
    updateServiceWorker
  };
};