import React, { Suspense } from 'react';
import { Loader } from 'lucide-react';

// Lazy loading dos componentes pesados
const LazyCustomerList = React.lazy(() => import('./Customers/CustomerList'));
const LazyWeeklyCalendar = React.lazy(() => import('./Calendar/WeeklyCalendar'));
const LazyAppointmentForm = React.lazy(() => import('./Appointments/AppointmentForm'));

// Componente de loading
const LoadingSpinner: React.FC<{ message?: string }> = ({ message = 'Carregando...' }) => (
  <div className="flex items-center justify-center p-8">
    <div className="text-center">
      <Loader className="w-8 h-8 animate-spin text-primary-500 mx-auto mb-2" />
      <p className="text-gray-600 text-sm">{message}</p>
    </div>
  </div>
);

// HOC para wrapping com Suspense
const withSuspense = <P extends object>(
  Component: React.ComponentType<P>,
  loadingMessage?: string
) => {
  return (props: P) => (
    <Suspense fallback={<LoadingSpinner message={loadingMessage} />}>
      <Component {...props} />
    </Suspense>
  );
};

// Componentes exportados com Suspense
export const CustomerListWithSuspense = withSuspense(LazyCustomerList, 'Carregando lista de clientes...');
export const WeeklyCalendarWithSuspense = withSuspense(LazyWeeklyCalendar, 'Carregando calendário...');
export const AppointmentFormWithSuspense = withSuspense(LazyAppointmentForm, 'Carregando formulário...');