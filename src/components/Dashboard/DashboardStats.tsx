import React from 'react';
import { Calendar, Users, Clock, TrendingUp } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { startOfDay, endOfDay, isToday, isTomorrow, differenceInDays } from 'date-fns';

interface DashboardStatsProps {
  onNavigate?: (view: string) => void;
}

const DashboardStats: React.FC<DashboardStatsProps> = ({ onNavigate }) => {
  const { appointments, customerCount, todayVariation } = useApp();

  const today = new Date();
  const todayAppointments = appointments.filter(apt => isToday(apt.date));
  const tomorrowAppointments = appointments.filter(apt => isTomorrow(apt.date));
  const confirmedAppointments = appointments.filter(apt => apt.status === 'confirmed');

  // Calcular confirmados e não confirmados para hoje
  const todayConfirmed = todayAppointments.filter(apt => apt.status === 'confirmed').length;
  const todayTotal = todayAppointments.length;

  // Calcular média diária de atendimentos
  const calculateDailyAverage = () => {
    if (appointments.length === 0) return 0;

    // Encontrar a data mais antiga e mais recente dos agendamentos
    const dates = appointments.map(apt => new Date(apt.date));
    const oldestDate = new Date(Math.min(...dates.map(d => d.getTime())));
    const newestDate = new Date(Math.max(...dates.map(d => d.getTime())));
    
    // Calcular número de dias trabalhados (diferença entre a primeira e última data + 1)
    const workingDays = differenceInDays(newestDate, oldestDate) + 1;
    
    // Calcular média: total de atendimentos / dias trabalhados
    const totalAppointments = appointments.length;
    const dailyAverage = totalAppointments / workingDays;
    
    return Math.round(dailyAverage * 10) / 10; // Arredondar para 1 casa decimal
  };

  const dailyAverage = calculateDailyAverage();

  // Format variation percentage for display
  const formatVariation = (variation: number) => {
    const sign = variation >= 0 ? '+' : '';
    return `${sign}${variation.toFixed(1)}% vs média`;
  };

  const getVariationColor = (variation: number) => {
    if (variation > 0) return 'text-green-600';
    if (variation < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const stats = [
    {
      label: 'Agendamentos Hoje',
      value: todayAppointments.length,
      icon: Calendar,
      color: 'primary',
      trend: `${todayConfirmed} de ${todayTotal} clientes confirmados`,
      trendColor: todayConfirmed === todayTotal && todayTotal > 0 ? 'text-green-600' : 'text-gray-600',
      onClick: () => onNavigate?.('calendar')
    },
    {
      label: 'Clientes Cadastrados',
      value: customerCount,
      icon: Users,
      color: 'secondary',
      trend: customerCount > 0 ? `${customerCount} clientes ativos` : 'Nenhum cliente cadastrado',
      onClick: () => onNavigate?.('customers')
    },
    {
      label: 'Confirmados',
      value: confirmedAppointments.length,
      icon: Clock,
      color: 'accent',
      trend: `Sua média de atendimentos por dia é de ${dailyAverage} pessoas.`,
      onClick: () => onNavigate?.('calendar')
    },
    {
      label: 'Amanhã',
      value: tomorrowAppointments.length,
      icon: TrendingUp,
      color: 'primary',
      trend: `${tomorrowAppointments.length} agendamentos`,
      onClick: () => onNavigate?.('calendar')
    }
  ];

  const getColorClasses = (color: string) => {
    const colors = {
      primary: 'bg-primary-50 text-primary-700 border-primary-200',
      secondary: 'bg-secondary-50 text-secondary-700 border-secondary-200',
      accent: 'bg-accent-50 text-accent-700 border-accent-200'
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  const getIconBg = (color: string) => {
    const colors = {
      primary: 'bg-primary-500',
      secondary: 'bg-secondary-500',
      accent: 'bg-accent-500'
    };
    return colors[color as keyof typeof colors] || colors.primary;
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
      {stats.map((stat, index) => {
        const Icon = stat.icon;
        return (
          <div 
            key={index}
            onClick={stat.onClick}
            className={`p-6 rounded-2xl border ${getColorClasses(stat.color)} transition-all duration-200 hover:shadow-card cursor-pointer transform hover:scale-105`}
          >
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${getIconBg(stat.color)}`}>
                <Icon className="w-6 h-6 text-dark-900" />
              </div>
              <span className="text-2xl font-bold">{stat.value}</span>
            </div>
            <h3 className="font-semibold text-sm mb-1">{stat.label}</h3>
            <p className={`text-xs opacity-75 ${stat.trendColor || ''}`}>
              {stat.trend}
            </p>
          </div>
        );
      })}
    </div>
  );
};

export default DashboardStats;