import React, { useState } from 'react';
import { Clock, Phone, MessageCircle, CheckCircle, XCircle, AlertCircle, Calendar, ChevronDown, ChevronUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { isToday, format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const TodaySchedule: React.FC = () => {
  const { appointments, updateAppointment, sendWhatsAppMessage } = useApp();
  const [expandedAppointment, setExpandedAppointment] = useState<string | null>(null);

  const todayAppointments = appointments
    .filter(apt => {
      try {
        return isToday(apt.date);
      } catch (error) {
        console.error('Error filtering today appointments:', error, apt);
        return false;
      }
    })
    .sort((a, b) => {
      try {
        return a.date.getTime() - b.date.getTime();
      } catch (error) {
        console.error('Error sorting appointments:', error, a, b);
        return 0;
      }
    });

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'confirmed':
        return <CheckCircle className="w-4 h-4 text-green-500" />;
      case 'pending':
        return <AlertCircle className="w-4 h-4 text-yellow-500" />;
      case 'cancelled':
        return <XCircle className="w-4 h-4 text-red-500" />;
      case 'completed':
        return <CheckCircle className="w-4 h-4 text-blue-500" />;
      default:
        return <Clock className="w-4 h-4 text-gray-500" />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'bg-green-50 text-green-700 border-green-200';
      case 'pending':
        return 'bg-yellow-50 text-yellow-700 border-yellow-200';
      case 'cancelled':
        return 'bg-red-50 text-red-700 border-red-200';
      case 'completed':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      default:
        return 'bg-gray-50 text-gray-700 border-gray-200';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'confirmed':
        return 'Confirmado';
      case 'pending':
        return 'Pendente';
      case 'cancelled':
        return 'Cancelado';
      case 'completed':
        return 'Concluído';
      default:
        return 'Agendado';
    }
  };

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    try {
      console.log('TodaySchedule: Alterando status do agendamento:', appointmentId, newStatus);
      const success = await updateAppointment(appointmentId, { status: newStatus as any });
      if (!success) {
        console.error('TodaySchedule: Falha ao atualizar status do agendamento');
      }
    } catch (error) {
      console.error('TodaySchedule: Error updating appointment status:', error);
    }
  };

  const toggleExpanded = (appointmentId: string) => {
    setExpandedAppointment(expandedAppointment === appointmentId ? null : appointmentId);
  };

  const formatAppointmentTime = (date: Date) => {
    try {
      return format(date, 'HH:mm');
    } catch (error) {
      console.error('Error formatting appointment time:', error, date);
      return '00:00';
    }
  };

  if (todayAppointments.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-6 md:p-8 border border-gray-200">
        <h2 className="text-xl font-semibold text-dark-900 mb-4">Agendamentos de Hoje</h2>
        <div className="text-center py-8">
          <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Nenhum agendamento para hoje</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-2xl p-4 md:p-6 border border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-lg md:text-xl font-semibold text-dark-900">Agendamentos de Hoje</h2>
        <span className="bg-primary-100 text-primary-800 px-3 py-1 rounded-full text-sm font-medium">
          {todayAppointments.length} agendamentos
        </span>
      </div>

      <div className="space-y-3 md:space-y-4">
        {todayAppointments.map((appointment) => {
          const isExpanded = expandedAppointment === appointment.id;
          
          return (
            <div 
              key={appointment.id}
              className="border border-gray-200 rounded-xl overflow-hidden hover:shadow-card transition-all duration-200"
            >
              {/* Main appointment info - always visible */}
              <div className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-dark-900 truncate">{appointment.clientName}</h3>
                      <div className="flex items-center gap-1">
                        {getStatusIcon(appointment.status)}
                        <span className={`px-2 py-1 rounded-full text-xs font-medium border ${getStatusColor(appointment.status)}`}>
                          {getStatusText(appointment.status)}
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-gray-600 text-sm mb-2 truncate">{appointment.serviceName}</p>
                    
                    <div className="flex items-center gap-4 text-sm text-gray-500">
                      <div className="flex items-center gap-1">
                        <Clock className="w-4 h-4" />
                        <span>{formatAppointmentTime(appointment.date)}</span>
                      </div>
                      <div className="flex items-center gap-1 truncate">
                        <Phone className="w-4 h-4 flex-shrink-0" />
                        <span className="truncate">{appointment.clientPhone}</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* Expand/Collapse button */}
                  <button
                    onClick={() => toggleExpanded(appointment.id)}
                    className="p-2 hover:bg-gray-100 rounded-lg transition-colors touch-manipulation ml-2"
                    aria-label={isExpanded ? "Recolher" : "Expandir"}
                  >
                    {isExpanded ? (
                      <ChevronUp className="w-4 h-4 text-gray-500" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-gray-500" />
                    )}
                  </button>
                </div>

                {/* Quick actions - always visible */}
                <div className="flex items-center gap-2 flex-wrap">
                  {appointment.status === 'pending' && (
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'confirmed')}
                      className="bg-green-100 hover:bg-green-200 text-green-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation"
                    >
                      Confirmar
                    </button>
                  )}
                  
                  {appointment.status === 'confirmed' && (
                    <button
                      onClick={() => handleStatusChange(appointment.id, 'completed')}
                      className="bg-blue-100 hover:bg-blue-200 text-blue-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation"
                    >
                      Concluir
                    </button>
                  )}
                  
                  {!appointment.whatsappSent && (
                    <button
                      onClick={() => sendWhatsAppMessage(appointment)}
                      className="bg-primary-100 hover:bg-primary-200 text-primary-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors flex items-center gap-1 touch-manipulation"
                    >
                      <MessageCircle className="w-4 h-4" />
                      <span className="hidden sm:inline">WhatsApp</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Expanded content */}
              {isExpanded && (
                <div className="border-t border-gray-100 p-4 bg-gray-50">
                  <div className="space-y-3">
                    {/* Additional info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                      <div>
                        <span className="text-gray-600">Duração:</span>
                        <span className="ml-2 font-medium">{appointment.duration} minutos</span>
                      </div>
                      <div>
                        <span className="text-gray-600">Status WhatsApp:</span>
                        <span className={`ml-2 font-medium ${appointment.whatsappSent ? 'text-green-600' : 'text-gray-600'}`}>
                          {appointment.whatsappSent ? 'Enviado' : 'Não enviado'}
                        </span>
                      </div>
                    </div>

                    {/* Notes */}
                    {appointment.notes && (
                      <div>
                        <span className="text-gray-600 text-sm">Observações:</span>
                        <p className="mt-1 text-sm text-gray-800 bg-white p-2 rounded border">
                          {appointment.notes}
                        </p>
                      </div>
                    )}

                    {/* Extended actions */}
                    <div className="flex items-center gap-2 pt-2 border-t border-gray-200">
                      {appointment.status !== 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'cancelled')}
                          className="bg-red-100 hover:bg-red-200 text-red-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation"
                        >
                          Cancelar
                        </button>
                      )}
                      
                      {appointment.status === 'cancelled' && (
                        <button
                          onClick={() => handleStatusChange(appointment.id, 'pending')}
                          className="bg-yellow-100 hover:bg-yellow-200 text-yellow-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation"
                        >
                          Reativar
                        </button>
                      )}
                      
                      <button className="bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg text-sm font-medium transition-colors touch-manipulation">
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default TodaySchedule;