import React from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  format, 
  addWeeks, 
  subWeeks,
  isSameDay,
  isToday
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useApp } from '../../context/AppContext';
import { Appointment } from '../../types';

interface WeeklyCalendarProps {
  currentDate: Date;
  onDateChange: (date: Date) => void;
  onNewAppointment: () => void;
}

const WeeklyCalendar: React.FC<WeeklyCalendarProps> = ({ 
  currentDate, 
  onDateChange, 
  onNewAppointment 
}) => {
  const { appointments } = useApp();

  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentDate, { weekStartsOn: 1 });
  const days = eachDayOfInterval({ start: weekStart, end: weekEnd });

  const timeSlots = [
    '08:00', '09:00', '10:00', '11:00', '12:00',
    '13:00', '14:00', '15:00', '16:00', '17:00', '18:00'
  ];

  const getAppointmentsForDay = (day: Date) => {
    return appointments.filter(apt => {
      try {
        return isSameDay(apt.date, day);
      } catch (error) {
        console.error('Error comparing dates:', error, apt);
        return false;
      }
    });
  };

  const getAppointmentForSlot = (day: Date, time: string) => {
    const dayAppointments = getAppointmentsForDay(day);
    return dayAppointments.find(apt => {
      try {
        const aptTime = format(apt.date, 'HH:mm');
        return aptTime === time;
      } catch (error) {
        console.error('Error formatting appointment time:', error, apt);
        return false;
      }
    });
  };

  const navigateWeek = (direction: 'prev' | 'next') => {
    const newDate = direction === 'prev' 
      ? subWeeks(currentDate, 1) 
      : addWeeks(currentDate, 1);
    onDateChange(newDate);
  };

  const getStatusColor = (appointment: Appointment) => {
    switch (appointment.status) {
      case 'confirmed':
        return 'bg-green-100 border-green-300 text-green-800';
      case 'pending':
        return 'bg-yellow-100 border-yellow-300 text-yellow-800';
      case 'cancelled':
        return 'bg-red-100 border-red-300 text-red-800';
      case 'completed':
        return 'bg-blue-100 border-blue-300 text-blue-800';
      default:
        return 'bg-gray-100 border-gray-300 text-gray-800';
    }
  };

  // Formatar o período da semana em português
  const formatWeekPeriod = () => {
    try {
      const startDay = format(weekStart, 'd', { locale: ptBR });
      const endDay = format(weekEnd, 'd', { locale: ptBR });
      const month = format(weekEnd, 'MMMM', { locale: ptBR });
      const year = format(weekEnd, 'yyyy', { locale: ptBR });
      
      return `${startDay} - ${endDay} de ${month}, ${year}`;
    } catch (error) {
      console.error('Error formatting week period:', error);
      return 'Semana atual';
    }
  };

  return (
    <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
      {/* Mobile-optimized Header */}
      <div className="p-4 md:p-6 border-b border-gray-200">
        <div className="flex flex-col space-y-4 md:space-y-0 md:flex-row md:items-center md:justify-between">
          {/* Date Range - Mobile Optimized and Centered */}
          <div className="flex items-center justify-center md:justify-start">
            <h2 className="text-lg md:text-xl font-semibold text-dark-900 text-center md:text-left">
              {formatWeekPeriod()}
            </h2>
          </div>
          
          {/* Navigation Controls - Mobile Optimized */}
          <div className="flex items-center justify-center gap-1">
            <button
              onClick={() => navigateWeek('prev')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors touch-manipulation"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={() => onDateChange(new Date())}
              className="px-3 py-2 bg-primary-100 text-primary-800 rounded-xl hover:bg-primary-200 transition-colors text-sm font-medium touch-manipulation"
            >
              Hoje
            </button>
            <button
              onClick={() => navigateWeek('next')}
              className="p-2 hover:bg-gray-100 rounded-xl transition-colors touch-manipulation"
              aria-label="Próxima semana"
            >
              <ChevronRight className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Day headers - Mobile Optimized */}
        <div className="mt-4 grid grid-cols-8 gap-1">
          <div className="p-2 md:p-3"></div>
          {days.map((day) => (
            <div 
              key={day.toISOString()} 
              className={`p-2 md:p-3 text-center rounded-xl transition-colors ${
                isToday(day) 
                  ? 'bg-primary-500 text-dark-900 font-semibold' 
                  : 'bg-gray-50 text-gray-700 hover:bg-gray-100'
              }`}
            >
              <div className="text-xs font-medium mb-1">
                <span className="hidden sm:inline">
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                </span>
                <span className="sm:hidden">
                  {format(day, 'EEEEE', { locale: ptBR }).toUpperCase()}
                </span>
              </div>
              <div className="text-sm md:text-lg font-semibold">
                {format(day, 'dd')}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Calendar Grid - Mobile Optimized */}
      <div className="overflow-x-auto">
        <div className="min-w-full">
          {timeSlots.map((time) => (
            <div key={time} className="grid grid-cols-8 gap-1 border-b border-gray-100 last:border-b-0">
              <div className="p-2 md:p-4 text-xs md:text-sm font-medium text-gray-600 bg-gray-50 border-r border-gray-200 flex items-center justify-center">
                {time}
              </div>
              {days.map((day) => {
                const appointment = getAppointmentForSlot(day, time);
                return (
                  <div 
                    key={`${day.toISOString()}-${time}`} 
                    className="p-1 md:p-2 min-h-[50px] md:min-h-[60px] border-r border-gray-100 last:border-r-0 hover:bg-gray-50 transition-colors touch-manipulation cursor-pointer"
                    onClick={() => !appointment && onNewAppointment()}
                  >
                    {appointment && (
                      <div className={`
                        p-1.5 md:p-2 rounded-lg border text-xs font-medium cursor-pointer
                        ${getStatusColor(appointment)}
                        hover:shadow-sm transition-all duration-200 touch-manipulation
                      `}>
                        <div className="font-semibold truncate mb-1 text-xs">
                          {appointment.clientName}
                        </div>
                        <div className="text-xs opacity-75 truncate hidden sm:block">
                          {appointment.serviceName}
                        </div>
                        {/* Status indicator for mobile */}
                        <div className="sm:hidden flex items-center justify-center mt-1">
                          <div className={`w-2 h-2 rounded-full ${
                            appointment.status === 'confirmed' ? 'bg-green-500' :
                            appointment.status === 'pending' ? 'bg-yellow-500' : 
                            appointment.status === 'completed' ? 'bg-blue-500' : 'bg-red-500'
                          }`}></div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile Legend */}
      <div className="md:hidden p-4 border-t border-gray-100 bg-gray-50">
        <div className="flex items-center justify-center gap-4 text-xs">
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-green-500"></div>
            <span>Confirmado</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-yellow-500"></div>
            <span>Pendente</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-blue-500"></div>
            <span>Concluído</span>
          </div>
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-red-500"></div>
            <span>Cancelado</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default WeeklyCalendar;